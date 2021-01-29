/*
    Name:           SaveManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     24/07/19
    Last Change:    24/07/19
    
    Description:    This manager is supposed to handle all save and load operations on the local
                    disk, e.g. the saving of table configurations and their respective loading.
*/

'use strict';

const { dialog } = require('electron');
const path = require('path');
const fs = require('fs');

class SaveManager {
    constructor(){
        this.defaultSaveFolder = "./saves";
        this.currentSaveFolder = this.defaultSaveFolder;
    }

    saveTable(tableConfiguration){
        // read current date for some default filename
        let now = new Date();

        let year = now.getFullYear();
        let month = ((now.getMonth()+1) < 10 ? '0' : '') + (now.getMonth()+1);
        let day = (now.getDate() < 10 ? '0' : '') + now.getDate();
    
        let hour = now.getHours();
        let minute = (now.getMinutes() < 10 ? '0' : '') + now.getMinutes();
        let second = (now.getSeconds() < 10 ? '0' : '') + now.getSeconds();


        let date = year+"-"+month+"-"+day;
        let time = hour+"h"+minute+"m"+second+"s";
        let filename = "VLT_"+date+"_"+time;

        // create save dialog
        let filepath = dialog.showSaveDialogSync({
            title: "Save Current Table Configuration",
            defaultPath: path.join(__dirname+"/../saves/", filename),
            filters: [{
                name: 'Virtual Light Table Save',
                extensions: ['vlt']
            }]
        });
        // TODO: man könnte hier auch mit dialog.showSaveDialog arbeiten; die Parameter sind
        // die gleichen, aber der main process würde nicht durch den save dialog blockiert
        // werden. Als Ergebnis gibt es ein promise-Object, das dann vermutlich durch eine
        // callback-Funktion abgefangen werden müssen. Quelle: https://www.electronjs.org/docs/api/dialog

        console.log(filepath);

        if (filepath) {
            // save current status of canvasManager to a .vtl-file
            let canvasContent = JSON.stringify(tableConfiguration);
            fs.writeFileSync(filepath, canvasContent, 'utf-8');
            console.log("**SaveManager** - Saved table configuration to " + filepath);
        }
    }

    loadTable(){
        let filepath = dialog.showOpenDialog({
            title: "Open VLT Configuration",
            filters: [{
                name: "Virtual Light Table Save",
                extensions: ['vlt']
            }],
            defaultPath: __dirname+"/..",
            properties: [
                "openFile"
            ]
        });

        if (filepath) {
            let content = fs.readFileSync(filepath[0]).toString();
            console.log("**SaveManager** - Loading " + filepath);
            return JSON.parse(content);
        }
    }

    getSaveFolder(){
        let filepath = dialog.showOpenDialog({
            title: "Open VLT Configuration",
            filters: [{
                name: "Virtual Light Table Save",
                extensions: ['vlt']
            }],
            defaultPath: __dirname+"/..",
            properties: [
                "openDirectory"
            ]
        });

        return filepath;
    }

    getSaveFiles(folder, callback) {
        this.currentSaveFolder = folder;
        console.log("Reading folder " + folder + ".");
        fs.readdir(folder, (err, files) => {
            callback(null, files);
        });
    }

    loadSaveFile(filepath) {
        let content = fs.readFileSync(filepath).toString();
        let stats = fs.statSync(filepath);
        let mtime = stats.mtimeMs;
        console.log("**SaveManager** - Loading " + filepath);
        let json = JSON.parse(content);
        json.mtime = mtime;
        //console.log(json);
        return json;
    }

    saveSavefile(filepath, data) {
        let json = JSON.stringify(data);
        fs.writeFileSync(filepath, json);
    }

    deleteFile(filename) {
        fs.unlinkSync(path.join(this.currentSaveFolder, filename));
        return true;
    }

    getCurrentFolder() {
        return this.currentSaveFolder;
    }

    getDefaultFolder() {
        return this.defaultSaveFolder;
    }
}

module.exports = SaveManager;