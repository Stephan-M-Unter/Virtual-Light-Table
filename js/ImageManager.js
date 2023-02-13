/*
    Name:           ImageManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel,
                        Crossing Boundaries project)
    Start-Date:     23/07/19

    Description:    This manager is supposed to handle all image operations,
                    i.e. requesting the images from the internet by a given
                    address, manipulating them (e.g. squeezing them through
                    some neural network) etc.
*/

'use strict';

const {dialog} = require('electron');
const path = require('path');
const fs = require('fs-extra');
const {spawn} = require('child_process');
const {CONFIG} = require('../statics/CONFIG');
const LOGGER = require('../statics/LOGGER');

/**
 * TODO
 */
class ImageManager {
  /**
   * TODO
   */
  constructor() {}

  /**
   * TODO
   * @return {String}
   */
  selectImageFromFilesystem() {
    const filepath = dialog.showOpenDialogSync({
      title: 'Select Image',
      filters: [{
        name: 'Image Files',
        extensions: ['jpg', 'png', 'tif', 'tiff'],
      }],
      properties: ['openFile', 'treatPackageAsDirectory'],
    });
    // TODO: man könnte hier auch mit dialog.showOpenDialog
    // arbeiten; die Parameter sind die gleichen, aber der
    // main process würde nicht durch den open dialog blockiert
    // werden. Als Ergebnis gibt es ein promise-Object, das dann
    // vermutlich durch eine callback-Funktion abgefangen werden
    // müssen. Quelle: https://www.electronjs.org/docs/api/dialog.

    if (filepath) {
      return filepath[0];
    } else {
      return null;
    }
  }

  name() {
    return "ImageManager";
  }

  /* CURRENTLY NOT USED

  requestImage(url){
    https.get('', (resp) => {
      resp.setEncoding('base64');
      let body = 'data:' + resp.headers['content-type'] + ';base64,';
      resp.on('data', (data) => { body += data});
      resp.on('end', () => {
        return body;
        //return res.json({result: body, status: 'success'});
      });
    }).on('error', (e) => {
      console.log(`Got error: ${e.message}`);
    });
  }
  */

  /**
   * 
   * @param {*} filters JS object containing the active filter settings for the currently selected table.
   * @param {*} urls A list containing the URLs for the images to apply filters to.
   * @param {*} tempFolder Folder where temporary files for autosaves and image processing are being stored.
   * @param {*} callback Function to call once the filters have been applied. If no filters are given, this
   *                          is a trivial operation. It is needed, however, for the filter process itself,
   *                          as the execution of the python script is an asynchronous process.
   * 
   * TODO: remove global variables like tempoFolder, pythonCmd, vltFolder
   */
  applyGraphicalFilters(filters, urls, callback) {
    if (filters == null) {
      // no filters set, so we simply return the data
      LOGGER.log('IMAGE', 'Applying graphical filter, no filter set.');
      callback();
    } else {
      LOGGER.log('IMAGE', 'Applying graphical filter.');
      // bundling all filter information for python process and saving it to file
      const filterRequest = {
        'urls': urls,
        'filters': filters,
      };
      const filterJsonPath = path.join(CONFIG.TEMP_FOLDER, 'filters.json');
      const filterJsonContent = JSON.stringify(filterRequest);
      fs.writeFileSync(filterJsonPath, filterJsonContent, 'utf8');
  
      const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'filter_images.py'), CONFIG.VLT_FOLDER, filterJsonPath], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
      python.on('close', function(code) {
        LOGGER.log('IMAGE', `Applying graphical filters finished with code ${code}.`);
        fs.removeSync(filterJsonPath);
        callback();
      });
    }
  }
}

module.exports = ImageManager;
