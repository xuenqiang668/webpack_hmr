// /src/myHMR-webpack-dev-server.js 热更新服务端入口

const webpack = require('webpack')
const Server = require('./lib/server/Server')
const config = require('~/webpack.config')

// 1. 创建webpack 实例
const comiler = webpack(config)

// 2. 创建server类，这里面包含了webpack-dev-server服务器的主要逻辑
const server = new Server(comiler)

// 10. 启动webServer服务器
server.listen(8000, 'localhost', () => {
  console.log('project is running at http://localhost:8000/')
})
