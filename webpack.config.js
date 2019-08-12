const path = require('path');

module.exports = {
  entry: "./src/ts/main.ts",
  mode: "production",
  module: {
    rules: [
      { test: /\.tsx?$/, loader: "ts-loader" }
    ]
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, 'assets/js')
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  }
};
