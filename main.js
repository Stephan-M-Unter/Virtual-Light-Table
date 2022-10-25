/*
    Name:           Virtual Light Table - main.js
    Author:         Stephan M. Unter
    Start Date:     22/07/19

    Description:    This file contains the "server side"
                    of the virtual light table, created within
                    the electron framework. It creates and
                    controls the windows and holds managers
                    for data storage and data processing.
*/

'use strict';

// Loading Requirements
const {app, ipcMain, dialog, shell} = require('electron');
const path = require('path');
const fs = require('fs-extra');
const util = require('util');
const request = require('request');
const process = require('process');
const {spawn} = require('child_process');


const Window = require('./js/Window');
const TableManager = require('./js/TableManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');
const TPOPManager = require('./js/TPOPManager');
const { resolve } = require('path');

// Settings
let devMode = true;
if (process.argv.includes('--test')) {
  devMode = false;
}
const appPath = app.getAppPath();
const appDataPath = app.getPath('appData');
let vltFolder = path.join(appDataPath, 'Virtual Light Table');
let saveFolder = path.join(vltFolder, 'saves');
let tempFolder = path.join(vltFolder, 'temp');
const vltConfigFile = path.join(vltFolder, 'vlt.config');
const pythonFolder = path.join(appPath, 'python-scripts');
app.commandLine.appendSwitch('touch-events', 'enabled');

const logfile = fs.createWriteStream(path.join(vltFolder, 'log.txt'), {flags: 'w'});
const logStdout = process.stdout;
const logStderr = process.stderr;

console.log = function() {
  logfile.write(util.format.apply(null, arguments)+'\n');
  logStdout.write(util.format.apply(null, arguments)+'\n');
};
console.error = function() {
  logfile.write(util.format.apply(null, arguments)+'\n');
  logStderr.write(util.format.apply(null, arguments)+'\n');
};

const out = fs.createWriteStream(path.join(vltFolder, 'out.txt'), {flags: 'w'});
let pythonCmd = 'python3';
let config = {};

// Initialisation
// Managers
const tableManager = new TableManager();
const imageManager = new ImageManager();
let tpopManager;
let saveManager;
// Windows
let mainWindow; // main window containing the light table itself
let loadWindow; // window for loading configurations
let detailWindow; // TODO additional window to show fragment details
// let filterWindow; // TODO additional window to set database filters
let uploadWindow;
let calibrationWindow;
let settingsWindow;
let tpopWindow;


const color = {
  success: 'rgba(0,255,0,0.6)',
  error: 'rgba(255,0,0,0.6)',
};
const activeTables = {
  loading: null,
  uploading: null,
  view: null,
  tpop: null,
};
let autosaveChecked = false;

const loadingQueue = [];

/* ##############################################################
###
###                         MAIN PROCESS
###
############################################################## */

/**
 * TODO
 */
function main() {
  // check if "Virtual Light Table" subfolder exists
  if (!fs.existsSync(vltFolder)) {
    // creating VLT subfolder in appdata
    fs.mkdirSync(vltFolder);
    console.log('Created new VLT folder at ' + vltFolder);
  }

  console.log("appPath:", appPath);
  console.log("appDataPath:", appDataPath);
  console.log("vltFolder:", vltFolder);

  // check if config file exists
  if (!fs.existsSync(vltConfigFile)) {
    // config file doesn't exist - load default values and save to file
    config = loadDefaultConfig();
    saveConfig();
  } else {
    // config file exists - read it
    config = readConfig();
    extendConfig();
  }

  // CHECK FOR PYTHON
  check_python();

  if (!(config.vltFolder)) config.vltFolder = vltFolder;
  saveManager = new SaveManager(config);
  tpopManager = new TPOPManager(vltFolder);

  mainWindow = new Window({
    file: './renderer/index.html',
    type: 'main',
    devMode: devMode,
  });
  mainWindow.maximize(); // fullscreen mode
  if (!devMode) {
    mainWindow.removeMenu();
  }
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (saveManager.checkForAutosave()) {
      sendMessage(mainWindow, 'client-confirm-autosave');
    } else {
      autosaveChecked = true;
      // const data = createNewTable();
      // activeTable.view = data.tableID;
      // sendMessage(mainWindow, 'client-load-model', data);
    }
  });
  mainWindow.on('close', function(event) {
    const choice = dialog.showMessageBoxSync(event.target, {
      type: 'question',
      buttons: ['Yes', 'No'],
      title: 'Confirm',
      message: 'Are you sure you want to quit?',
    });
    if (choice == 1) {
      event.preventDefault();
    } else {
      saveManager.removeAutosaveFiles();
      app.quit();
    }
    // sendMessage(mainWindow, 'client-confirm-quit');
  });
}

app.on('ready', main);
app.on('window-all-closed', () => {
  app.quit();
});

/**
 * TODO
 * @return {String}
 */
function timestamp() {
  const now = new Date();

  const second = now.getSeconds().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  let month = now.getMonth()+1; // zero-based value
  month = month.toString().padStart(2, '0');
  const year = now.getFullYear();
  return '['+day+'/'+month+'/'+year+' '+hour+':'+minute+':'+second+']';
}

/**
 *
 */
function saveConfig() {
  const configJSON = JSON.stringify(config);
  fs.writeFile(vltConfigFile, configJSON, function(err) {
    if (err) {
      console.log('Error while writing config file.');
      console.log(err);
      return false;
    } else {
      console.log('Config File successfully saved.');
    }
  });
  return true;
}

/**
 *
 */
function readConfig() {
  if (!fs.existsSync(vltConfigFile)) return loadDefaultConfig();
  const configJSON = fs.readFileSync(vltConfigFile);
  try {
    const config = JSON.parse(configJSON)
    if (config.vltFolder) {
      vltFolder = config.vltFolder;
      saveFolder = path.join(vltFolder, 'saves');
      tempFolder = path.join(vltFolder, 'temp');
    }
    return config;
  } catch (err) {
    console.log('An error occurred while reading the config file.');
    console.log(err);
    console.log('Loading default configuration.');
    return loadDefaultConfig();
  }
}

