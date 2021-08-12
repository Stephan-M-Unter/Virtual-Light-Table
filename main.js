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
const {app, ipcMain, dialog} = require('electron');
const path = require('path');

const Window = require('./js/Window');
const TableManager = require('./js/TableManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');

// Settings
const devMode = true;
const appPath = app.getAppPath();
app.commandLine.appendSwitch('touch-events', 'enabled');

// Initialisation
// Managers
const tableManager = new TableManager();
const imageManager = new ImageManager();
const saveManager = new SaveManager(__dirname.split(path.sep).pop());
// Windows
let mainWindow; // main window containing the light table itself
let loadWindow; // window for loading configurations
let detailWindow; // TODO additional window to show fragment details
// let filterWindow; // TODO additional window to set database filters
let localUploadWindow;


const color = {
  success: 'rgba(0,255,0,0.6)',
  error: 'rgba(255,0,0,0.6)',
};
const activeTable = {
  loading: null,
  uploading: null,
  active: null,
};

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
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (saveManager.checkForAutosave()) sendMessage(mainWindow, 'client-confirm-autosave');
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

// server-save-to-model | data -> data.tableID, data.tableData
ipcMain.on('server-save-to-model', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-save-to-model] from client for table '+data.tableID);
  }

  tableManager.updateTable(data.tableID, data.tableData);
  saveManager.saveTable(data.tableData, false, true);

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
  } else {
    // undo step was unsuccessful
    const feedback = {
      title: 'Undo Impossible',
      desc: 'There are probably no more undo steps possible.',
      color: color.error,
    };
    sendMessage(event.sender, 'client-show-feedback', feedback);
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
  } else {
    const feedback = {
      title: 'Redo Impossible',
      desc: 'There are probably no more redo steps available.',
      color: color.error,
    };
    sendMessage(event.sender, 'client-show-feedback', feedback);
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
  const tableID = activeTable.loading;
  activeTable.loading = null;
  loadWindow.close();
  const savefolder = saveManager.getCurrentFolder();
  const file = saveManager.loadSaveFile(path.join(savefolder, filename));
  tableManager.loadFile(tableID, file);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  data.tableData['loading'] = true;
  sendMessage(mainWindow, 'client-load-model', data);
  const feedback = {
    title: 'Table Loaded',
    desc: 'Successfully loaded file: \n'+saveManager.getCurrentFilepath(),
    color: color.success,
  };
  sendMessage(mainWindow, 'client-show-feedback', feedback);
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
  if (data.quicksave && saveManager.getCurrentFilepath()) {
    // overwrite old file
    filepath = saveManager.saveTable(tableManager.getTable(data.tableID), true);
    response = {
      title: 'Quicksave',
      desc: 'Quicksave successful',
      color: color.success,
    };
  } else {
    // don't overwrite but ask for new file destination
    filepath = saveManager.saveTable(tableManager.getTable(data.tableID), false);
    response = {
      title: 'Save',
      desc: 'Lighttable has successfully been saved',
      color: color.success,
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

  activeTable.loading = tableID;

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
      activeTable.loading = null;
    });
  }
});

// server-export-file
ipcMain.on('server-export-file', (event, filename) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-export-file] from loadWindow');
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
  tableManager.setAnnotation(data.tableID, data.aData);
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

  activeTable.uploading = tableID;

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
      activeTable.uploading = null;
    });
  }
});

// server-upload-ready
ipcMain.on('server-upload-ready', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-upload-ready] from client');
  }
  localUploadWindow.close();
  localUploadWindow = null;
  activeTable.uploading = null;
  mainWindow.send('client-add-upload', data);
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
    sendMessage(localUploadWindow, 'upload-receive-image', filepath);
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
  if (localUploadWindow) {
    localUploadWindow.close();
  }

  activeTable.uploading = data.tableID;

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
    activeTable.uploading = null;
  });
  sendMessage(localUploadWindow, 'upload-change-fragment', fragment);
});

// server-confirm-autosave | data -> data.tableID, data.confirmation
ipcMain.on('server-confirm-autosave', (event, data) => {
  if (devMode) {
    console.log(timestamp() + ' ' +
    'Receiving code [server-confirm-autosave] from client for table '+data.tableID);
  }
  if (data.confirmation) {
    tableManager.clearTable(data.tableID);
    const autosave = saveManager.loadAutosave();
    tableManager.loadFile(data.tableID, autosave);
    const data = {
      tableID: data.tableID,
      tableData: tableManager.getTable(data.tableID),
    };
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
  const tableID = tableManager.createNewTable();
  console.log("tableID", tableID);
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  console.log("data", data);
  sendMessage(event.sender, 'client-load-model', data);
});

ipcMain.on('server-send-model', (event, tableID) => {
  const data = {
    tableID: tableID,
    tableData: tableManager.getTable(tableID),
  };
  sendMessage(event.sender, 'client-get-model', data);
});
