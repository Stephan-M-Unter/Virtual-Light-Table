'use strict';

const {ipcRenderer} = require('electron');
const LOGGER = require('../statics/LOGGER');

let recto;
let verso;
let scaleMode = 'hidden';
const recto_scale = new createjs.Container();
recto_scale.name = 'Recto Scale';
const verso_scale = new createjs.Container();
verso_scale.name = 'Verso Scale';
const recto_rgb = new createjs.Container();
recto_rgb.name = 'Recto RGB';
const verso_rgb = new createjs.Container();
verso_rgb.name = 'Verso RGB';
const recto_filters = new createjs.Container();
recto_filters.name = 'Recto Filters';
const verso_filters = new createjs.Container();
verso_filters.name = 'Verso Filters';
const recto_facsimile = new createjs.Container();
recto_facsimile.name = 'Recto Facsimile';
const verso_facsimile = new createjs.Container();
verso_facsimile.name = 'Verso Facsimile';

let objects = {};

$(document).ready(function(){
    recto = new createjs.Stage('canvas-recto');
    verso = new createjs.Stage('canvas-verso');



    recto.addChild(recto_rgb, recto_filters, recto_facsimile);
    verso.addChild(verso_rgb, verso_filters, verso_facsimile);

    recto.addChild(recto_scale);
    verso.addChild(verso_scale);

    resizeCanvas();
    updateColorpicker();

    send('server-get-active-table', null);
    send('server-check-tensorflow');
});

function send(message, data) {
    LOGGER.send('EXPORT', message, data);
    ipcRenderer.send(message, data);
}

function resizeCanvas() {
    recto.canvas.width = $('#canvas-recto').innerWidth();
    recto.canvas.height = $('#canvas-recto').innerHeight();
    verso.canvas.width = $('#canvas-verso').innerWidth();
    verso.canvas.height = $('#canvas-verso').innerHeight();

    recto.update();
    verso.update();
}

function loadObjects(imageMode='rgb') {
    /*
    Create a new createjs loadingqueue and load all images as given per url_view in the objects list.
    We insert the image urls together with the corresponding object id in the queue.
    Whenever an image is loaded, we check if the image is a recto or a verso image and add it to the corresponding canvas.
    */

    if (imageMode === 'rgb') {
        recto_rgb.removeAllChildren();
        verso_rgb.removeAllChildren();
    } else if (imageMode === 'filters') {
        recto_filters.removeAllChildren();
        verso_filters.removeAllChildren();
    } else if (imageMode === 'facsimile') {
        recto_facsimile.removeAllChildren();
        verso_facsimile.removeAllChildren();
    }

    const queue = new createjs.LoadQueue();
    for (const fragment_id in objects) {
        const fragment = objects[fragment_id];
        const url_recto = fragment['recto']['url'][imageMode];
        const url_verso = fragment['verso']['url'][imageMode];
        queue.loadFile({'id': fragment_id, 'imageMode': imageMode, 'side': 'recto', 'src': url_recto});
        queue.loadFile({'id': fragment_id, 'imageMode': imageMode, 'side': 'verso', 'src': url_verso});
    }
    queue.on('fileload', displayImage);
    queue.on('complete', function() {
        recto.removeAllChildren();
        verso.removeAllChildren();
        if (imageMode === 'rgb') {
            recto.addChild(recto_rgb);
            verso.addChild(verso_rgb);
        } else if (imageMode === 'filters') {
            recto.addChild(recto_filters);
            verso.addChild(verso_filters);
        } else if (imageMode === 'facsimile') {
            recto.addChild(recto_facsimile);
            verso.addChild(verso_facsimile);
        }
        recto.addChild(recto_scale);
        verso.addChild(verso_scale);
        centerStages();
    });
    
}

