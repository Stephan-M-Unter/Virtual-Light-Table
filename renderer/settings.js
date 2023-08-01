const { ipcRenderer } = require("electron");
const LOGGER = require('../statics/LOGGER');

$(document).ready(function() {
    $('#save-path').attr('readonly', true);
    const request = {
        'code': '',
        'requiredCapacities': [],
    }
});

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
    if (!('ignoreUpdates') in config || !config.ignoreUpdates) {
        $('#check-for-updates').prop('checked', true);
    }
}

function saveData() {
    const config = {
        'ppi': $('#ppi').html(),
        'minZoom': $('#minZoom').val(),
        'maxZoom': $('#maxZoom').val(),
        'stepZoom': $('#stepZoom').val(),
        'vltFolder': $('#save-path').val(),
        'ignoreUpdates': !$('#check-for-updates').is(':checked'),
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

function movePanel(event) {
    const order = ['main', 'ml'];

    const currentName = $('.on-display').attr('id');
    const targetName = $(event.target).attr('target');

    const target = $(`#${targetName}`);
    const current = $(`#${currentName}`);

    const moveToLeft = order.indexOf(targetName) > order.indexOf(currentName);

    if (moveToLeft) {
        target.css('left', '100%');
        target.removeClass('hidden');
        current.stop().animate({left: '-100%'}, 500, function() {
            current.addClass('hidden');
        });
        target.stop().animate({left: '0%'}, 500);
    } else {
        target.css('left', '-100%');
        target.removeClass('hidden');
        current.stop().animate({left: '100%'}, 500, function() {
            current.addClass('hidden');
        });
        target.stop().animate({left: '0%'}, 500);
    }
    current.removeClass('on-display');
    target.addClass('on-display');

}

function loadModels(models) {
    $('#ml-models').empty();
    for (const model of models) {
        const modelID = model['modelID'];
        let name = model['name'];
        const downloaded = model['localPath'] != null;
        const size = model['size'];

        name = `${name} (${size})`;

        // create option elements per model
        const option = $('<option></option>');
        option.attr('value', modelID);
        if (downloaded) {
            name = '✅ ' + name;
        } else if (model.unreachable) {
            name = '❌ ' + name;
        }
        option.html(name);
        $('#ml-models').append(option);
    }
    $('#ml-models').trigger('change');
}

function downloadModel() {
    const modelID = $('#ml-models').val();
    const buttonImage = $('#ml-download img');
    buttonImage.attr('src', '../imgs/VLT_small.gif');
    ipcRenderer.send('server-download-model', modelID);
}

function deleteModel() {
    const modelID = $('#ml-models').val();
    ipcRenderer.send('server-delete-model', modelID);
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
$('#tensorflow-download').click(function() {
    ipcRenderer.send('server-install-tensorflow');
});
$('.link').click(movePanel);
$('#ml-reload').click(function() {
    ipcRenderer.send('server-reload-ml');
});
$('#ml-models').change(function() {
    const modelName = $('#ml-models option:selected').text();
    if (modelName.includes('✅')) {
        $('#ml-delete').removeClass('unrendered');
        if (!(modelName.includes('❌'))) {
            $('#ml-download').addClass('unrendered');
        }
    } else {
        $('#ml-download').removeClass('unrendered');
        $('#ml-delete').addClass('unrendered');
    }
});
$('#ml-download').click(downloadModel);
$('#ml-delete').click(deleteModel);


ipcRenderer.on('settings-data', (event, settingsData) => {
    LOGGER.receive('settings-data', settingsData);
    loadData(settingsData);
});

ipcRenderer.on('tensorflow-installed', (event, result) => {
    LOGGER.receive('tensorflow-installed', result);
    if (result) {
        $('#tensorflow-installation').addClass('unrendered');
        $('#tensorflow-installed').removeClass('unrendered');
        $('#ml-settings').removeClass('unrendered');
    } else {
        $('#tensorflow-installation').removeClass('unrendered');
        $('#tensorflow-installed').addClass('unrendered');
        $('#ml-settings').addClass('unrendered');
    }
});

ipcRenderer.on('ml-models', (event, models) => {
    LOGGER.receive('ml-models', models);
    loadModels(models);
});

ipcRenderer.on('model-availability', (event, responseData) => {
    LOGGER.receive('model-availability', responseData);
    const modelOption = $(`#ml-models option[value="${responseData.modelID}"]`);
    const buttonImage = $('#ml-download img');
    buttonImage.attr('src', '../imgs/symbol_download.png');
    if (responseData.modelAvailability) {
        modelOption.html('✅ ' + modelOption.html());
        $('#ml-delete').removeClass('unrendered');
        $('#ml-download').addClass('unrendered');
    } else {
        modelOption.html(modelOption.html().replace('✅ ', ''));
        $('#ml-delete').addClass('unrendered');
        $('#ml-download').removeClass('unrendered');
    }
});
