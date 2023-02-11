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
const request = require('request');
const process = require('process');
const {spawn} = require('child_process');
const CSC = require('./statics/CRIME_SCENE_CLEANER');

const Window = require('./js/Window');
const TableManager = require('./js/TableManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');
const TPOPManager = require('./js/TPOPManager');
const MLManager = require('./js/MLManager');
const ConfigManager = require('./js/ConfigManager');
const {CONFIG} = require('./statics/CONFIG');
const LOGGER = require('./statics/LOGGER');

// Settings
let devMode = false;
let tpopEnabled = true;
if (process.argv.includes('--dev')) {
  devMode = true;
}
const version = 'v0.5';
const appPath = app.getAppPath();
const appDataPath = app.getPath('appData');
LOGGER.start(appPath, version);
CONFIG.set_app_path(appPath);
CONFIG.set_vlt_folder(path.join(appDataPath, 'Virtual Light Table'));
const vltConfigFile = path.join(CONFIG.VLT_FOLDER, 'vlt.config');
CONFIG.set_python_folder(path.join(appPath, 'python-scripts'));
app.commandLine.appendSwitch('touch-events', 'enabled');

let online = true;
let config = {};

// Initialisation
// Managers
const tableManager = new TableManager();
const imageManager = new ImageManager();
let mlManager;
let tpopManager;
let saveManager;
let configManager;

// Views
let startupWindow;
let mainWindow; // main window containing the light table itself
let loadWindow; // window for loading configurations
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
let app_is_quitting = false;

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
  startupWindow = new Window({
    file: './renderer/start.html',
    type: 'start',
    devMode: devMode,
  });

  startupWindow.once('ready-to-show', () => {
    startUp();
    setTimeout(() => {
      createMainView();
    }, 2000);
  });
}

app.on('ready', main);
app.on('window-all-closed', () => {
  app.quit();
});

function startUp() {
  sendMessage(startupWindow, 'startup-status', 'Removing Legacy Files...');
  CSC.removeLegacies();
  sendMessage(startupWindow, 'startup-status', 'Preparing Folders...');
  createFolders();
  sendMessage(startupWindow, 'startup-status', 'Installing Managers...');
  createManagers();
  sendMessage(startupWindow, 'startup-status', 'Checking Python and Tensorflow...');
  check_requirements();
  sendMessage(startupWindow, 'startup-status', 'Preparation Finished, Ready to Go!');
}

function createFolders() {
  
  // check if "Virtual Light Table" subfolder exists
  if (!fs.existsSync(CONFIG.VLT_FOLDER)) {
    // creating VLT subfolder in appdata
    fs.mkdirSync(CONFIG.VLT_FOLDER);
    LOGGER.log('SERVER', 'Created new VLT folder at ' + CONFIG.VLT_FOLDER);
  }

  // check if the "External Content" subfolder exists
  if (!fs.existsSync(CONFIG.EXTERNAL_FOLDER)) {
    fs.mkdirSync(CONFIG.EXTERNAL_FOLDER);
    LOGGER.log('SERVER', 'Created new folder for external content at ' + CONFIG.EXTERNAL_FOLDER);
  }
}

function createManagers() {
  configManager = new ConfigManager(vltConfigFile);
  saveManager = new SaveManager();
  tpopManager = new TPOPManager();
  mlManager = new MLManager();
}

/**
 * Function to create the main view, the central view of the VLT, including important parameters for the window
 * itself, functions to close the VLT, and some overridings for the Browserwindow behaviour.
 * 
 * @return {void}
 */
