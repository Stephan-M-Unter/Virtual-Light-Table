/*
    Name:           Window.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     23/07/19
    Last Change:    23/07/19
    
    Description:    File for definition of electron window instance, derived from a tutorial at
                    https://codeburst.io/build-a-todo-app-with-electron-d6c61f58b55a.
*/

'use strict'

const { BrowserWindow } = require('electron');
const development = true;

let mainProps = {
    width: 1024,
    height: 800,
    //frame: false,
    icon: './imgs/icons/png/logo.png',
    show: false,
    webPreferences: {
        nodeIntegration: true
    }
}

let saveProps = {
    width: 600,
    height: 800,
    icon: './imgs/icons/png/logo.png',
    //frame: false,
    show: false,
    webPreferences: {
        nodeIntegration: true
    }
}

let loadProps = {
    width: 1200,
    height: 800,
    icon: './imgs/icons/png/logo.png',
    show: false,
    webPreferences: {
        nodeIntegration: true
    }
}

class Window extends BrowserWindow {
    // Constructor for creating a new Window
    constructor({ file, type, ...windowSettings }) {
        let props = mainProps;
        if (type == "save") {
            props = saveProps;
        } else if (type == "load") {
            props = loadProps
        }
        // TODO: If not main, then change props

        super({ ...props, ...windowSettings })
        
        // Load content and open dev tools
        this.loadFile(file)

        if (development){
            this.webContents.openDevTools()
        } else {
            this.removeMenu();
        }

        // Show Window once rendering is finished
        this.once('ready-to-show', () => {
            this.show()
        })
    }
}

module.exports = Window