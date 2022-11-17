const { ipcRenderer } = require("electron");
const LOGGER = require('../statics/LOGGER');

function loadData(config) {
    if ('ppi' in config && config.ppi) {
        const ppi = Math.round(config.ppi * 100) / 100;
        $('#ppi').html(ppi);
    }
    if ('minZoom' in config && config.minZoom) {
        $('#minZoom').val(config.minZoom);
    }
    if ('maxZoom' in config && config.maxZoom) {
        $('#maxZoom').val(config.maxZoom);
    }
    if ('vltFolder' in config && config.vltFolder) {
        $('#save-path').val(config.vltFolder);
    }
    if ('stepZoom' in config && config.stepZoom) {
        $('#stepZoom').val(config.stepZoom);
    }
}

function saveData() {
    const config = {
        'ppi': $('#ppi').html(),
        'minZoom': $('#minZoom').val(),
        'maxZoom': $('#maxZoom').val(),
        'stepZoom': $('#stepZoom').val(),
        'vltFolder': $('#save-path').val(),
    };
    if (verifyZoomValues()) {
        ipcRenderer.send('server-save-config', config);
    }
}

function verifyZoomValues() {
    let valid = true;
    const minZoom = $('#minZoom').val();
    const maxZoom = $('#maxZoom').val();
    const stepZoom = $('#stepZoom').val();

    if (!Number(minZoom) && minZoom != 0) {
        $('#minZoom').addClass('error');
        valid = false;
    }
    if (!Number(maxZoom)) {
        $('#maxZoom').addClass('error');
        valid = false;
    }
    if (!Number(stepZoom)) {
        $('#stepZoom').addClass('error');
        valid = false;
    }
    
    if (minZoom < 0) {
        $('#minZoom').addClass('error');
        valid = false;
    }
    if (stepZoom <= 0) {
        $('#stepZoom').addClass('error');
        valid = false;
    }
    
    if (minZoom > maxZoom) {
        $('#minZoom').addClass('error');
        $('#maxZoom').addClass('error');
        valid = false;
    }

    if (stepZoom > (maxZoom-minZoom)) {
        $('#stepZoom').addClass('error');
        valid = false;
    }
    
    if (valid) {
        $('#minZoom').removeClass('error');
        $('#maxZoom').removeClass('error');
        $('#stepZoom').removeClass('error');
        return true;
    } else {
        return false;
    }
}


$('#abort').click(function() {
    ipcRenderer.send('server-close-settings');
});
$('#save').click(function() {
    saveData();
});
$('#select-save').click(function() {
    ipcRenderer.send('server-select-folder', 'vltFolder');
});
$('#calibrate').click(function() {
    ipcRenderer.send('server-open-calibration');
});
$('#minZoom').on('keyup', function(event) {
    verifyZoomValues();
});
$('#maxZoom').on('keyup', function(event) {
    verifyZoomValues();
});
$('#stepZoom').on('keyup', function() {
    verifyZoomValues();
});
$('#default-save').click(function() {
    ipcRenderer.send('server-get-default', 'vltFolder');
});


$(document).ready(function() {
    $('#save-path').attr('readonly', true);
    ipcRenderer.send('server-settings-opened');
});

ipcRenderer.on('settings-data', (event, settingsData) => {
    LOGGER.receive('settings-data', settingsData);
    // console.log('Received message: [settings-data]', settingsData);
    loadData(settingsData);
});