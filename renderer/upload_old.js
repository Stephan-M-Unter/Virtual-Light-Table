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

function draw(sidename, center) {
  // const side = getSide(sidename);
  // side.stage.removeAllChildren();
  // if (side.content.filepath != null) {
    // if (side.content.img == null) {
      // create a new image first from file
    // } else {
    //   // draw canvas
    //   // // get width/height of image and canvas
    //   // const iWidth = side.content.img.image.width;
    //   // const iHeight = side.content.img.image.height;
    //   // const cWidth = side.stage.canvas.width;
    //   // const cHeight = side.stage.canvas.height;

    //   // setting regCoordinates for img and img_bg
    //   // side.content.img_bg.regX = side.content.img.regX = iWidth / 2;
    //   // side.content.img_bg.regY = side.content.img.regY = iHeight / 2;

    //   // set x, y - if there is an offset, take it,
    //   // otherwise center image to canvas
    //   // const x = side.content.offsetX || cWidth / 2;
    //   // const y = side.content.offsetY || cHeight / 2;
      
      
    //   // if ('scale' in side.content && side.content.scale) {
    //     // side.content.img.scale = side.content.scale;
    //     // side.content.img_bg.scale = side.content.scale;
    //   // }
    //   // else {
    //     // const fittingScale = getFittingScale(side);
    //     // side.content.scale = fittingScale;
    //     // side.content.img.scale = fittingScale;
    //     // side.content.img_bg.scale = fittingScale;
    //     // reposition = true;
    //   // }
      
    //   // side.content.img.x = side.content.img_bg.x = side.content.x;
    //   // side.content.img.y = side.content.img_bg.y = side.content.y;
    //   // side.content.img.rotation = side.content.img_bg.rotation = side.content.rotation;

    //   // creating white "shadow" layer to visually indicate mask
    //   // const shadow = new createjs.Shape();
    //   // shadow.name = 'Shadow';
    //   // shadow.graphics.beginFill('white')
    //       // .drawRect(0, 0, cWidth, cHeight)
    //       // .endFill();
    //   // shadow.alpha = 0.8;
    //   // shadow.side = side;

    //   // shadow event listeners
    //   shadow.on('mousedown', (event) => {
    //     handleMouseDown(event, event.target.side.sidename);
    //   });}}}n('pressmove', (event) => {
    //     handlePressMove(event, event.target.side.sidename);
    //   });

      // side.stage.addChildAt(side.content.img_bg, shadow, side.content.img, side.mask.group, 0);
      // if (center) centerImage(side);
    // }
  // } else {
    // side.stage.removeAllChildren();
    // side.stage.update();
    if (tpop) {
      $('#'+sidename+'_canvas_region').find('.choose_tpop').removeClass('unrendered');
    }
  // drawMasks();
  // checkGUI();
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

/**
 *
//  * @param {*} event
//  * @param {*} sidename
//  */
// function handlePressMove(event, sidename) {
  // const side = getSide(sidename);
  // const mouse = {x: event.stageX, y: event.stageY};
  // const mouseDistance = {x: mouse.x - mousestart.offsetX, y: mouse.y - mousestart.offsetY};
  // if (actionMode == null && !(brushMode && brushing)) {
    // if (mode == 'move') {
      // side.content.x = mouseDistance.x;
      // side.content.y = mouseDistance.y;
    // } else if (mode == 'rotate') {
      // const radsOld = Math.atan2(mousestart.y - side.content.img.y,
          // mousestart.x - side.content.img.x);
      // const radsNew = Math.atan2(mouse.y - side.content.img.y,
          // mouse.x - side.content.img.x);
      // const rads = radsNew - radsOld;
      // const deltaAngle = rads * (180 / Math.PI);
      // rotateByAngle(deltaAngle, sidename);
      // mousestart.x = mouse.x;
      // mousestart.y = mouse.y;
    // }
    // draw(sidename);
    // side.stage.update();
  // }
// }

/**
 *
 * @param {*} event
 */
function handleMousewheel(event) {
  // const zoomStep = 0.05;
  // const zoomDirection = Math.sign(event.originalEvent.wheelDelta); // positive: zoom in; negative: zoom out
  // if (recto.content.filepath != null || verso.content.filepath != null) {
    // only zoom if at least one canvas has content
    // if ((scale > zoomStep && zoomDirection < 0) || zoomDirection > 0) {
      // scale = scale + (zoomStep * zoomDirection);
      // scale = Math.round(scale*100)/100;

      // let scaleRecto = 10;
      // let scaleVerso = 10;
      // if (recto.content.scale) {
        // scaleRecto = recto.content.scale + (zoomStep * zoomDirection);
      // }
      // if (verso.content.scale) {
        // scaleVerso = verso.content.scale + (zoomStep * zoomDirection);
      // }

      // if (scaleRecto > zoomStep && scaleVerso > zoomStep) {
        // if (recto.content.img) {
          // if (recto.content.scale) {
            // recto.content.scale += (zoomStep * zoomDirection);
            // recto.content.img.scale += (zoomStep * zoomDirection);
            // recto.content.img_bg.scale += (zoomStep * zoomDirection);
          } else {
            let rectoPPI = $('#recto_ppi').val();
            if (rectoPPI == '') {
              rectoPPI = 96;
            // }
            let rectoScale = (96 * (96/rectoPPI) * scale) / 96;
            rectoScale = Math.round(rectoScale*100) / 100;
            recto.content.img.scale = rectoScale;
            recto.content.img_bg.scale = rectoScale;
            recto.content.scale = rectoScale;
          }
        // }
        // if (verso.content.img) {
          // if (verso.content.scale) {
            // verso.content.scale += (zoomStep * zoomDirection);
            // verso.content.img.scale += (zoomStep * zoomDirection);
            // verso.content.img_bg.scale += (zoomStep * zoomDirection);
          } else {
            let versoPPI = $('#verso_ppi').val();
            if (versoPPI == '') {
              versoPPI = 96;
            }
            let versoScale = (96 * (96/versoPPI) * scale) / 96;
            versoScale = Math.round(versoScale*100) / 100;
            verso.content.img.scale = versoScale;
            verso.content.img_bg.scale = versoScale;
            verso.content.scale = versoScale;
          }
        // }
        // recto.stage.update();
        // verso.stage.update();
      // }
      // drawMasks();
      // }

  // }
// }k

/**
 *
 * @param {'recto'|'verso'} sidename - String indicating which canvas needs to be cleared.
 */
// function clearCanvas(sidename) {
  // // remove data
  // if (sidename == 'recto') {
    // recto = createEmptySide('recto');
    // recto.stage.update();k
  // } else if (sidename == 'verso') {
    // verso = createEmptySide('verso');
    // verso.stage.update();
  // }

  // clearing fields
  // $('#'+sidename+'_ppi').val('');
  // draw(sidename);
// }

/**
 *
 */
// function swap() {
  // // swap side data
  // let temp = recto.content;
  // recto.content = verso.content;
  // verso.content = temp;

  // swap masks
  // temp = recto.mask;
  // recto.mask = verso.mask;
  // verso.mask = temp;
  // drawMasks();

  // swap ppi
  // temp = $('#recto_ppi').val();
  // $('#recto_ppi').val($('#verso_ppi').val());
  // $('#verso_ppi').val(temp);

  // draw('recto');
  // draw('verso');
// }

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
// function checkGUI() {
  // show/hide side GUI elements according to the status of the connected side
  // if (recto.content.filepath) {
    // $('#recto_button_region').removeClass('hidden');
    // $('#button_region').removeClass('hidden');
    // $('#load_region').removeClass('unrendered');
    // $('#mask_region').removeClass('unrendered');
    // $('#recto_canvas').addClass('active');
    // $('#recto_upload_wrapper').addClass('unrendered');
  // } else {
    // $('#recto_canvas').removeClass('active');
    // $('#recto_upload_wrapper').removeClass('unrendered');
    // $('#recto_button_region').addClass('hidden');
  }
  // if (verso.content.filepath) {
    // $('#verso_button_region').removeClass('hidden');
    // $('#button_region').removeClass('hidden');
    // $('#load_region').removeClass('unrendered');
    // $('#mask_region').removeClass('unrendered');
    // $('#verso_upload_wrapper').addClass('unrendered');
    // $('#verso_canvas').addClass('active');
  // } else {
    // $('#verso_canvas').removeClass('active');
    // $('#verso_upload_wrapper').removeClass('unrendered');
    // $('#verso_button_region').addClass('hidden');
  // }
  // hide full GUI if both sides are empty
  // if (recto.content.filepath == null && verso.content.filepath == null) {
    // $('#button_region').addClass('hidden');
    // $('#load_region').addClass('unrendered');
    // $('#mask_region').addClass('unrendered');
  // }
  // checkRequiredFields();