function displayImage(event) {
    const id = event.item.id;
    let side = event.item.side;

    const image = new createjs.Bitmap(event.result);
    image.x = objects[id][side]['x'];
    image.y = objects[id][side]['y'];
    image.url = event.item.src;
    image.rotation = objects[id][side]['rotation'];

    const imagePPI = objects[id][side]['ppi'];
    const canvasPPI = 96;
    const scale = canvasPPI / imagePPI;
    image.scaleX = scale;
    image.scaleY = scale;

    // set image regX/regY to center
    const bounds = image.getBounds();
    image.regX = bounds.width / 2;
    image.regY = bounds.height / 2;

    const imageMode = event.item.imageMode;
    if (imageMode === 'rgb' && side === 'recto') {
        recto_rgb.addChild(image);
    } else if (imageMode === 'rgb' && side === 'verso') {
        verso_rgb.addChild(image);
    } else if (imageMode === 'filters' && side === 'recto') {
        recto_filters.addChild(image);
    } else if (imageMode === 'filters' && side === 'verso') {
        verso_filters.addChild(image);
    } else if (imageMode === 'facsimile' && side === 'recto') {
        recto_facsimile.addChild(image);
    } else if (imageMode === 'facsimile' && side === 'verso') {
        verso_facsimile.addChild(image);
    }
}

function centerStages() {
    let recto_bounds = recto.getBounds();
    let verso_bounds = verso.getBounds();

    if (recto_bounds === null) {
        recto_bounds = {width: 1, height: 1};
    }
    if (verso_bounds === null) {
        verso_bounds = {width: 1, height: 1};
    }

    // determine scaling ratio to ensure that the image fits on the canvas
    const recto_scale_x = recto.canvas.width / recto_bounds.width;
    const recto_scale_y = recto.canvas.height / recto_bounds.height;
    const verso_scale_x = verso.canvas.width / verso_bounds.width;
    const verso_scale_y = verso.canvas.height / verso_bounds.height;
    const scale_ratio = Math.min(recto_scale_x, recto_scale_y, verso_scale_x, verso_scale_y);
    recto.scale = scale_ratio;
    verso.scale = scale_ratio;

    resizeCanvas();

    // determine the center of the canvas and the center of the image
    // also take into account the scale of the canvas

    const recto_center_x = recto.canvas.width / (2 * recto.scale);
    const recto_center_y = recto.canvas.height / (2 * recto.scale);
    const verso_center_x = verso.canvas.width / (2 * verso.scale);
    const verso_center_y = verso.canvas.height / (2 * verso.scale);

    const recto_center_bounds_x = recto_bounds.x + recto_bounds.width / 2;
    const recto_center_bounds_y = recto_bounds.y + recto_bounds.height / 2;
    const verso_center_bounds_x = verso_bounds.x + verso_bounds.width / 2;
    const verso_center_bounds_y = verso_bounds.y + verso_bounds.height / 2;

    // calculate the difference between the center of the canvas and the center of the image
    // this is the amount by which we need to move the image to center it on the canvas
    const recto_dx = recto_center_x - recto_center_bounds_x;
    const recto_dy = recto_center_y - recto_center_bounds_y;
    const verso_dx = verso_center_x - verso_center_bounds_x;
    const verso_dy = verso_center_y - verso_center_bounds_y;

    // iterate over all children of the stage and move them by the calculated dx and dy
    for (const child of recto.children) {
        child.x += recto_dx;
        child.y += recto_dy;
    }
    for (const child of verso.children) {
        child.x += verso_dx;
        child.y += verso_dy;
    }

    

    recto.update();
    verso.update();
}

function hexToRgb(hex) {
    // https://stackoverflow.com/questions/5623838/rgb-to-hex-and-hex-to-rgb
    const bigint = parseInt(hex.substring(1), 16);
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return {'r': r, 'g': g, 'b': b};
}

function updateColorpicker() {
    const color = $('#colorpicker').val();
    $('#jpg-color').css('background-color', color);
    // if contrast is too low, change text color to white
    const rgb = hexToRgb(color);
    const brightness = Math.round(((parseInt(rgb.r) * 299) + (parseInt(rgb.g) * 587) + (parseInt(rgb.b) * 114)) / 1000);
    if (brightness > 125) {
        $('#jpg-color').css('color', 'black');
    }
    else {
        $('#jpg-color').css('color', 'white');
    }

}

function updateCanvasBorder(noBackground=false) {
    const color = $('#colorpicker').val();
    $('#jpg-color').css('background-color', color);
    // if contrast is too low, change text color to white
    const rgb = hexToRgb(color);
    const brightness = Math.round(((parseInt(rgb.r) * 299) + (parseInt(rgb.g) * 587) + (parseInt(rgb.b) * 114)) / 1000);
    if (brightness > 125 || noBackground) {
        $('.wrapper-canvas.recto').css('border-color', 'black');
        $('.wrapper-canvas.verso').css('border-color', 'black');
    }
    else {
        $('.wrapper-canvas.recto').css('border-color', 'white');
        $('.wrapper-canvas.verso').css('border-color', 'white');
    }
}

