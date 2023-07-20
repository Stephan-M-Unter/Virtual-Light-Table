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
  frame: false,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const startProps = {
  frame: false,
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

const calibrationProps = {
  width: 600,
  height: 1000,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const settingsProps = {
  width: 900,
  height: 500,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const tpopProps = {
  width: 1024,
  height: 800,
  frame: false,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
};

const exportProps = {
  width: 1024,
  height: 800,
  // frame: false,
  icon: './imgs/icons/png/logo.png',
  show: false,
  webPreferences: {
    nodeIntegration: true,
    contextIsolation: false,
  },
}

const propsPresets = {
  'main': mainProps,
  'tpop': tpopProps,
  'settings': settingsProps,
  'calibration': calibrationProps,
  'upload': uploadProps,
  'load': loadProps,
  'start': startProps,
  'export': exportProps,
}

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
    const props = propsPresets[type];

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
