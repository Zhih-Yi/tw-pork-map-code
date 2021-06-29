module.exports = {
  publicPath: process.env.NODE_ENV === 'production'
  ? '/tw-pork-map/'
  : './',
  chainWebpack: config => {
    config
      .plugin('html')
      .tap(args => {
        args[0].title = '台灣豬標章地圖'
        return args
      })
  }
}
