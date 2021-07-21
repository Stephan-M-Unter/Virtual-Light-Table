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
const {app, ipcMain} = require('electron');
const path = require('path');

const Window = require('./js/Window');
const CanvasManager = require('./js/CanvasManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');

// Settings
const devMode = true;
const appPath = app.getAppPath();
app.commandLine.appendSwitch('touch-events', 'enabled');

// Initialisation
// Managers
const canvasManager = new CanvasManager();
const imageManager = new ImageManager();
const saveManager = new SaveManager();
// Windows
let mainWindow; // main window containing the light table itself
let loadWindow; // window for loading configurations
let detailWindow; // TODO additional window to show fragment details
// let filterWindow; // TODO additional window to set database filters
let localUploadWindow;

/* ##############################################################
###
###                         MAIN PROCESS
###
############################################################## */

/**
 * TODO
 */
function main() {
  mainWindow = new Window({
    file: './renderer/index.html',
    type: 'main',
    devMode: devMode,
  });
  mainWindow.maximize(); // fullscreen mode
  if (!devMode) {
    mainWindow.removeMenu();
  }
  mainWindow.on('close', function() {
    app.quit();
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

// server-save-to-model
ipcMain.on('server-save-to-model', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-to-model] from client');
  }
  canvasManager.updateAll(data);
});

// server-undo-step
ipcMain.on('server-undo-step', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-undo-step] from client');
  }
  const undo = canvasManager.undoStep();
  if (undo) {
    const data = canvasManager.getAll();
    data['undo'] = true;
    sendMessage(event.sender, 'client-load-model', data);
  } else {
    const feedback = {
      title: 'Undo Impossible',
      desc: 'There are no more undo steps possible.',
      color: 'rgba(255,0,0,0.6)',
    };
    sendMessage(event.sender, 'client-show-feedback', feedback);
  }
});

// server-redo-step
ipcMain.on('server-redo-step', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-redo-step] from client');
  }
  const redo = canvasManager.redoStep();
  if (redo) {
    const data = canvasManager.getAll();
    data['undo'] = true;
    sendMessage(event.sender, 'client-load-model', data);
  } else {
    const feedback = {
      title: 'Redo Impossible',
      desc: 'There are no more redo steps available.',
      color: 'rgba(255,0,0,0.6)',
    };
    sendMessage(event.sender, 'client-show-feedback', feedback);
  }
});

// server-clear-table
ipcMain.on('server-clear-table', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-clear-table] from client');
  }
  canvasManager.clearAll();
  saveManager.clear();
  sendMessage(event.sender, 'client-load-model', canvasManager.getAll());
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
ipcMain.on('server-load-file', (event, file) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-load-file] from loadWindow');
  }
  loadWindow.close();
  canvasManager.clearAll();
  canvasManager.loadFile(file);
  const fileData = canvasManager.getAll();
  fileData['loading'] = true;
  sendMessage(mainWindow, 'client-load-model', fileData);
  const feedback = {
    title: 'Table Loaded',
    desc: 'Successfully loaded file: \n'+saveManager.getCurrentFilepath(),
    color: 'rgba(0,255,0,0.6)',
  };
  sendMessage(mainWindow, 'client-show-feedback', feedback);
});

// server-save-file
ipcMain.on('server-save-file', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-file] from client');
  }
  canvasManager.setScreenshot(data.screenshot);

  if (data.quicksave && !data.editor) {
    // non-initial quicksave, only update editor modified time
    canvasManager.updateEditor();
  } else {
    // add new editor
    canvasManager.addEditor(data.editor);
  }

  let filepath; let response;
  if (data.quicksave && saveManager.getCurrentFilepath()) {
    // overwrite old file
    filepath = saveManager.saveTable(canvasManager.getAll(), true);
    response = {
      title: 'Quicksave',
      desc: 'Quicksave successful',
      color: 'rgba(0,255,0,0.6)',
    };
  } else {
    // don't overwrite but ask for new file destination
    filepath = saveManager.saveTable(canvasManager.getAll(), false);
    response = {
      title: 'Save',
      desc: 'Lighttable has successfully been saved',
      color: 'rgba(0,255,0,0.6)',
    };
  }
  if (filepath && response) {
    sendMessage(mainWindow, 'client-show-feedback', response);
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

  saveManager.getSaveFiles(folder, function(err, content) {
    const filesNames = content.filter(function(item) {
      return item.endsWith('.vlt');
    });

    const savefiles = {};

    filesNames.forEach((name) => {
      savefiles[name] = saveManager.loadSaveFile(folder + '/' + name);
    });
    event.sender.send('load-receive-saves', savefiles);
  });
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
ipcMain.on('server-open-load', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-load] from client');
  }

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
    });
  }
});

ipcMain.on('server-delete-file', (event, filename) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-delete-file] from loadWindow');
  }
  const deleted = saveManager.deleteFile(filename);
  if (deleted) {
    const folder = saveManager.getCurrentFolder();
    saveManager.getSaveFiles(folder, function(err, content) {
      const filesNames = content.filter(function(item) {
        return item.endsWith('.vlt');
      });
      const savefiles = {};
      filesNames.forEach((name) => {
        savefiles[name] = saveManager.loadSaveFile(folder + '/' + name);
      });
      event.sender.send('load-receive-saves', savefiles);
    });
  }
});

ipcMain.on('server-write-annotation', (event, annotData) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-write-annotation] from client');
  }
  canvasManager.setAnnotation(annotData);
});

ipcMain.on('server-remove-annotation', (event, id) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-remove-annotation] from client');
  }
  canvasManager.removeAnnotation(id);
});

ipcMain.on('server-open-upload', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-upload] from client');
  }

  if (!localUploadWindow) {
    localUploadWindow = new Window({
      file: './renderer/upload.html',
      type: 'upload',
      devMode: devMode,
    });
    localUploadWindow.removeMenu();
    localUploadWindow.once('ready-to-show', () => {
      localUploadWindow.show();
    });
    localUploadWindow.on('close', function() {
      localUploadWindow = null;
    });
  }
});

ipcMain.on('server-upload-ready', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-ready] from client');
  }
  localUploadWindow.close();
  localUploadWindow = null;
  mainWindow.send('client-add-upload', data);
});

ipcMain.on('server-upload-image', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-image] from client');
  }
  let filepath = imageManager.selectImageFromFilesystem();

  if (filepath) {
    filepath = path.relative(__dirname.split(path.sep).pop(), filepath);
    sendMessage(localUploadWindow, 'upload-receive-image', filepath);
  }
});

ipcMain.on('quit-table', (event) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [quit-table] from client');
  }
  // TODO Potential cleaning of temp files?
  app.quit();
});