/**
 *
 */
function loadDefaultConfig() {
  const newConfig = {};
  newConfig.ppi = 96;
  newConfig.minZoom = 0.1;
  newConfig.maxZoom = 3.0;
  newConfig.stepZoom = 0.1;
  newConfig.vltFolder = vltFolder;
  newConfig.saveFolder = saveFolder;
  newConfig.tempFolder = tempFolder;
  return newConfig;
}

function extendConfig() {
  const defaultConfig = loadDefaultConfig();
  for (const k of Object.keys(defaultConfig)) {
    if (!(k in config)) {
      config[k] = defaultConfig[k];
    }
  }
}

function uploadTpopFragments() {
  if (loadingQueue.length == 0) {
    try {
      uploadWindow.close();
    } catch {}
    // localUploadWindow = null;
    return;
  }
  
  const data = loadingQueue.pop(0);
  const fragmentData = data.fragment;
  activeTables.uploading = data.table;
  const fragment = {
    'x': 0,
    'y': 0,
    'name': fragmentData.name,
    'tpop': fragmentData.id,
    'urlTPOP': fragmentData.urlTPOP,
    'recto': {
      'url': fragmentData.urlRecto,
      'www': true,
    },
    'verso': {
      'url': fragmentData.urlVerso,
      'www': true,
    }
  }

  if (uploadWindow) {
    try {
      uploadWindow.close();
    } catch {}
    // localUploadWindow = null;
  }
  uploadWindow = new Window({
    file: './renderer/upload.html',
    type: 'upload',
    devMode: devMode,
  });
  uploadWindow.maximize();
  uploadWindow.removeMenu();
  uploadWindow.once('ready-to-show', () => {
    uploadWindow.webContents.once('did-finish-load', () => {
      sendMessage(uploadWindow, 'upload-tpop-fragment', fragment);
      uploadWindow.show();
    });
  });

  uploadWindow.on('close', function() {
    uploadWindow = null;
    sendMessage(mainWindow, 'client-stop-loading');
    uploadTpopFragments();
  });

  /*
  const fragment = tableManager.getFragment(data.tableID, data.fragmentID);
  */
}

/**
 * Helper function to feed config settings into the config object and save everything to disk.
 * @param {String} key - Config attribute name.
 * @param {*} value - Config attribute value.
 */
function setConfig(key, value) {
  config[key] = value;
  saveConfig();
}

/**
 * @return {Object}
 */
function createNewTable() {
  const tableID = tableManager.createNewTable();
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  return data;
}

function preprocess_loading_fragments(data) {
  let allProcessed = true;
  const fragments = data.tableData.fragments;
  let fragment;
  let fragmentKey;
  let n_processed = 0;
  const n_total = Object.keys(fragments).length;
  for (const key of Object.keys(fragments)) {
    fragment = fragments[key];
    if (!('processed' in fragment)) {
      allProcessed = false,
      fragmentKey = key;
      break;
    } else {
      n_processed = n_processed + 1;
    }
  }

  if (fragment) {
    const status = {
      name: fragment.name,
      nProcessed: n_processed,
      nTotal: n_total,
    };
    sendMessage(mainWindow, 'client-loading-progress', status);
    
    if (!('recto' in fragment)) fragment.recto = {};
    if (!('verso' in fragment)) fragment.verso = {};
  }

  if (allProcessed) {
    if ('graphicFilters' in data.tableData && data.tableData.graphicFilters) {
      const urls = [];
      for (const k of Object.keys(data.tableData.fragments)) {
        const fragment = data.tableData.fragments[k];
        if ('recto' in fragment) {
          if ('url_view' in fragment.recto && fragment.recto.url_view) urls.push(fragment.recto.url_view);
          else if ('url' in fragment.recto && fragment.recto.url) urls.push(fragment.recto.url);
        }
        if ('verso' in fragment) {
          if ('url_view' in fragment.verso && fragment.verso.url_view) urls.push(fragment.verso.url_view);
          else if ('url' in fragment.verso && fragment.verso.url) urls.push(fragment.verso.url);
        }
      }
      filterImages(data['tableID'], urls);
    } else {
      sendMessage(mainWindow, 'client-load-model', data);
      activeTables.view = data['tableID'];
    }
    return;
  }

  let rectoProcessed = false;
  let versoProcessed = false;

  // if a side contains the "url_view" property, it must already
  // have been processed
  if ('recto' in fragment && 'url_view' in fragment.recto) rectoProcessed = true;
  if ('verso' in fragment && 'url_view' in fragment.verso) versoProcessed = true;

  if (rectoProcessed && versoProcessed) {
    fragment.processed = true;
    data.tableData.fragments[fragmentKey] = fragment;
    preprocess_loading_fragments(data);
    return;
  }

  // now we know that there is cropping to do:
  // maskMode in ['boundingbox', 'polygon', 'automatic']
  // and that there is a fragment side that has not yet been processed

  let python;
  let imageURL;
  let boxPoints;
  let polygonPoints;
  let filename;
  let mirror = false;

  // in the following, we first check if the first side has to be processed; if so,
  // the corresponding python script will be called, and as this is an async process,
  // we need to call the process_fragment method again once this extraction is done.
  // in the second run the second side will be processed (if available) and again
  // we wait for the python script to be finished before re-calling the method. In the third
  // and final run both sides should be processed and therefore the data can be sent to the
  // main window.

  // at least one side must still be to be processed at this point, otherwise the data
  // would already have been sent to the main window

  if (!rectoProcessed) {
    // we are processing the recto side
    if ('recto' in fragment && 'url' in fragment.recto) {
      // recto data available
      imageURL = fragment.recto.url;
      boxPoints = fragment.recto.box;
      polygonPoints = fragment.recto.polygon;
    } else {
      // no recto data available, thus we use the verso data and
      // set the mirror flag to true
      data.recto = {};
      mirror = true;
      imageURL = fragment.verso.url;
      boxPoints = fragment.verso.box;
      polygonPoints = fragment.verso.polygon;
      data.recto.ppi = fragment.verso.ppi;
    }
  } else {
    // we are processing the verso side
    if ('verso' in fragment && 'url' in fragment.verso) {
      // verso data available
      imageURL = fragment.verso.url;
      boxPoints = fragment.verso.box;
      polygonPoints = fragment.verso.polygon;
    } else {
      // no verso data available, thus we use the recto data and
      // set the mirror flag to true
      data.verso = {};
      mirror = true;
      imageURL = fragment.recto.url;
      boxPoints = fragment.recto.box;
      polygonPoints = fragment.recto.polygon;
      data.verso.ppi = fragment.recto.ppi;
    }
  }

  if (mirror) filename = path.basename(imageURL).split('.')[0]+'_mirror.png';
  else filename = path.basename(imageURL).split('.')[0]+'_frag.png';

  if (fragment.maskMode == 'no_mask') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, "no_mask", vltFolder], {stdio: ['ignore', out, out]});
    }
    else python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, "no_mask", vltFolder], {stdio: ['ignore', out, out]});
  } else if (fragment.maskMode == 'boundingbox') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, JSON.stringify(boxPoints), vltFolder], {stdio: ['ignore', out, out]});
    }
    else python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, JSON.stringify(boxPoints), vltFolder], {stdio: ['ignore', out, out]});
  } else if (fragment.maskMode == 'polygon') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, JSON.stringify(polygonPoints), vltFolder], {stdio: ['ignore', out, out]});
    } else {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, JSON.stringify(polygonPoints), vltFolder], {stdio: ['ignore', out, out]});
    }
  } else if (fragment.maskMode == 'automatic') {
    // TODO
  }
  const newURL = path.join(vltFolder, 'temp', 'imgs', filename);
  if (!rectoProcessed) {
    fragment.recto.url_view = newURL;
  } else {
    fragment.verso.url_view = newURL;
  }
  python.on('close', function(code) {
    console.log(`Python finished (code ${code}), restarting...`);
    data.tableData.fragments[fragmentKey] = fragment;
    preprocess_loading_fragments(data);
  });
  // python.stderr.pipe(process.stdout);
  // python.stdout.pipe(process.stdout);
}

