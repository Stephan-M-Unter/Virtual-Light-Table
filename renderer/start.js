'use strict';

const {ipcRenderer} = require('electron');

ipcRenderer.on('startup-status', (event, statusText) => {
    $('#status').html(statusText);
});