// }

/**
 *
 * @param {*} deltaAngle
 * @param {*} sidename
 */
// function rotateByAngle(deltaAngle, sidename) {
  // const side = getSide(sidename);
  // side.content.rotation += deltaAngle;
  // side.content.rotation = side.content.rotation % 360;
  // draw(sidename);
// }

/**
 *
 * @param {*} targetAngle
 * @param {*} sidename
 */
// function rotateToAngle(targetAngle, sidename) {
  // const side = getSide(sidename);
  // side.content.rotation = (targetAngle%360);
  // draw(sidename);
// }

/**
 *
 * @param {'recto'|'verso'} target
 */
function startScaling(target) {
  actionMode = 'scale';
  scaleMode = target;
}

/**
 *
 */
function endScaling() {
  actionMode = null;
  scaleMode = null;
  scalePoint = null;
  $('.measure').removeClass('active');
  $('canvas').removeClass('scale');
}

/**
 *
 * @param {*} x
 * @param {*} y
 */
function doScaling(x, y) {
  if (scalePoint == null) {
    // this click determines the first point
    scalePoint = [x, y];
  } else {
    // this is the second point, enough to determine the distance
    const dx = Math.abs(x - scalePoint[0]);
    const dy = Math.abs(y - scalePoint[1]);
    const z = Math.sqrt((dx*dx) + (dy*dy));
    const ppi = (z*2.54)/getSide(scaleMode).content.img.scale;

    $('#'+scaleMode+'_ppi').val(Math.round(ppi*100)/100);
    scaleImages();
    checkGUI();

    endScaling();
  }
}