function check_python() {
  let python = spawn('python3', [path.join(pythonFolder, 'python_test.py')]);
  python.on('close', function(code) {
    if (code == 9009) {
      console.log(timestamp() + ' Code 9009 - "python3" does not exist, now testing with "python"');
      python = spawn('python', [path.join(pythonFolder, 'python_test.py')]);
      python.on('close', function(code) {
        if (code == 9009) {
          console.log(timestamp() + " Code 9009 - no working version of python found.");
          app.quit();
        } else if (code == 0) {
          console.log(timestamp() + ` [PYTHON] closed with code ${code}`);
          console.log(timestamp() + ' Setting python command to "python"');
          pythonCmd = 'python';
        } else {
          console.log(timestamp() + ` [PYTHON] closed with code ${code}`);
          console.log(timestamp() + ' Command "python" found, but other problem occurred, please resolve.');
          app.quit();
        }
      });
      python.stdout.pipe(process.stdout);
      python.stderr.pipe(process.stderr);
    } else if (code == 0) {
      console.log(`python3 closed with code ${code}`);
      console.log('setting pythonCmd to python3');
      pythonCmd = 'python3';
    } else {
      console.log(`python3 closed with code ${code}`);
      console.log('python3 found, but other problem occurred, please solve');
      app.quit();
    }
  })
  python.stdout.pipe(process.stdout);
  python.stderr.pipe(process.stderr);
}

/**
 *
 * @param {*} data
 * @returns
 */
function preprocess_fragment(data) {
  let rectoProcessed = false;
  let versoProcessed = false;
  
  // if a side contains the "url_view" property, it must already
  // have been processed
  if ('url_view' in data.recto) rectoProcessed = true;
  if ('url_view' in data.verso) versoProcessed = true;

  // IF recto and verso have been processed, send data to mainWindow
  if (rectoProcessed && versoProcessed) {
    filterImage(activeTables.uploading, data);
    return;
  }


  // now we know that there is cropping to do:
  // maskMode in ['boundingbox', 'polygon', 'automatic']
  // and that there is a fragment side that has not yet been processed

  let python;
  let imageURL;
  let boxPoints;
  let polygonPoints;
  let filename;
  let mirror = false;

  // in the following, we first check if the first side has to be processed; if so,
  // the corresponding python script will be called, and as this is an async process,
  // we need to call the process_fragment method again once this extraction is done.
  // in the second run the second side will be processed (if available) and again
  // we wait for the python script to be finished before re-calling the method. In the third
  // and final run both sides should be processed and therefore the data can be sent to the
  // main window.

  // at least one side must still be to be processed at this point, otherwise the data
  // would already have been sent to the main window

  if (!rectoProcessed) {
    // we are processing the recto side
    if ('url' in data.recto) {
      // recto data available
      imageURL = data.recto.url;
      boxPoints = data.recto.box;
      polygonPoints = data.recto.polygon;
    } else {
      // no recto data available, thus we use the verso data and
      // set the mirror flag to true
      mirror = true;
      imageURL = data.verso.url;
      boxPoints = data.verso.box;
      polygonPoints = data.verso.polygon;
      data.recto.ppi = data.verso.ppi;
    }
  } else {
    // we are processing the verso side
    if ('url' in data.verso) {
      // verso data available
      imageURL = data.verso.url;
      boxPoints = data.verso.box;
      polygonPoints = data.verso.polygon;
    } else {
      // no verso data available, thus we use the recto data and
      // set the mirror flag to true
      mirror = true;
      imageURL = data.recto.url;
      boxPoints = data.recto.box;
      polygonPoints = data.recto.polygon;
      data.verso.ppi = data.recto.ppi;
    }
  }

  if (mirror) filename = path.basename(imageURL).split('.')[0]+'_mirror.png';
  else filename = path.basename(imageURL).split('.')[0]+'_frag.png';

  if (data.maskMode == 'no_mask') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, "no_mask", vltFolder], {stdio: ['ignore', out, out]});
    }
    else python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, "no_mask", vltFolder], {stdio: ['ignore', out, out]});
  } else if (data.maskMode == 'boundingbox') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, JSON.stringify(boxPoints), vltFolder]), {stdio: ['ignore', out, out]};
    }
    else python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, JSON.stringify(boxPoints), vltFolder], {stdio: ['ignore', out, out]});
  } else if (data.maskMode == 'polygon') {
    if (mirror) {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'mirror_cut.py'), imageURL, JSON.stringify(polygonPoints), vltFolder], {stdio: ['ignore', out, out]});
    } else {
      python = spawn(pythonCmd, [path.join(pythonFolder, 'cut_image.py'), imageURL, JSON.stringify(polygonPoints), vltFolder], {stdio: ['ignore', out, out]});
    }
  } else if (data.maskMode == 'automatic') {
    // TODO
  }
  const newURL = path.join(vltFolder, 'temp', 'imgs', filename);
  if (!rectoProcessed) {
    data.recto.url_view = newURL;
  } else {
    data.verso.url_view = newURL;
  }
  python.on('close', function(code) {
    console.log(`Python finished (code ${code}), restarting...`);
    preprocess_fragment(data);
  });
  // python.stderr.pipe(process.stdout);
  // python.stdout.pipe(process.stdout);
}

