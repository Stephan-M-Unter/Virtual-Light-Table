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

      const imagepath = path.dirname(filepath) + '/imgs';
      if (!fs.existsSync(imagepath)) fs.mkdirSync(imagepath);

      for (const fID in tableConfiguration.fragments) {
        if (Object.prototype.hasOwnProperty.call(tableConfigurationy.fragments, fID)) {
          const fragment = tableConfiguration.fragments[fID];
          const rectoImageDir = path.dirname(fragment.rectoURL);
          const rectoImageName = path.basename(fragment.rectoURL);
          const versoImageDir = path.dirname(fragment.versoURL);
          const versoImageName = path.basename(fragment.versoURL);
          const rectoNewPath = path.join(imagepath, rectoImageName);
          const versoNewPath = path.join(imagepath, versoImageName);
          const tempImageFolder = path.resolve(this.tempSaveFolder + '/imgs');

          // is image in save_folder?
          if (path.resolve(rectoImageDir) == path.resolve(imagepath)) {
            // nothing to do, image is already correct
            continue;
          } else {
            // is image in temp folder?
            if (path.resolve(rectoImageDir) == path.resolve(tempImageFolder)) {
              // move image from temp folder to imagepath
              fs.rename(fragment.rectoURL, rectoNewPath, (err) => {});
            } else {
              // image is somewhere else; copy image to imagepath
              fs.copyFile(fragment.rectoURL, rectoNewPath, (err) => {});
            }
            tableConfiguration.fragments[fID].rectoURL = rectoNewPath;
          }

          // is image in save_folder?
          if (path.resolve(versoImageDir) == path.resolve(imagepath)) {
            // nothing to do, image is already correct
            continue;
          } else {
            // is image in temp folder?
            if (path.resolve(versoImageDir) == path.resolve(tempImageFolder)) {
              // move image from temp folder to imagepath
              fs.rename(fragment.versoURL, versoNewPath, (err) => {});
            } else {
              // image is somewhere else; copy image to imagepath
              fs.copyFile(fragment.versoURL, versoNewPath, (err) => {});
            }
            tableConfiguration.fragments[fID].versoURL = versoNewPath;
          }
        }
      }

      let content = this.convertToRelativePaths(filepath, tableConfiguration);
      content = JSON.stringify(content);
      fs.writeFileSync(filepath, content, 'utf-8');
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
    let json = JSON.parse(content);
    json.mtime = mtime;
    this.filepath = filepath;

    json = this.convertToAbsolutePaths(filepath, json);

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

  /**
   * Takes the table configuration object (=data) and converts all image paths from absolute paths to
   * relative paths with a reference to the new savefile.
   * @param {String} reference - Absolute path to the current savefile.
   * @param {Object} tableConfiguration - Table configuration object. The individual fragments are located under
   * data.fragments, each fragment has data.fragment.rectoURL and data.fragment.versoURL.
   * @return {Object} Returns the table configuration object with converted relative image paths.
   */
  convertToRelativePaths(reference, tableConfiguration) {
    const data = JSON.parse(JSON.stringify(tableConfiguration));
    reference = path.dirname(reference);
    for (const fID in data.fragments) {
      if (Object.prototype.hasOwnProperty.call(data.fragments, fID)) {
        const fragment = data.fragments[fID];
        const absoluteRectoURL = fragment.rectoURL;
        const absoluteVersoURL = fragment.versoURL;
        const relativeRectoURL = path.relative(reference, absoluteRectoURL);
        const relativeVersoURL = path.relative(reference, absoluteVersoURL);
        data.fragments[fID].rectoURL = relativeRectoURL;
        data.fragments[fID].versoURL = relativeVersoURL;
      }
    }
    return data;
  }

  /**
   * Takes the table configuration object (=data) and converts all image paths from relative paths
   * (from reference to image) to absolute paths in the given file system.
   * @param {String} reference - Absolute path to the current savefile.
   * @param {*} tableConfiguration - Table configuration object. The individual fragments are located under
   * data.fragments, each fragment has data.fragment.rectoURL and data.fragment.versoURL.
   * @return {Object} Returns the table configuration object with converted absolute image paths.
   */
  convertToAbsolutePaths(reference, tableConfiguration) {
    const data = JSON.parse(JSON.stringify(tableConfiguration));
    reference = path.dirname(reference);
    for (const fID in data.fragments) {
      if (Object.prototype.hasOwnProperty.call(data.fragments, fID)) {
        const fragment = data.fragments[fID];
        const relativeRectoURL = fragment.rectoURL;
        const relativeVersoURL = fragment.versoURL;
        const absoluteRectoURL = path.resolve(reference, relativeRectoURL);
        const absoluteVersoURL = path.resolve(reference, relativeVersoURL);
        data.fragments[fID].rectoURL = absoluteRectoURL;
        data.fragments[fID].versoURL = absoluteVersoURL;
      }
    }
    return data;
  }
}

module.exports = SaveManager;
