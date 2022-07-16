const TerserPlugin = require('terser-webpack-plugin');
const path = require('path');

module.exports = {
  performance: {
    maxEntrypointSize: 1048576,
    maxAssetSize: 1048576
  },
  entry: path.resolve(__dirname, '../src/ts/main.ts'),
  mode: "production",
  module: {
    rules: [{
      loader: "ts-loader",
      test: /\.tsx?$/,
    }],
  },
  output: {
    filename: "app.js",
    path: path.resolve(__dirname, '../assets/js')
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  },
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: true,
      })
    ]
  }
};
