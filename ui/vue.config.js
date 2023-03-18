const { defineConfig } = require('@vue/cli-service')
const webpack = require("webpack");

module.exports = defineConfig({
  transpileDependencies: true,
  devServer: {
    hot: false,
    liveReload: true,
    proxy: {
      "/api": {
        target: "http://localhost:5217",
        changeOrigin: true,
        pathRewrite: { "^/api": "/" }
      }
    }
  },
  configureWebpack: {
    plugins: [
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
    ],
  }
})
