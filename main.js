'use strict'

// Loading Requirements...
const {app, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const Window = require('./js/Window')
const CanvasManager = require('./js/CanvasManager')
const ImageManager = require('./js/ImageManager')
const SaveManager = require('./js/SaveManager')


// Settings

const development = true;


// Initialisation
const canvas_manager = new CanvasManager();
const imageManager = new ImageManager();
const save_manager = new SaveManager();

var main_window;


/*
    SENDING MESSAGES

    The following functions are designed to send messages to one or multiple controlled windows.
*/

/*
    -> update-canvas

    This function sends an 'update-canvas' message to the main window, including the current location information
    on the canvas items as registered in the CanvasManager. This location information is basically the content
    of the CanvasManager, but without additional meta information.
*/
function send_update_canvas(main_window){
    console.log("Sent code 'update-canvas' to " + main_window);
    main_window.webContents.send('update-canvas', canvas_manager.getItemLocations());
}

/*
    -> redraw-canvas

    This function is closely related to the send_update_canvas function. However, this should be called whenever
    not just some minor details on the canvas have changed or the UI requested some update about the items' locations,
    but when the whole setup changes. Otherwise, information about locations between old and new images might be
    mixed.
*/
function send_redraw_canvas(main_window){
    console.log("Sent code 'redraw-canvas' to " + main_window);
    main_window.webContents.send('redraw-canvas', canvas_manager.getItemLocations());
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
// TODO: Repair function, as this currently just serves as playground
ipcMain.on('clear-table', (event) => {
    console.log(event);
    if (development){console.log("Received code 'clear-table'.")};
    canvas_manager.clearItems();
    send_redraw_canvas(main_window);
})

// <- duplicate
ipcMain.on('duplicate', () => {
    if (development){console.log("Received code 'duplicate'.")};
})

// <- save-table
ipcMain.on('save-table', () => {
    if (development){console.log("Received code 'save-table'.")};
    save_manager.saveTable(canvas_manager.getCanvasContent());
})

// <- load-table
ipcMain.on('load-table', () => {
    if (development){console.log("Received code 'load-table'.")};
    
    let loadedContent = save_manager.loadTable();
    if (loadedContent) {
        canvas_manager.setCanvasContent(loadedContent);
        send_redraw_canvas(main_window);
    }
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




// This is the main process, the main function which creates the windows and controlls everything else.
function main() {
    main_window = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    main_window.maximize(); // the VLT needs space, so use fullscreen mode
    //win.removeMenu(); // increase work immersion by removing unnecessary menu
    main_window.once('ready-to-show', () => {
        main_window.show();
    });

    // TODO: Remove dummy items
    canvas_manager.addItem("1", {
        "name":"item1",
        "xPos":0,
        "yPos":0,
        "rotation":0,
        "recto": true,
        "rectoURLlocal": "../imgs/cb_logo.png"
    });
    canvas_manager.addItem("2", {
        "name":"item2",
        "xPos":0,
        "yPos":0,
        "rotation":0,
        "recto": true,
        "rectoURLlocal": "../imgs/pap_dummy.jpg"
    });
    send_update_canvas(main_window);
}

app.on('ready', main)
app.on("window-all-closed", () => {app.quit();});

