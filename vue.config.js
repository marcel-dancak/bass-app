const path = require('path')
const express = require('express')

module.exports = {
  runtimeCompiler: true,

  chainWebpack: config => {
    const svgRule = config.module.rule('svg')
    svgRule.uses.clear()
    
    config.module
      .rule('svg')
      .oneOf('sprite')
        .test(/icons\/.*\.svg$/)
        .use('babel')
          .loader('babel-loader')
          .end()
        .use('svg-sprite')
          .loader('svg-sprite-loader')
          .end()
        .use('svgo')
          .loader('svgo-loader')
          .end()
        .end()

      .oneOf('other')
        .use('file-loader')
          .loader('file-loader')
          .options({
            name: 'img/[name].[hash:8].[ext]'
          })
          .end()
        .end()
  },
  devServer: {
    compress: true,

    // contentBase: [path.join(__dirname, 'public'), path.join(__dirname, '../sounds')]
    before (app, server) {
      app.use('/sounds/', express.static(path.join(__dirname, '../sounds')))
      app.use('/', express.static(path.join(__dirname, '../static')))
    }
  }
}
