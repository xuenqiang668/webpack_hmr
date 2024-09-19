const path = require('path')
const htmlWebpackPlugin = require('html-webpack-plugin')
const { HotModuleReplacementPlugin } = require('webpack')

module.exports = {
  mode: 'development',
  // 目前实现这种
  entry: path.resolve(__dirname, './src/index.js'),
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: '[name].hash.js',
    clean: true, // 每次构建前清除旧的输出目录
  },

  devtool: 'source-map',
  plugins: [
    new htmlWebpackPlugin({
      template: './public/index.html',
    }),
    new HotModuleReplacementPlugin(),
  ],
  devServer: {
    static: {
      directory: path.resolve(__dirname, './pbulic/index.html'),
    },
    hot: true,
  },
}
