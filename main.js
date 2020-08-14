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
var saveWindow; // window for saving a configuration
var loadWindow; // window for loading configurations
var detail_window; // TODO additional window to show fragment details
var filter_window; // TODO additional window to set database filters

/* ##############################################################
###
###                         MAIN PROCESS
###
############################################################## */

function main() {
    console.clear();
    mainWindow = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    mainWindow.maximize(); // the VLT needs space, so use fullscreen mode
    if (!development) {
        mainWindow.removeMenu(); // increase work immersion by removing unnecessary menu TODO
    }
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
    canvasManager.updateAll(data);
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-save-to-model] from client'); }
});

// server-clear-table
ipcMain.on('server-clear-table', (event) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-clear-table] from client'); }
    canvasManager.clearAll();
    sendMessage(event.sender, 'client-load-from-model', canvasManager.getAll());
});

// server-open-save-window
ipcMain.on('server-open-save-window', (event) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-open-save-window] from client'); }
    saveWindow = new Window({
        file: './renderer/save.html',
        type: 'save'
    });
    saveWindow.removeMenu();
    saveWindow.once('ready-to-show', () => {
        saveWindow.show();
    });
});

// server-load-file
ipcMain.on('server-load-file', (event, file) => {
    if (development) { console.log(timestamp() + " " + 'Receiving code [server-load-file] from loadWindow'); }
    loadWindow.close();
    canvasManager.clearAll();
    canvasManager.updateAll(file);
    sendMessage(mainWindow, 'client-load-from-model', canvasManager.getAll());
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
    
    loadWindow = new Window({
        file: './renderer/load.html',
        type: 'load'
    });
    // TODO loadWindow.removeMenu();
    loadWindow.once('read-to-show', () => {
        loadWindow.show();
    });
});





















/*

// <- get-folder
ipcMain.on('get-folder', (event) => {
    if (development){console.log("Received code 'get-folder'.");}
    let filepath = dialog.showOpenDialog({
        title: "Select Folder to Save Configuration in",
        defaultPath: path.join(__dirname+"/.."),
        properties: ['openDirectory']
    });
    event.sender.send('send-folder', filepath);
});

// <- request-save-files




// <- load-file
*/
