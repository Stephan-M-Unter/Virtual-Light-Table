'use strict';

const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const LOGGER = require('../statics/LOGGER');
const dialogs = new Dialogs();

/* Variables */

let currentUpload = null;
let mode = $('.active_mode').attr('mode');
let maskMode = 'no_mask';
let scaleMode = null;
let actionMode = null;
let scalePoint = null;
let brushMode = false;
let brushing = false;
let scale = 1;
let reposition = false;
const mousestart = {};
let id = null;
let tpop = null;
const modelsDownloaded = {};
let tensorflow = false;

let recto = createEmptySide('recto');
let verso = createEmptySide('verso');

let editData;

/* FUNCTIONS */



function createEmptySide(sidename) {
  // const newSide = {
    // 'stage': new createjs.Stage(sidename+'_canvas'),
    // 'cursor': new createjs.Shape(new createjs.Graphics().beginStroke('black').drawCircle(0,0,$('#mask_control_brush_slider').val())),
    // 'canvas': $('#'+sidename+'_canvas'),
    // 'sidename': sidename,
    // 'content': {
      // 'filepath': null,
      // 'img': null,
      // 'img_bg': null,
      // 'rotation': 0,
      // 'x': null,
      // 'y': null,
      // 'www': false,
    // },
    // 'mask': {
      // 'group': null,
      // 'box': [],
      // 'polygon': [],
      // 'auto': {
        // 'paths': {},
        // 'mask': null,
        // 'cuts': {},
        // 'cut': null,
        // 'drawing': null,
      // },
    // },
  // };
  // newSide.stage.sidename = sidename;
  // newSide.stage.enableMouseOver();
  newSide.cursor.name = 'brush';

  $(newSide.canvas).on('mousemove', (event) => {
    if (brushMode) {    
      if (!(newSide.stage.getChildByName('brush'))) {
        newSide.stage.addChild(newSide.cursor);
        $(newSide.canvas).addClass('brush');
      }
      newSide.cursor.x = event.offsetX;
      newSide.cursor.y = event.offsetY;

      let color = 'red';
      if ($('#mask_control_automatic_draw').hasClass('active')) {
        color = 'green';
      }

      if (newSide.stage.getChildByName('brushDrawing') && brushing) {
        const stroke = $('#mask_control_brush_slider').val()*2;
        newSide.mask.auto.drawing.graphics
        .ss(stroke, 'round', 'round')
        .s(color)
        .mt(newSide.canvas.oldX,newSide.canvas.oldY)
        .lt(newSide.stage.mouseX, newSide.stage.mouseY);
        
        newSide.mask.auto.drawing.alpha = 0.5;
      }

      newSide.canvas.oldX = newSide.stage.mouseX;
      newSide.canvas.oldY = newSide.stage.mouseY;
      
      newSide.stage.update();
    }
  });
  
  $(newSide.canvas).on('mousedown', (event) => {
    if (brushMode && event.button != 2) {
      let color = 'red';
      if ($('#mask_control_automatic_draw').hasClass('active')) {
        color = 'green';
      }

      newSide.mask.auto.drawing = new createjs.Shape();
      newSide.mask.auto.drawing.name = 'brushDrawing';
      newSide.mask.auto.drawing.alpha = 0.5;
      newSide.stage.addChildAt(newSide.mask.auto.drawing, newSide.stage.children.length-1);
      const stroke = $('#mask_control_brush_slider').val()*2;
      newSide.mask.auto.drawing.graphics
        .clear()
        .ss(stroke, 'round', 'round')
        .s(color)
        .moveTo(newSide.stage.mouseX, newSide.stage.mouseY)
        .lineTo(newSide.stage.mouseX+0.1, newSide.stage.mouseY+0.1);

      newSide.canvas.oldX = newSide.stage.mouseX;
      newSide.canvas.oldY = newSide.stage.mouseY;

      brushing = true;
    }
  });
  
  $(newSide.canvas).on('mouseup', (event) => {
    if (brushMode && brushing) {
      newSide.mask.auto.drawing.graphics.endStroke();
      
      newSide.stage.removeChild(newSide.mask.auto.drawing);
      sendChange(newSide);
      newSide.stage.update();
    }
  });

  $(document).on('mouseup', () => {
    brushing = false;
  });
  
  $(newSide.canvas).on('mouseout', (event) => {
    newSide.stage.removeChild(newSide.cursor);
    $(newSide.canvas).removeClass('brush');
    newSide.stage.update();
  });

  return newSide;
}

