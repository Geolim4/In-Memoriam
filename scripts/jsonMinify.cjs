const clc = require('cli-color');
const fs = require('fs');
const jsonminify = require("jsonminify");

const deathPath = __dirname + '/../data/deaths/';
const assetJsonPath = __dirname + '/../assets/json/deaths/';

console.log(clc.green('Minifying JSON files...'));

if(!fs.existsSync(assetJsonPath)){
  console.log(clc.yellow(assetJsonPath + ' dir does not exist, creating...'))
  fs.mkdirSync(assetJsonPath, { recursive: true });
}

fs.readdir(deathPath, (err, files) => {
  files.forEach(file => {
    fs.readFile(deathPath + file, 'utf8', (err, data) => {
      const minifiedFilename = file.replace('.json', '.min.json');
      fs.writeFile(assetJsonPath + minifiedFilename, jsonminify(data), 'utf8', (err) => {
        if(!err) {
          console.log(clc.green(file + ' has been minified to ' + assetJsonPath + minifiedFilename));
        } else {
           console.log(clc.red(file + ' failed to minify to ' + assetJsonPath + minifiedFilename));
        }
      });
    });
  });
});
