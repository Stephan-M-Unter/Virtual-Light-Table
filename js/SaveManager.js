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
const JSZip = require('jszip');
const yauzl = require('yauzl');
const LOGGER = require('../statics/LOGGER');
const {CONFIG} = require('../statics/CONFIG');
const mime = require('mime-types');

/**
 * TODO
 */
class SaveManager {
  /**
     * TODO
     * @param {String} vltFolder - Path to the application data directory provided by the operating
     *                           system. If no "Virtual Light Table" subfolder is present, a new one
     *                           will be created.
     */
  constructor() {
    this.currentSaveFolder = CONFIG.SAVES_FOLDER;
    this.filepath = null;
    this.tableFilepaths = {};
  }

  name() {
    return "SaveManager";
  }

  createFilename() {
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
    return filename;
  }

  save(tableData, tableID) {
    const filename = this.createFilename();

    // create save dialog
    const filepath = dialog.showSaveDialogSync({
      title: 'Save Current Table Configuration',
      defaultPath: path.join(this.currentSaveFolder, filename),
      filters: [{
        name: 'Virtual Light Table Save',
        extensions: ['vlt'],
      }],
    });
    this.tableFilepaths[tableID] = filepath;
    return this.saveTable(tableData, filepath);
  }

  quicksave(tableData, tableID) {
    if (!(tableID in this.tableFilepaths) || !fs.existsSync(this.tableFilepaths[tableID])) {
      return this.save(tableData, tableID);
    } else {
      return this.saveTable(tableData, this.tableFilepaths[tableID]);
    }
  }

  autosave(tableData, tableID) {
    const filepath = path.join(CONFIG.TEMP_FOLDER, tableID + '_temp.vlt');
    return this.saveTable(tableData, filepath);
  }

