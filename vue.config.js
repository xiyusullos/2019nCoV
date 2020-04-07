module.exports = {
  publicPath: '/2019nCoV',
  productionSourceMap: false,
  css: {
    extract: false
  },
  configureWebpack: {
    externals: {
      "vue": "Vue",
      "element-ui": "ELEMENT",
      // 'collect': 'collect'
    }
  }

}