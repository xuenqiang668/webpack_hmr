// /src/lib/client/index.js
const io = require('/node_modules/socket.io/client-dist/socket.io.js') // websocket客户端
const hotEmitter = require('./emitter') // 和hot/dev-server.js共用一个EventEmitter实例，这里用于发射事件
let currentHash // 最新的编译hash

//【1】连接websocket服务器
const URL = '/'
const socket = io(URL)

//【2】websocket客户端监听事件
const onSocketMessage = {
  //【2.1】注册hash事件回调，这个回调主要干了一件事，获取最新的编译hash值
  hash(hash) {
    console.log('hash', hash)
    currentHash = hash
  },
  //【2.2】注册ok事件回调，调用reloadApp进行热更新
  ok() {
    console.log('ok')
    reloadApp()
  },
  connect() {
    console.log('client connect successfully!')
  },
}
// 将onSocketMessage进行循环，给websocket注册事件
Object.keys(onSocketMessage).forEach((eventName) => {
  let handler = onSocketMessage[eventName]
  socket.on(eventName, handler)
})

//【3】reloadApp中 发射webpackHotUpdate事件
let reloadApp = () => {
  let hot = true
  // 会进行判断，是否支持热更新；我们本身就是为了实现热更新，所以简单粗暴设置为true
  if (hot) {
    // 事件通知：如果支持的话发射webpackHotUpdate事件
    hotEmitter.emit('webpackHotUpdate', currentHash)
  } else {
    // 直接刷新：如果不支持则直接刷新浏览器
    window.location.reload()
  }
}