  /**
   * TODO
   * @param {Object} tableData
   *    Object containing the full data JSON with table and fragments configuration.
   * @param {[Boolean]} overwrite
   *    TRUE: if there is already a savefile, it will be overwritten
   *    FALSE: the user will be asked for a directory and filename
   * @param {[Boolean]} autosave
   *    TRUE: table will be saved as temp_save in dedicated place and overwrite pre-existing file
   *    FALSE: regular save, user will potentially be asked for directory and filename
   * @param {[String]} tableID ID of table, e.g. "table_1".
   * @return {String}
   *    String with the filepath of the just saved file.
   */
  saveTable(tableData, filepath, insert_images=false) {
    if (typeof filepath !== 'string') return false;
    const imagepath = path.dirname(filepath) + '/imgs';
    if (!fs.existsSync(imagepath)) fs.mkdirSync(imagepath);

    for (const fID in tableData.fragments) {
      if (Object.prototype.hasOwnProperty.call(tableData.fragments, fID)) {
        const fragment = tableData.fragments[fID];
        const tempImageFolder = path.join(CONFIG.TEMP_FOLDER, 'imgs');

        if ('recto' in fragment) {
          const rectoImageDir = path.dirname(fragment.recto.url);
          const rectoImageName = fragment.recto.url.split('\\').pop().split('/').pop();
          const rectoNewPath = path.join(imagepath, rectoImageName);
          const rectoAlreadyMoved = fs.existsSync(rectoNewPath);

          // is image in save_folder?
          if (path.resolve(rectoImageDir) == path.resolve(imagepath)) {
            // nothing to do, image is already correct
            continue;
          } else if ('www' in fragment.recto && fragment.recto.www) {
            // is image a web file?  in that case, nothing to do
            continue;
          } else {
            if (!rectoAlreadyMoved) {
              // is image in temp folder?
              const rectoOldPath = fragment.recto.url.replace(/\\\\/g, '/').replace(/\\/g, '/');
              if (path.resolve(rectoImageDir) == path.resolve(tempImageFolder)) {
                // move image from temp folder to imagepath
                fs.renameSync(rectoOldPath, rectoNewPath);
              } else {
                // image is somewhere else; copy image to imagepath
                fs.copyFileSync(rectoOldPath, rectoNewPath);
              }
            }
            tableData.fragments[fID].recto.url = rectoNewPath;
          }
        }
        
        if ('verso' in fragment) {
          const versoImageDir = path.dirname(fragment.verso.url);
          const versoImageName = fragment.verso.url.split('\\').pop().split('/').pop();
          const versoNewPath = path.join(imagepath, versoImageName);
          const versoAlreadyMoved = fs.existsSync(versoNewPath);

          // is image in save_folder?
          if (path.resolve(versoImageDir) == path.resolve(imagepath)) {
            // nothing to do, image is already correct
            continue;
          }  else if ('www' in fragment.verso && fragment.verso.www) {
            // is image a web file?  in that case, nothing to do
            continue;
          } else {
            if (!versoAlreadyMoved) {
              // is image in temp folder?
              const versoOldPath = fragment.verso.url.replace(/\\\\/g, '/').replace(/\\/g, '/');
              if (path.resolve(versoImageDir) == path.resolve(tempImageFolder)) {
                // move image from temp folder to imagepath
                fs.renameSync(versoOldPath, versoNewPath);
              } else {
                // image is somewhere else; copy image to imagepath
                fs.copyFileSync(versoOldPath, versoNewPath);
              }
            }
            tableData.fragments[fID].verso.url = versoNewPath;
          }
        }
      }
    }

    let content = this.convertToRelativePaths(filepath, tableData);
    const view_urls = [];
    const autoMasks = [];

    for (const key of Object.keys(content.fragments)) {
      if ('recto' in content.fragments[key] && 'url_view' in content.fragments[key].recto) {
        view_urls.push(content.fragments[key].recto.url_view);
        delete content.fragments[key].recto.url_view;
      }
      if ('verso' in content.fragments[key] && 'url_view' in content.fragments[key].verso) {
        view_urls.push(content.fragments[key].verso.url_view);
        delete content.fragments[key].verso.url_view;
      }


      const maskMode = content.fragments[key].maskMode;
      if (maskMode === 'automatic') {
        if ('recto' in content.fragments[key]) {

          const rectoMaskPath = content.fragments[key].recto.auto.mask;
          if (rectoMaskPath !== null) {
            const rectoMask = this.convertImageToDataURL(content.fragments[key].recto.auto.mask);
            const rectoFilename = path.basename(content.fragments[key].recto.auto.mask);
            autoMasks.push({
              filename: rectoFilename,
              data: rectoMask,
            });
            content.fragments[key].recto.auto.mask = rectoFilename;
            content.fragments[key].recto.auto.cut = null;
          }
        }
        
        if ('verso' in content.fragments[key]) {

          const versoMaskPath = content.fragments[key].verso.auto.mask;
          if (versoMaskPath !== null) {
            const versoMask = this.convertImageToDataURL(content.fragments[key].verso.auto.mask);
            const versoFilename = path.basename(content.fragments[key].verso.auto.mask);
            autoMasks.push({
              filename: versoFilename,
              data: versoMask,
            });
            content.fragments[key].verso.auto.mask = versoFilename;
            content.fragments[key].verso.auto.cut = null;
          }
        }
      }
    }

    content['autoMasks'] = autoMasks;

    if (insert_images) {
      const view_images = this.convertImagesToDataURLs(view_urls);
      content['view_images'] = view_images;
    }
    
    content = JSON.stringify(content, null, 4);
    fs.writeFileSync(filepath, content, 'utf-8');
    LOGGER.log('SAVE MANAGER', '[SaveManager] Saved table configuration to ' + filepath);
    return filepath;
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
      defaultPath: this.currentSaveFolder,
      properties: [
        'openFile',
      ],
    });

    if (filepath) {
      this.filepath = filepath;
      const content = fs.readFileSync(filepath[0]).toString();
      LOGGER.log('SAVE MANAGER', '[SaveManager] Loading ' + filepath);
      return JSON.parse(content);
    }
  }


  selectFolder() {
    const filepath = dialog.showOpenDialogSync({
      title: 'Select Folder',
      properties: [
        'openDirectory',
        'treatPackageAsDirectory',
      ],
    });

    if (filepath && fs.existsSync(filepath[0])) return filepath[0];
    else return null;
  }


  /**
   * TODO
   * @param {String} folder
   * @return {Object}
   */
  getSaveFiles(folder) {
    this.currentSaveFolder = folder;
    LOGGER.log('SAVE MANAGER', 'Reading folder ' + folder);
    const files = fs.readdirSync(folder).filter(function(item) {
      return item.endsWith('.vlt');
    });

    const savefiles = {};

    files.forEach((name) => {
      try {
        savefiles[name] = this.loadSaveFile(folder + '/' + name);
      } catch(error) {}
    });

    this.cleanSavefileImages(folder, savefiles);

    return savefiles;
  }

  /**
   * TODO
   * @param {String} folder - Absolute path to current save folder.
   * @param {Object} savefiles - Object containing all loaded savefiles.
   */
  cleanSavefileImages(folder, savefiles) {
    if (!fs.existsSync(folder+'/imgs')) {
      return;
    }
    const images = fs.readdirSync(folder+'/imgs');

    for (const sID in savefiles) {
      if (Object.prototype.hasOwnProperty.call(savefiles, sID)) {
        const savefile = savefiles[sID];
        for (const fID in savefile.fragments) {
          if (Object.prototype.hasOwnProperty.call(savefile.fragments, fID)) {
            const fragment = savefile.fragments[fID];

            if ('recto' in fragment) {
              const recto = path.resolve(fragment.recto.url).split('\\').pop().split('/').pop();
              while (true) {
                const index = images.indexOf(recto);
                if (index !== -1) {
                  images.splice(index, 1);
                } else {
                  break;
                }
              }
            }
            
            if ('verso' in fragment) {
              const verso = path.resolve(fragment.verso.url).split('\\').pop().split('/').pop();
              while (true) {
                const index = images.indexOf(verso);
                if (index !== -1) {
                  images.splice(index, 1);
                } else {
                  break;
                }
              }
            }
            
          }
        }
      }
    }

    images.forEach((item) => {
      const imageToDelete = path.join(folder, 'imgs', item);
      LOGGER.log('SAVE MANAGER', '[SaveManager] Unlinking item:', imageToDelete);
      fs.unlinkSync(imageToDelete);
    });
  }


  /**
   * TODO
   * @param {*} filepath
   * @return {*}
   */
  loadSaveFile(filepath, tableID) {
    this.tableFilepaths[tableID] = filepath;
    const content = fs.readFileSync(filepath).toString();
    const stats = fs.statSync(filepath);
    const mtime = stats.mtimeMs;
    LOGGER.log('SAVE MANAGER', '[SaveManager] Loading ' + filepath);
    let json = JSON.parse(content);
    json.mtime = mtime;
    this.filepath = filepath;

    json = this.convertToAbsolutePaths(filepath, json);

    for (const aID of Object.keys(json.annots)) {
      json.annots[aID].editable = false;
    }

    return json;
  }

  /**
   * TODO
   * @param {*} filepath
   * @param {*} data
   */
  saveSavefile(filepath, data) {
    const view_urls = [];
    for (const key in data.tableData.fragments) {
      if (('url_view' in data.tableData.fragments[key].recto) && (data.tableData.fragments[key].recto.url_view)) {
        view_urls.push(data.tableData.fragments[key].recto.url_view);
      }
      delete data.tableData.fragments[key].recto.url_view;
      if (('url_view' in data.tableData.fragments[key].verso) && (data.tableData.fragments[key].verso.url_view)) {
        view_urls.push(data.tableData.fragments[key].verso.url_view);
      }
      delete data.tableData.fragments[key].verso.url_view;
    }

    const images = this.convertImagesToDataURLs(view_urls);
    data['images_view'] = images;


    const json = JSON.stringify(data, null, 4);

    fs.writeFileSync(filepath, json);
  }

  convertImagesToDataURLs(filepaths) {
    const images = [];
    for (const filepath of filepaths) {
      if ((filepath === null) || (!fs.existsSync(filepath))) {
        continue;
      }
      const dataURL = this.convertImageToDataURL(filepath);
      images.push(dataURL);
    }
    return images;
  }

  convertImageToDataURL(filepath) {
    if (filepath === null) {
      return;
    }
    const image = fs.readFileSync(filepath);
    const data = image.toString('base64');
    const mimeType = mime.lookup(filepath);
    const dataURL = 'data:' + mimeType + ';base64,' + data;
    return dataURL;
  }

  /**
   * TODO
   * @param {*} filename
   * @return {boolean}
   */
  deleteFile(filename) {
    fs.unlinkSync(path.join(this.currentSaveFolder, filename));
    this.cleanSavefileImages(this.currentSaveFolder, this.getSaveFiles(this.currentSaveFolder));
    return true;
  }

  /**
   * TODO
   * @param {String} filename - Filename of the savefile to export, positioned in the currentSaveFolder
   */
  exportFile(filename) {
    const filepath = path.join(this.currentSaveFolder, filename);
    const images = [];
    const savefile = this.loadSaveFile(filepath);

    // collecting urls for local files
    for (const fID in savefile.fragments) {
      if (Object.prototype.hasOwnProperty.call(savefile.fragments, fID)) {
        const fragment = savefile.fragments[fID];

        if ('recto' in fragment && 'url' in fragment.recto && fragment.recto.url && fragment.recto.url.indexOf('https://') == -1 && fragment.recto.url.indexOf('imgs') != -1) {
          images.push(fragment.recto.url);
        }
        if ('verso' in fragment && 'url' in fragment.verso && fragment.verso.url && fragment.verso.url.indexOf('https://') == -1 && fragment.verso.url.indexOf('imgs') != -1) {
          images.push(fragment.verso.url);
        }
      }
    }

    // creating the new ZIP file
    const zip = new JSZip();

    // creating the filepath for the zip to be saved at
    const dot = filename.lastIndexOf('.');
    const zipname = filename.substring(0,dot)+'.zip';
    // loading data from .vlt-save into zip
    zip.file(filename, fs.createReadStream(filepath));

    // loading local images into zip
    images.forEach((image) => {
      const imagename = path.basename(image);
      zip.file('imgs/'+imagename, fs.createReadStream(image));
    });

    const outputpath = dialog.showSaveDialogSync({
      title: 'Save Export',
      // defaultPath: path.join(__dirname+'/../saves/', filename),
      defaultPath: zipname,
      filters: [{
        name: 'ZIP-Archive',
        extensions: ['zip'],
      }],
    });

    if (outputpath) {
      zip
          .generateNodeStream({type: 'nodebuffer', streamFiles: true})
          .pipe(fs.createWriteStream(outputpath))
          .on('finish', function() {
            LOGGER.log('SAVE MANAGER', outputpath + ' written');
          });
    }
  }

  /**
   * @param {function} callback
   */
  importFile(callback) {
    const filepath = dialog.showOpenDialogSync({
      title: 'Select packed ZIP file containing VLT save(s)',
      filters: [{
        name: 'zip-file',
        extensions: ['zip'],
      }],
      defaultPath: this.currentSaveFolder,
      properties: ['openFile'],
    });

    if (filepath) {
      yauzl.open(filepath[0], {lazyEntries: true}, (err, zipfile) => {
        if (err) {
          LOGGER.err('An error occurred while reading the ZIP file:');
          LOGGER.err(err);
        } else {
          zipfile.readEntry();
          zipfile.on('entry', (entry) => {
            if (/\/$/.test(entry.fileName)) {
              // filename ends with / => directory, read next entry
              zipfile.readEntry();
            } else {
              zipfile.openReadStream(entry, (err, readStream) => {
                if (err) {
                  LOGGER.err('An error occurred with the readStream:');
                  LOGGER.log('SAVE MANAGER', err);
                } else {
                  let destination = path.join(CONFIG.SAVES_FOLDER, entry.fileName);

                  if (fs.existsSync(destination)) {
                    if (destination.endsWith('.vlt')) {
                      destination = destination.split('.').slice(0, -1).join('')+'_copy.vlt';
                      readStream.pipe(fs.createWriteStream(destination));
                      readStream.on('end', () => {
                        zipfile.readEntry();
                      });
                    } else {
                      zipfile.readEntry();
                    }
                  } else {
                    readStream.pipe(fs.createWriteStream(destination));
                    readStream.on('end', () => {
                      zipfile.readEntry();
                    });
                  }
                }
              });
            }
          });
          zipfile.once('end', () => {
            zipfile.close();
            if (typeof callback == 'function') {
              callback();
            }
          });
        }
      });
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getCurrentFolder() {
    return this.currentSaveFolder;
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
    const tempFiles = fs.readdirSync(CONFIG.TEMP_FOLDER);
    let autosaveFound = false;
    if (tempFiles.length > 0) {
      tempFiles.forEach((file) => {
        if (file.includes('_temp.vlt')) {
          autosaveFound = true;
        }
      });
    }
    return autosaveFound;
  }

  /**
   * TODO
   * @return {Object[]}
   */
  loadAutosaves() {
    const tempFiles = fs.readdirSync(CONFIG.TEMP_FOLDER);
    const autosaves = [];
    tempFiles.forEach((file) => {
      if (file.includes('_temp.vlt')) {
        const autosavePath = path.join(CONFIG.TEMP_FOLDER, file);
        const autosave = this.loadSaveFile(autosavePath);
        autosave.tableID = file.slice(0, file.lastIndexOf('_'));
        autosaves.push(autosave);
      }
    });
    return autosaves;
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

    removeDir(CONFIG.TEMP_FOLDER);
  }

  /**
   *
   * @param {*} tableID
   */
  removeAutosave(tableID) {
    if (fs.existsSync(CONFIG.TEMP_FOLDER+tableID+'_temp.vlt')) {
      fs.unlinkSync(CONFIG.TEMP_FOLDER+tableID+'_temp.vlt');
    }
  }

  /**
   * Takes the table configuration object (=data) and converts all image paths from absolute paths to
   * relative paths with a reference to the new savefile.
   * @param {String} reference - Absolute path to the current savefile.
   * @param {Object} tableConfiguration - Table configuration object. The individual fragments are located under
   * data.fragments, each fragment has data.fragment.recto.url and data.fragment.verso.url.
   * @return {Object} Returns the table configuration object with converted relative image paths.
   */
  convertToRelativePaths(reference, tableConfiguration) {
    const data = JSON.parse(JSON.stringify(tableConfiguration));
    reference = path.dirname(reference);
    for (const fID in data.fragments) {
      if (Object.prototype.hasOwnProperty.call(data.fragments, fID)) {
        const fragment = data.fragments[fID];

        if ('recto' in fragment && !fragment.recto.www) {
          const absoluteRectoURL = fragment.recto.url;
          const relativeRectoURL = path.relative(reference, absoluteRectoURL);
          data.fragments[fID].recto.url = relativeRectoURL;
        }
        
        if ('verso' in fragment && !fragment.verso.www) {
          const absoluteVersoURL = fragment.verso.url;
          const relativeVersoURL = path.relative(reference, absoluteVersoURL);
          data.fragments[fID].verso.url = relativeVersoURL;
        }
      }
    }
    return data;
  }

  /**
   * Takes the table configuration object (=data) and converts all image paths from relative paths
   * (from reference to image) to absolute paths in the given file system.
   * @param {String} reference - Absolute path to the current savefile.
   * @param {*} tableConfiguration - Table configuration object. The individual fragments are located under
   * data.fragments, each fragment has data.fragment.recto.url and data.fragment.verso.url.
   * @return {Object} Returns the table configuration object with converted absolute image paths.
   */
  convertToAbsolutePaths(reference, tableConfiguration) {
    const data = JSON.parse(JSON.stringify(tableConfiguration));
    reference = path.dirname(reference);
    for (const fID in data.fragments) {
      if (Object.prototype.hasOwnProperty.call(data.fragments, fID)) {
        const fragment = data.fragments[fID];
        if ('recto' in fragment && !fragment.recto.www) {
          const relativeRectoURL = fragment.recto.url;
          const absoluteRectoURL = path.resolve(reference, relativeRectoURL);
          data.fragments[fID].recto.url = absoluteRectoURL;
        }

        if ('verso' in fragment && !fragment.verso.www) {
          const relativeVersoURL = fragment.verso.url;
          const absoluteVersoURL = path.resolve(reference, relativeVersoURL);
          data.fragments[fID].verso.url = absoluteVersoURL;
        }
          
      }
    }
    return data;
  }
}

module.exports = SaveManager;
