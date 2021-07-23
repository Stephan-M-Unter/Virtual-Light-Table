/*
    Name:           SaveManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel,
                        Crossing Boundaries project)
    Start-Date:     24/07/19
    Last Change:    24/07/19

    Description:    This manager is supposed to handle all
                    save and load operations on the local
                    disk, e.g. the saving of table configurations
                    and their respective loading.
*/

'use strict';

const {dialog} = require('electron');
const path = require('path');
const fs = require('fs');

/**
 * TODO
 */
class SaveManager {
  /**
     * TODO
     * @param {String} appPath
     */
  constructor(appPath) {
    // this.defaultSaveFolder = './saves';
    this.defaultSaveFolder = __dirname+'/saves/';
    this.tempSaveFolder = __dirname+'/../temp/';
    if (!fs.existsSync(this.tempSaveFolder)) fs.mkdirSync(this.tempSaveFolder);
    console.log('Temp Save Folder:', this.tempSaveFolder);
    this.currentSaveFolder = this.defaultSaveFolder;
    this.filepath = null;
    this.appPath = appPath;
  }

  /**
   * TODO
   * @param {Object} tableConfiguration
   *    Object containing the full data JSON with table and fragments configuration.
   * @param {Boolean} overwrite
   *    TRUE: if there is already a savefile, it will be overwritten
   *    FALSE: the user will be asked for a directory and filename
   * @param {Boolean} autosave
   *    TRUE: table will be saved as temp_save in dedicated place and overwrite pre-existing file
   *    FALSE: regular save, user will potentially be asked for directory and filename
   * @return {String}
   *    String with the filepath of the just saved file.
   */
  saveTable(tableConfiguration, overwrite, autosave) {
    console.log('Autosave?:', autosave);
    let filepath;
    if (autosave) {
      filepath = this.tempSaveFolder + '_temp.vlt';
    } else if (overwrite && this.filepath) {
      filepath = this.filepath;
    } else {
      // read current date for some default filename
      const now = new Date();

      const year = now.getFullYear();
      const month = ((now.getMonth()+1) < 10 ? '0' : '') + (now.getMonth()+1);
      const day = (now.getDate() < 10 ? '0' : '') + now.getDate();
      const hour = now.getHours();
      const minute = (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
      const second = (now.getSeconds() < 10 ? '0' : '') + now.getSeconds();
      const date = year+'-'+month+'-'+day;
      const time = hour+'h'+minute+'m'+second+'s';
      const filename = 'VLT_'+date+'_'+time;


      // create save dialog
      filepath = dialog.showSaveDialogSync({
        title: 'Save Current Table Configuration',
        defaultPath: path.join(__dirname+'/../saves/', filename),
        filters: [{
          name: 'Virtual Light Table Save',
          extensions: ['vlt'],
        }],
      });
      // TODO: man könnte hier auch mit dialog.showSaveDialog
      // arbeiten; die Parameter sind die gleichen, aber der
      // main process würde nicht durch den save dialog blockiert
      // werden. Als Ergebnis gibt es ein promise-Object,
      // das dann vermutlich durch eine callback-Funktion abgefangen
      // werden müssen. Quelle: https://www.electronjs.org/docs/api/dialog
    }


    if (filepath) {
      if (!autosave) this.filepath = filepath;
      // save current status of canvasManager to a .vtl-file

      /*
      // TODO: sämtliche imageURLs der Fragmente konvertieren zu relativen Pfaden von filepath zu Bild
      for (const [key, value] of Object.entries(tableConfiguration.fragments)) {
        const urlRecto = path.resolve(value.rectoURL);
        const urlVerso = path.resolve(value.versoURL);
        const urlRectoRelative = path.relative(filepath, urlRecto);
        const urlVersoRelative = path.relative(filepath, urlVerso);

        // TODO: copy image into imgs subfolder

        tableConfiguration.fragments[key].rectoURL = urlRectoRelative;
        tableConfiguration.fragments[key].versoURL = urlVersoRelative;
      }
      */

      const canvasContent = JSON.stringify(tableConfiguration);
      fs.writeFileSync(filepath, canvasContent, 'utf-8');
      if (autosave) console.log('**SaveManager** - Table autosaved');
      else console.log('**SaveManager** - Saved table configuration to ' + filepath);
      return filepath;
    }
  }

  /**
    * TODO
    * @return {*}
    */
  loadTable() {
    const filepath = dialog.showOpenDialog({
      title: 'Open VLT Configuration',
      filters: [{
        name: 'Virtual Light Table Save',
        extensions: ['vlt'],
      }],
      defaultPath: __dirname+'/..',
      properties: [
        'openFile',
      ],
    });

    if (filepath) {
      this.filepath = filepath;
      const content = fs.readFileSync(filepath[0]).toString();
      console.log('**SaveManager** - Loading ' + filepath);
      return JSON.parse(content);
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getSaveFolder() {
    const filepath = dialog.showOpenDialogSync({
      title: 'Open VLT Configuration',
      /*
      filters: [{
        name: 'Virtual Light Table Save',
        extensions: ['vlt'],
      }],
      * TODO Das macht momentan Probleme - wenn ich den VLT auf Produktivbetrieb
      * stelle, findet er den richtigen "Saves"-Folder nicht mehr, aber solange
      * ich den Filter nur auf vlt-Dateien lasse, kann die NutzerIn nicht mehr
      * frei durch die Ordner traversieren.
      */
      defaultPath: __dirname+'/..',
      properties: [
        'openDirectory',
        'treatPackageAsDirectory',
      ],
    });

    return filepath;
  }

  /**
   * TODO
   * @param {*} folder
   * @param {*} callback
   */
  getSaveFiles(folder, callback) {
    this.currentSaveFolder = folder;
    console.log('Reading folder ' + folder + '.');
    fs.readdir(folder, (err, files) => {
      callback(err, files);
    });
  }

  /**
   * TODO
   * @param {*} filepath
   * @return {*}
   */
  loadSaveFile(filepath) {
    const content = fs.readFileSync(filepath).toString();
    const stats = fs.statSync(filepath);
    const mtime = stats.mtimeMs;
    console.log('**SaveManager** - Loading ' + filepath);
    const json = JSON.parse(content);
    json.mtime = mtime;
    this.filepath = filepath;

    /*
    for (const [key, value] of Object.entries(json.fragments)) {
      const urlRecto = path.resolve(filepath, value.rectoURL);
      const urlVerso = path.resolve(filepath, value.versoURL);
      const urlRectoRelative = path.relative(this.appPath, urlRecto);
      const urlVersoRelative = path.relative(this.appPath, urlVerso);

      console.log(value.rectoURL);
      console.log(filepath);
      console.log(urlRecto);
      console.log(this.appPath);
      console.log(urlRectoRelative);
      console.log('------');

      // TODO: copy image into imgs subfolder

      json.fragments[key].rectoURL = urlRectoRelative;
      json.fragments[key].versoURL = urlVersoRelative;
    }
    */

    return json;
  }

  /**
   * TODO
   * @return {Object}
   */
  loadAutosave() {
    return this.loadSaveFile(this.tempSaveFolder+'_temp.vlt');
  }

  /**
   * TODO
   * @param {*} filepath
   * @param {*} data
   */
  saveSavefile(filepath, data) {
    const json = JSON.stringify(data);
    fs.writeFileSync(filepath, json);
  }

  /**
   * TODO
   * @param {*} filename
   * @return {boolean}
   */
  deleteFile(filename) {
    fs.unlinkSync(path.join(this.currentSaveFolder, filename));
    return true;
  }

  /**
   * TODO
   * @return {*}
   */
  getCurrentFolder() {
    return this.currentSaveFolder;
  }

  /**
   * TODO
   * @return {*}
   */
  getDefaultFolder() {
    return this.defaultSaveFolder;
  }

  /**
   * @return {*}
   */
  getCurrentFilepath() {
    return this.filepath;
  }

  /**
   * TODO
   */
  clear() {
    this.filepath = null;
  }

  /**
   * TODO
   * @return {Boolean}
   */
  checkForAutosave() {
    try {
      if (fs.existsSync(this.tempSaveFolder+'_temp.vlt')) {
        return true;
      }
    } catch (err) {
      console.error(err);
    }
    return false;
  }

  /**
   * TODO
   */
  removeAutosaveFiles() {
    const removeDir = function(path) {
      if (fs.existsSync(path)) {
        const files = fs.readdirSync(path);

        if (files.length > 0) {
          files.forEach(function(filename) {
            if (fs.statSync(path + '/' + filename).isDirectory()) {
              removeDir(path + '/' + filename);
            } else {
              fs.unlinkSync(path + '/' + filename);
            }
          });
        }
      }
    };

    removeDir(this.tempSaveFolder);
  }
}

module.exports = SaveManager;
