const { ipcRenderer } = require("electron");

$(document).ready(function() {
    ipcRenderer.send('server-settings-opened');
});

ipcRenderer.on('settings-data', (event, settingsData) => {
    console.log(settingsData);
});