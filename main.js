/*
    Name:           Virtual Light Table - main.js
    Author:         Stephan M. Unter
    Start Date:     22/07/19

    Description:    This file contains the "server side" of the virtual light table, created within
                    the electron framework. It creates and controls the windows and holds managers
                    for data storage and data processing. 
*/

'use strict'

// Loading Requirements
const {app, ipcMain, dialog } = require('electron')
const path = require('path')
// const fs = require('fs')
const https = require('https')
const Window = require('./js/Window')
const CanvasManager = require('./js/CanvasManager')
const ImageManager = require('./js/ImageManager')
const SaveManager = require('./js/SaveManager')


// Settings
const development = true;


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

    The following functions are designed to send messages to one or multiple controlled windows.
*/
/*
    -> redraw-canvas

    This function should be called whenever not just some minor details on the canvas have changed or the UI
    requested some update about the items' locations, but when the whole setup changes. Otherwise, information
    about locations between old and new images might be mixed.
*/
function send_redraw_canvas(window){
    console.log("Sent code 'redraw-canvas' to " + window);
    window.webContents.send('redraw-canvas', canvas_manager.getStageInformation(), canvas_manager.getItemLocations());
}



/*
    RECEIVING MESSAGES

    The following functions listen to the communication with the sub-windows and react to specific code messages.

    So far, the following codes have been agreed upon and implemented:
    - 'clear-table'
    - 'save-table'
    - 'load-table'
    - 'new-pic'
    - 'update-location'
*/
// <- clear-table
ipcMain.on('clear-table', (event) => {
    if (development){console.log("Received code 'clear-table'.")};
    canvas_manager.clearItems();
    send_redraw_canvas(event.sender);
})

// <- duplicate
ipcMain.on('duplicate', () => {
    if (development){console.log("Received code 'duplicate'.")};
    // TODO
})

// <- save-table
ipcMain.on('save-table', () => {
    if (development){console.log("Received code 'save-table'.")};
    save_window = new Window({
        file: './renderer/save.html',
        type: 'save'
    });
    save_window.removeMenu();
    save_window.once('ready-to-show', () => {
        save_window.show();
    });
})

// <- load-table
ipcMain.on('load-table', (event) => {
    if (development){console.log("Received code 'load-table'.")};

    load_window = new Window({
        file: './renderer/load.html',
        type: 'load'
    });
    load_window.removeMenu();
    load_window.once('read-to-show', () => {
        load_window.show();
    });
    
    /*
    let loadedContent = save_manager.loadTable();
    if (loadedContent) {
        canvas_manager.setCanvasContent(loadedContent);
        send_redraw_canvas(event.sender);
    }
    */
})

// <- 'new-pic'
ipcMain.on('new-pic', (event, data) => {
    if (development){console.log("Received code 'new-pic'.")};
    https.get(data, (resp) => {
        resp.setEncoding('base64');
        let body = "data:" + resp.headers["content-type"] + ";base64,";
        resp.on('data', (data) => { body += data});
        resp.on('end', () => {
            win.webContents.send('draw-picture', body);
            //return res.json({result: body, status: 'success'});
        });
    }).on('error', (e) => {
        console.log(`Got error: ${e.message}`);
    });
})

// <- update-location
// update: contains location information of a canvas item
ipcMain.on('update-location', (event, update) => {
    if (development){console.log("Received code 'update-location'.")};
    let id = update.id;
    let xPos = update.xPos;
    let yPos = update.yPos;
    let rotation = update.rotation;
    canvas_manager.updateItemLocation(id, xPos, yPos, rotation);
})

// <- update-stage
// update: contains new information about the stage configuration
ipcMain.on('update-stage', (event, update) => {
    if (development){console.log("Received code 'update-stage'.")};
    canvas_manager.updateStageInformation(update);
})

// <- get-folder
ipcMain.on('get-folder', (event) => {
    if (development){console.log("Received code 'get-folder'.")};
    let filepath = dialog.showOpenDialog({
        title: "Select Folder to Save Configuration in",
        defaultPath: path.join(__dirname+"/.."),
        properties: ['openDirectory']
    });
    event.sender.send('send-folder', filepath);
})

// <- request-save-files
ipcMain.on('request-save-files', (event, folder) => {
    if (development){console.log("Received code 'get-save-files' for folder "+folder+".")};
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
})

// <- request-saves-folder
ipcMain.on('request-saves-folder', (event) => {
    let path = save_manager.getSaveFolder();
    if (path) {
        event.sender.webContents.send('return-saves-folder', path[0]);
    }
})

ipcMain.on('load-file', (event, file) => {
    load_window.close();
    canvas_manager.clearItems();
    send_redraw_canvas(main_window);
    canvas_manager.setCanvasContent(file);
    send_redraw_canvas(main_window);
});


// This is the main process, the main function which creates the windows and controlls everything else.
function main() {
    console.clear();
    main_window = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    main_window.maximize(); // the VLT needs space, so use fullscreen mode
    //win.removeMenu(); // increase work immersion by removing unnecessary menu
    main_window.once('ready-to-show', () => {
        main_window.show();
        send_redraw_canvas(main_window);
    });
}

app.commandLine.appendSwitch('touch-events', 'enabled');
app.on('ready', main)
app.on("window-all-closed", () => {app.quit();});

