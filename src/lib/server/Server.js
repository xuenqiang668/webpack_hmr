// /src/lib/server/Server.js

const express = require('express')
const http = require('http')
const mime = require('mime') // 可以根据文件后缀，生成相应的Content-Type类型
const path = require('path')
const socket = require('socket.io') // 通过它和http实现websocket服务端
const MemoryFileSystem = require('memory-fs') // 内存文件系统，主要目的就是将编译后的文件打包到内存
const updateCompiler = require('./updateCompiler')

class Server {
  constructor(compiler) {
    this.compiler = compiler // 将webpack实例挂载到this上
    updateCompiler(compiler) // 【3】entry增加 websocket客户端的两个文件，让其一同打包到chunk中
    this.currentHash // 每次编译的hash
    this.clientSocketList = [] // 所有的websocket客户端
    this.fs // 会指向内存文件系统
    this.server // webserver服务器
    this.app // express实例
    this.middleware // webpack-dev-middleware返回的express中间件，用于返回编译的文件

    this.setupHooks() // 【4】添加webpack的done事件回调，编译完成时会触发；编译完成时向客户端发送消息，通过websocket向所有的websocket客户端发送两个事件，告知浏览器来拉取新的代码了
    this.setupApp() //【5】创建express实例app
    this.setupDevMiddleware() // 【6】里面就是webpack-dev-middlerware完成的工作，主要是本地文件的监听、启动webpack编译、设置文件系统为内存文件系统（让编译输出到内存中）、里面有一个中间件负责返回编译的文件
    this.routes() // 【7】app中使用webpack-dev-middlerware返回的中间件
    this.createServer() // 【8】创建webserver服务器，让浏览器可以访问编译的文件
    this.createSocketServer() // 【9】创建websocket服务器，监听connection事件，将所有的websocket客户端存起来，同时通过发送hash事件，将最新一次的编译hash传给客户端
  }
  setupHooks() {
    let { compiler } = this
    compiler.hooks.done.tap('webpack-dev-server', (stats) => {
      // 每次编译都会产生一个唯一的hash
      this.currentHash = stats.hash
      // 每当新一个编译完成后都会向所有websocket客户端发送消息
      this.clientSocketList.forEach((socket) => {
        // 先向客户端发送最新的hash
        socket.emit('hash', this.currentHash)
        // 再向客户端发送一个ok
        socket.emit('ok')
      })
    })
  }
  setupApp() {
    this.app = new express()
  }
  setupDevMiddleware() {
    const { compiler } = this

    // 会监控文件的变化，每当有文件改变（ctrl+s）的时候都会重新编译打包
    // 在编译输出的过程中，会生成两个补丁文件 hash.hot-update.json 和 chunk名.hash.hot-update.js
    compiler.watch({}, () => [console.log('Compiled successfully')])

    // 设置文件系统为内存文件系统，同时挂载在this上，方便webserver使用
    const fs = new MemoryFileSystem()
    this.fs = compiler.outputFileSystem = fs

    // express中间件，将编译的文件返回
    // 为什么不直接使用express的static中间件，因为我们要读取的文件在内存中，所以自己实现一款简易版的static中间件
    let staticMiddleWare = (fileDir) => {
      return (req, res, next) => {
        let { url } = req
        if (url === '/favicon.ico') {
          return res.sendStatus(404)
        }
        url === '/' ? (url = '/index.html') : null
        let filePath = path.join(fileDir, url)
        try {
          let statObj = this.fs.statSync(filePath)
          if (statObj.isFile()) {
            // 判断是否是文件，不是文件直接返回404（简单粗暴）
            // 路径和原来写到磁盘的一样，只是这是写到内存中了
            let content = this.fs.readFileSync(filePath)
            res.setHeader('Content-Type', mime.getType(filePath))
            res.send(content)
          } else {
            res.sendStatus(404)
          }
        } catch (error) {
          res.sendStatus(404)
        }
      }
    }
    this.middleware = staticMiddleWare // 将中间件挂载在this实例上，以便app使用
  }
  routes() {
    let { compiler } = this
    let config = compiler.options // 经过webpack(config)，会将 webpack.config.js导出的对象 挂在compiler.options上
    this.app.use(this.middleware(config.output.path)) // 使用webpack-dev-middleware导出的中间件
  }
  createServer() {
    this.server = http.createServer(this.app)
  }
  createSocketServer() {
    // socket.io+http服务 实现一个websocket
    const io = socket(this.server)
    io.on('connection', (socket) => {
      console.log('a new client connect server')
      // 把所有的websocket客户端存起来，以便编译完成后向这个websocket客户端发送消息（实现双向通信的关键）
      this.clientSocketList.push(socket)
      // 每当有客户端断开时，移除这个websocket客户端
      socket.on('disconnect', () => {
        let num = this.clientSocketList.indexOf(socket)
        this.clientSocketList = this.clientSocketList.splice(num, 1)
      })
      // 向客户端发送最新的一个编译hash
      socket.emit('hash', this.currentHash)
      // 再向客户端发送一个ok
      socket.emit('ok')
    })
  }
  listen(port, host = 'localhost', cb = new Function()) {
    this.server.listen(port, host, cb)
  } // 启动服务器
}

module.exports = Server
