const clc = require('cli-color');
const fs = require('fs');
const path = require('path');
const projectDir =  fs.realpathSync(__dirname + '/../');
const glob = require("glob")

console.log(clc.blue('Rebuilding service worker...'));
fs.readFile(path.resolve(projectDir + '/data/config/', 'settings.json'), 'utf8', (err, settingsStr) => {
  const settings = JSON.parse(settingsStr);
  const appVersion = settings.settings.appVersion;

  fs.readFile(path.resolve(projectDir, 'sw.js.dist'), 'utf8', (err, swDistStr) => {
    const swFile = path.resolve(projectDir, 'sw.js');
    const assetsDir = path.resolve(projectDir, 'assets');
    let swDistStrTarget = swDistStr.replace('%APP_VERSION%', appVersion).replace('%APP_BUILD_DATE%', (new Date()).toISOString());
    let assetsStr = '';

    glob('**/*.{png,twig}', {cwd : assetsDir}, function (er, files) {
      files.forEach(file => {
        assetsStr += "  'assets/" + file + "',\n";
      });
      swDistStrTarget = swDistStrTarget.replace('%APP_ASSETS%', assetsStr.trimEnd());
      fs.writeFile(swFile, swDistStrTarget, 'utf8', (err) => {
        if(!err) {
          console.log(clc.green('Service worker has been updated to v' + appVersion));
        } else {
          console.log(clc.red('Service worker failed to get updated: ' + err));
        }
      });
    });
  });
});
