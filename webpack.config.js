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
      use: [{
          loader: 'file-loader',
          options: {
            name: '.bundle.css'
          }
        },
        'extract-loader',
        'css-loader',
        {
          loader: 'sass-loader',
          options: {
            includePaths: ['./node_modules']
          }
        }
      ],
    }],
  },
  output: {
    path: path.resolve(__dirname, 'assets/css')
  }
};

module.exports = [
  tsConfig, scssConfig
];
