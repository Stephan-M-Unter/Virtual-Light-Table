'use strict';

const {ipcRenderer} = require('electron');
const { UploadController } = require('./classes/UploadController.js');
const LOGGER = require('../statics/LOGGER');
const Dialogs = require('dialogs');
const { external } = require('jszip');

const controller = new UploadController('recto_canvas', 'verso_canvas', notify);

let canvasLock = null;
let tensorflow_available = null;
let dragCounter = 0; // neccessary event counter for file drag&drop
let lastGeneralCursorMode = "move"; // last mode applicable to all maskModes, needed in case of mask switch (see setMaskMode())

$(document).ready(function () {
    controller.resize();
});



/* ------------------------------ */
/*           FUNCTIONS            */
/* ------------------------------ */

function notify() {
    checkActiveCanvases();
    checkMeasuring();
    gatherPPI();
    checkFields();
}

function checkActiveCanvases() {
    if (controller.recto.isActive()) {
        $('#recto_canvas').addClass('active');
        $('#recto_upload_wrapper').addClass('unrendered');
        $('#recto_button_region').removeClass('hidden');
    }
    else {
        $('#recto_canvas').removeClass('active');
        $('#recto_upload_wrapper').removeClass('unrendered');
        $('#recto_button_region').addClass('hidden');
    }

    if (controller.verso.isActive()) {
        $('#verso_canvas').addClass('active');
        $('#verso_upload_wrapper').addClass('unrendered');
        $('#verso_button_region').removeClass('hidden');
    }
    else {
        $('#verso_canvas').removeClass('active');
        $('#verso_upload_wrapper').removeClass('unrendered');
        $('#verso_button_region').addClass('hidden');
    }
}

function gatherPPI() {
    let recto_ppi = controller.getProperty('recto', 'ppi');
    if ((!isNaN(recto_ppi)) && (recto_ppi !== null) && (recto_ppi !== '')) {
        recto_ppi = recto_ppi.toFixed(2);
    }
    $('#recto_ppi').val(recto_ppi);

    let verso_ppi = controller.getProperty('verso', 'ppi');
    if ((!isNaN(verso_ppi)) && (verso_ppi !== null) && (verso_ppi !== '')) {
        verso_ppi = verso_ppi.toFixed(2);
    }
    $('#verso_ppi').val(verso_ppi);
}

function checkMeasuring() {
    if (!(controller.recto.isMeasuring()) && !(controller.verso.isMeasuring())) {
        setCursorMode(lastGeneralCursorMode);
    }
}

function checkFields() {
    let valid = true;
    valid = checkPPIField('recto') && valid;
    valid = checkPPIField('verso') && valid;
    valid = checkObjectName() && valid;

    $('#upload_button').addClass('disabled');
    if (valid) {
        $('#upload_button').removeClass('disabled');
    }
}

function checkPPIField(side) {
    if (!controller.sideHasContent(side)) {
        // No image on this side, no need to check
        return true;
    }

    const ppi = $(`#${side}_ppi`);
    let valid = true;
    ppi.removeClass('missing');
    
    if (controller.sideHasContent(side)) {
        valid = !(ppi.val() === null || isNaN(ppi.val()) || ppi.val() === '');
    }
    if (!valid) {
        ppi.addClass('missing');
    }
    return valid;
}

function checkObjectName() {
    const objectField = $('#objectname');
    let valid = true;
    objectField.removeClass('missing');
    if (objectField.val() === null || objectField.val() === '') {
        valid = false;
        objectField.addClass('missing');
    }
    return valid;
}

function handleMouseWheel(event) {
    const zoomDirection = event.originalEvent.deltaY < 0 ? 1 : -1;
    controller.zoom(zoomDirection);
};

function localUpload(event) {
    if (canvasLock === null) {
        const side = $(event.target).attr('canvas');
        canvasLock = side;
        send('server-upload-image');
    }
};

function wwwUpload(event) {
    if (canvasLock === null) {
        const side = $(event.target).attr('canvas');
        canvasLock = side;
        
        try {
            new Dialogs().prompt('Enter image URL:', (url) => {
                if (url != '' && url != null) {
                    controller.setProperty(canvasLock, 'filepath', url);
                    controller.setProperty(canvasLock, 'is_www', true);
                    controller.draw(canvasLock);
                }
                canvasLock = null;
            });
        }
        catch {
            alert('Please make sure your image URL leads to an image file (jpg, png)!');
            canvasLock = null;
        }
    }
};

function deleteImage(event) {
    const side = $(event.target).attr('canvas');
    controller.deleteContent(side);
    // clear potential PPI information
    const ppi = $(`${side}_ppi`);
    ppi.val('');
    updateGUI();
};