/**
 *
 */
function scaleImages() {
  if (recto.content.filepath) {
    const rectoPPI = $('#recto_ppi').val();
    if (rectoPPI != '') {
      const rectoScale = (96 * (96/rectoPPI) * scale) / 96;
      recto.content.scale = rectoScale;
      recto.content.img.scale = rectoScale;
      recto.content.img_bg.scale = rectoScale;
    }
  }
  if (verso.content.filepath) {
    const versoPPI = $('#verso_ppi').val();
    if (versoPPI != '') {
      const versoScale = (96 * (96/versoPPI) * scale) / 96;
      verso.content.scale = versoScale;
      verso.content.img.scale = versoScale;
      verso.content.img_bg.scale = versoScale;
    }
  }
  recto.stage.update();
  verso.stage.update();
}

function syncMasks() {
  if (recto.mask.box.length == 0 && verso.mask.box.length > 0) {
    updateRectoMask();
  }
  if (recto.mask.polygon.length == 0 && verso.mask.polygon.length > 0) {
    updateRectoMask();
  }
  if (verso.mask.box.length == 0 && recto.mask.box.length > 0) {
    updateVersoMask();
  }
  if (verso.mask.polygon.length == 0 && recto.mask.polygon.length > 0) {
    updateVersoMask();
  }
}

/**
 *
 */
function drawMasks(reload) {
  // if (maskMode == 'boundingbox') {
    // display boundingbox
    // drawBoxMask();
  } else if (maskMode == 'polygon') {
    // display polygonal mask
    drawPolygonMask();
  } else if (maskMode == 'automatic' || maskMode == 'automatic_cut') {
    // use ML result
    drawAutoMask(reload);
  } else {
    // no mask -> un-display all masks
    clearMask();
  }
}


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


/**
 *
 */