/* ##############################################################
###
###                    MESSAGES (SEND/RECEIVE)
###
############################################################## */

/* SENDING MESSAGES */

/**
 * TODO
 * @param {Window} recipientWindow
 * @param {String} message
 * @param {Object} data
 */
function sendMessage(recipientWindow, message, data=null) {
  if (devMode) {
    console.log(timestamp() +
    ' ' + 'Sending code ['+message+'] to client');
  }
  recipientWindow.send(message, data);
}


/* RECEIVING MESSAGES */

// server-save-to-model | data -> data.tableID, data.tableData, data.skipDoStep
ipcMain.on('server-save-to-model', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-to-model] from client for table '+data.tableID);
  }

  tableManager.updateTable(data.tableID, data.tableData, data.skipDoStep);
  if (Object.keys(data.tableData.fragments).length > 0) {
    // no need to autosave when there are no fragments
    saveManager.saveTable(tableManager.getTable(data.tableID), false, true, data.tableID);
  }

  sendMessage(event.sender, 'client-redo-undo-update', tableManager.getRedoUndo(data.tableID));
});

// server-undo-step
ipcMain.on('server-undo-step', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-undo-step] from client for table '+tableID);
  }
  const isUndone = tableManager.undoStep(tableID);
  if (isUndone) {
    // undo step was successful
    const tableData = tableManager.getTable(tableID);
    tableData['undo'] = true;
    // TODO evtl. zusammenfassen???
    sendMessage(event.sender, 'client-redo-model', tableData);
    sendMessage(event.sender, 'client-redo-undo-update', tableManager.getRedoUndo(tableID));
  }
});

// server-redo-step
ipcMain.on('server-redo-step', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-redo-step] from client for table '+tableID);
  }
  const isRedone = tableManager.redoStep(tableID);
  if (isRedone) {
    // redo step was successful
    const tableData = tableManager.getTable(tableID);
    tableData['undo'] = true;
    // TODO evtl. zusammenfassen???
    sendMessage(event.sender, 'client-redo-model', tableData);
    sendMessage(event.sender, 'client-redo-undo-update', tableManager.getRedoUndo(tableID));
  }
});

// server-clear-table
ipcMain.on('server-clear-table', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-clear-table] from client for table '+tableID);
  }
  tableManager.clearTable(tableID);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  sendMessage(event.sender, 'client-load-model', data);
});

// server-open-details
ipcMain.on('server-open-details', (event, id) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-details] from' +
    'client for fragment with id ' + id);
  }
  detailWindow = new Window({
    file: './renderer/details.html',
    type: 'detail',
    devMode: devMode,
  });
  detailWindow.removeMenu();
  detailWindow.maximize();
  detailWindow.once('ready-to-show', () => {
    detailWindow.show();
  });
});

// server-load-file
ipcMain.on('server-load-file', (event, filename) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-load-file] from loadWindow');
  }
  let tableID = activeTables.loading;
  sendMessage(mainWindow, 'client-start-loading', tableID);
  activeTables.loading = null;
  loadWindow.close();
  const savefolder = saveManager.getCurrentFolder();
  const file = saveManager.loadSaveFile(path.join(savefolder, filename));

  if (!activeTables.view) {
    tableID = tableManager.createNewTable();
    activeTables.view = tableID;
  } else if (tableManager.hasFragments(activeTables.view)) {
    tableID = tableManager.createNewTable();
  }

  tableManager.loadFile(tableID, file);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  data.tableData['loading'] = true;
  data.tableData['filename'] = filename;

  const feedback = {
    title: 'Table Loaded',
    desc: 'Successfully loaded file: \n'+saveManager.getCurrentFilepath(),
    color: color.success,
  };
  // sendMessage(mainWindow, 'client-show-feedback', feedback);

  preprocess_loading_fragments(data);
});

// server-save-file | data -> data.tableID, data.screenshot, data.quicksave, data.editor
ipcMain.on('server-save-file', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-file] from client');
  }
  tableManager.setScreenshot(data.tableID, data.screenshot);

  if (data.quicksave && !data.editor) {
    // non-initial quicksave, only update editor modified time
    tableManager.updateEditor(data.tableID);
  } else {
    // add new editor
    tableManager.addEditor(data.tableID, data.editor);
  }

  let filepath; let response;
  const tableData = tableManager.getTable(data.tableID);
  if (data.quicksave && saveManager.getCurrentFilepath()) {
    // overwrite old file
    filepath = saveManager.saveTable(tableData, true, false);
    response = {
      title: 'Quicksave',
      desc: 'Quicksave successful',
      color: color.success,
    };
  } else {
    // don't overwrite but ask for new file destination
    filepath = saveManager.saveTable(tableData, false, false);
    response = {
      title: 'Save',
      desc: 'Lighttable has successfully been saved',
      color: color.success,
    };
  }
  if (filepath && response) {
    sendMessage(mainWindow, 'client-show-feedback', response);
    const saveData = {
      tableID: data.tableID,
      filename: path.basename(filepath),
    };
    sendMessage(mainWindow, 'client-file-saved', saveData);
  }
});

