/*
    Name:           Window.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel,
                        Crossing Boundaries project)
    Start-Date:     23/07/19
    Last Change:    23/07/19

    Description:    File for definition of electron window
                    instance, derived from a tutorial at
                    https://codeburst.io/build-a-todo-app-with-electron-d6c61f58b55a.
*/

'use strict';

const {BrowserWindow} = require('electron');

const mainProps = {
  width: 1024,
  height: 800,
  // frame: false, TODO: looks better, but needs other way to close the application
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const loadProps = {
  width: 1200,
  height: 800,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const uploadProps = {
  width: 1500,
  height: 1000,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

/**
 * TODO
 */
class Window extends BrowserWindow {
  // Constructor for creating a new Window
  /**
   * TODO
   * @param {*} param0
   */
  constructor({file, type, devMode, ...windowSettings}) {
    let props = mainProps;
    if (type == 'load') {
      props = loadProps;
    } else if (type == 'upload') {
      props = uploadProps;
    }
    // TODO: If not main, then change props

    super({...props, ...windowSettings});

    // Load content and open dev tools
    this.loadFile(file);

    if (devMode) {
      this.webContents.openDevTools();
    } else {
      this.removeMenu();
    }

    // Show Window once rendering is finished
    this.once('ready-to-show', () => {
      this.show();
    });
  }
}

module.exports = Window;