function createMainView() {
  mainWindow = new Window({
    file: './renderer/index.html',
    type: 'main',
    devMode: devMode,
  });

  // Overriding some default properties for BrowserWindows opened in the MainView
  // BrowserWindows: extra windows, opened when clicking a "target='_blank'" <a></a>.
  // frame: without setting this to TRUE, some devices show a frameless browser window that cannot be closed
  // height: set to a rather high value to display as much as possible; at least on
  //    windows, this value is capped by the factual height of the screen
  mainWindow.webContents.setWindowOpenHandler(({url}) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        frame: true,
        width: 1500,
        height: 2000,
      }
    };
  });

  mainWindow.maximize();
  if (!devMode) {
    mainWindow.removeMenu();
  }
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    startupWindow.close();
    if (saveManager.checkForAutosave()) {
      sendMessage(mainWindow, 'client-confirm-autosave');
    } else {
      autosaveChecked = true;
    }
  });
  mainWindow.on('close', function(event) {
    if (app_is_quitting) {
      app.quit();
    } else {
      // confirmation dialog, asking the user to confirm they want to quit the app
      const choice = dialog.showMessageBoxSync(event.target, {
        type: 'question',
        buttons: ['Yes', 'No'],
        title: 'Confirm',
        message: 'Are you sure you want to quit?',
      });
      if (choice == 1) {
        // NO, user doesn't want to quit
        event.preventDefault();
      } else {
        // YES, user wants to quit
        app_is_quitting = true; // needed to prevent double check
        LOGGER.log('SERVER', 'Quitting Virtual Light Table...');
        saveManager.removeAutosaveFiles();
        app.quit();
      }
    }
  });
}


function uploadTpopFragments() {
  if (loadingQueue.length == 0) {
    try {
      uploadWindow.close();
    } catch {}
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
      allProcessed = false;
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
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  } else if (fragment.maskMode == 'boundingbox') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, JSON.stringify(boxPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, JSON.stringify(boxPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  } else if (fragment.maskMode == 'polygon') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, JSON.stringify(polygonPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    } else {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, JSON.stringify(polygonPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
  } else if (fragment.maskMode == 'automatic') {
    // TODO
  }
  const newURL = path.join(CONFIG.TEMP_FOLDER, 'imgs', filename);
  if (!rectoProcessed) {
    fragment.recto.url_view = newURL;
  } else {
    fragment.verso.url_view = newURL;
  }
  python.on('close', function(code) {
    LOGGER.log('SERVER', `Python script finished (code ${code}), restarting...`);
    data.tableData.fragments[fragmentKey] = fragment;
    preprocess_loading_fragments(data);
  });
}

function check_requirements() {
  let python = spawn('python3', [path.join(CONFIG.PYTHON_FOLDER, 'python_test.py')], {detached: false});
  python.stdout.pipe(process.stdout);
  python.stderr.pipe(process.stderr);
  // STEP 1 - CHECK FOR PYTHON3 AS PYTHON COMMAND
  python.on('close', function(code) {
    if (code == 0) {
      // SET PYTHONCMD TO PYTHON3
      LOGGER.log('SERVER', `python3 closed with code ${code}`);
      LOGGER.log('SERVER', 'setting python command to "python3"');
      CONFIG.set_python_command('python3');
      mlManager.checkForTensorflow();
    } else {
      LOGGER.log('SERVER', `[PYTHON] closed with code ${code}`);
      if (code == 9009) LOGGER.log('SERVER', '"python3" was not found, now testing with command "python"');
      else LOGGER.log('SERVER', '"python3" was found, but another problem stopped it from working. Now testing with command "python".');
      // STEP 2 - CHECK FOR PYTHON AS PYTHON COMMAND
      python = spawn('python', [path.join(CONFIG.PYTHON_FOLDER, 'python_test.py')], {detached: false});
      python.stdout.pipe(process.stdout);
      python.stderr.pipe(process.stderr);
      python.on('close', function(code) {
        if (code == 0) {
          // SET PYTHONCMD TO PYTHON
          LOGGER.log('SERVER', `[PYTHON] closed with code ${code}`);
          LOGGER.log('SERVER', 'Setting python command to "python"');
          CONFIG.set_python_command('python');
          mlManager.checkForTensorflow();
        } else {
          // ABORT - PYTHON3 AND PYTHON NOT AVAILABLE
          LOGGER.log('SERVER', `[PYTHON] closed with code ${code}`);
          if (code == 9009) LOGGER.err('SERVER', "Code 9009 - no working version of python found.");
          else LOGGER.err('SERVER', "Python was found, but another problem stops the installation from running.");
          app.quit();
        }
      });
    }
  }
)}

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
    const urls = [];
    if ('recto' in data) {
      if ('url_view' in data.recto && data.recto.url_view) urls.push(data.recto.url_view);
      else if ('url' in data.recto && data.recto.url) urls.push(data.recto.url);
    }
    if ('verso' in data) {
      if ('url_view' in data.verso && data.verso.url_view) urls.push(data.verso.url_view);
      else if ('url' in data.verso && data.verso.url) urls.push(data.verso.url);
    }
    // filterImage(activeTables.uploading, data);
    const filters = tableManager.getGraphicFilters(activeTables.uploading);
    imageManager.applyGraphicalFilters(filters, urls, function() {
      sendMessage(mainWindow, 'client-add-upload', data);
    });
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
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  } else if (data.maskMode == 'boundingbox') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, JSON.stringify(boxPoints), CONFIG.VLT_FOLDER]), {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]};
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, JSON.stringify(boxPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  } else if (data.maskMode == 'polygon') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, JSON.stringify(polygonPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    } else {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, JSON.stringify(polygonPoints), CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
  } else if (data.maskMode == 'automatic') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), imageURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  }
  const newURL = path.join(CONFIG.TEMP_FOLDER, 'imgs', filename);
  if (!rectoProcessed) {
    data.recto.url_view = newURL;
  } else {
    data.verso.url_view = newURL;
  }
  python.on('close', function(code) {
    LOGGER.log('SERVER', `Python script finished (code ${code}), restarting...`);
    preprocess_fragment(data);
  });
}

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
    const r = request(url, function(e, response) {
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

function filterImages(tableID, urls) {
  const filterData = {
    'tableID': tableID,
    'urls': urls,
    'filters': tableManager.getGraphicFilters(tableID),
  };
  const jsonPath = path.join(CONFIG.VLT_FOLDER, 'temp', 'filters.json');
  const jsonContent = JSON.stringify(filterData);
  fs.writeFileSync(jsonPath, jsonContent, 'utf8');

  const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'filter_images.py'), CONFIG.VLT_FOLDER, jsonPath], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
  python.on('close', function(code) {
    LOGGER.log('SERVER', `Python script finished graphical filtering with code ${code}.`)
    const response = {
      tableID: tableID,
      tableData: tableManager.getTable(tableID),
    };
    sendMessage(mainWindow, 'client-load-model', response);
    activeTables.view = tableID;
  });
}

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
    const r = request(url, function(e, response) {
      urlList[i] = r.uri.href;
      resolveUrls(urlList, callback);
    });
  }
}