// server-list-savefiles
ipcMain.on('server-list-savefiles', (event, folder) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Received code [server-list-savefiles] for folder '+folder);
  }

  // if the requested folder uses relative pathing, indicated either by
  // "./" or "../", combine it with the absolute appPath, that is the folder the
  // application runs from
  if (folder.startsWith('.')) {
    folder = path.join(appPath, folder);
  }

  const savefiles = saveManager.getSaveFiles(folder);
  event.sender.send('load-receive-saves', savefiles);
});

// <- server-get-saves-folder
ipcMain.on('server-get-saves-folder', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-get-saves-folder] from client');
  }
  const path = saveManager.getSaveFolder();
  if (path) {
    event.sender.send('load-receive-folder', path[0]);
  }
});

// server-open-load
ipcMain.on('server-open-load', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-load] from client for table '+tableID);
  }

  activeTables.loading = tableID;

  if (loadWindow != null) {
    loadWindow.show();
  } else {
    loadWindow = new Window({
      file: './renderer/load.html',
      type: 'load',
      devMode: devMode,
    });
    loadWindow.removeMenu();
    loadWindow.once('read-to-show', () => {
      loadWindow.show();
    });
    loadWindow.on('close', function() {
      loadWindow = null;
      activeTables.loading = null;
    });
  }
});

// server-export-file
ipcMain.on('server-export-file', (event, filename) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-export-file] with filename '+filename+' from loadWindow');
  }
  saveManager.exportFile(filename);
});

// server-delete-file
ipcMain.on('server-delete-file', (event, filename) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-delete-file] from loadWindow');
  }
  const deleted = saveManager.deleteFile(filename);
  if (deleted) {
    const folder = saveManager.getCurrentFolder();
    const savefiles = saveManager.getSaveFiles(folder);
    event.sender.send('load-receive-saves', savefiles);
  }
});

// server-write-annotation | data -> data.tableID, data.aData
ipcMain.on('server-write-annotation', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-write-annotation] from client for table '+data.tableID);
  }
  tableManager.writeAnnotation(data.tableID, data.annotation);
});

// server-remove-annotation | data -> data.tableID, data.aID
ipcMain.on('server-remove-annotation', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-remove-annotation] from client for table '+data.tableID);
  }
  tableManager.removeAnnotation(data.tableID, data.aID);
});

// server-open-upload
ipcMain.on('server-open-upload', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-upload] from client for table '+tableID);
  }

  activeTables.uploading = tableID;
  
  if (uploadWindow) {
    try {
      uploadWindow.close();
    } catch {};
    uploadWindow = null;
  }

  if (!uploadWindow) {
    uploadWindow = new Window({
      file: './renderer/upload.html',
      type: 'upload',
      devMode: devMode,
    });
    uploadWindow.maximize();
    uploadWindow.removeMenu();
    uploadWindow.once('ready-to-show', () => {
      uploadWindow.show();
    });
    uploadWindow.on('close', function() {
      sendMessage(mainWindow, 'client-stop-loading');
      // localUploadWindow = null;
      // activeTables.uploading = null;
    });
  }
});

// server-upload-ready
ipcMain.on('server-upload-ready', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-ready] from client');
  }

  if (!activeTables.uploading) {
    // if no table is currently associated with the upload, create a new table
    const tableID = tableManager.createNewTable();
    const tableData = tableManager.getTable(tableID);
    activeTables.uploading = tableID;
    const newTableData = {
      tableID: tableID,
      tableData: tableData,
    };
    // tell client to open the newly created table
    sendMessage(mainWindow, 'client-load-model', newTableData);
  }
  
  // activeTables.uploading = null;
  if (uploadWindow) {
    try {
      uploadWindow.close();
    } catch {}
    // localUploadWindow = null;
  }

  sendMessage(mainWindow, 'client-start-loading', activeTables.uploading);

  preprocess_fragment(data);
});

// server-upload-image | triggers a file dialog for the user to select a fragment
// image which will then be displayed in the upload window
ipcMain.on('server-upload-image', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-image] from client');
  }
  const filepath = imageManager.selectImageFromFilesystem();

  if (filepath) {
    const ext = path.extname(filepath);
    const conversionRequired = ['.tiff', '.tif', '.TIFF', '.TIF'];
    if (conversionRequired.includes(ext)) {
      let filename = path.basename(filepath);
      const dotPos = filename.lastIndexOf('.');
      filename = filename.substring(0,dotPos) + '.jpg';
      const newFilepath = path.join(tempFolder, 'imgs', filename);
      const python = spawn(pythonCmd, [path.join(pythonFolder, 'convert_tiff.py'), filepath, newFilepath], {stdio: ['ignore', out, out]});
      python.on('close', function(code) {
        console.log(timestamp() + ` [PYTHON] Converted TIFF to JPG with code ${code}.`);
        sendMessage(uploadWindow, 'upload-receive-image', newFilepath);
      });
    } else {
      sendMessage(uploadWindow, 'upload-receive-image', filepath);
    }
  } else {
    sendMessage(uploadWindow, 'upload-receive-image');
  }
});

// server-quit-table
ipcMain.on('server-quit-table', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-quit-table] from client');
  }
  app.quit();
});

// server-change-fragment | data -> data.tableID, data.fragmentID
ipcMain.on('server-change-fragment', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-change-fragment] from client for table '+data.tableID);
  }

  const fragment = tableManager.getFragment(data.tableID, data.fragmentID);
  if (uploadWindow) {
    try {
      uploadWindow.close();
    } catch {};
  }

  activeTables.uploading = data.tableID;

  uploadWindow = new Window({
    file: './renderer/upload.html',
    type: 'upload',
    devMode: devMode,
  });
  uploadWindow.maximize();
  uploadWindow.removeMenu();
  uploadWindow.once('ready-to-show', () => {
    uploadWindow.show();
    sendMessage(uploadWindow, 'upload-edit-fragment', fragment);
  });
  uploadWindow.on('close', function() {
    sendMessage(mainWindow, 'client-stop-loading');
    // localUploadWindow = null;
    // activeTables.uploading = null;
  });
});

