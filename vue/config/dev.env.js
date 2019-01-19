'use strict'
const merge = require('webpack-merge')
const prodEnv = require('./prod.env')
const path = require('path')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  // dev: {
  //   // Paths
  //   // assetsSubDirectory: '../sounds',
  //   assetsSubDirectory: path.resolve(__dirname, '../sounds'),
  //   assetsPublicPath: '/sounds'
  // }
})