function uploadData() {
  const data = {};

  // RECTO
  const dataRecto = {};
  if (recto.content.img) {
    dataRecto.rotation = recto.content.img.rotation;
    dataRecto.url = recto.content.filepath;
    dataRecto.ppi = $('#recto_ppi').val();
    dataRecto.cx = recto.content.img.x;
    dataRecto.cy = recto.content.img.y;
    dataRecto.box = canvasToImage(recto.content.img, recto.mask.box);
    dataRecto.polygon = canvasToImage(recto.content.img, recto.mask.polygon);
    dataRecto.auto = {};
    dataRecto.auto.modelID = null;
    dataRecto.auto.cut = null;
    dataRecto.auto.mask = null;
    if (maskMode == 'automatic_cut') {
      dataRecto.auto.modelID = $('#mask_automatic_model').find(":selected").val();
      dataRecto.auto.cut = recto.mask.auto.cuts[dataRecto.auto.modelID];
      dataRecto.auto.mask = recto.mask.auto.paths[dataRecto.auto.modelID];
    }
    dataRecto.www = recto.content.www;

    dataRecto.upload = {
      box: recto.mask.box,
      polygon: recto.mask.polygon,
      x: recto.content.img.x,
      y: recto.content.img.y,
      scale: recto.content.img.scale,
    };
  }
  data.recto = dataRecto;

  // VERSO
  const dataVerso = {};
  if (verso.content.img) {
    dataVerso.rotation = verso.content.img.rotation;
    dataVerso.url = verso.content.filepath;
    dataVerso.ppi = $('#verso_ppi').val();
    dataVerso.cx = verso.content.img.x;
    dataVerso.cy = verso.content.img.y;
    dataVerso.box = canvasToImage(verso.content.img, verso.mask.box);
    dataVerso.box_upload = verso.mask.box;
    dataVerso.polygon = canvasToImage(verso.content.img, verso.mask.polygon);
    dataVerso.polygon_upload = verso.mask.polygon;
    dataVerso.auto = {};
    dataVerso.auto.modelID = null;
    dataVerso.auto.cut = null;
    dataVerso.auto.mask = null;
    if (maskMode == 'automatic_cut') {
      dataVerso.auto.modelID = $('#mask_automatic_model').find(":selected").val();
      dataVerso.auto.cut = verso.mask.auto.cuts[dataVerso.auto.modelID];
      dataVerso.auto.mask = verso.mask.auto.paths[dataVerso.auto.modelID];
    }

    dataVerso.www = verso.content.www;

    dataVerso.upload = {
      box: verso.mask.box,
      polygon: verso.mask.polygon,
      x: verso.content.img.x,
      y: verso.content.img.y,
      scale: verso.content.img.scale,
    };
  }
  data.verso = dataVerso;

  // RELATION
  data.name = $('#objectname').val();
  if (recto.content.img) {
    data.showRecto = true;
  } else {
    data.showRecto = false;
  }

  data.maskMode = maskMode;
  
  if (editData) {
    data.id = editData.id;
    data.x = editData.x;
    data.y = editData.y;
    data.baseX = editData.baseX;
    data.baseY = editData.baseY;
    data.rotation = editData.rotation;
    if ('urlTPOP' in editData) data.urlTPOP = editData.urlTPOP;
    if ('tpop' in editData) data.tpop = editData.tpop;
  }
  LOGGER.send('UPLOAD', 'server-upload-ready', data);
  ipcRenderer.send('server-upload-ready', data);
}

/**
 *
 * @param {*} image
 * @param {*} pointArray
 * @return {*}
 */
function canvasToImage(image, pointArray) {
  const result = [];
  if (pointArray.length > 0) {
    pointArray.forEach((p) => {
      const imagePoint = image.globalToLocal(p[0], p[1]);
      result.push(imagePoint);
    });
  }
  return result;
}

