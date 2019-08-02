'use strict'

// REQUIREMENTS //
const {app, ipcMain, dialog } = require('electron')
const path = require('path')
const fs = require('fs')
const https = require('https')
const Window = require('./js/Window')
const CanvasManager = require('./js/CanvasManager')
const ImageManager = require('./js/ImageManager')
const SaveManager = require('./js/SaveManager')

// Load Managers //
const canvasManager = new CanvasManager();
const imageManager = new ImageManager();
const saveManager = new SaveManager();

function main() {
    let win = new Window({
        file: './renderer/index.html',
        type: 'main'
    });
    win.maximize();
    //win.removeMenu();
    win.once('ready-to-show', () => {
        win.show();
    });

    // <- CLEAR-TABLE
    ipcMain.on('clear-table', () => {
        canvasManager.clearItems();
        console.log("CanvasManager: All Items Cleared.");
    })

    // <- SAVE-TABLE
    ipcMain.on('save-table', () => {
        saveManager.saveTable(canvasManager.getCanvasContent());
    })

    // <- LOAD-TABLE
    ipcMain.on('load-table', () => {
        let loadedContent = saveManager.loadTable();
        if (loadedContent) {
            canvasManager.setCanvasContent(loadedContent);
            canvasManager.printCanvasItems();
        }
    })

    ipcMain.on('new-pic', (event, data) => {
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

    //

    // <- UPDATE-POSITION
    ipcMain.on('update-position', (event, update) => {
        console.log(update);
        updateCanvas(win);
    })

    // -> UPDATE-CANVAS
    function updateCanvas(window){
        console.log("Update Canvas!");
        window.webContents.send('update-canvas', canvasManager.getItemLocations());
    }

    canvasManager.addItem("1", {
        "name":"item1",
        "xPos":500,
        "yPos":500,
        "rotation":0,
        "recto": true,
        "rectoURLlocal": "../imgs/cb_logo.png" 
    });
    canvasManager.addItem("2", {
        "name":"item2",
        "xPos":500,
        "yPos":500,
        "rotation":0,
        "recto": true,
        "rectoURLlocal": "../imgs/pap_dummy.jpg"
    });
    updateCanvas(win);

}

app.on('ready', main)
app.on("window-all-closed", () => {
    app.quit();
});