const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const jsonminify = require("jsonminify");

const deathPath = fs.realpathSync(__dirname + '/../data/database/');
const projectDir =  fs.realpathSync(__dirname + '/../');
let assetJsonPath = __dirname + '/../assets/json/database/';

console.log(clc.blue('Minifying JSON files...'));

if(!fs.existsSync(assetJsonPath)){
  fs.mkdirSync(assetJsonPath, { recursive: true });
  assetJsonPath = fs.realpathSync(assetJsonPath);
  console.log(clc.yellow(assetJsonPath.replace(projectDir, '.') + ' directory was not existing and has been created...'))
} else {
  assetJsonPath = fs.realpathSync(assetJsonPath);
}

fs.readdir(deathPath, (err, files) => {
  files.forEach(file => {
    const originFile = path.resolve(deathPath, file);
    fs.readFile(originFile, 'utf8', (err, data) => {
      const targetFile = path.resolve(assetJsonPath, file.replace('.json', '.min.json'));
      fs.writeFile(targetFile, jsonminify(data), 'utf8', (err) => {
        if(!err) {
          console.log(clc.green(originFile.replace(projectDir, '.') + ' has been minified to ' + targetFile.replace(projectDir, '.')));
        } else {
           console.log(clc.red(originFile.replace(projectDir, '.')  + ' failed to minify to ' + targetFile.replace(projectDir, '.')));
        }
      });
    });
  });
});