// server-confirm-autosave | confirmation -> Boolean
ipcMain.on('server-confirm-autosave', (event, confirmation) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-confirm-autosave] from client with reply ' + confirmation);
  }
  autosaveChecked = true;
  if (confirmation) {
    let tableID;
    const autosaves = saveManager.loadAutosaves();
    autosaves.forEach((autosave, key, autosaves) => {
      if (Object.keys(autosave).includes('tableID')) {
        tableID = tableManager.createNewTable(autosave.tableID);
      } else {
        tableID = tableManager.createNewTable();
      }
      tableManager.loadFile(tableID, autosave);
      const data = {
        tableID: tableID,
        tableData: tableManager.getTable(tableID),
      };
      sendMessage(mainWindow, 'client-inactive-model', data);
    });
    const data = {
      tableID: tableID,
      tableData: tableManager.getTable(tableID),
    };
    activeTables.view = tableID;
    data.tableData['loading'] = true;
    sendMessage(mainWindow, 'client-load-model', data);
    const feedback = {
      title: 'Table Loaded',
      desc: 'Successfully loaded last autosave',
      color: color.success,
    };
    sendMessage(mainWindow, 'client-show-feedback', feedback);
  } else {
    saveManager.removeAutosaveFiles();
    // const data = createNewTable();
    // activeTables.view = data.tableID;
    // sendMessage(event.sender, 'client-load-model', data);
  }
});

// server-create-table
ipcMain.on('server-create-table', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-create-table] from client');
  }
  if (autosaveChecked) {
    const data = createNewTable();
    activeTables.view = data.tableID;
    sendMessage(event.sender, 'client-load-model', data);
  } else {
    sendMessage(mainWindow, 'client-confirm-autosave');
  }
});

// server-open-table
ipcMain.on('server-open-table', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-table] from client for table '+tableID);
  }
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  activeTables.view = tableID;
  sendMessage(event.sender, 'client-load-model', data);
});

// server-close-table
ipcMain.on('server-close-table', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-close-table] from client for table '+tableID);
  }
  const newTableID = tableManager.removeTable(tableID);
  saveManager.removeAutosave(tableID);
  if (tableID == activeTables.view) {
    const data = {
      tableID: newTableID,
      tableData: tableManager.getTable(newTableID),
    };
    activeTables.view = newTableID;
    sendMessage(event.sender, 'client-load-model', data);
  }
});

// server-send-model
ipcMain.on('server-send-model', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-send-model] from client for table '+tableID);
  }
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  sendMessage(event.sender, 'client-get-model', data);
});

ipcMain.on('server-send-all', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-send-all] from client');
  }
  sendMessage(event.sender, 'client-get-all', tableManager.getTables());
});

ipcMain.on('server-new-session', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-new-session] from client');
  }

  activeTables.view = null;
  activeTables.loading = null;
  activeTables.uploading = null;

  // if no tables are yet created, create a new one
  if (tableManager.getNumberOfTables() == 0) {
    tableManager.createNewTable();
  }

  // checking for all registered tables
  const registeredTables = tableManager.getTableIds();
  const selectedTable = registeredTables.pop();

  registeredTables.forEach((tableID) => {
    const data = {
      tableID: tableID,
      tableData: tableManager.getInactiveTable(tableID),
    };
    sendMessage(event.sender, 'client-inactive-model', data);
  });

  activeTables.view = selectedTable;
  const data = {
    tableID: selectedTable,
    tableData: tableManager.getTable(selectedTable),
  };
  sendMessage(event.sender, 'client-load-model', data);
});

// server-save-screenshot | data -> data.tableID, data.screenshot
ipcMain.on('server-save-screenshot', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-screenshot] from client for table '+data.tableID);
  }
  if (data.tableID && data.screenshot) {
    tableManager.setScreenshot(data.tableID, data.screenshot);
  }
});

ipcMain.on('server-ask-load-folders', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-ask-load-folders] from client');
  }
  event.sender.send('load-set-default-folder', saveManager.getDefaultFolder());
  event.sender.send('load-receive-folder', saveManager.getCurrentFolder());
});

ipcMain.on('server-open-calibration', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-calibration] from client');
  }

  if (calibrationWindow) {
    try {
      calibrationWindow.close();
    } catch {}
    calibrationWindow = null;
  }

  calibrationWindow = new Window({
    file: './renderer/calibration.html',
    type: 'calibration',
    devMode: false,
  });
  calibrationWindow.removeMenu();
  calibrationWindow.once('ready-to-show', () => {
    calibrationWindow.show();
  });
  calibrationWindow.on('close', function() {
    calibrationWindow = null;
  });
});

ipcMain.on('server-open-settings', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-settings] from client');
  }

  if (settingsWindow) {
    try {
      settingsWindow.close();
    } catch {}
    settingsWindow = null;
  }

  settingsWindow = new Window({
    file: './renderer/settings.html',
    type: 'settings',
    devMode: false,
  });
  settingsWindow.removeMenu();
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  })
});

ipcMain.on('server-close-settings', () => {
  settingsWindow.close();
  settingsWindow = null;
});

ipcMain.on('server-settings-opened', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-settings-opened] from client');
  }

  sendMessage(settingsWindow, 'settings-data', config);
});

ipcMain.on('server-gather-ppi', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-gather-ppi] from calibration tool');
  }
  sendMessage(event.sender, 'calibration-set-ppi', config.ppi);
});

ipcMain.on('server-stage-loaded', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' + 'Receiving code [server-stage-loaded] from mainWindow');
  }
  if ('ppi' in config && config.ppi) {
    sendMessage(mainWindow, 'calibration-set-ppi', config.ppi);
  }
  if ('minZoom' in config && config.minZoom
  && 'maxZoom' in config && config.maxZoom
  && 'stepZoom' in config && config.stepZoom) {
    const data = {
      'minZoom': config.minZoom,
      'maxZoom': config.maxZoom,
      'stepZoom': config.stepZoom,
    };
    sendMessage(mainWindow, 'client-set-zoom', data);
  }
});

