const FixStyleOnlyEntriesPlugin = require('webpack-fix-style-only-entries');
const OptimizeCssAssetsPlugin = require('optimize-css-assets-webpack-plugin');
const autoprefixer = require('autoprefixer');
const cssnano = require('cssnano');
const path = require('path');

module.exports = {
  entry: path.resolve(__dirname, '../src/scss/main.scss'),
  mode: 'production',
  module: {
    rules: [{
      use: [{
          loader: 'file-loader',
          options: {
            name: '[name].css',
          }
        },
        {
          loader: 'extract-loader',
        },
        {
          loader: 'css-loader',
        },
        {
          loader: 'postcss-loader',
          options: {
            plugins: () => [
              autoprefixer(),
            ]
          }
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
    path: path.resolve(__dirname, '../assets/css')
  },
  plugins: [
    new FixStyleOnlyEntriesPlugin(),
    new OptimizeCssAssetsPlugin({
      cssProcessor: cssnano,
      cssProcessorPluginOptions: {
        preset: ['default', { discardComments: { removeAll: true } }],
      },
    })
  ]
};