function uploadTpopImages(urlList) {
  sendMessage(uploadWindow, 'upload-tpop-images', urlList);
}

/* ##############################################################
#################################################################
#################################################################
#################################################################
#################################################################
###
###                    MESSAGES (SEND/RECEIVE)
###
#################################################################
#################################################################
#################################################################
#################################################################
############################################################## */

/* SENDING MESSAGES */

/**
 * TODO
 * @param {Window} recipientWindow
 * @param {String} message
 * @param {Object} data
 */
function sendMessage(recipientWindow, message, data=null) {
  LOGGER.send('SERVER', message);
  recipientWindow.send(message, data);
}


/* RECEIVING MESSAGES */

// server-save-to-model | data -> data.tableID, data.tableData, data.skipDoStep
ipcMain.on('server-save-to-model', (event, data) => {
  LOGGER.receive('SERVER', 'server-save-to-model');

  tableManager.updateTable(data.tableID, data.tableData, data.skipDoStep);
  if (Object.keys(data.tableData.fragments).length > 0) {
    // no need to autosave when there are no fragments
    saveManager.autosave(tableManager.getTable(data.tableID), data.tableID);
  }

  sendMessage(event.sender, 'client-redo-undo-update', tableManager.getRedoUndo(data.tableID));
});

// server-undo-step
ipcMain.on('server-undo-step', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-undo-step');
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
  LOGGER.receive('SERVER', 'server-redo-step');
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
  LOGGER.receive('SERVER', 'server-clear-table');
  tableManager.clearTable(tableID);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  sendMessage(event.sender, 'client-load-model', data);
});