function rotateImage90(event) {
    const side = $(event.target).attr('canvas');
    controller.rotateImage(side, 90);
};

function centerImage(event) {
    const side = $(event.target).attr('canvas');
    controller.centerImage(side);
};

function measurePPI(event) {
    handleCursorModeChange(event);
    if (controller.getCursorMode() === 'measure_recto') {
        $('#recto_canvas').on('mousemove', handleMouseMove);
    } else {
        $('#recto_canvas').off('mousemove', handleMouseMove);
    }

    if (controller.getCursorMode() === 'measure_verso') {
        $('#verso_canvas').on('mousemove', handleMouseMove);
    } else {
        $('#verso_canvas').off('mousemove', handleMouseMove);
    }
};

function setCursorMode(mode) {
    $('.active_mode').removeClass('active_mode');
    $('#recto_canvas').removeClass('move rotate add_polygon_node remove_polygon_node measure');
    $('#verso_canvas').removeClass('move rotate add_polygon_node remove_polygon_node measure');

    console.log(`Setting cursor mode to ${mode}`);
    $('.active_mode').removeClass('active_mode');

    if (mode === 'measure_recto') {
        $('#recto_canvas').addClass('measure');
    }
    else if (mode === 'measure_verso') {
        $('#verso_canvas').addClass('measure');
    }
    else {
        $('#recto_canvas').addClass(mode);
        $('#verso_canvas').addClass(mode);
    }

    $(`#${mode}`).addClass('active_mode');
    controller.setCursorMode(mode);

    if (['move', 'rotate', 'none'].includes(mode)) {
        lastGeneralCursorMode = mode;
    }
};

function handleCursorModeChange(event) {
    let mode = $(event.target).attr('mode');
    const alreadyActive = $(`#${mode}`).hasClass('active_mode');
    if (alreadyActive) {
        // mode is already active, so we deactivate it and set the
        // cursorMode to "none"
        mode = 'none';
    }

    setCursorMode(mode);
}

function swapImages(event) {
    controller.swap();
};

function proposeObjectName(filepath) {
    if ($('#objectname').val() == '') {
        let name = filepath.split('\\').pop().split('/').pop();
        name = name.replace(/\.[^/.]+$/, '');
        $('#objectname').val(name);
    }
    // checkFields();
}

function loadNewImage(filepath) {
    if (filepath) {
        controller.setProperty(canvasLock, 'filepath', filepath);
        controller.centerImage(canvasLock);
        controller.draw(canvasLock);
        proposeObjectName(filepath);
    }
    canvasLock = null;
    checkFields();
    updateGUI();
}

function handleMouseDown(event) {
    const side = $(event.target).attr('id').split('_')[0];
    controller.handleMouseDown(event, side);
}

function handleMouseUp(event) {
    controller.handleMouseUp(event);
}

function updateGUI() {
    const recto_has_content = controller.sideHasContent('recto');
    const verso_has_content = controller.sideHasContent('verso');

    if (recto_has_content) {
        $('#recto_button_region').removeClass('hidden');
        $('#button_region').removeClass('hidden');
        $('#load_region').removeClass('unrendered');
        $('#mask_region').removeClass('unrendered');
        $('#recto_canvas').addClass('active');
        $('#recto_upload_wrapper').addClass('unrendered');
    } else {
        $('#recto_canvas').removeClass('active');
        $('#recto_upload_wrapper').removeClass('unrendered');
        $('#recto_button_region').addClass('hidden');
    }
    if (verso_has_content) {
        $('#verso_button_region').removeClass('hidden');
        $('#button_region').removeClass('hidden');
        $('#load_region').removeClass('unrendered');
        $('#mask_region').removeClass('unrendered');
        $('#verso_upload_wrapper').addClass('unrendered');
        $('#verso_canvas').addClass('active');
    } else {
        $('#verso_canvas').removeClass('active');
        $('#verso_upload_wrapper').removeClass('unrendered');
        $('#verso_button_region').addClass('hidden');
    }

    if (!recto_has_content && !verso_has_content) {
        $('#button_region').addClass('hidden');
        $('#load_region').addClass('unrendered');
        $('#mask_region').addClass('unrendered');
    }
}

function scaleImages(event) {
    const side = $(event.target).attr('canvas');
    const ppi = $(`#${side}_ppi`).val();
    controller.scaleImages(ppi, side);
};

function toggleMaskList(event) {
    const list = $('.list');
    if (list.hasClass('open')) {
        // close mask selection list and activate selected mask mode
        list.removeClass('open');
        let listItem = $(event.target);
        if (!listItem.hasClass('list_item')) {
            listItem = listItem.parent();
        }
        const maskMode = listItem.attr('mask_mode');
        setMaskMode(maskMode);
        if (maskMode !== 'polygon') {
            setCursorMode(lastGeneralCursorMode);
        }
    } else {
        // open mask selection list
        list.addClass('open');
    }
};