function sendChange(side) {
  const bounds = side.content.img.getTransformedBounds();
  
  const w = bounds.width;
  const h = bounds.height;
  const x = bounds.x;
  const y = bounds.y;
  const scale = recto.content.img.scale;

  side.mask.auto.drawing.cache(x, y, w, h, scale);
  const dataURL = side.mask.auto.drawing.cacheCanvas.toDataURL();

  const activeModelID = $('#mask_automatic_model').find(":selected").val();
  const maskURL = side.mask.auto.paths[activeModelID];

  const data = {
    modelID: activeModelID,
    canvas: side.sidename,
    maskURL: maskURL,
    change: dataURL,
    add: $('#mask_control_automatic_draw').hasClass('active'),
  };

  ipcRenderer.send('server-edit-auto-mask', data);
}


function createImage(sidename, center) {}}
  // const side = getSide(sidename);
  // const newImage = new Image();
  if (maskMode == 'automatic') {
    const activeModelID = $('#mask_automatic_model').find(":selected").val();
    if (side.mask.auto.cuts[activeModelID]) {
      newImage.src = side.mask.auto.cuts[activeModelID];
    } else {
      newImage.src = side.content.filepath;
    }
  // } else {
    // newImage.src = side.content.filepath;
  // }
  // newImage.onload = function() {
    // extract PPI from EXIF if possible
    readExifPPI(newImage, sidename);

    // create new Bitmap objects
    // const image = new createjs.Bitmap(newImage);
    // image.name = 'image';
    // const imageBackground = new createjs.Bitmap(newImage);
    // imageBackground.name = 'image_background';
    // side.content.img = image;
    // side.content.img_bg = imageBackground;

    // if (side.content.x == null) {
      // side.content.x = side.stage.canvas.width / 2;
      // side.content.y = side.stage.canvas.height / 2;
    // }

    // register event listeners
    // side.content.img.on('mousedown', (event) => {
      // handleMouseDown(event, event.target.parent.sidename);
    // });
    // side.content.img_bg.on('mousedown', (event) => {
      // handleMouseDown(event, event.target.parent.sidename);
    // });
    // side.content.img.on('pressmove', (event) => {
      // handlePressMove(event, event.target.parent.sidename);
    // });
    // side.content.img_bg.on('pressmove', (event) => {
      // handlePressMove(event, event.target.parent.sidename);
    // });

    // now recursively restart startCanvas() as now an image is available
    // draw(sidename, center);
  // };
// }


/**
 *
 * @param {*} event
 * @param {*} sidename
 */
function handleMouseDown(event, sidename) {
  // const side = getSide(sidename);
  if (actionMode == 'scale' && sidename == scaleMode) {
    doScaling(event.stageX, event.stageY);
  } else if (actionMode == 'polygon') {
    addPolygonNode([event.stageX, event.stageY], sidename);
  }
  // mousestart.x = event.stageX;
  // mousestart.y = event.stageY;
  // mousestart.offsetX = event.stageX - side.content.x;
  // mousestart.offsetY = event.stageY - side.content.y;
}




function checkAutoSegmentationRequirements(side) {
  if (!side.content.filepath) return true;
  const activeModelID = $('#mask_automatic_model').find(":selected").val();
  if (!side.mask.auto.cuts[activeModelID]) return false;
  return true;
}

/**
 *
 */
function checkRequiredFields() {
  let rectoFulfilled = true;
  let versoFulfilled = true;
  let nameFulfilled = true;
  let automaticFulfilled = true;
  if (maskMode == 'automatic') {
    automaticFulfilled = false;
  }
  if (maskMode == 'automatic_cut') {
    if (!checkAutoSegmentationRequirements(recto)) automaticFulfilled = false;
    if (!checkAutoSegmentationRequirements(verso)) automaticFulfilled = false;
  }
  // if (recto.content.filepath) {
    // if ($('#recto_ppi').val() == null) {
      // rectoFulfilled = false;
      // $('#recto_ppi').addClass('missing');
    // }
    // if ($('#recto_ppi').val() == '') {
      // rectoFulfilled = false;
      // $('#recto_ppi').addClass('missing');
    // }
    // if (isNaN($('#recto_ppi').val())) {
      // rectoFulfilled = false;
      // $('#recto_ppi').addClass('missing');
    // }
    // if (rectoFulfilled) {
      // $('#recto_ppi').removeClass('missing');
    // }
  // }
  // if (verso.content.filepath) {
    // if ($('#verso_ppi').val() == null) {
      // versoFulfilled = false;
      // $('#versok_ppi').addClass('missing');
    // }
    // if ($('#verso_ppi').val() == '') {
      // versoFulfilled = false;
      // $('#verso_ppi').addClass('missing');
    // }
    // if (isNaN($('#verso_ppi').val())) {
      // versoFulfilled = false;
      // $('#verso_ppi').addClass('missing');
    // }
    // if (versoFulfilled) {
      // $('#verso_ppi').removeClass('missing');
    // }
  // }
  // if ($('#objectname').val() == null || $('#objectname').val() == '') {
    // nameFulfilled = false;
    // $('#objectname').addClass('missing');
  // } else {
    // $('#objectname').removeClass('missing');
  // }

  // if (rectoFulfilled && versoFulfilled && nameFulfilled && automaticFulfilled) {
    // $('#upload_button').removeClass('disabled');
  // } else {
    // $('#upload_button').addClass('disabled');
  // }
// }


/**
 *
 */
function drawAutoMask(reload) {
  if (tensorflow == false) {
    /* No information available if tensorflow is available; thus asking server to check */
    LOGGER.send('UPLOAD', 'server-check-tensorflow');
    ipcRenderer.send('server-check-tensorflow');
  } else {
    const activeModelID = $('#mask_automatic_model').find(":selected").val();
    for (const side of [recto, verso]) {
      if (!side.content.img) {
        continue;
      }
      if (!side.mask.auto.cuts[activeModelID]) {

        side.mask.group.removeAllChildren();
        if (side.content.img) {
          side.content.img.mask = null;
          side.content.img.rotation = 0;
        }
        if (reload) {
          if (side.mask.auto.mask != null) {
            side.mask.group.removeChild(side.mask.auto.mask);
            side.mask.auto.mask = null;
          }
          
          if (activeModelID in side.mask.auto.paths && side.mask.auto.paths[activeModelID] != null) {
            const maskPath = side.mask.auto.paths[activeModelID];
            const autoMask = new Image();
            autoMask.src = `${maskPath}?_=${+new Date()}`;
            autoMask.onload = function() {          
              const mask = new createjs.Bitmap(autoMask);
              side.mask.auto.mask = mask;
              mask.name = 'Automatic Mask ('+activeModelID+')';
              mask.regX = side.content.img.regX;
              mask.regY = side.content.img.regY;
              mask.x = side.content.img.x;
            mask.y = side.content.img.y;
            mask.scale = side.content.img.scale;
            mask.alpha = $('#mask_control_opacity_slider').val() / 100;
            
            side.mask.group.addChild(mask);
            side.stage.update();
          };
        }
      } else if (side.mask.auto.mask != null) {
        const mask = side.mask.auto.mask;
        side.mask.group.addChild(mask);
        mask.regX = side.content.img.regX;
        mask.regY = side.content.img.regY;
        mask.x = side.content.img.x;
        mask.y = side.content.img.y;
        mask.scale = side.content.img.scale;
        side.stage.update();
      } else {
      }
    }
    }
  }
}


/* Buttons */

$('#mask_control_opacity_slider').on('change input', (event) => {
  const sliderValue = $('#mask_control_opacity_slider').val();
  $('#mask_control_opacity_label').html(sliderValue);

  for (const side of [recto, verso]) {
    if (side.mask.auto.mask) {
      side.mask.auto.mask.alpha = sliderValue / 100;
    }
    side.stage.update();
  }
});


$('#mask_automatic_model').on('change', () => {
  const modelID = $('#mask_automatic_model').find(":selected").val();
  if (modelID in modelsDownloaded && modelsDownloaded[modelID]) {
    // model has already been checked and is downloaded
    updateAutomaticModelSelectionButtons();
  } else {
    // model has not yet been checked or is not downloaded
    LOGGER.send('UPLOAD', 'server-check-model-availability', modelID);
    ipcRenderer.send('server-check-model-availability', modelID);
  }
});
$('#mask_selection_automatic_button').click(() => {
  const modelButtonMode = $('#mask_selection_automatic_button').attr('mode')
  const modelID = $('#mask_automatic_model').find(':selected').val();
  if (modelButtonMode == 'download') {
    modelsDownloaded[modelID] = 'processing';
    updateAutomaticModelSelectionButtons();
    LOGGER.send('UPLOAD', 'server-download-model', modelID);
    ipcRenderer.send('server-download-model', modelID);

  } else if (modelButtonMode == 'compute') {
    checkRequiredFields();

    let missingRectoPPI = false;
    if (recto.content.img && ($('#recto_ppi').hasClass('missing'))) missingRectoPPI = true;
    let missingVersoPPI = false;
    if (verso.content.img && ($('#verso_ppi').hasClass('missing'))) missingVersoPPI = true;

    if (!missingRectoPPI && !missingVersoPPI) {
      modelsDownloaded[modelID] = 'processing';
      updateAutomaticModelSelectionButtons();
      const data = {
        modelID: modelID,
        pathImage1: recto.content.filepath,
        pathImage2: verso.content.filepath,
        ppi1: $('#recto_ppi').val(),
        ppi2: $('#verso_ppi').val(),
      };
      LOGGER.send('UPLOAD', 'server-compute-automatic-masks', data);
      ipcRenderer.send('server-compute-automatic-masks', data);
    }
  }
});

$('#mask_selection_automatic_button').on('mouseover', () => {
  checkRequiredFields();
  const modelButtonMode = $('#mask_selection_automatic_button').attr('mode')
  if (modelButtonMode == 'compute') {
    if ($('#recto_ppi').hasClass('missing') && recto.content.img) {
      $('#recto_ppi').addClass('missing_pulse');
      $('#mask_selection_automatic_button').addClass('missing_pulse');
    }
    if ($('#verso_ppi').hasClass('missing') && verso.content.img) {
      $('#verso_ppi').addClass('missing_pulse');
      $('#mask_selection_automatic_button').addClass('missing_pulse');
    }
  }
});

$('#mask_selection_automatic_button').on('mouseout', () => {
  $('#recto_ppi').removeClass('missing_pulse');
  $('#verso_ppi').removeClass('missing_pulse');
  $('#mask_selection_automatic_button').removeClass('missing_pulse');
});


$('#mask_selection_delete_model').click(() => {
  const modelID = $('#mask_automatic_model').find(':selected').val();
  LOGGER.send('UPLOAD', 'server-delete-model', modelID);
  ipcRenderer.send('server-delete-model', modelID);
});
$('#mask_control_automatic_draw').click(() => {
  if ($('#mask_control_automatic_draw').hasClass('active')) {
    $('#mask_control_automatic_draw').removeClass('active');
    brushMode = false;
  } else {
    $('#mask_control_automatic_erase').removeClass('active');
    $('#mask_control_automatic_draw').addClass('active');
    brushMode = true;
  }
});
$('#mask_control_automatic_erase').click(() => {
  if ($('#mask_control_automatic_erase').hasClass('active')) {
    $('#mask_control_automatic_erase').removeClass('active');
    brushMode = false;
  } else {
    $('#mask_control_automatic_draw').removeClass('active');
    $('#mask_control_automatic_erase').addClass('active');
    brushMode = true;
  }
});
$('#mask_control_automatic_register').click(() => {});
$('#mask_control_automatic_delete').click(() => {
  LOGGER.send('UPLOAD', 'server-delete-masks');
  ipcRenderer.send('server-delete-masks');
  recto.content.img = null;
  recto.mask.group.removeAllChildren();
  verso.content.img = null;
  verso.mask.group.removeAllChildren();
  const activeModelID = $('#mask_automatic_model').find(":selected").val();
  recto.mask.auto.cuts[activeModelID] = null;
  verso.mask.auto.cuts[activeModelID] = null;
  draw('recto', true);
  draw('verso', true);
});

function updateAutomaticModelSelectionButtons() {
  const modelID = $('#mask_automatic_model').find(':selected').val();
  const selectionButton = $('#mask_selection_automatic_button');
  const buttonLabel = $('#mask_selection_automatic_button label');
  const buttonImage = $('#mask_selection_automatic_button img');
  const deleteButton = $('#mask_selection_delete_model');
  let targetMode = 'download';

  if ((modelID in modelsDownloaded) && (modelsDownloaded[modelID] == true)) {
    targetMode = 'compute';
  } else if ((modelID in modelsDownloaded) && (modelsDownloaded[modelID] == 'processing')) {
    targetMode = 'processing';
  }

  selectionButton.removeClass('loading');
  if (targetMode == 'download') {
    buttonLabel.html('Download Model');
    buttonImage.attr('src', '../imgs/symbol_download.png');
    selectionButton.attr('mode', targetMode);
    deleteButton.addClass('unrendered');
  } else if (targetMode == 'compute') {
    buttonLabel.html('Compute Mask(s)');
    buttonImage.attr('src', '../imgs/symbol_ml.png');
    selectionButton.attr('mode', targetMode);
    deleteButton.removeClass('unrendered');
  } else if (targetMode == 'processing') {
    buttonLabel.html('Loading...');
    buttonImage.attr('src', '../imgs/symbol_gear.png');
    selectionButton.addClass('loading');
    selectionButton.attr('mode', targetMode);
  }
}

$('#mask_control_automatic_cut').click(() => {
  $('#mask_control_automatic_cut').addClass('loading');
  const activeModelID = $('#mask_automatic_model').find(":selected").val();
  let pathMask1 = null;
  let pathMask2 = null;

  if (activeModelID in recto.mask.auto.paths) {
    pathMask1 = recto.mask.auto.paths[activeModelID];
  }
  if (activeModelID in verso.mask.auto.paths) {
    pathMask2 = verso.mask.auto.paths[activeModelID];
  }

  const data = {
    'modelID': activeModelID,
    'image1': recto.content.filepath,
    'mask1': pathMask1,
    'image2': verso.content.filepath,
    'mask2': pathMask2,
  }

  LOGGER.send('UPLOAD', 'server-cut-automatic-masks', data);
  ipcRenderer.send('server-cut-automatic-masks', data);
});














ipcRenderer.on('model-availability', (event, data) => {
  LOGGER.receive('UPLOAD', 'model-availability', data);
  const modelID = data.modelID;
  const modelAvailability = data.modelAvailability;
  if (modelAvailability) {
    modelsDownloaded[modelID] = true;
    const modelText = $('#mask_automatic_model option[value="'+modelID+'"]').html();
    if (!(modelText.includes('✅ '))) {
      $('#mask_automatic_model option[value="'+modelID+'"]').html('✅ ' + modelText);
    }
  }
  updateAutomaticModelSelectionButtons();
});

ipcRenderer.on('upload-model-deleted', (event, modelID) => {
  LOGGER.receive('UPLOAD', 'upload-model-deleted', modelID);
  modelsDownloaded[modelID] = false;

  // removing checkmark for not-downloaded model
  let text =  $('#mask_automatic_model option[value="'+modelID+'"]').html();
  text = text.replace('✅ ', '');
  $('#mask_automatic_model option[value="'+modelID+'"]').html(text);

  updateAutomaticModelSelectionButtons();
});

ipcRenderer.on('upload-masks-computed', (event, data) => {
  LOGGER.receive('UPLOAD', 'upload-masks-computed', data);

  if (data == null) {
    /* some error happened, most likely with the execution of the script */
    const selectionButton = $('#mask_selection_automatic_button');
    const buttonLabel = $('#mask_selection_automatic_button label');
    const buttonImage = $('#mask_selection_automatic_button img');

    buttonLabel.html('ERROR!');
    buttonImage.attr('src', '../imgs/symbol_exit.png');
    selectionButton.removeClass('loading');
    selectionButton.attr('mode', 'compute');

  } else {
    modelsDownloaded[data.modelID] = true;
    updateAutomaticModelSelectionButtons();
    if (data) {
      $('#mask_control_panel_automatic').removeClass('unrendered');
      recto.mask.auto.paths[data.modelID] = data.pathMask1;
      verso.mask.auto.paths[data.modelID] = data.pathMask2;
      drawMasks(true);
    }
  }
});

ipcRenderer.on('upload-images-cut', (event, data) => {
  LOGGER.receive('UPLOAD', 'upload-images-cut', data);
  $('#mask_control_automatic_cut').removeClass('loading');
  if (data) {
    recto.mask.auto.cuts[data.modelID] = data.cut1;
    verso.mask.auto.cuts[data.modelID] = data.cut2;
    // recto.content.filepath = data.cut1;
    recto.content.img = null;
    recto.mask.group.removeAllChildren();
    // verso.content.filepath = data.cut2;
    verso.content.img = null;
    verso.mask.group.removeAllChildren();
    draw('recto', true);
    draw('verso', true);
    maskMode = 'automatic_cut';
  }
});