function JPGPreview(event) {
    updateColorpicker();
    const showPreview = (event.type != 'mouseout' && event.type != 'click') || $('#jpg-button').hasClass('active-format');
    const color = $('#colorpicker').val();
    if (showPreview) {
        $('#canvas-recto').css('background-color', color);
        $('#canvas-verso').css('background-color', color);
        updateCanvasBorder();
    } else {
        $('#canvas-recto').css('background-color', '');
        $('#canvas-verso').css('background-color', '');
        updateCanvasBorder(true);
    }
}

function scale() {
    recto_scale.removeAllChildren();
    verso_scale.removeAllChildren();
    if (scaleMode === '10cm') {
        // remove all children from the recto_scale container and the verso_scale container
        scaleMode = 'hidden';
    } else {
        let distance;
        if (scaleMode === 'hidden') {
            distance = 1;
            scaleMode = '1cm';
        } else {
            distance = 10;
            scaleMode = '10cm';
        }
        const PxRecto = (distance * 96) / 2.54;
        const PxVerso = (distance * 96) / 2.54;
        // create a scale (a black horizontal line of length 1cm with two small vertical strokes at the ends)
        // and scale it according to the canvas scale; then, add it to the canvas scale container
        const scaleRecto = new createjs.Shape();
        scaleRecto.graphics.beginStroke('black').setStrokeStyle(1).moveTo(0, 0).lineTo(PxRecto, 0).endStroke();
        scaleRecto.graphics.beginStroke('black').setStrokeStyle(1).moveTo(0, -5).lineTo(0, 5).endStroke();
        scaleRecto.graphics.beginStroke('black').setStrokeStyle(1).moveTo(PxRecto, -5).lineTo(PxRecto, 5).endStroke();
        recto_scale.addChild(scaleRecto);

        const scaleVerso = new createjs.Shape();
        scaleVerso.graphics.beginStroke('black').setStrokeStyle(1).moveTo(0, 0).lineTo(PxVerso, 0).endStroke();
        scaleVerso.graphics.beginStroke('black').setStrokeStyle(1).moveTo(0, -5).lineTo(0, 5).endStroke();
        scaleVerso.graphics.beginStroke('black').setStrokeStyle(1).moveTo(PxVerso, -5).lineTo(PxVerso, 5).endStroke();
        verso_scale.addChild(scaleVerso);

        // position the scale at the bottom right of the displayed images
        const recto_bounds = recto.getBounds();
        const verso_bounds = verso.getBounds();

        recto_scale.x = recto_bounds.x+recto_bounds.width+40;
        recto_scale.y = recto_bounds.y+recto_bounds.height-40;
        verso_scale.x = verso_bounds.x+verso_bounds.width+40;
        verso_scale.y = verso_bounds.y+verso_bounds.height-40;

        // add a text "1cm" underneath the horizontal line, left aligned
        const textRecto = new createjs.Text(distance+'cm', '12px Arial', 'black');
        textRecto.x = 0;
        textRecto.y = 10;
        textRecto.textAlign = 'center';
        recto_scale.addChild(textRecto);
        
        const textVerso = new createjs.Text(distance+'cm', '12px Arial', 'black');
        textVerso.x = 0;
        textVerso.y = 10;
        textVerso.textAlign = 'center';
        verso_scale.addChild(textVerso);

    }
    recto.update();
    verso.update();
}

