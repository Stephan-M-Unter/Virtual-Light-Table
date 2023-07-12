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
const https = require('follow-redirects').https;
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

// EventHandlers
const { registerAllEventHandlers } = require('./protocol/registerEvents');

// Settings
let devMode = false;
let tpopEnabled = true;
if (process.argv.includes('--dev')) {
  devMode = true;
}
const version = 'v0.5';
const appPath = app.getAppPath();
const appDataPath = app.getPath('appData');
LOGGER.start(path.join(appDataPath, 'Virtual Light Table'), version);
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
let exportWindow;

// ViewGetters
function getStartWindow() {return startupWindow;}
function getMainWindow() {return mainWindow;}
function getLoadWindow() {return loadWindow;}
function getUploadWindow() {return uploadWindow;}
function getCalibrationWindow() {return calibrationWindow;}
function getSettingsWindow() {return settingsWindow;}
function getTpopWindow() {return tpopWindow;}
function getExportWindow() {return exportWindow;}

// ViewSetters
function setStartWindow(window) {startupWindow = window;}
function setMainWindow(window) {mainWindow = window;}
function setLoadWindow(window) {loadWindow = window;}
function setUploadWindow(window) {uploadWindow = window;}
function setCalibrationWindow(window) {calibrationWindow = window;}
function setSettingsWindow(window) {settingsWindow = window;}
function setTpopWindow(window) {tpopWindow = window;}
function setExportWindow(window) {exportWindow = window;}


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

async function startUp() {
  LOGGER.log('STARTUP', 'Removing Legacy Files...');
  sendMessage(startupWindow, 'startup-status', 'Removing Legacy Files...');
  CSC.removeLegacies();
  LOGGER.log('STARTUP', 'Checking Python and Tensorflow...');
  sendMessage(startupWindow, 'startup-status', 'Checking Python and Tensorflow...');
  try {
    await check_requirements();
    LOGGER.log('STARTUP', 'Installing Managers...');
    sendMessage(startupWindow, 'startup-status', 'Installing Managers...');
    createManagers();
  } catch (error) {
    LOGGER.log('SERVER', 'Quitting Application.');
    app.quit();
  }
    LOGGER.log('STARTUP', 'Registering EventHandlers...');
    sendMessage(startupWindow, 'startup-status', 'Registering EventHandlers...');
    registerEventHandlers();
    LOGGER.log('STARTUP', 'Preparation Finished, Ready to Go!');
    sendMessage(startupWindow, 'startup-status', 'Preparation Finished, Ready to Go!');
}

function createManagers() {
  configManager = new ConfigManager(vltConfigFile);
  saveManager = new SaveManager();
  mlManager = new MLManager();

  // external managers
  tpopManager = new TPOPManager();
  configManager.registerManager(tpopManager);
}

function getDependencies() {
  const deps = {
    'ipcMain': ipcMain,
    'app': app,
    'sendMessage': sendMessage,
    'mlManager': mlManager,
    'tableManager': tableManager,
    'saveManager': saveManager,
    'activeTables': activeTables,
    'autosaveChecked': autosaveChecked,
    'calibrationWindow': calibrationWindow,
    'devMode': devMode,
    'settingsWindow': settingsWindow,
    'exportWindow': exportWindow,
    'configManager': configManager,
    'config': config,
    'mainWindow': mainWindow,
    'Window': Window,
    'dialog': dialog,
    'path': path,
    'tpopManager': tpopManager,
    'resolveUrls': resolveUrls, // TODO
    'tpopWindow': tpopWindow,
    'uploadWindow': uploadWindow,
    'preprocess_fragment': preprocess_fragment, // TODO
    'preprocess_loading_fragments': preprocess_loading_fragments,
    'color': color,
    'getStartWindow': getStartWindow,
    'getMainWindow': getMainWindow,
    'getLoadWindow': getLoadWindow,
    'getUploadWindow': getUploadWindow,
    'getCalibrationWindow': getCalibrationWindow,
    'getSettingsWindow': getSettingsWindow,
    'getTpopWindow': getTpopWindow,
    'getExportWindow': getExportWindow,
    'imageManager': imageManager,
    'uploadLocalImage': uploadLocalImage,
    'tpopEnabled': tpopEnabled,
    'setStartWindow': setStartWindow,
    'setMainWindow': setMainWindow,
    'setLoadWindow': setLoadWindow,
    'setUploadWindow': setUploadWindow,
    'setCalibrationWindow': setCalibrationWindow,
    'setSettingsWindow': setSettingsWindow,
    'setTpopWindow': setTpopWindow,
    'setExportWindow': setExportWindow,
  };
  return deps;
}