ipcMain.on('server-calibrate', (event, ppi) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-calibrate] from calibration tool');
  }
  calibrationWindow.close();
  calibrationWindow = null;
  sendMessage(mainWindow, 'calibration-set-ppi', ppi);
  const response = {
    'ppi': ppi,
  };
  sendMessage(settingsWindow, 'settings-data', response);
});

ipcMain.on('server-import-file', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-import-file] from loadWindow');
  }
  saveManager.importFile(() => {
    sendMessage(event.sender, 'load-set-default-folder', saveManager.getDefaultFolder());
    sendMessage(event.sender, 'load-receive-folder', saveManager.getCurrentFolder());
  });
});

// server-open-tpop
ipcMain.on('server-open-tpop', (event, tableID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-tpop] from client for table '+tableID);
  }

  tpopManager.sortByName();
  activeTables.tpop = tableID;

  if (!tpopWindow) {
    tpopWindow = new Window({
      file: './renderer/tpop.html',
      type: 'tpop',
      devMode: devMode,
    });
    tpopWindow.removeMenu();
    tpopWindow.maximize();
    tpopWindow.on('close', function() {
      tpopWindow = null;
      activeTables.tpop = null;
    });
  }
});

// server-load-tpop-json | data -> data.startIndex, data.endIndex
ipcMain.on('server-load-tpop-json', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-load-tpop-json] from TPOP window.');
  }

  let tpopData;

  if (data) {
    tpopData = tpopManager.loadData(data.startIndex, data.endIndex);
  } else {
    tpopData = tpopManager.loadData();
  }
  /*
    1. Check: ist bereits ein TPOP-Json vorhanden?
    2. Check: Kann eine Verbindung zum ME-Server hergestellt werden?
    3. Falls ja: muss das JSON neu heruntergeladen werden?
    4. Übermittlung der Daten an das TPOP-Window
    5. Falls kein JSON vorhanden: Übermittlung dass keine Daten vorhanden
  */

  const activeTPOPs = tableManager.getTPOPIds(activeTables.tpop);
  tpopData.activeTPOPs = activeTPOPs;

  if (tpopData == null) {
    sendMessage(tpopWindow, 'tpop-json-failed');
  } else {
    sendMessage(tpopWindow, 'tpop-json-data', tpopData);
  }
});

ipcMain.on('server-tpop-details', (event, id) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-tpop-details] from TPOP window for ID '+id);
  }
  const details = tpopManager.loadDetails(id);

  sendMessage(tpopWindow, 'tpop-details', details);
});

ipcMain.on('server-tpop-filter', (event, filters) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-tpop-filter] from TPOP window');
  }
  tpopManager.filterData(filters);
  sendMessage(tpopWindow, 'tpop-filtered');
});


ipcMain.on('server-close-tpop', () => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-close-tpop] from TPOP window');
  }
  tpopWindow.close();
  tpopWindow = null;
});

ipcMain.on('server-tpop-position', (event, tpopID) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-tpop-position] from TPOP window for id '+tpopID);
  }
  const pos = tpopManager.getPosition(tpopID);
  const data = {
    tpopID: tpopID,
    pos: pos,
  };
  sendMessage(tpopWindow, 'tpop-position', data);
});

ipcMain.on('server-tpop-basic-info', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-tpop-basic-info] from TPOP window');
  }
  const result = tpopManager.getBasicInfo(data);
  sendMessage(tpopWindow, 'tpop-basic-info', result);
});

ipcMain.on('server-calculate-distances', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-calculate-distances] from TPOP window');
  }
  tpopManager.sortByDistance(data);
  sendMessage(tpopWindow, 'tpop-calculation-done');
});

ipcMain.on('server-reload-json', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-reload-json] from TPOP window');
  }
  tpopManager.initialiseVLTdata(true, () => {
    sendMessage(tpopWindow, 'tpop-calculation-done');
  });
});

ipcMain.on('server-reset-sorting', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-reset-sorting] from TPOP window');
  }
  tpopManager.sortByName();
  sendMessage(tpopWindow, 'tpop-calculation-done');
});

ipcMain.on('server-open-load-folder', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-load-folder] from loadWindow');
  }
  const folder = saveManager.getCurrentFolder();
  shell.openPath(folder);
});

ipcMain.on('server-load-tpop-fragments', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-load-tpop-fragments] from TPOPWindow');
  }
  data = tpopManager.getBasicInfo(data);
  sendMessage(mainWindow, 'client-start-loading', activeTables.tpop);
  
  const tableID = activeTables.tpop;
  tpopWindow.close();
  resolveTPOPUrls(data, tableID);
});

function resolveTPOPUrls(fragments, tableID) {
  let allResolved = true;
  let urlKey;
  let fragmentKey;
  let url;
  let fragment;
  for (const k in fragments) {
    fragment = fragments[k];
    if ('urlRecto' in fragment && fragment.urlRecto && !isURLResolved(fragment.urlRecto)) {
      allResolved = false;
      urlKey = 'urlRecto';
      fragmentKey = k;
      url = fragment.urlRecto;
      break;
    }
    if ('urlVerso' in fragment && fragment.urlVerso && !isURLResolved(fragment.urlVerso)) {
      allResolved = false;
      urlKey = 'urlVerso';
      fragmentKey = k;
      url = fragment.urlVerso;
      break;
    }
  }
  if (allResolved) {
    for (const f of fragments) {
      const entry = {
        'table': tableID,
        'fragment': f,
      };
      loadingQueue.push(entry);
    }
    uploadTpopFragments();
  } else {
    var r = request(url, function(e, response) {
      fragment[urlKey] = r.uri.href;
      fragments[fragmentKey] = fragment;
      resolveTPOPUrls(fragments, tableID);
    });
  }
}

function isURLResolved(url) {
  const formats = ['jpg', 'jpeg', 'png', 'tif', 'tiff'];
  for (const format of formats) {
    if (url.indexOf('.'+format) != -1) return true;
  }
  return false;
}

