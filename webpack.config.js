const FixStyleOnlyEntriesPlugin = require("webpack-fix-style-only-entries");
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
  entry: "./src/scss/main.scss",
  mode: "production",
  module: {
    rules: [{
      use: [{
          loader: 'file-loader',
          options: {
            name: '[name].css',
            outputPath: 'assets/css/',
          }
        },
        {
          loader: 'extract-loader',
        },
        {
          loader: 'css-loader',
        },
        {
          loader: 'sass-loader',
        }
      ],
      test: /\.scss$/,
    }, {
      use: [{
        loader: 'file-loader',
        options: {
          name: '[name].[ext]',
          outputPath: 'fonts/',
        }
      }],
      test: /.(ttf|otf|eot|svg|woff(2)?)(\?[a-z0-9]+)?$/,
    }],
  },
  output: {
    path: path.resolve(__dirname, 'assets/css')
  },
  plugins: [
    new FixStyleOnlyEntriesPlugin()
  ]
};

module.exports = [
  tsConfig, scssConfig
];
