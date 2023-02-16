const { defineConfig } = require('@vue/cli-service')
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
  }
})