ipcMain.on('server-display-folders', function(event) {
  const data = tpopManager.getFolders();
  sendMessage(event.sender, 'tpop-display-folders', data);
});

function filterImages(tableID, urls) {
  const filterData = {
    'tableID': tableID,
    'urls': urls,
    'filters': tableManager.getGraphicFilters(tableID),
  };
  const jsonPath = path.join(vltFolder, 'temp', 'filters.json');
  const jsonContent = JSON.stringify(filterData);
  fs.writeFileSync(jsonPath, jsonContent, 'utf8');

  const python = spawn(pythonCmd, [path.join(pythonFolder, 'filter_images.py'), vltFolder, jsonPath], {stdio: ['ignore', out, out]});
  // python.stderr.pipe(process.stdout);
  // python.stdout.pipe(process.stdout);
  python.on('close', function(code) {
    console.log(`Filtering finished with code ${code}.`)
    const response = {
      tableID: tableID,
      tableData: tableManager.getTable(tableID),
    };
    sendMessage(mainWindow, 'client-load-model', response);
    activeTables.view = tableID;
  });
}

function filterImage(tableID, data) {
  const graphicFilters = tableManager.getGraphicFilters(tableID);
  if (graphicFilters == null) {
    sendMessage(mainWindow, 'client-add-upload', data);
  } else {
    const urls = [];

    if ('recto' in data) {
      if ('url_view' in data.recto && data.recto.url_view) urls.push(data.recto.url_view);
      else if ('url' in data.recto && data.recto.url) urls.push(data.recto.url);
    }
    if ('verso' in data) {
      if ('url_view' in data.verso && data.verso.url_view) urls.push(data.verso.url_view);
      else if ('url' in data.verso && data.verso.url) urls.push(data.verso.url);
    }

    const filterData = {
      'tableID': tableID,
      'urls': urls,
      'filters': graphicFilters,
    };
    const jsonPath = path.join(vltFolder, 'temp', 'filters.json');
    const jsonContent = JSON.stringify(filterData);
    fs.writeFileSync(jsonPath, jsonContent, 'utf8');
    const python = spawn(pythonCmd, [path.join(pythonFolder, 'filter_images.py'), vltFolder, jsonPath], {stdio: ['ignore', out, out]});
    // python.stderr.pipe(process.stdout);
    // python.stdout.pipe(process.stdout);
    python.on('close', function(code) {
      console.log(`Filtering finished with code ${code}.`)
      sendMessage(mainWindow, 'client-add-upload', data);
    });
  }
}

ipcMain.on('server-graphics-filter', function(event, data) {
  tableManager.setGraphicFilters(data['tableID'], data.filters);
  filterImages(data.tableID, data.urls);
});

ipcMain.on('server-reset-graphics-filter', function(event, tableID) {
  // remove all filter images
  // resend model to trigger reload
  tableManager.resetGraphicFilters(tableID);
  const response = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  }
  sendMessage(event.sender, 'client-load-model', response);
});

ipcMain.on('server-select-folder', function(event, folderType) {
  const path = saveManager.selectFolder();
  if (path) {
    const response = {};
    response[folderType] = path;
    sendMessage(settingsWindow, 'settings-data', response);
  }
});

ipcMain.on('server-save-config', function(event, newConfig) {
  settingsWindow.close();
  settingsWindow = null;
  config = newConfig;

  const saved = saveConfig();
  if (saved) {
    if ('vltFolder' in config && config.vltFolder && vltFolder != config.vltFolder && fs.existsSync(config.vltFolder)) {
      if (fs.existsSync(path.join(vltFolder, 'saves'))) {
        fs.moveSync(path.join(vltFolder, 'saves'), path.join(config.vltFolder, 'saves'));
      }
      if (fs.existsSync(path.join(vltFolder, 'temp'))) {
        fs.moveSync(path.join(vltFolder, 'temp'), path.join(config.vltFolder, 'temp'));
      }
      if (fs.existsSync(path.join(vltFolder, 'tpop'))) {
        fs.moveSync(path.join(vltFolder, 'tpop'), path.join(config.vltFolder, 'tpop'));
      }

      vltFolder = config.vltFolder;
      saveFolder = path.join(vltFolder, 'saves');
      tempFolder = path.join(vltFolder, 'temp');

      tpopManager.setTpopFolder(path.join(vltFolder, 'tpop'));
      saveManager.setSaveFolder(saveFolder);
      saveManager.setTempFolder(tempFolder);
    }
    if ('minZoom' in config && config.minZoom
    && 'maxZoom' in config && config.maxZoom
    && 'stepZoom' in config && config.stepZoom) {
      const data = {
        'minZoom': config.minZoom,
        'maxZoom': config.maxZoom,
        'stepZoom': config.stepZoom,
      }
      sendMessage(mainWindow, 'client-set-zoom', data);
    }
  }
});

ipcMain.on('server-get-default', function(event, valueType) {
    let defaultValue;
    if (valueType == 'vltFolder') {
      defaultValue = path.join(appDataPath, 'Virtual Light Table');
    }
    if (defaultValue) {
      const response = {};
      response[valueType] = defaultValue;
      sendMessage(settingsWindow, 'settings-data', response);
    }
});

ipcMain.on('console', function(event, data) {
  console.log(data);
});

ipcMain.on('server-select-other-tpops', (event, data) => {
  const imageArray = tpopManager.getImageLinks(data.tpop);
  resolveUrls(imageArray, uploadTpopImages);
});

function resolveUrls(urlList, callback) {
  let workFound = false;
  let url;
  let i;

  for (const index in urlList) {
    url = urlList[index];
    if (url.lastIndexOf('.')+5 < url.length) {
      workFound = true;
      i = index;
      break;
    }
  }

  if (!(workFound)) {
    callback(urlList);
  } else {
    console.log("Processing URL", url);
    var r = request(url, function(e, response) {
      urlList[i] = r.uri.href;
      resolveUrls(urlList, callback);
    });
  }
}

function uploadTpopImages(urlList) {
  sendMessage(uploadWindow, 'upload-tpop-images', urlList);
}