function setMaskMode(maskMode) {
    $('.selected').removeClass('selected');
    $('.list_item.'+maskMode).addClass('selected');
    $('.mask_controls.'+maskMode).addClass('selected');
    $('.mask_explanation.'+maskMode).addClass('selected');

    if (maskMode.includes('automatic')) {
        if (tensorflow_available === null) {
            send('server-check-tensorflow');
        } else {
            displayMLTools();
        }
    }

    controller.setMaskMode(maskMode);
    checkFields();
}

function resetBox() {
    controller.resetBox();
}

function undoPolygonNode() {
    controller.undoPolygonNode();
}

function clearPolygonMask() {
    controller.clearPolygonMask();
}

function displayMLTools() {
    if (tensorflow_available) {
        $('#mask_control_automatic_selection_panel').removeClass('unrendered');
        const modelRequest = {
            'code': 'SEG',
            'requiredCapacities': ['papyrus'],
        }
        send('server-get-ml-models', modelRequest);
    } else {
        $('#mask_control_tensorflow_panel').removeClass('unrendered');
    }
}

function loadMLModels(models) {
    for (const model of models) {
        const modelID = model['modelID'];
        const size = model['size'];
        let text = `${model['name']} (${size})`;
    
        if (model['localPath']) {
          text = '✅ ' + text;
        } else if (model['unreachable']) {
          text = '❌ ' + text;
        }
    
        const option = $('<option>', {
          value: modelID,
          text: text,
        });
        $('#mask_automatic_model').append(option);
      }
    $('#mask_automatic_model').trigger('change');
}

function openSettings() {
    send('server-open-settings');
}

function selectModel(event) {
    console.log("'HIIIIIIIIII");
    const modelID = $(event.target).val();
    const modelName = $(event.target).find(':selected').text();

    console.log(modelID, modelName);

    if (modelName.includes('✅')) {
        $('#model-download').addClass('unrendered');
        $('#compute-mask').removeClass('unrendered');
    } else {
        $('#model-download').removeClass('unrendered');
        $('#compute-mask').addClass('unrendered');
    }
}
function uploadData() {
    const buttonDisabled = $('#upload_button').hasClass('disabled');
    if (buttonDisabled) {
        return;
    }
}
function updateMaskOpacity(event) {}

function updateBrushSize(event) {
    const size = $('#mask_control_brush_slider').val();
    controller.setBrushSize(size);
}

function requestTPOPAlternatives() {}
function selectTPOPAlternative(event) {}

function closeTPOPAlternatives() {
    $('#tpop-select-overlay').addClass('unrendered');
}

function downloadModel(event) {}
function computeMask(event) {}

function handleDragEnter(event) {
    event.preventDefault();
    event.stopPropagation();
    dragCounter += 1;
    if (!controller.recto.isActive()) {
      $('#recto_canvas_region .overlay-drop').css('display', 'flex');
      $('#recto_upload_wrapper').addClass('unrendered');
    }
    if (!controller.verso.isActive()) {
        $('#verso_canvas_region .overlay-drop').css('display', 'flex');
        $('#verso_upload_wrapper').addClass('unrendered');
    }
}

function handleDragLeave(event) {
    event.preventDefault();
    event.stopPropagation();
    dragCounter -= 1;
    if (dragCounter <= 0) {
        dragCounter = 0;
        $('#recto_canvas_region .overlay-drop').css('display', 'none');
        $('#verso_canvas_region .overlay-drop').css('display', 'none');
        $('#recto_upload_wrapper').removeClass('unrendered');
        $('#verso_upload_wrapper').removeClass('unrendered');
    }
}

function handleDragOver(event) {
    event.preventDefault();
}

function handleDrop(e) {
    e.preventDefault();
    dragCounter = 0;
    $('#recto_canvas_region .overlay-drop').css('display', 'none');
    $('#verso_canvas_region .overlay-drop').css('display', 'none');
    $('#recto_upload_wrapper').removeClass('unrendered');
    $('#verso_upload_wrapper').removeClass('unrendered');

    if ($(e.target).hasClass('drop') && canvasLock === null) {
        e.stopPropagation();
        canvasLock = $(e.target).attr('canvas')
        if (!canvasLock) {
            // if the canvasLock is not yet set, try with the parent element
            canvasLock = $(e.target).parent().attr('canvas')
        }
        let pathArr = [];
        for (const f of event.dataTransfer.files) {
          pathArr.push(f.path);
        }
        
        send('server-upload-image-given-filepath', pathArr[0]);
    }
}

