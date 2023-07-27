'use strict';

const {ipcRenderer} = require('electron');

$(document).ready(function() {});

$('#update').click(function() {
    ipcRenderer.send('server-open-update-page');
    ipcRenderer.send('server-close-update');
});
$('#cancel').click(function() {
    ipcRenderer.send('server-close-update');
});
$('#ignore').click(function() {
    ipcRenderer.send('server-ignore-updates');
    ipcRenderer.send('server-close-update');
});

ipcRenderer.on('update-available', (event, versionData) => {
    $('#current-version').html(versionData.currentVersion);
    $('#latest-version').html(`${versionData.version} (${versionData.date})`);
    $('#changes').append(`<ul id="changes-list"></ul>`);
    for (const entry of versionData.changes) {
        $('#changes-list').append(`<li>${entry}</li>`);
    }
});