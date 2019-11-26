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
const CanvasManager = require('./js/CanvasManager');
const ImageManager = require('./js/ImageManager');
const SaveManager = require('./js/SaveManager');

// Settings
const development = true;
app.commandLine.appendSwitch('touch-events', 'enabled');

// Initialisation
// Managers
const canvas_manager = new CanvasManager();
const imageManager = new ImageManager();
const save_manager = new SaveManager();
// Windows
var main_window;
var save_window;
var load_window;
var detail_window;


/*
    SENDING MESSAGES
*/
function send_message(recipient_window, message, data=null) {
    console.log("Sending code "+message+" to "+recipient_window);
    recipient_window.webContents.send(message, data);
}

function send_message_reload_canvas(recipient_window) {
    console.log("Sending code 'client-reload-whole-canvas' to "+recipient_window);
    let stage_info = canvas_manager.getStageInformation();
    let canvas_info = canvas_manager.getCanvasInformation();
    recipient_window.webContents.send('client-reload-whole-canvas', stage_info, canvas_info);
}


/*
    RECEIVING MESSAGES

    The following functions listen to the communication with the sub-windows and react to specific code messages.

    So far, the following codes have been agreed upon and implemented:
    - 'server-clear-table'
    - 'server-save-table'
    - 'server-load-table'
    - 'server-duplicate'
    - 'server-hor-flip'
    - 'server-vert-flip'
    - 'server-update-image'
    - 'server-update-stage'
*/
// <- server-clear-table
ipcMain.on('server-clear-table', (event) => {
    if (development){console.log("Received code 'server-clear-table'.");}
    canvas_manager.clearItems();
    send_message_reload_canvas(event.sender);
});

// <- server-duplicate
ipcMain.on('server-duplicate', () => {
    if (development){console.log("Received code 'server-duplicate'.");}
    // TODO do something
});

// <- server-save-table
ipcMain.on('server-save-table', () => {
    if (development){console.log("Received code 'server-save-table'.");}
    save_window = new Window({
        file: './renderer/save.html',
        type: 'save'
    });
    save_window.removeMenu();
    save_window.once('ready-to-show', () => {
        save_window.show();
    });
});

// <- server-load-table
ipcMain.on('server-load-table', (event) => {
    if (development){console.log("Received code 'server-load-table'.");}

    load_window = new Window({
        file: './renderer/load.html',
        type: 'load'
    });
    load_window.removeMenu();
    load_window.once('read-to-show', () => {
        load_window.show();
    });
});

// server-hor-flip
ipcMain.on('server-hor-flip', (event) => {
    //TODO do something
});

// <- server-vert-flip
ipcMain.on('server-vert-flip', (event) => {
    // TODO do something
});

// <- server-update-image
// update: contains location information of a canvas item
ipcMain.on('server-update-image', (event, update) => {
    if (development){console.log("Received code 'server-update-image'.");}
    let id = update.id;
    let xPos = update.xPos;
    let yPos = update.yPos;
    let rotation = update.rotation;
    canvas_manager.updateItemLocation(id, xPos, yPos, rotation);
});

// <- server-update-stage
// update: contains new information about the stage configuration
ipcMain.on('server-update-stage', (event, update) => {
    if (development){console.log("Received code 'server-update-stage'.");}
    canvas_manager.updateStageInformation(update);
});

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
ipcMain.on('request-save-files', (event, folder) => {
    if (development){console.log("Received code 'get-save-files' for folder "+folder+".");}
    save_manager.getSaveFiles(folder, function(err, content) {
        let save_files_names = content.filter(function(item){
            return item.endsWith(".vlt");
        });
        
        let save_files = {};

        save_files_names.forEach(name => {
            save_files[name] = save_manager.loadSaveFile(folder + "/" + name);
        });

        event.sender.webContents.send('return-save-files', save_files);
    });
});

// <- request-saves-folder
ipcMain.on('request-saves-folder', (event) => {
    let path = save_manager.getSaveFolder();
    if (path) {
        event.sender.webContents.send('return-saves-folder', path[0]);
    }
});

// <- load-file
ipcMain.on('load-file', (event, file) => {
    load_window.close();
    canvas_manager.clearItems();
    send_message_reload_canvas(main_window);
    canvas_manager.setCanvasContent(file);
    send_message_reload_canvas(main_window);
});


// This is the main process, the main function which creates the windows and controlls everything else.
function main() {
    console.clear();
    main_window = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    main_window.maximize(); // the VLT needs space, so use fullscreen mode
    //win.removeMenu(); // increase work immersion by removing unnecessary menu TODO
    main_window.once('ready-to-show', () => {
        main_window.show();
        send_message_reload_canvas(main_window);
    });
}


app.on('ready', main);
app.on("window-all-closed", () => {app.quit();});