function download() {
    const pseudoLink_recto = document.createElement('a');
    const pseudoLink_verso = document.createElement('a');
    const magnifyingFactor = 10;

    // determine file extension
    let extension;
    if ($('#jpg-button').hasClass('active-format')) { extension = 'jpg'; }
    else if ($('#png-button').hasClass('active-format')) { extension = 'png'; }
    else if ($('#tiff-button').hasClass('active-format')) { extension = 'tiff'; }

    // create pseudo canvas elements
    const pseudoCanvas_recto = document.createElement('canvas');
    const pseudoCanvas_verso = document.createElement('canvas');

    // set pseudo canvas dimensions
    pseudoCanvas_recto.width = recto.canvas.width * magnifyingFactor / recto.scaleX;
    pseudoCanvas_recto.height = recto.canvas.height * magnifyingFactor / recto.scaleY;
    pseudoCanvas_verso.width = verso.canvas.width * magnifyingFactor / verso.scaleX;
    pseudoCanvas_verso.height = verso.canvas.height * magnifyingFactor / verso.scaleY;
    
    // adjust pseudo canvas scale to regular scale
    pseudoCanvas_recto.getContext('2d').scale(magnifyingFactor, magnifyingFactor);
    pseudoCanvas_verso.getContext('2d').scale(magnifyingFactor, magnifyingFactor);
    
    // get pseudo canvas contexts
    const pseudoContext_recto = pseudoCanvas_recto.getContext('2d');
    const pseudoContext_verso = pseudoCanvas_verso.getContext('2d');
    
    // if format is jpg, fill pseudo canvas with selected background color
    if (extension === 'jpg') {
        const color = $('#colorpicker').val();
        pseudoContext_recto.fillStyle = color;
        pseudoContext_recto.fillRect(0, 0, pseudoCanvas_recto.width, pseudoCanvas_recto.height);
        pseudoContext_verso.fillStyle = color;
        pseudoContext_verso.fillRect(0, 0, pseudoCanvas_verso.width, pseudoCanvas_verso.height);
    }

    // draw the stage onto the pseudo canvas
    recto.draw(pseudoContext_recto);
    verso.draw(pseudoContext_verso);

    // convert the pseudo canvas to a data url
    const dataURL_recto = pseudoCanvas_recto.toDataURL(`image/${extension}`);	
    const dataURL_verso = pseudoCanvas_verso.toDataURL(`image/${extension}`);

    // set the pseudo link's href to the data url
    pseudoLink_recto.href = dataURL_recto;
    pseudoLink_verso.href = dataURL_verso;

    // set the pseudo link's download attribute to the filename
    pseudoLink_recto.download = `recto.${extension}`;
    pseudoLink_verso.download = `verso.${extension}`;

    // trigger the download
    pseudoLink_recto.click();
    pseudoLink_verso.click();
}

function getURLs() {
    const urls = [];
    const children = recto.children.concat(verso.children);
    for (const fragment of children) {
        const url = fragment.url;
        if (url) {
            urls.push(url);
        }
    }
    return urls;
}

function requestFilters() {
    const filters = {
        'brightness': $('#graphics-brightness').val(),
        'contrast': $('#graphics-contrast').val(),
        'invertR': $('.flip-button.R').hasClass('inverted'),
        'invertG': $('.flip-button.G').hasClass('inverted'),
        'invertB': $('.flip-button.B').hasClass('inverted'),
    };

    const urls = getURLs();
    const data = {
        urls: urls,
        filters: filters,
    }

    send('server-graphics-filter-export', data);
}

function switchDisplay(imageMode) {
    recto.removeAllChildren();
    verso.removeAllChildren();

    if (imageMode === 'filters' && recto_filters.children.length > 0) {
        recto.addChild(recto_filters);
        verso.addChild(verso_filters);
    }
    else if (imageMode === 'facsimile' && recto_facsimile.children.length > 0) {
        recto.addChild(recto_facsimile);
        verso.addChild(verso_facsimile);
    } else {
        recto.addChild(recto_rgb);
        verso.addChild(verso_rgb);
    }

    recto.addChild(recto_scale);
    verso.addChild(verso_scale);

    centerStages();

    recto.update();
    verso.update();
}

function getThresholds() {
    let t_papyrus = $('#threshold-papyrus').val();
    let t_black = $('#threshold-black').val();
    let t_red = $('#threshold-red').val();
    let t_outline = $('#papyrus-outline').val();
    t_papyrus = (t_papyrus / 100).toFixed(2);
    t_black = (t_black / 100).toFixed(2);
    t_red = (t_red / 100).toFixed(2);

    const thresholds = {
        0: -1,
        1: -1,
        2: t_papyrus,
        3: t_black,
        4: t_red,
        'outline': t_outline,
    }

    return thresholds;
}

function getColors() {
    const colors = {
        0: [0, 0, 0, 0], // background
        1: [0, 0, 0, 0], // scale
        2: [255, 255, 255, 255], // papyrus
        3: [0, 0, 0, 255], // black
        4: [255, 0, 0, 255], // red
    }

    return colors;
}