function registerEventHandlers() {
  const deps = getDependencies();
  registerAllEventHandlers(deps);
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

/**
 * This function takes a list (array) of fragmentEntries. Each entry consists of an entry "table", containing
 * the tableID, and an entry "fragment". For an example what can be contained in that fragmentEntry, see
 * tpopManager.prepareLoadingQueueForUpload().
 * The function recursively openes a new uploadWindow and sends the information for the first fragment
 * in the queue to that window. Once the user has processed the fragment and closes the window (e.g. by 
 * uploading the fragment to the mainView), this function is called again. If there are no fragments left,
 * i.e. the loading queue has a length of 0, the process is stopped and the main view is informed that
 * loading has finished.
 */
function sequentialUpload(loadingQueue) {
  // if nothing is left in the queue, kill upload window and stop loading animation in main view
  if (loadingQueue.length == 0) {
    try {
      uploadWindow.close();
    } catch {}
    return;
  }
  
  const data = loadingQueue.pop(0);
  activeTables.uploading = data.table;

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
      sendMessage(uploadWindow, 'upload-fragment', data.fragment); // TODO - shouldn't be TPOP specific!
      uploadWindow.show();
    });
  });

  uploadWindow.on('close', () => {
    uploadWindow = null;
    sendMessage(mainWindow, 'client-stop-loading');
    // once the upload window is closed, re-call this method to check for the next entry in the queue
    sequentialUpload(loadingQueue);
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

async function checkPythonVersion(pythonCommand) {
  return new Promise((resolve, reject) => {
    const python = spawn(pythonCommand, [path.join(CONFIG.PYTHON_FOLDER, 'python_test.py')], { detached: false });
    python.stdout.pipe(process.stdout);
    python.stderr.pipe(process.stderr);

    python.on('error', (error) => {
      reject(error);
    });

    python.on('close', (code) => {
      if (code == 0) {

        LOGGER.log('SERVER', `[PYTHON] closed with code ${code}`);
        LOGGER.log('SERVER', `Setting python command to "${pythonCommand}"`);
        CONFIG.set_python_command(pythonCommand);
        resolve();
      } else {
        reject();
      }
    });
  });
}

function check_requirements() {
  return new Promise(async (resolve, reject) => {
    try {
      LOGGER.log('SERVER', 'Checking for PYTHON3...');
      await checkPythonVersion('python3');
      resolve();
    } catch (error) {
      LOGGER.log('SERVER', `Command "python3" not found.`);
      try {
        LOGGER.log('SERVER', 'Checking for PYTHON...');
        await checkPythonVersion('python');
        resolve();
      } catch (error) {
        LOGGER.log('SERVER', `Command "python" not found. Python not installed on this system.`);
        reject(error);
      }
    }
  });
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
  let autoCutURL;
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

  console.log(data.recto.auto);
  console.log(data.verso.auto);

  if (!rectoProcessed) {
    // we are processing the recto side
    if ('url' in data.recto) {
      // recto data available
      imageURL = data.recto.url;
      autoCutURL = data.recto.auto.cut;
      boxPoints = data.recto.box;
      polygonPoints = data.recto.polygon;
    } else {
      // no recto data available, thus we use the verso data and
      // set the mirror flag to true
      mirror = true;
      imageURL = data.verso.url;
      autoCutURL = data.verso.auto.cut;
      boxPoints = data.verso.box;
      polygonPoints = data.verso.polygon;
      data.recto.ppi = data.verso.ppi;
    }
  } else {
    // we are processing the verso side
    if ('url' in data.verso) {
      // verso data available
      imageURL = data.verso.url;
      autoCutURL = data.verso.auto.cut;
      boxPoints = data.verso.box;
      polygonPoints = data.verso.polygon;
    } else {
      // no verso data available, thus we use the recto data and
      // set the mirror flag to true
      mirror = true;
      imageURL = data.recto.url;
      autoCutURL = data.recto.auto.cut;
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
  } else if (data.maskMode == 'automatic_cut') {
    if (mirror) {
      python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'mirror_cut.py'), autoCutURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    }
    else python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'cut_image.py'), autoCutURL, "no_mask", CONFIG.VLT_FOLDER], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
    if (mirror) filename = path.basename(autoCutURL).split('.')[0]+'_mirror.png';
    else filename = path.basename(autoCutURL).split('.')[0]+'_frag.png';
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


function uploadLocalImage(filepath) {
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


// server-redo-step


// server-clear-table


// server-load-file


// server-save-file | data -> data.tableID, data.screenshot, data.quicksave, data.editor


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

ipcMain.on('server-upload-image-given-filepath', (event, filepath) => {
  LOGGER.receive('SERVER', 'server-upload-image-given-filepath', filepath);
  uploadLocalImage(filepath);
});





ipcMain.on('server-import-file', (event) => {
  LOGGER.receive('SERVER', 'server-import-file');
  saveManager.importFile(() => {
    sendMessage(event.sender, 'load-set-default-folder', saveManager.CONFIG.SAVES_FOLDER);
    sendMessage(event.sender, 'load-receive-folder', saveManager.getCurrentFolder());
  });
});

// server-open-tpop
// server-load-tpop-json | data -> data.startIndex, data.endIndex


ipcMain.on('server-tpop-details', (event, id) => {
  LOGGER.receive('SERVER', 'server-tpop-details', id);
  const details = tpopManager.loadDetails(id);

  sendMessage(event.sender, 'tpop-details', details);
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

ipcMain.on('server-load-tpop-fragments', (event, listOfTpopIds) => {
  LOGGER.receive('SERVER', 'server-load-tpop-fragments');
  tpopWindow.close();
  const tableID = activeTables.tpop;
  activeTables.tpop = null;
  activeTables.uploading = tableID;
  sendMessage(mainWindow, 'client-start-loading', tableID);

  tpopManager.prepareIDsForUpload(listOfTpopIds, tableID, sequentialUpload);
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

ipcMain.on('server-graphics-filter-export', function(event, data) {
  
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

ipcMain.on('console', function(event, data) {
  LOGGER.log('SERVER', data);
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
});

ipcMain.on('server-check-tensorflow', (event) => {
  LOGGER.receive('SERVER', 'server-check-tensorflow');
  mlManager.checkForTensorflow((tensorflowAvailable) => {
    sendMessage(event.sender, 'tensorflow-checked', tensorflowAvailable);
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

ipcMain.on('server-local-drop', (event, dataArray) => {
  LOGGER.receive('SERVER', 'server-drop-local', dataArray);

  const loadingQueue = [];

  const tableID = activeTables.view;

  for (const url of dataArray) {
    // url is a path to a file; read the filename (without extension) into the variable name
    const name = path.basename(url, path.extname(url));
    const entry = {
      'table': tableID,
      'fragment': {
        'x': 0,
        'y': 0,
        'name': name,
        'recto': {
          'url': url,
          'www': false,
        },
      },
    };
    loadingQueue.push(entry);
  }

  sequentialUpload(loadingQueue);
});

ipcMain.on('server-test', (event) => {
  const modelfilepath = 'https://huggingface.co/S-Unter/PapyrusSegmentationBiNet4.2/resolve/main/model.h5';
  const pythonfilepath = 'https://huggingface.co/S-Unter/PapyrusSegmentationBiNet4.2/resolve/main/VLT.py';
  const accessToken = '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'

  // Download the python file from pythonfilepath, using the provided access token
  const pythonfile = fs.createWriteStream('VLT.py');
  const pythonRequest = https.get(pythonfilepath, {headers: {'Authorization': `Bearer ${accessToken}`}}, function(response) {
    response.pipe(pythonfile);
    pythonfile.on('finish', () => {
      pythonfile.close();
      console.log('Python File downloaded');
    });
  });

  const modelfile = fs.createWriteStream('model.h5');
  const modelRequest = https.get(modelfilepath, {headers: {'Authorization': `Bearer ${accessToken}`}}, function(response) {
    response.pipe(modelfile);
    modelfile.on('finish', () => {
      modelfile.close();
      console.log('Model File downloaded');
    });
  });
});

ipcMain.on('server-open-export', (event, tableID) => {
  LOGGER.receive('SERVER', 'server-open-export', tableID);
  if (!exportWindow) {
    exportWindow = new Window({
      file: './renderer/export.html',
      type: 'export',
      devMode: devMode,
    });
    exportWindow.removeMenu();
    exportWindow.maximize();
    exportWindow.on('close', function() {
      exportWindow = null;
    });
  }
});

ipcMain.on('server-get-active-table', (event) => {
  LOGGER.receive('SERVER', 'server-get-active-table');
  const tableID = activeTables.view;
  const table = tableManager.getTable(tableID);
  sendMessage(event.sender, 'active-table', table);
});

ipcMain.on('server-get-ml-models', (event, code) => {
  LOGGER.receive('SERVER', 'server-get-ml-models', code);
  const models = mlManager.getModelsByCode(code);
  sendMessage(event.sender, 'ml-models', models);
});

// ipcMain.on('server-get-ml-model-details', (event, modelID) => {
//   LOGGER.receive('SERVER', 'server-get-ml-model-details', modelID);
//   const model = mlManager.getModelDetails(modelID);
//   sendMessage(event.sender, 'ml-model-details', model);
// });

ipcMain.on('server-facsimilate-images', (event, data) => {
  LOGGER.receive('SERVER', 'server-facsimilate-images', data);
  const inputData_facsimile = data.inputData;
  // deep copy inputData_facsimile into inputData
  const inputData = JSON.parse(JSON.stringify(inputData_facsimile));
  const thresholds = data.thresholds;
  const colors = data.colors;

  const callback_facsimile = () => {
    const inputData_threshold = [];

    for (const entry of inputData) {
      const image_path = entry['image_path'];
      const basename = path.basename(image_path, path.extname(image_path));
      const segmentation_filename = `${basename}_segmentation.npy`;
      inputData_threshold.push(segmentation_filename);
    }
    const callback_threshold = function() {
      sendMessage(event.sender, 'thresholded-images');
    };

    mlManager.thresholdImages(inputData_threshold, thresholds, colors, callback_threshold);
  }

  mlManager.facsimilateImages(inputData_facsimile, callback_facsimile);


});

ipcMain.on('server-threshold-images', (event, data) => {
  LOGGER.receive('SERVER', 'server-threshold-images', data);
  const inputData = data.inputData;
  const thresholds = data.thresholds;
  const colors = data.colors;

  const callback = function() {
    sendMessage(event.sender, 'thresholded-images');
  };

  mlManager.thresholdImages(inputData, thresholds, colors, callback);
});
