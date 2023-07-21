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

  /**
   * @param {*} data 
   */
  preprocess_objects(data, statusCallback, finalCallback, failCallback) {
    const objects = data.tableData.fragments;

    // if there are no objects, just return the data as is
    if (objects.length == 0) {
      finalCallback(data);
    }

    let allObjectsProcessed = true;
    let object, objectKey;

    // variables for sending processing status feedback to the mainview
    let nProcessed = 0;
    const nTotal = Object.keys(objects).length;

    // iterate over all fragments in data and search for the next one to process
    for (const objectID of Object.keys(objects)) {
      object = objects[objectID];

      if (!('processed' in object)) {
        // found an object that needs further processing, stopping iteration here
        allObjectsProcessed = false;
        objectKey = objectID;
        break;
      }
      nProcessed = nProcessed + 1; // counting all objects already processed
    }

    const processingStatus = {
      name: object.name,
      nProcessed: nProcessed,
      nTotal: nTotal,
    }
    statusCallback(processingStatus);

    if (allObjectsProcessed) {
      if ('graphicFilters' in data.tableData && data.tableData.graphicFilters) {
        // graphical filters active, so collect all URLs and 
        const urls = [];
        for (const k of Object.keys(data.tableData.fragments)) {
          const objects = data.tableData.fragments[k];
          if ('recto' in objects) {
            if ('url_view' in objects.recto && objects.recto.url_view) urls.push(objects.recto.url_view);
            else if ('url' in objects.recto && objects.recto.url) urls.push(objects.recto.url);
          }
          if ('verso' in objects) {
            if ('url_view' in objects.verso && objects.verso.url_view) urls.push(objects.verso.url_view);
            else if ('url' in objects.verso && objects.verso.url) urls.push(objects.verso.url);
          }
        }
        this.applyGraphicalFilters(data.tableData.graphicFilters, urls, finalCallback);
      } else {
        finalCallback();
      }
      return;
    }

    const successCallback = function(resultingObject) {
      data.tableData.fragments[objectKey] = resultingObject;
      this.preprocess_objects(data, statusCallback, finalCallback);
    }
    
    this.preprocess_object(object, successCallback, failCallback);
  }

  preprocess_object(object, callback, failCallback) {
    const rectoData = this.prepare_object(object.recto, object.maskMode);
    const versoData = this.prepare_object(object.verso, object.maskMode);

    let output_path_1 = null;
    let output_path_2 = null;
    if (rectoData.filename) output_path_1 = path.join(CONFIG.TEMP_FOLDER, 'imgs', rectoData.filename+'.png');
    else output_path_1 = path.join(CONFIG.TEMP_FOLDER, 'imgs', versoData.filename+'_back.png');
    if (versoData.filename) output_path_2 = path.join(CONFIG.TEMP_FOLDER, 'imgs', versoData.filename+'.png');
    else output_path_2 = path.join(CONFIG.TEMP_FOLDER, 'imgs', rectoData.filename+'_back.png');

    // consolidating the necessary information for the python script
    const maskingInstructions = JSON.stringify({
      mask_mode:          object.maskMode,
      path_src_img_1:     rectoData.imageURL,
      vertices_1:         rectoData.vertices,
      auto_mask_1:        null,
      path_src_img_2:     versoData.imageURL,
      vertices_2:         versoData.vertices,
      auto_mask_2:        null,
      output_path_1:      output_path_1,
      output_path_2:      output_path_2,
    });
  
    // writing instructions to file for inter process communication
    const pathMaskingInstructions = path.join(CONFIG.TEMP_FOLDER, 'masking_instructions.json');
    fs.writeFileSync(pathMaskingInstructions, maskingInstructions, 'utf8');

    // running the python script
    const args = [path.join(CONFIG.PYTHON_FOLDER, 'create_image_mask.py'), pathMaskingInstructions];
    const settings = {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]};
    const python = spawn(CONFIG.PYTHON_CMD, args, settings);

    python.on('close', (code) => {
      if (code == 0) {
        LOGGER.log('IMAGE', `Python script "create_image.mask.py" finished with code ${code}. Restarting preprocess_objects()...`);
        fs.removeSync(pathMaskingInstructions);
        object.processed = true;
        object.recto.url_view = maskingInstructions.output_path_1;
        object.verso.url_view = maskingInstructions.output_path_2;
        callback(object);
      } else {
        LOGGER.log('IMAGE',  `Python script "create_image_mask.py" finished with code ${code}. Aborting process.`);
        fs.removeSync(pathMaskingInstructions);
        if (failCallback) {
          failCallback();
        }
      }
    });
  }

  /**
   * Function to determine the necessary data for preprocessing a side based on whether
   * there is information for that side, or it has to be a dummy side (black canvas).
   * @param {*} front 
   * @param {*} back 
   * @param {*} maskMode 
   * @returns 
   */
  prepare_object(side, maskMode) {
    let imageURL = null;
    let filename = null;
    let vertices = null;
    
    if ('url' in side) imageURL = side.url;
    if ((maskMode == 'boundingbox') && ('box' in side)) vertices = side.box;
    else if ((maskMode == 'polygon') && ('polygon' in side)) vertices = side.polygon;

    if (imageURL) {
      const suffix = '_frag';
      filename = path.basename(imageURL).split('.')[0] + suffix;
    }
    
    return {
      imageURL: imageURL,
      vertices: vertices,
      filename: filename,
    }
  }

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
