'use strict';

const {ipcRenderer} = require('electron');
const { UploadController } = require('./classes/UploadController.js');
const LOGGER = require('../statics/LOGGER');
const Dialogs = require('dialogs');

const controller = new UploadController('recto_canvas', 'verso_canvas');

let canvasLock = null;
let lastGeneralCursorMode = "move"; // last mode applicable to all maskModes, needed in case of mask switch (see setMaskMode())


$(document).ready(function () {
    controller.resize();
});



/* ------------------------------ */
/*           FUNCTIONS            */
/* ------------------------------ */

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

function measurePPI(event) {};

function setCursorMode(event) {
    let mode = $(event.target).attr('mode');
    const alreadyActive = $(`#${mode}`).hasClass('active_mode');

    $('.active_mode').removeClass('active_mode');
    $('#recto_canvas').removeClass('move rotate add_polygon_node remove_polygon_node');
    $('#verso_canvas').removeClass('move rotate add_polygon_node remove_polygon_node');
    
    if (alreadyActive) {
        // mode is already active, so we deactivate it and set the
        // cursorMode to "none"
        mode = 'none';
    }
    
    console.log(`Setting cursor mode to ${mode}`);
    $('.active_mode').removeClass('active_mode');
    $('#recto_canvas').addClass(mode);
    $('#verso_canvas').addClass(mode);
    $(`#${mode}`).addClass('active_mode');
    controller.setCursorMode(mode);

    if (['move', 'rotate', 'none'].includes(mode)) {
        lastGeneralCursorMode = mode;
    }


};

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
            $(`#${lastGeneralCursorMode}`).click();
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

$('#move').click(setCursorMode);
$('#swap').click(swapImages);
$('#rotate').click(setCursorMode);
$('#reset_box').click(resetBox);
$('#add_polygon_node').click(setCursorMode);
$('#remove_polygon_node').click(setCursorMode);
$('#undo_polygon_node').click(undoPolygonNode);
$('#clear_polygon').click(clearPolygonMask);

$('#recto_canvas').on('mousedown', handleMouseDown);
$('#verso_canvas').on('mousedown', handleMouseDown);
$(window).on('mouseup', handleMouseUp);
$(window).on('mouseup', handleMouseUp);





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

ipcRenderer.on('upload-receive-image', (event, filepath) => {
    LOGGER.receive('UPLOAD', 'upload-receive-image', filepath);
    loadNewImage(filepath);
});


ipcRenderer.on('upload-fragment', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-fragment', data);

});


ipcRenderer.on('upload-tpop-images', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-tpop-images', data);
});


ipcRenderer.on('model-availability', (event, data) => {
    LOGGER.receive('UPLOAD', 'model-availability', data);
});


ipcRenderer.on('tensorflow-checked', (event, tensorflow_checked) => {
    LOGGER.receive('UPLOAD', 'tensorflow-checked', tensorflow_checked);
});


ipcRenderer.on('tensorflow-installed', (event, tensorflow_installed) => {
    LOGGER.receive('UPLOAD', 'tensorflow-installed', tensorflow_installed);
});


ipcRenderer.on('upload-masks-computed', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-masks-computed', data);
});


ipcRenderer.on('upload-images-cut', (event, data) => {
    LOGGER.receive('UPLOAD', 'upload-images-cut', data);
});


ipcRenderer.on('upload-mask-edited', (event) => {
    LOGGER.receive('UPLOAD', 'upload-mask-edited');
});


ipcRenderer.on('ml-models', (event, models) => {
    LOGGER.receive('UPLOAD', 'ml-models', models);
});