// server-load-file
ipcMain.on('server-load-file', (event, filename) => {
  LOGGER.receive('SERVER', 'server-load-file', filename);
  let tableID = activeTables.loading;
  sendMessage(mainWindow, 'client-start-loading', tableID);
  activeTables.loading = null;
  loadWindow.close();
  filename = path.join(saveManager.getCurrentFolder(), filename);
  const file = saveManager.loadSaveFile(filename, tableID);

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

  preprocess_loading_fragments(data);
});

// server-save-file | data -> data.tableID, data.screenshot, data.quicksave, data.editor
ipcMain.on('server-save-file', (event, data) => {
  LOGGER.receive('SERVER', 'server-save-file');
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
  if (data.quicksave) {
    // overwrite old file
    filepath = saveManager.quicksave(tableData, data.tableID);
    response = {
      title: 'Quicksave',
      desc: 'Quicksave successful',
      color: color.success,
    };
  } else {
    // don't overwrite but ask for new file destination
    filepath = saveManager.save(tableData);
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
  LOGGER.receive('SERVER', 'server-list-savefiles');

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
  LOGGER.receive('SERVER', 'server-get-saves-folder');
    event.sender.send('load-receive-folder', CONFIG.SAVES_FOLDER);
});

// server-open-load
ipcMain.on('server-open-load', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-open-load');

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
  LOGGER.receive('SERVER', 'server-export-file');
  saveManager.exportFile(filename);
});

// server-delete-file
ipcMain.on('server-delete-file', (event, filename) => {
  LOGGER.receive('SERVER', 'server-delete-file');
  const deleted = saveManager.deleteFile(filename);
  if (deleted) {
    const folder = saveManager.getCurrentFolder();
    const savefiles = saveManager.getSaveFiles(folder);
    event.sender.send('load-receive-saves', savefiles);
  }
});

// server-write-annotation | data -> data.tableID, data.aData
ipcMain.on('server-write-annotation', (event, data) => {
  LOGGER.receive('SERVER', 'server-write-annotation');
  tableManager.writeAnnotation(data.tableID, data.annotation);
});

// server-remove-annotation | data -> data.tableID, data.aID
ipcMain.on('server-remove-annotation', (event, data) => {
  LOGGER.receive('SERVER', 'server-remove-annotation');
  tableManager.removeAnnotation(data.tableID, data.aID);
});

// server-open-upload
ipcMain.on('server-open-upload', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-open-upload');
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
    });
  }
});

// server-upload-ready
ipcMain.on('server-upload-ready', (event, data) => {
  LOGGER.receive('SERVER', 'server-upload-ready');

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
  
  if (uploadWindow) {
    try {
      uploadWindow.close();
    } catch {}
  }

  sendMessage(mainWindow, 'client-start-loading', activeTables.uploading);

  preprocess_fragment(data);
});

// server-upload-image | triggers a file dialog for the user to select a fragment
// image which will then be displayed in the upload window
ipcMain.on('server-upload-image', (event) => {
  LOGGER.receive('SERVER', 'server-upload-image');
  const filepath = imageManager.selectImageFromFilesystem();

  if (filepath) {
    const ext = path.extname(filepath);
    const conversionRequired = ['.tiff', '.tif', '.TIFF', '.TIF'];
    if (conversionRequired.includes(ext)) {
      let filename = path.basename(filepath);
      const dotPos = filename.lastIndexOf('.');
      filename = filename.substring(0,dotPos) + '.jpg';
      const newFilepath = path.join(CONFIG.TEMP_FOLDER, 'imgs', filename);
      const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'convert_tiff.py'), filepath, newFilepath], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
      python.on('close', function(code) {
        LOGGER.log('SERVER', `[PYTHON] Converted TIFF to JPG, closing with code ${code}.`);
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
  LOGGER.receive('SERVER', 'server-quit-table');
  app.quit();
});

// server-change-fragment | data -> data.tableID, data.fragmentID
ipcMain.on('server-change-fragment', (event, data) => {
  LOGGER.receive('SERVER', 'server-change-fragment');

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
  });
});