function requestFacsimile() {
    const inputData = [];
    const modelID = $('#select-facsimile-model').val();
    for (const fragment_id in objects) {
        const fragment = objects[fragment_id];
        for (const side of [fragment['recto'], fragment['verso']]) {
            const url = side.url.rgb;
            const ppi = side.ppi;
            if (url) {
                inputData.push({
                    'modelID': modelID,
                    'image_path': url,
                    'image_ppi': ppi,
                });
            }
        }
    }

    const requestData = {
        'thresholds': getThresholds(),
        'colors': getColors(),
        'inputData': inputData,
    }

    send('server-facsimilate-images', requestData);
}

function requestThreshold() {
    const inputData = [];
    for (const fragment_id in objects) {
        const fragment = objects[fragment_id];
        for (const side of [fragment['recto'], fragment['verso']]) {
            const url = side.url.rgb;
            // get filename from url, regardless if delimiters are /, \ or \\
            let filename = url.split('/').pop().split('\\').pop();
            // remove file extension
            filename = filename.split('.')[0];
            // add _segmentation.npy
            filename = filename + '_segmentation.npy';
            inputData.push(filename);
        }
    }

    const requestData = {
        'inputData': inputData,
        'thresholds': getThresholds(),
        'colors': getColors(),
    }

    send('server-threshold-images', requestData);
}

function updateThresholdSliders() {
    let t_papyrus = $('#threshold-papyrus').val();
    let t_black = $('#threshold-black').val();
    let t_red = $('#threshold-red').val();
    let t_outline = $('#papyrus-outline').val();

    // convert values such that they display decimal values with up to 2 decimal places
    t_papyrus = (t_papyrus / 100).toFixed(2);
    t_black = (t_black / 100).toFixed(2);
    t_red = (t_red / 100).toFixed(2);
    
    // update slider values
    $('#threshold-papyrus-value').text(t_papyrus);
    $('#threshold-black-value').text(t_black);
    $('#threshold-red-value').text(t_red);
    $('#papyrus-outline-value').text(t_outline);
}

function displayThresholdImages() {
    const folder = "C:\\Users\\unter\\AppData\\Roaming\\Virtual Light Table\\ML\\results";

    for (const fragment_id in objects) {
        const fragment = objects[fragment_id];
        const recto_url = fragment['recto']['url']['rgb'];
        const verso_url = fragment['verso']['url']['rgb'];
        const recto_filename = recto_url.split('/').pop().split('\\').pop().split('.')[0];
        const verso_filename = verso_url.split('/').pop().split('\\').pop().split('.')[0];
        objects[fragment_id]['recto']['url']['facsimile'] = `${folder}\\${recto_filename}_threshold.png`;
        objects[fragment_id]['verso']['url']['facsimile'] = `${folder}\\${verso_filename}_threshold.png`;
    }

    loadObjects('facsimile');
}





















$('#rotate-layout').click(function() {
    const layout_canvas = $('#layout-canvas');
    if (layout_canvas.hasClass('flex-hor')) {
        layout_canvas.removeClass('flex-hor');
        layout_canvas.addClass('flex-vert');
    } else {
        layout_canvas.removeClass('flex-vert');
        layout_canvas.addClass('flex-hor');
    }
    resizeCanvas();
    centerStages();
});

$('.mode.button').click(function() {
    if (!$(this).hasClass('disabled')) {
        const targetMode = $(this).attr('mode');
        
        $('.active').removeClass('active');
        $(this).addClass('active');
    
        $('.mode-options').addClass('hidden');
        $(`#mode-options-${targetMode}`).removeClass('hidden');
    
        switchDisplay(targetMode);
    }
});

$('.format.button').click(function(event) {
    $('.active-format').removeClass('active-format');
    $(this).addClass('active-format');
    JPGPreview(event);
});

$('#scale').click(scale);
$('#download').click(download);

$('#close').click(function(){
    ipcRenderer.send('server-close-export');
});

$('#colorpicker').on('mouseover', JPGPreview);
$('#jpg-button').on('mouseover', JPGPreview);
$('#jpg-button').on('mouseout', JPGPreview);
$('#jpg-color').on('mouseover', JPGPreview);
$('#jpg-color').on('mouseout', JPGPreview);
$('#colorpicker').on('input', JPGPreview);

