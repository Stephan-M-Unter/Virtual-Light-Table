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
     */
  constructor() {
    // this.defaultSaveFolder = './saves';
    this.defaultSaveFolder = __dirname+'/saves';
    this.currentSaveFolder = this.defaultSaveFolder;
    this.filepath = null;
  }

  /**
   * TODO
   * @param {*} tableConfiguration
   */
  saveTable(tableConfiguration) {
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
    const filepath = dialog.showSaveDialogSync({
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

    console.log(filepath);

    if (filepath) {
      // save current status of canvasManager to a .vtl-file
      const canvasContent = JSON.stringify(tableConfiguration);
      fs.writeFileSync(filepath, canvasContent, 'utf-8');
      console.log('**SaveManager** - Saved table configuration to ' + filepath);
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
    return json;
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
  getCurrentFile() {
    return this.filepath;
  }
}

module.exports = SaveManager;
