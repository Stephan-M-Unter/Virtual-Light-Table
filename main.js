/*
    Name:           Virtual Light Table - main.js
    Author:         Stephan M. Unter
    Start Date:     22/07/19

    Description:    This file contains the "server side" of the virtual light table, created within
                    the electron framework. It creates and controls the windows and holds managers
                    for data storage and data processing. 
*/

'use strict';

// Loading Requirements
const {app, ipcMain, dialog } = require('electron');
const path = require('path');

const Window = require('./js/Window');
const CanvasManager = require('./js/CanvasManager'); // manages elements to be shown on screen
const ImageManager = require('./js/ImageManager'); // manages request of external images
const SaveManager = require('./js/SaveManager'); // manages loading/saving of files

// Settings
const development = true; // console messages and other debugging stuff should only trigger if not being productive
app.commandLine.appendSwitch('touch-events', 'enabled');

// Initialisation
// Managers
const canvasManager = new CanvasManager();
const imageManager = new ImageManager();
const saveManager = new SaveManager();
// Windows
var mainWindow; // main window containing the light table itself
var loadWindow; // window for loading configurations
var detailWindow; // TODO additional window to show fragment details
var filterWindow; // TODO additional window to set database filters
var localUploadWindow;

/* ##############################################################
###
###                         MAIN PROCESS
###
############################################################## */

function main() {
    mainWindow = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    mainWindow.maximize(); // the VLT needs space, so use fullscreen mode
    if (!development) {
        mainWindow.removeMenu(); // increase work immersion by removing unnecessary menu TODO
    }
    mainWindow.on('close', function(){
        app.quit();
    });
}

app.on('ready', main);
app.on("window-all-closed", () => {app.quit();});


function timestamp(){
    let now = new Date();

    let second = now.getSeconds().toString().padStart(2,"0");
    let minute = now.getMinutes().toString().padStart(2,"0");
    let hour = now.getHours().toString().padStart(2,"0");
    let day = now.getDay().toString().padStart(2,"0");
    let month = now.getMonth().toString().padStart(2,"0");
    let year = now.getFullYear();
    return "["+day+"/"+month+"/"+year+" "+hour+":"+minute+":"+second+"]";
}

/* ##############################################################
###
###                    MESSAGES (SEND/RECEIVE)
###
############################################################## */

/* SENDING MESSAGES */

function sendMessage(recipient_window, message, data=null) {
    if (development) {console.log(timestamp() + " " + "Sending code ["+message+"] to client");}
    recipient_window.webContents.send(message, data);
}


/* RECEIVING MESSAGES */

// server-save-to-model
ipcMain.on('server-save-to-model', (event, data) => {
    canvasManager.updateStage(data.stage);
    canvasManager.updateFragments(data.fragments);
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-save-to-model] from client'); }
});

// server-clear-table
ipcMain.on('server-clear-table', (event) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-clear-table] from client'); }
    canvasManager.clearAll();
    sendMessage(event.sender, 'client-load-from-model', canvasManager.getAll());
});

// server-open-detail-window
ipcMain.on('server-open-detail-window', (event, id) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-open-detail-window] from client for fragment with id ' + id);}
    detailWindow = new Window({
        file: "./renderer/details.html",
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
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-load-file] from loadWindow'); }
    loadWindow.close();
    canvasManager.clearAll();
    canvasManager.loadFile(file);
    sendMessage(mainWindow, 'client-load-from-model', canvasManager.getAll());
});

// server-save-file
ipcMain.on('server-save-file', (event, data) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-save-file] from client'); }
    canvasManager.addEditor(data.editor);
    canvasManager.setScreenshot(data.screenshot);
    saveManager.saveTable(canvasManager.getAll());
});

// server-list-savefiles
ipcMain.on('server-list-savefiles', (event, folder) => {
    if (development){console.log(timestamp() + " " + "Received code [server-list-savefiles] for folder "+folder);}
    saveManager.getSaveFiles(folder, function(err, content) {
        let filesNames = content.filter(function(item){
            return item.endsWith(".vlt");
        });
        
        let savefiles = {};

        filesNames.forEach(name => {
            savefiles[name] = saveManager.loadSaveFile(folder + "/" + name);
        });
        event.sender.webContents.send('return-save-files', savefiles);
    });
});

// <- server-get-saves-folder
ipcMain.on('server-get-saves-folder', (event) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-get-saves-folder] from client'); }
    let path = saveManager.getSaveFolder();
    if (path) { event.sender.webContents.send('return-saves-folder', path[0]); }
});

// server-open-load-window
ipcMain.on('server-open-load-window', (event) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-open-load-window] from client'); }

    if (loadWindow != null) {
        loadWindow.show();
    } else {
        loadWindow = new Window({
            file: './renderer/load.html',
            type: 'load'
        });
        loadWindow.removeMenu();
        loadWindow.once('read-to-show', () => {
            loadWindow.show();
        });
        loadWindow.on('close', function(){
            loadWindow = null;
        });
    }
});

ipcMain.on('server-delete-save', (event, filename) => {
    if (development) { console.log(timestamp() + " " + "Receiving code [server-delete-save] from loadWindow"); }
    let deleted = saveManager.deleteFile(filename);
    if (deleted) {
        let folder = saveManager.getCurrentFolder();
        saveManager.getSaveFiles(folder, function(err, content) {
            let filesNames = content.filter(function(item){
                return item.endsWith(".vlt");
            });
            
            let savefiles = {};
            
            filesNames.forEach(name => {
                savefiles[name] = saveManager.loadSaveFile(folder + "/" + name);
            });
            event.sender.webContents.send('return-save-files', savefiles);
        });
    }
});

ipcMain.on('server-write-annotation', (event, annot_data) => {
    if (development) { console.log(timestamp() + " " + "Receiving code [server-write-annotation] from client"); }
    canvasManager.setAnnotation(annot_data);
});

ipcMain.on('server-remove-annotation', (event, id) => {
    if (development) { console.log(timestamp() + " " + "Receiving code [server-remove-annotation] from client"); }
    canvasManager.removeAnnotation(id);
});

ipcMain.on('server-upload-local', (event) => {
    if (development) { console.log(timestamp() + " " + "Receiving code [server-upload-local] from client"); }
    let filepath = imageManager.selectImageFromFilesystem();
    
    if(filepath) {
        localUploadWindow = new Window({
            file: "./renderer/upload.html",
            type: 'upload',
        });
        localUploadWindow.removeMenu();
        localUploadWindow.once('ready-to-show', () => {
            localUploadWindow.show();
            sendMessage(localUploadWindow, 'upload-image-path', filepath);
        });
    }
});

ipcMain.on('server-upload-ready', (event, data) => {
    if (development) { console.log(timestamp() + " " + "Receiving code [server-upload-ready] from client"); }
    localUploadWindow.close();
    mainWindow.send('client-local-upload', data);
});