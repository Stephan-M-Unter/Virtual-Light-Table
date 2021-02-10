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

const Window = require('./js/Window');
const CanvasManager = require('./js/CanvasManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');

// Settings
const development = true;
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
  });
  mainWindow.maximize(); // fullscreen mode
  if (!development) {
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
  if (development) {
    console.log(timestamp() +
    ' ' + 'Sending code ['+message+'] to client');
  }
  recipientWindow.send(message, data);
}


/* RECEIVING MESSAGES */

// server-save-to-model
ipcMain.on('server-save-to-model', (event, data) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-to-model] from client');
  }
  canvasManager.updateAll(data);
});

// server-undo-step
ipcMain.on('server-undo-step', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-undo-step] from client');
  }
  const undo = canvasManager.undoStep();
  if (undo) {
    const data = canvasManager.getAll();
    data['undo'] = true;
    sendMessage(event.sender, 'client-load-from-model', data);
  } else {
    const feedback = {
      title: 'Undo Impossible',
      desc: 'There are no more undo steps possible.',
      color: 'red',
    };
    sendMessage(event.sender, 'client-display-feedback', feedback);
  }
});

// server-redo-step
ipcMain.on('server-redo-step', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-redo-step] from client');
  }
  const redo = canvasManager.redoStep();
  if (redo) {
    const data = canvasManager.getAll();
    data['undo'] = true;
    sendMessage(event.sender, 'client-load-from-model', data);
  } else {
    const feedback = {
      title: 'Redo Impossible',
      desc: 'There are no more redo steps available.',
      color: 'red',
    };
    sendMessage(event.sender, 'client-display-feedback', feedback);
  }
});

// server-clear-table
ipcMain.on('server-clear-table', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-clear-table] from client');
  }
  canvasManager.clearAll();
  sendMessage(event.sender, 'client-load-from-model', canvasManager.getAll());
});

// server-open-detail-window
ipcMain.on('server-open-detail-window', (event, id) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-detail-window] from' +
    'client for fragment with id ' + id);
  }
  detailWindow = new Window({
    file: './renderer/details.html',
    type: 'detail',
  });
  detailWindow.removeMenu();
  detailWindow.maximize();
  detailWindow.once('ready-to-show', () => {
    detailWindow.show();
  });
});

// server-load-file
ipcMain.on('server-load-file', (event, file) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-load-file] from loadWindow');
  }
  loadWindow.close();
  canvasManager.clearAll();
  canvasManager.loadFile(file);
  sendMessage(mainWindow, 'client-load-from-model', canvasManager.getAll());
  const feedback = {
    title: 'Table Loaded',
    desc: 'Successfully loaded file: \n'+saveManager.getCurrentFile(),
    color: 'lightgreen',
  };
  sendMessage(mainWindow, 'client-display-feedback', feedback);
});

// server-save-file
ipcMain.on('server-save-file', (event, data) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-file] from client');
  }
  canvasManager.addEditor(data.editor);
  canvasManager.setScreenshot(data.screenshot);
  const filepath = saveManager.saveTable(canvasManager.getAll());
  const response = {
    title: 'Table Saved',
    desc: 'Lighttable scene has successfully been saved to:\n'+filepath,
    color: 'lightgreen',
  };
  if (filepath) {
    sendMessage(mainWindow, 'client-display-feedback', response);
  }
});

// server-list-savefiles
ipcMain.on('server-list-savefiles', (event, folder) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Received code [server-list-savefiles] for folder '+folder);
  }
  saveManager.getSaveFiles(folder, function(err, content) {
    const filesNames = content.filter(function(item) {
      return item.endsWith('.vlt');
    });

    const savefiles = {};

    filesNames.forEach((name) => {
      savefiles[name] = saveManager.loadSaveFile(folder + '/' + name);
    });
    event.sender.send('return-save-files', savefiles);
  });
});

// <- server-get-saves-folder
ipcMain.on('server-get-saves-folder', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-get-saves-folder] from client');
  }
  const path = saveManager.getSaveFolder();
  if (path) {
    event.sender.webContents.send('return-saves-folder', path[0]);
  }
});

// server-open-load-window
ipcMain.on('server-open-load-window', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-open-load-window] from client');
  }

  if (loadWindow != null) {
    loadWindow.show();
  } else {
    loadWindow = new Window({
      file: './renderer/load.html',
      type: 'load',
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

ipcMain.on('server-delete-save', (event, filename) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-delete-save] from loadWindow');
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
      event.sender.send('return-save-files', savefiles);
    });
  }
});

ipcMain.on('server-write-annotation', (event, annotData) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-write-annotation] from client');
  }
  canvasManager.setAnnotation(annotData);
});

ipcMain.on('server-remove-annotation', (event, id) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-remove-annotation] from client');
  }
  canvasManager.removeAnnotation(id);
});

ipcMain.on('server-start-upload', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-start-upload] from client');
  }

  if (!localUploadWindow) {
    localUploadWindow = new Window({
      file: './renderer/upload.html',
      type: 'upload',
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
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-ready] from client');
  }
  localUploadWindow.close();
  localUploadWindow = null;
  mainWindow.send('client-local-upload', data);
});

ipcMain.on('upload-new-image', (event) => {
  if (development) {
    console.log(timestamp() + ' ' +
    'Receiving code [upload-new-image] from client');
  }
  const filepath = imageManager.selectImageFromFilesystem();

  if (filepath) {
    sendMessage(localUploadWindow, 'new-upload-image', filepath);
  }
});