function handleMouseMove(event) {
    let side = null;
    if ($(event.target).attr('id').includes('canvas')) {
        side = $(event.target).attr('id').split('_')[0];
    }
    controller.handleMouseMove(event, side)
}

/* ------------------------------ */
/*           EVENTS               */
/* ------------------------------ */


$(window).keyup(checkFields);
$(window).resize(controller.resize());
$(window).on('mousewheel', handleMouseWheel);

$('.local_upload').click(localUpload);
$('.www_upload').click(wwwUpload);
$('.delete').click(deleteImage);
$('.rotate_90').click(rotateImage90);
$('.center').click(centerImage);
$('.measure').click(measurePPI);
$('.input_ppi').on('input', scaleImages);
$('.list_item').click(toggleMaskList);
$('.overlay-drop').on('drop', handleDrop);

$('#move').click(handleCursorModeChange);
$('#swap').click(swapImages);
$('#rotate').click(handleCursorModeChange);
$('#reset_box').click(resetBox);
$('#add_polygon_node').click(handleCursorModeChange);
$('#remove_polygon_node').click(handleCursorModeChange);
$('#undo_polygon_node').click(undoPolygonNode);
$('#clear_polygon').click(clearPolygonMask);
$('#open-settings').click(openSettings);
$('#upload_button').click(uploadData);
$('#tpop_choose').click(requestTPOPAlternatives);
$('#tpop_select').click(selectTPOPAlternative);
$('#tpop-close').click(closeTPOPAlternatives);
$('#model-download').click(downloadModel);
$('#compute-mask').click(computeMask);
$('#mask_automatic_model').on('change', selectModel);
$('#mask_control_opacity_slider').on('change input', updateMaskOpacity);
$('#mask_control_brush_slider').on('change input', updateBrushSize);

$('#recto_canvas').on('mousedown', handleMouseDown);
$('#verso_canvas').on('mousedown', handleMouseDown);
$(window).on('mouseup', handleMouseUp);
$(window).on('mouseup', handleMouseUp);
$(window).on('dragenter', handleDragEnter);
$(window).on('dragleave', handleDragLeave);
$(window).on('dragover', handleDragOver);
$(window).on('drop', handleDrop);


/* ------------------------------ */
/*
    III   PPPPPP      CCCCCC
    III   PPP   P    CCCCCCCCC
    III   PPP    P  CCCC    CC 
    III   PPP   P   CCC        
    III   PPPPPP    CCC
    III   PPP       CCCC    CC 
    III   PPP        CCCCCCCCC
    III   PPP          CCCCC
*/
/* ------------------------------ */

function send(message, data=null) {
    LOGGER.send('UPLOAD', message, data);
    ipcRenderer.send(message, data);
}

/* upload-receive-image */
ipcRenderer.on('upload-receive-image', (event, filepath) => {
    LOGGER.receive('UPLOAD', 'upload-receive-image', filepath);
    loadNewImage(filepath);
});

/* upload-fragment */
ipcRenderer.on('upload-fragment', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-fragment', data);

});

/* upload-tpop-images */
ipcRenderer.on('upload-tpop-images', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-tpop-images', data);
});

/* model-availability */
ipcRenderer.on('model-availability', (event, data) => {
    LOGGER.receive('UPLOAD', 'model-availability', data);
});

/* tensorflow-checked */
ipcRenderer.on('tensorflow-checked', (event, tensorflow_checked) => {
    LOGGER.receive('UPLOAD', 'tensorflow-checked', tensorflow_checked);
    tensorflow_available = tensorflow_checked;
    displayMLTools();
});

/* tensorflow-installed */
ipcRenderer.on('tensorflow-installed', (event, tensorflow_installed) => {
    LOGGER.receive('UPLOAD', 'tensorflow-installed', tensorflow_installed);
    if (tensorflowInstalled) {
        $('#mask_control_tensorflow_panel').addClass('unrendered');
        $('#mask_control_automatic_selection_panel').removeClass('unrendered');
        tensorflow_available = true;
    }
});

/* upload-masks-computed */
ipcRenderer.on('upload-masks-computed', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-masks-computed', data);
});

/* upload-images-cut */
ipcRenderer.on('upload-images-cut', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-images-cut', data);
});

/* upload-mask-edited */
ipcRenderer.on('upload-mask-edited', (event) => {
    LOGGER.receive('UPLOAD', 'upload-mask-edited');
});

/* ml-models */
ipcRenderer.on('ml-models', (event, models) => {
    LOGGER.receive('UPLOAD', 'ml-models', models);
    loadMLModels(models);
});