function loadData(data) {
  $('#upload_button').find('.large_button_label').html('Update object');

  if ('recto' in data) {
    if ('ppi' in data.recto) $('#recto_ppi').val(data.recto.ppi);
    recto.content.filepath = data.recto.url;
    recto.content.www = data.recto.www;
    
    if ('upload' in data.recto) {
      recto.content.x = data.recto.upload.x;
      recto.content.y = data.recto.upload.y;
      recto.content.rotation = data.recto.rotation;
      recto.mask.box = data.recto.upload.box;
      recto.mask.polygon = data.recto.upload.polygon;
      recto.content.scale = data.recto.upload.scale;
    } else {
      recto.content.x = 0;
      recto.content.y = 0;
      recto.content.rotation = 0;
      recto.mask.box = [];
      recto.mask.polygon = [];
    }
    
  }
  
  if ('verso' in data) {
    if ('ppi' in data.verso) $('#verso_ppi').val(data.verso.ppi);
    verso.content.filepath = data.verso.url;
    verso.content.www = data.verso.www;
    
    if ('upload' in data.verso) {
      verso.content.x = data.verso.upload.x;
      verso.content.y = data.verso.upload.y;
      verso.content.rotation = data.verso.rotation;
      verso.mask.box = data.verso.upload.box;
      verso.mask.polygon = data.verso.upload.polygon;
      verso.content.scale = data.verso.upload.scale;
    } else {
      verso.content.x = 0;
      verso.content.y = 0;
      verso.content.rotation = 0;
      verso.mask.box = [];
      verso.mask.polygon = [];
    }
  }

  
  $('#objectname').val(data.name);
  if ('maskMode' in data && data.maskMode) maskMode = data.maskMode;
  if ('id' in data && data.id) editData = data;
  if ('urlTPOP' in data) editData = data;

  let center;
  if ('edit' in data && data.edit) {
    center = false;
  } else {
    center = true;
  }

  draw('recto', center);
  draw('verso', center);
  activateMaskMode(maskMode);
  drawMasks();
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

$('.choose_tpop').click(function(event) {
  const request = {
    tpop: tpop,
    side: $(event.target).attr('canvas'),
  };
  currentUpload = request.side;
  LOGGER.send('UPLOAD', 'server-select-other-tpops', request);
  ipcRenderer.send('server-select-other-tpops', request);
});


$('#tpop-button-select').click(function() {
  if (!($('#tpop-button-select').hasClass('disabled'))) {
    const url = $('.tpop-image.selected').find('img').attr('src');
    const sidename = $('#tpop-side').html();
    const side = getSide(sidename);
    side.content.filepath = url;
    draw(sidename, true);
    $('#tpop-button-select').addClass('disabled');
    $('.tpop-image.selected').removeClass('selected');
    $('#tpop-select-overlay').addClass('unrendered');
    $('#tpop-side').html('');
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


let drags = 0;

$(window).on('dragenter', (e) => {
  e.preventDefault();
  e.stopPropagation();
  drags = drags + 1;
  if (!recto.content.filepath) {
    $('#recto_canvas_region .overlay-drop').css('display', 'flex');
  }
  if (!verso.content.filepath) {
    $('#verso_canvas_region .overlay-drop').css('display', 'flex');
  }
});
$(window).on('dragleave', (e) => {
  e.preventDefault();
  e.stopPropagation();
  drags = drags - 1;
  if (drags <= 0) {
    drags = 0;
    $('#recto_canvas_region .overlay-drop').css('display', 'none');
    $('#verso_canvas_region .overlay-drop').css('display', 'none');
  }
});

$(window).on('dragover', (e) => {
  e.preventDefault();
});

$(window).on('drop', (e) => {
  e.preventDefault();
  drags = 0;
  $('#recto_canvas_region .overlay-drop').css('display', 'none');
  $('#verso_canvas_region .overlay-drop').css('display', 'none');
});

$('.overlay-drop').on('drop', (e) => {
  e.preventDefault();
  e.stopPropagation();
  drags = 0;
  $('#recto_canvas_region .overlay-drop').css('display', 'none');
  $('#verso_canvas_region .overlay-drop').css('display', 'none');

  currentUpload = $(e.target).attr('canvas')
  if (!currentUpload) {
    currentUpload = $(e.target).parent().attr('canvas')
  }
  let pathArr = [];
  for (const f of event.dataTransfer.files) {
    pathArr.push(f.path);
  }

  ipcRenderer.send('server-upload-image-given-filepath', pathArr[0]);
});



/* IP-COMMUNICATION */

// Event receiving the filepath to an image, be it local or from the internet.
ipcRenderer.on('upload-receive-image', (event, filepath) => {
  // LOGGER.receive('UPLOAD', 'upload-receive-image', filepath);
  
  // if (!filepath) {
    // currentUpload = null;
  // } else {
    updateCanvasSize();
    // const side = getSide(currentUpload);
    // side.content.filepath = filepath;
    syncMasks();
    // draw(currentUpload);
    // centerImage(getSide(currentUpload));
    // currentUpload = null;
  
    // if ($('#objectname').val() == '') {
    //   let name = filepath.split('\\').pop().split('/').pop();
    //   name = name.replace(/\.[^/.]+$/, '');
    //   $('#objectname').val(name);
    //   checkRequiredFields();
    // }
  // }
// });

ipcRenderer.on('upload-fragment', (event, data) => {
  LOGGER.receive('UPLOAD', 'upload-fragment', data);
  if ('tpop' in data) tpop = data['tpop'];
  loadData(data);
});

ipcRenderer.on('upload-tpop-images', (event, data) => {
  LOGGER.receive('UPLOAD', 'upload-tpop-images', data);
  $('#tpop-side').html(currentUpload);
  currentUpload = null;
  $('#tpop-image-list').empty();
  for (const imageURL of data) {
    const wrapper = document.createElement('div');
    wrapper.setAttribute('class', 'tpop-image');
    const tpopImage = document.createElement('img');
    tpopImage.setAttribute('src', imageURL);
    wrapper.append(tpopImage);
    $('#tpop-image-list').append(wrapper);

    wrapper.addEventListener('click', function(event) {
      $('.tpop-image.selected').removeClass('selected');
      $(wrapper).addClass('selected');
      $('#tpop-button-select').removeClass('disabled');
    });
  }
  $('#tpop-select-overlay').removeClass('unrendered');
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

ipcRenderer.on('upload-mask-edited', (event) => {
  LOGGER.receive('UPLOAD', 'upload-mask-edited');
  drawMasks(true);
});