$('#brightness').on('input', requestFilters);
$('#contrast').on('input', requestFilters);
$('.flip-button').click(function() {
    $(this).toggleClass('inverted');
    requestFilters();
});

$('#select-facsimile-model').on('change', function() {
    const modelID = $(this).val();
    const modelName = $(this).find("option:selected").text();

    if (modelName.includes('✅')) {
        $('#compute-model').removeClass('hidden');
        $('#download-model').addClass('hidden');
    } else {
        $('#download-model').removeClass('hidden');
        $('#compute-model').addClass('hidden');
    }

    ipcRenderer.send('server-get-ml-model-details', modelID);
});

$('#compute-model').click(requestFacsimile);
$('#compute-threshold').click(requestThreshold);
$('#threshold-papyrus').on('input', updateThresholdSliders);
$('#threshold-black').on('input', updateThresholdSliders);
$('#threshold-red').on('input', updateThresholdSliders);
$('#papyrus-outline').on('input', updateThresholdSliders);


ipcRenderer.on('active-table', (event, data) => {
    LOGGER.receive('EXPORT', 'active-table', data);
    
    /*
    We iterate over all elements in the dictionary data['fragments'].
    For every object, we store all the information necessary to rebuild the reconstructions,
    both for recto and verso:
    - the url to the image
    - the x value (for verso, we simply take the negative x value)
    - the y value
    - the rotation
    - image ppi
    - (the id of the object)
    */
   for (const fragment_id in data['fragments']) {
    const fragment = data['fragments'][fragment_id];
    const fragmentData = {
        'recto': {
            'url': {
                'rgb': fragment['recto']['url_view'],
                'filters': null,
                'facsimile': null,
            },
            'x': fragment['baseX'],
            'y': fragment['baseY'],
            'ppi': fragment['recto']['ppi'],
            'rotation': fragment['rotation'] + fragment['recto']['rotation'],
        },
        'verso': {
            'url': {
                'rgb': fragment['verso']['url_view'],
                'filters': null,
                'facsimile': null,
            },
            'x': -fragment['baseX'],
            'y': fragment['baseY'],
            'ppi': fragment['verso']['ppi'],
            'rotation': -fragment['rotation'] + fragment['verso']['rotation'],
        },
    }
    console.log('recto', fragmentData['recto']['rotation'], 'verso', fragmentData['verso']['rotation']);
    objects[fragment_id] = fragmentData;
   }

   loadObjects();
});

ipcRenderer.on('tensorflow-checked', (event, tensorflowAvailable) => {
    LOGGER.receive('EXPORT', 'tensorflow-checked', tensorflowAvailable);
    if (!tensorflowAvailable) {
        // select all mode buttons where the attribute requirement says "tensorflow"
        // add class "disabled" and append text "(tensorflow not available)"
        $('.mode.button[requirement="tensorflow"]').addClass('disabled').append(' (tensorflow not available)');
    } else {
        ipcRenderer.send('server-get-ml-models', 'SEG');
    }
});

ipcRenderer.on('ml-models', (event, models) => {
    LOGGER.receive('EXPORT', 'ml-models', models);
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
        $('#select-facsimile-model').append(option);
      }

      $('#select-facsimile-model').trigger('change');
});

ipcRenderer.on('ml-model-details', (event, model) => {
    LOGGER.receive('EXPORT', 'ml-model-details', model);
    const outputLabels = model['outputLabels'];
    // check if "red ink" is in the output labels
    const available = model['localPath'] != null;
    const redInk = outputLabels.includes('red ink');
    const blackInk = outputLabels.includes('black ink');
    const papyrus = outputLabels.includes('papyrus');

    $('#papyrus-wrapper').addClass('hidden');
    $('#papyrus-outline').addClass('hidden');
    $('#red-wrapper').addClass('hidden');
    $('#black-wrapper').addClass('hidden');

    if (available && papyrus) {
        $('#papyrus-wrapper').removeClass('hidden');
        $('#papyrus-outline').removeClass('hidden');
    }
    if (available && redInk) {
        $('#red-wrapper').removeClass('hidden');
    }
    if (available && blackInk) {
        $('#black-wrapper').removeClass('hidden');
    }
});

ipcRenderer.on('thresholded-images', (event) => {
    LOGGER.receive('EXPORT', 'thresholded-images');
    displayThresholdImages();
});
