// /src/lib/server/updateCompiler.js 更改entry，增加/src/lib/client/index.js和/src/lib/client/hot/dev-server.js
const path = require('path')

let updateCompiler = (compiler) => {
  const config = compiler.options

  config.entry.main.import = [
    ...config.entry.main.import,
    path.resolve(__dirname, '../client/index.js'),
    path.resolve(__dirname, '../client/hot/dev-server.js'),
  ]

  compiler.hooks.entryOption.call(config.context, config.entry)
}

module.exports = updateCompiler
