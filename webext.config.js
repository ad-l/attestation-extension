/*eslint-disable*/
const webpack = require('webpack')
/* eslint-enable */

console.log("Configuring webpack....")
module.exports = {
  webpack: (config) => {
    config.resolve = {fallback: { "path": false, "crypto": false, "fs":false, jquery:false } };
    config.externals = "jQuery";
    config.plugins = [new webpack.ProvidePlugin({
      $: 'jquery',
      jQuery: 'jquery',
    })];

    return config
  },
}
