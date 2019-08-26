const path = require('path');

const tsConfig = {
  entry: "./src/ts/main.ts",
  mode: "production",
  module: {
    rules: [{
      loader: "ts-loader",
      test: /\.tsx?$/,
    }],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, 'assets/js')
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"]
  }
};

const scssConfig = {
  entry: "./assets/scss/main.scss",
  mode: "production",
  module: {
    rules: [{
      test: /\.scss$/,
      loaders: [
        "file-loader?name=[name].css",
        "extract-loader",
        "css-loader",
        "sass-loader"
      ]
    }],
  },
  output: {
    filename: null,
    path: path.resolve(__dirname, 'assets/css')
  }
};

module.exports = [
  tsConfig, scssConfig
];