// server-confirm-autosave | confirmation -> Boolean
ipcMain.on('server-confirm-autosave', (event, confirmation) => {
  LOGGER.receive('SERVER', 'server-confirm-autosave', confirmation);
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
  }
});

// server-create-table
ipcMain.on('server-create-table', (event) => {
  LOGGER.receive('SERVER', 'server-create-table');
  if (autosaveChecked) {
    const newTableID = tableManager.createNewTable();
    const data = {
      tableID: newTableID,
      tableData: tableManager.getTable(newTableID),
    }
    activeTables.view = newTableID;
    sendMessage(event.sender, 'client-load-model', data);
  } else {
    sendMessage(mainWindow, 'client-confirm-autosave');
  }
});

// server-open-table
ipcMain.on('server-open-table', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-open-table', tableID);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  activeTables.view = tableID;
  sendMessage(event.sender, 'client-load-model', data);
});

// server-close-table
ipcMain.on('server-close-table', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-close-table', tableID);
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
  LOGGER.receive('SERVER', 'server-send-model', tableID);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  sendMessage(event.sender, 'client-get-model', data);
});

ipcMain.on('server-send-all', (event) => {
  LOGGER.receive('SERVER', 'server-send-all');
  if (devMode) {
    sendMessage(event.sender, 'client-get-all', tableManager.getTables());
  }
});

ipcMain.on('server-new-session', (event) => {
  LOGGER.receive('SERVER', 'server-new-session');
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

  if (saveManager.checkForAutosave()) {
    sendMessage(mainWindow, 'client-confirm-autosave');
  } else {
    autosaveChecked = true;
  }
});

// server-save-screenshot | data -> data.tableID, data.screenshot
ipcMain.on('server-save-screenshot', (event, data) => {
  LOGGER.receive('SERVER', 'server-save-screenshot');
  if (data.tableID && data.screenshot) {
    tableManager.setScreenshot(data.tableID, data.screenshot);
  }
});

ipcMain.on('server-ask-load-folders', (event) => {
  LOGGER.receive('SERVER', 'server-ask-load-folders');
  sendMessage(event.sender, 'load-set-default-folder', CONFIG.SAVES_FOLDER);
  sendMessage(event.sender, 'load-receive-folder', saveManager.getCurrentFolder());
});

ipcMain.on('server-open-calibration', (event) => {
  LOGGER.receive('SERVER', 'server-open-calibration');

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
  LOGGER.receive('SERVER', 'server-open-settings');

  if (settingsWindow) {
    try {
      settingsWindow.close();
    } catch {}
    settingsWindow = null;
  }

  settingsWindow = new Window({
    file: './renderer/settings.html',
    type: 'settings',
    devMode: devMode,
  });
  settingsWindow.webContents.setWindowOpenHandler(({url}) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        frame: true,
        width: 1000,
        height: 2000,
      }
    };
  });
  settingsWindow.removeMenu();
  settingsWindow.once('ready-to-show', () => {
    settingsWindow.show();
  })
});

ipcMain.on('server-close-settings', () => {
  LOGGER.receive('SERVER', 'server-close-settings');
  settingsWindow.close();
  settingsWindow = null;
});

ipcMain.on('server-settings-opened', (event) => {
  LOGGER.receive('SERVER', 'server-settings-opened');
  sendMessage(settingsWindow, 'settings-data', configManager.getConfig());
  mlManager.checkForTensorflow(function(tensorflowAvailable) {
    sendMessage(settingsWindow, 'tensorflow-installed', tensorflowAvailable);
  });
});

ipcMain.on('server-gather-ppi', (event) => {
  LOGGER.receive('SERVER', 'server-gather-ppi');
  sendMessage(event.sender, 'calibration-set-ppi', config.ppi);
});

ipcMain.on('server-stage-loaded', (event) => {
  LOGGER.receive('SERVER', 'server-stage-loaded');
  const config = configManager.getConfig();
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
  LOGGER.receive('SERVER', 'server-calibrate', ppi);
  calibrationWindow.close();
  calibrationWindow = null;
  sendMessage(mainWindow, 'calibration-set-ppi', ppi);
  const response = {
    'ppi': ppi,
  };
  sendMessage(settingsWindow, 'settings-data', response);
});

ipcMain.on('server-import-file', (event) => {
  LOGGER.receive('SERVER', 'server-import-file');
  saveManager.importFile(() => {
    sendMessage(event.sender, 'load-set-default-folder', saveManager.CONFIG.SAVES_FOLDER);
    sendMessage(event.sender, 'load-receive-folder', saveManager.getCurrentFolder());
  });
});

// server-open-tpop
ipcMain.on('server-open-tpop', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-open-tpop', tableID);

  if (!tpopEnabled) {
    const feedback = {
      title: 'TPOP not available',
      desc: 'The TPOP feature has not been enabled for your VLT version. Due to legal issues, the internal TPOP information will be available as soon as the database entries are published.',
      color: color.error,
    }
    sendMessage(mainWindow, 'client-show-feedback', feedback);
  } else {
    activeTables.tpop = tableID;
  
    if (!tpopWindow) {
      tpopWindow = new Window({
        file: './renderer/tpop.html',
        type: 'tpop',
        devMode: devMode,
      });
      tpopWindow.webContents.setWindowOpenHandler(({url}) => {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            frame: true,
            width: 1500,
            height: 2000,
          }
        };
      });
      tpopWindow.removeMenu();
      tpopWindow.maximize();
      tpopWindow.on('close', function() {
        tpopWindow = null;
        activeTables.tpop = null;
      });
    }
  }
});

// server-load-tpop-json | data -> data.startIndex, data.endIndex
ipcMain.on('server-load-tpop-json', (event, data) => {
  LOGGER.receive('SERVER', 'server-load-tpop-json');
  let tpopData;

  if (data) {
    tpopData = tpopManager.getData(data.startIndex, data.endIndex);
  } else {
    tpopData = tpopManager.getData();
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
  LOGGER.receive('SERVER', 'server-tpop-details', id);
  const details = tpopManager.loadDetails(id);

  sendMessage(tpopWindow, 'tpop-details', details);
});

ipcMain.on('server-tpop-filter', (event, filters) => {
  LOGGER.receive('SERVER', 'server-tpop-filter');
  tpopManager.filterData(filters);
  sendMessage(tpopWindow, 'tpop-filtered');
});


ipcMain.on('server-close-tpop', () => {
  LOGGER.receive('SERVER', 'server-close-tpop');
  tpopWindow.close();
  tpopWindow = null;
});

ipcMain.on('server-tpop-position', (event, tpopID) => {
  LOGGER.receive('SERVER', 'server-tpop-position', tpopID);
  const pos = tpopManager.getPosition(tpopID);
  const data = {
    tpopID: tpopID,
    pos: pos,
  };
  sendMessage(tpopWindow, 'tpop-position', data);
});

ipcMain.on('server-tpop-basic-info', (event, data) => {
  LOGGER.receive('SERVER', 'server-tpop-basic-info');
  const result = tpopManager.getBasicInfo(data);
  sendMessage(tpopWindow, 'tpop-basic-info', result);
});

ipcMain.on('server-calculate-distances', (event, data) => {
  LOGGER.receive('SERVER', 'server-calculate-distances');
  tpopManager.sortByDistance(data);
  sendMessage(tpopWindow, 'tpop-calculation-done');
});

ipcMain.on('server-reload-json', (event) => {
  LOGGER.receive('SERVER', 'server-reload-json');
  tpopManager.initialiseData(true, () => {
    sendMessage(tpopWindow, 'tpop-calculation-done');
  });
});

ipcMain.on('server-reset-sorting', (event) => {
  LOGGER.receive('SERVER', 'server-reset-sorting');
  tpopManager.sortByName();
  sendMessage(tpopWindow, 'tpop-calculation-done');
});

ipcMain.on('server-open-load-folder', (event) => {
  LOGGER.receive('SERVER', 'server-open-load-folder');
  const folder = saveManager.getCurrentFolder();
  shell.openPath(folder);
});

ipcMain.on('server-load-tpop-fragments', (event, data) => {
  LOGGER.receive('SERVER', 'server-load-tpop-fragments');
  data = tpopManager.getBasicInfo(data);
  sendMessage(mainWindow, 'client-start-loading', activeTables.tpop);
  
  const tableID = activeTables.tpop;
  tpopWindow.close();
  resolveTPOPUrls(data, tableID);
});

ipcMain.on('server-display-folders', function(event) {
  LOGGER.receive('SERVER', 'server-display-folders');
  const data = tpopManager.getFolders();
  sendMessage(event.sender, 'tpop-display-folders', data);
});

ipcMain.on('server-graphics-filter', function(event, data) {
  LOGGER.receive('SERVER', 'server-graphics-filter');
  tableManager.setGraphicFilters(data['tableID'], data.filters);
  filterImages(data.tableID, data.urls);
});

ipcMain.on('server-reset-graphics-filter', function(event, tableID) {
  LOGGER.receive('SERVER', 'server-reset-graphics-filter', tableID);
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
  LOGGER.receive('SERVER', 'server-select-folder', folderType);
  const path = saveManager.selectFolder();
  if (path) {
    const response = {};
    response[folderType] = path;
    sendMessage(settingsWindow, 'settings-data', response);
  }
});

ipcMain.on('server-save-config', function(event, newConfig) {
  LOGGER.receive('SERVER', 'server-save-config', newConfig);
  settingsWindow.close();
  settingsWindow = null;
  
  try {
    fs.accessSync(newConfig.vltFolder, fs.constants.R_OK | fs.constants.W_OK);
  } catch (error) {
    LOGGER.err('SERVER', "No writing permission to folder: " + newConfig.vltFolder);
    LOGGER.err(error);
    dialog.showMessageBox(mainWindow, {
      buttons: ['OK'],
      type: 'warning',
      title: 'Access Denied',
      message: 'No writing permission to selected save folder. Please select another location or adjust reading and writing permissions. Setting save location to original state.'
    });
    newConfig.vltFolder = configManager.getConfig().vltFolder;
  }

  configManager.replaceWith(newConfig);

  if ('vltFolder' in newConfig && newConfig.vltFolder && CONFIG.VLT_FOLDER != newConfig.vltFolder && fs.existsSync(newConfig.vltFolder)) {
    if (fs.existsSync(path.join(vltFolder, 'saves'))) {
      fs.moveSync(path.join(CONFIG.VLT_FOLDER, 'saves'), path.join(newConfig.vltFolder, 'saves'));
    }
    if (fs.existsSync(path.join(CONFIG.VLT_FOLDER, 'temp'))) {
      fs.moveSync(path.join(CONFIG.VLT_FOLDER, 'temp'), path.join(newConfig.vltFolder, 'temp'));
    }
    if (fs.existsSync(path.join(CONFIG.VLT_FOLDER, 'tpop'))) {
      fs.moveSync(path.join(CONFIG.VLT_FOLDER, 'tpop'), path.join(newConfig.vltFolder, 'tpop'));
    }

    CONFIG.set_vlt_folder(newConfig.vltFolder);

    tpopManager.setTpopFolder(path.join(CONFIG.VLT_FOLDER, 'tpop'));  // TODO
  }
  if ('minZoom' in newConfig && newConfig.minZoom
  && 'maxZoom' in newConfig && newConfig.maxZoom
  && 'stepZoom' in newConfig && newConfig.stepZoom) {
    const data = {
      'minZoom': newConfig.minZoom,
      'maxZoom': newConfig.maxZoom,
      'stepZoom': newConfig.stepZoom,
    }
    sendMessage(mainWindow, 'client-set-zoom', data);
  }
});

ipcMain.on('server-get-default', function(event, valueType) {
  LOGGER.receive('SERVER', 'server-get-default', valueType);
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
  LOGGER.log('SERVER', data);
});

ipcMain.on('server-select-other-tpops', (event, data) => {
  LOGGER.receive('SERVER', 'server-select-other-tpops');
  const imageArray = tpopManager.getImageLinks(data.tpop);
  resolveUrls(imageArray, uploadTpopImages);
});

ipcMain.on('server-check-tpop-data', () => {
  LOGGER.receive('SERVER', 'server-check-tpop-data');
  tpopManager.initialiseData(false, function() {
    sendMessage(tpopWindow, 'tpop-calculation-done')
  });

});

ipcMain.on('server-check-model-availability', (event, modelID) => {
  LOGGER.receive('SERVER', 'server-check-model-availability', modelID);
  let modelAvailable = mlManager.checkForModel(modelID);
  const responseData = {
    modelID: modelID,
    modelAvailability: modelAvailable,
  };
  sendMessage(event.sender, 'upload-model-availability', responseData);
});

ipcMain.on('server-download-model', (event, modelID) => {
  LOGGER.receive('SERVER', 'server-download-model', modelID);
  
  mlManager.downloadModel(modelID, function(modelDownloaded) {
    const responseData = {
      modelID: modelID,
      modelAvailability: modelDownloaded,
    };
    sendMessage(event.sender, 'upload-model-availability', responseData);
  });
});

ipcMain.on('server-compute-automatic-masks', (event, data) => {
  LOGGER.receive('SERVER', 'server-compute-automatic-masks', data);
  mlManager.segmentImages(data.modelID, data.pathImage1, data.pathImage2, data.ppi1, data.ppi2, function(responseData) {
    sendMessage(uploadWindow, 'upload-masks-computed', responseData);
  });
});

ipcMain.on('server-delete-model', (event, modelID) => {
  LOGGER.receive('SERVER', 'server-delete-model', modelID);
  // TODO delete model
  sendMessage(event.sender, 'upload-model-deleted', modelID);
});

ipcMain.on('server-delete-masks', (event) => {
  LOGGER.receive('SERVER', 'server-delete-masks');
  // TODO delete masks
  sendMessage(event.sender, 'upload-masks-deleted');
});

ipcMain.on('server-check-tensorflow', () => {
  LOGGER.receive('SERVER', 'server-check-tensorflow');
  mlManager.checkForTensorflow(function(tensorflowAvailable) {
    sendMessage(uploadWindow, 'upload-tensorflow-checked', tensorflowAvailable);
  });
});

ipcMain.on('server-install-tensorflow', (event) => {
  LOGGER.receive('SERVER', 'server-install-tensorflow');
  mlManager.installTensorflow(function(tensorflowInstalled) {
    sendMessage(event.sender, 'tensorflow-installed', tensorflowInstalled);
  });
});

ipcMain.on('server-cut-automatic-masks', (event, data) => {
  LOGGER.receive('SERVER', 'server-cut-automatic-masks', data);
  mlManager.registerImages(data.modelID, data.image1, data.mask1, data.image2, data.mask2, function(responseData) {
    sendMessage(uploadWindow, 'upload-images-cut', responseData);
  });
});
    
ipcMain.on('server-edit-auto-mask', (event, data) => {
  LOGGER.receive('SERVER', 'server-edit-auto-mask', data);

  const base64Data = data.change.replace(/^data:image\/png;base64,/, "");
  const changeURL = "manual_mask_change.png";
  let changeMode = "remove";
  if (data.add) changeMode = "add";

  fs.writeFile(changeURL, base64Data, 'base64', function(err) {

    const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'edit_mask.py'), data.maskURL, changeURL, changeMode], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    python.on('close', function(code) {
      LOGGER.log('SERVER', `Edit Mask Result: code ${code}.`);
      sendMessage(uploadWindow, 'upload-mask-edited');
      fs.removeSync(changeURL);
    });
  });
});

ipcMain.on('server-online-status', (event, onlineStatus) => {
  LOGGER.receive('SERVER', 'server-online-status', onlineStatus);
  online = onlineStatus;
});
