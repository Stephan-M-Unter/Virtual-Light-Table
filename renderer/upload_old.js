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

/* DOCUMENT READY */

// $(document).ready(function() {
  // updateCanvasSize();
// });

/* FUNCTIONS */

/**
 * Reading the current width and height of the canvas DOM element and feeding it into
 * the createjs.Stage().canvas object.
 */
// function updateCanvasSize() {
  // recto.stage.canvas.width = recto.canvas.width();
  // recto.stage.canvas.height = recto.canvas.height();
  // verso.stage.canvas.width = verso.canvas.width();
  // verso.stage.canvas.height = verso.canvas.height();
  // if (reposition) {
    // centerImages();
  // }
  // rectko.stage.update();
  // verso.stage.update();
// }

// function centerImages() {
  // centerImage(recto);
  // centerImage(verso);k
  // reposition = false;
// }

// function centerImage(side) {
  // if (side.content.img) {
    // side.content.x = $(side.canvas).innerWidth() / 2;
    // side.content.y = $(side.canvas).innerHeight() / 2;
    // side.content.img.x = side.content.x;
    // side.content.img_bg.x = side.content.x;
    // side.content.img.y = side.content.y;
    // side.content.img_bg.y = side.content.y;
  // }
  // drawMasks();
  // side.stage.update();
// }

/**
 * Helper function to declutter code a little bit.
 * @param {'recto'|'verso'} sidename
 * @return {Object}
 */
// function getSide(sidename) {
  // if (sidename == 'recto') {
    // return recto;
  // } else if (sidename == 'verso') {
    // return verso;
  // }
// }

/**
 * @param {'recto'|'verso'} sidename
 * @returns {Object}
 */
function createEmptySide(sidename) {
  const newSide = {
    'stage': new createjs.Stage(sidename+'_canvas'),
    'cursor': new createjs.Shape(new createjs.Graphics().beginStroke('black').drawCircle(0,0,$('#mask_control_brush_slider').val())),
    'canvas': $('#'+sidename+'_canvas'),
    'sidename': sidename,
    'content': {
      'filepath': null,
      'img': null,
      'img_bg': null,
      'rotation': 0,
      'x': null,
      'y': null,
      'www': false,
    },
    'mask': {
      'group': null,
      'box': [],
      'polygon': [],
      'auto': {
        'paths': {},
        'mask': null,
        'cuts': {},
        'cut': null,
        'drawing': null,
      },
    },
  };
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

  const maskGroup = new createjs.Container();
  maskGroup.name = 'mask container';
  newSide.mask.group = maskGroup;
  newSide.stage.addChild(maskGroup);

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

/**
 *
 * @param {'recto'|'verso'} sidename - String indicating which canvas needs to be initialised.
*/
function draw(sidename, center) {
  // const side = getSide(sidename);
  // side.stage.removeAllChildren();
  // if (side.content.filepath != null) {
    // if (side.content.img == null) {
      // create a new image first from file
    } else {
      // draw canvas
      // // get width/height of image and canvas
      // const iWidth = side.content.img.image.width;
      // const iHeight = side.content.img.image.height;
      // const cWidth = side.stage.canvas.width;
      // const cHeight = side.stage.canvas.height;

      // setting regCoordinates for img and img_bg
      // side.content.img_bg.regX = side.content.img.regX = iWidth / 2;
      // side.content.img_bg.regY = side.content.img.regY = iHeight / 2;

      // set x, y - if there is an offset, take it,
      // otherwise center image to canvas
      // const x = side.content.offsetX || cWidth / 2;
      // const y = side.content.offsetY || cHeight / 2;
      
      
      // if ('scale' in side.content && side.content.scale) {
        // side.content.img.scale = side.content.scale;
        // side.content.img_bg.scale = side.content.scale;
      // }
      // else {
        // const fittingScale = getFittingScale(side);
        // side.content.scale = fittingScale;
        // side.content.img.scale = fittingScale;
        // side.content.img_bg.scale = fittingScale;
        // reposition = true;
      // }
      
      // side.content.img.x = side.content.img_bg.x = side.content.x;
      // side.content.img.y = side.content.img_bg.y = side.content.y;
      // side.content.img.rotation = side.content.img_bg.rotation = side.content.rotation;

      // creating white "shadow" layer to visually indicate mask
      // const shadow = new createjs.Shape();
      // shadow.name = 'Shadow';
      // shadow.graphics.beginFill('white')
          // .drawRect(0, 0, cWidth, cHeight)
          // .endFill();
      // shadow.alpha = 0.8;
      // shadow.side = side;

      // shadow event listeners
      shadow.on('mousedown', (event) => {
        handleMouseDown(event, event.target.side.sidename);
      });
      shadow.on('pressmove', (event) => {
        handlePressMove(event, event.target.side.sidename);
      });

      // side.stage.addChildAt(side.content.img_bg, shadow, side.content.img, side.mask.group, 0);
      if (center) centerImage(side);
    }
  } else {
    // side.stage.removeAllChildren();
    // side.stage.update();
    if (tpop) {
      $('#'+sidename+'_canvas_region').find('.choose_tpop').removeClass('unrendered');
    }
  }
  drawMasks();
  checkGUI();
}

// function getFittingScale(side) {
//   const canvasHeight = $(side.canvas).innerHeight();
//   const canvasWidth = $(side.canvas).innerWidth();
//   const imageHeight = side.content.img.image.height;
//   const imageWidth = side.content.img.image.width;

//   const scaleX = Math.min(1, (canvasWidth / imageWidth));
//   const scaleY = Math.min(1, (canvasHeight / imageHeight));
//   const scale = Math.min(scaleX, scaleY);

//   return scale;
// }

/**
 *
 * @param {*} sidename
 */
function createImage(sidename, center) {
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
    side.content.img.on('mousedown', (event) => {
      handleMouseDown(event, event.target.parent.sidename);
    });
    side.content.img_bg.on('mousedown', (event) => {
      handleMouseDown(event, event.target.parent.sidename);
    });
    side.content.img.on('pressmove', (event) => {
      handlePressMove(event, event.target.parent.sidename);
    });
    side.content.img_bg.on('pressmove', (event) => {
      handlePressMove(event, event.target.parent.sidename);
    });

    // now recursively restart startCanvas() as now an image is available
    // draw(sidename, center);
  };
}

/**
 * Reading PPI resolution from EXIF data if available. If so, the result will be added
 * to the input field connected to the given side (recto/verso).
 * @param {Image} image
 * @param {'recto'|'verso'} sidename
 */
// function readExifPPI(image, sidename) {
  // try {
    // EXIF.getData(image, function() {
      // const exifs = EXIF.getAllTags(image);
      // if (exifs.XResolution) {
        // const ppi = exifs.XResolution.numerator/exifs.XResolution.denominator;
        // $('#'+sidename+'_ppi').val(ppi);
        // checkRequiredFields();
      // } else {
        // console.log(`Input image (${sidename}) has no EXIF data.`);
      // }
    // });
  // } catch {
    // console.log(`Input image (${sidename}) has no EXIF data.`);
  // }
// }

/**
 *
 * @param {*} event
 * @param {*} sidename
 */
function handleMouseDown(event, sidename) {
  const side = getSide(sidename);
  if (actionMode == 'scale' && sidename == scaleMode) {
    doScaling(event.stageX, event.stageY);
  } else if (actionMode == 'polygon') {
    addPolygonNode([event.stageX, event.stageY], sidename);
  }
  mousestart.x = event.stageX;
  mousestart.y = event.stageY;
  mousestart.offsetX = event.stageX - side.content.x;
  mousestart.offsetY = event.stageY - side.content.y;
}

/**
 *
 * @param {*} event
 * @param {*} sidename
 */
function handlePressMove(event, sidename) {
  const side = getSide(sidename);
  const mouse = {x: event.stageX, y: event.stageY};
  const mouseDistance = {x: mouse.x - mousestart.offsetX, y: mouse.y - mousestart.offsetY};
  if (actionMode == null && !(brushMode && brushing)) {
    if (mode == 'move') {
      side.content.x = mouseDistance.x;
      side.content.y = mouseDistance.y;
    } else if (mode == 'rotate') {
      const radsOld = Math.atan2(mousestart.y - side.content.img.y,
          mousestart.x - side.content.img.x);
      const radsNew = Math.atan2(mouse.y - side.content.img.y,
          mouse.x - side.content.img.x);
      const rads = radsNew - radsOld;
      const deltaAngle = rads * (180 / Math.PI);
      rotateByAngle(deltaAngle, sidename);
      mousestart.x = mouse.x;
      mousestart.y = mouse.y;
    }
    draw(sidename);
    side.stage.update();
  }
}

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
function swap() {
  // swap side data
  let temp = recto.content;
  recto.content = verso.content;
  verso.content = temp;

  // swap masks
  temp = recto.mask;
  recto.mask = verso.mask;
  verso.mask = temp;
  drawMasks();

  // swap ppi
  temp = $('#recto_ppi').val();
  $('#recto_ppi').val($('#verso_ppi').val());
  $('#verso_ppi').val(temp);

  draw('recto');
  draw('verso');
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
  if (maskMode == 'boundingbox') {
    // display boundingbox
    drawBoxMask();
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
function setDefaultBox() {
  // no mask created so far, set default values
  const canvasWidth = recto.stage.canvas.width;
  const canvasHeight = recto.stage.canvas.height;
  const x = canvasWidth * 0.25;
  const y = canvasHeight * 0.25;
  const w = canvasWidth * 0.5;
  const h = canvasHeight * 0.5;

  // nw, sw, se, ne
  recto.mask.box = [[x, y], [x, y+h], [x+w, y+h], [x+w, y]];
  updateVersoMask();
}

/**
 *
 */
function drawBoxMask() {
  if (recto.mask.box.length == 0 && verso.mask.box.length == 0) {
    // no mask created so far, set default values
    setDefaultBox();
  }

  // RECTO
  if (recto.content.img) {
    const polygonRecto = createPolygon(recto.mask.box);
    recto.content.img.mask = polygonRecto;
    const b1rt = createVertex(recto.mask.box[0]);
    const b2rt = createVertex(recto.mask.box[1]);
    const b3rt = createVertex(recto.mask.box[2]);
    const b4rt = createVertex(recto.mask.box[3]);
    b1rt.on('pressmove', (event) => {
      resizeBox(event, 'recto', 'nw');
    });
    b2rt.on('pressmove', (event) => {
      resizeBox(event, 'recto', 'sw');
    });
    b3rt.on('pressmove', (event) => {
      resizeBox(event, 'recto', 'se');
    });
    b4rt.on('pressmove', (event) => {
      resizeBox(event, 'recto', 'ne');
    });
    recto.mask.group.removeAllChildren();
    recto.mask.group.addChild(polygonRecto, b1rt, b2rt, b3rt, b4rt);
    recto.stage.update();
  }

  // VERSO
  if (verso.content.img) {
    const polygonVerso = createPolygon(verso.mask.box);
    verso.content.img.mask = polygonVerso;
    const b1vs = createVertex(verso.mask.box[0]);
    const b2vs = createVertex(verso.mask.box[1]);
    const b3vs = createVertex(verso.mask.box[2]);
    const b4vs = createVertex(verso.mask.box[3]);
    b1vs.on('pressmove', (event) => {
      resizeBox(event, 'verso', 'ne');
    });
    b2vs.on('pressmove', (event) => {
      resizeBox(event, 'verso', 'se');
    });
    b3vs.on('pressmove', (event) => {
      resizeBox(event, 'verso', 'sw');
    });
    b4vs.on('pressmove', (event) => {
      resizeBox(event, 'verso', 'nw');
    });
    verso.mask.group.removeAllChildren();
    verso.mask.group.addChild(polygonVerso, b1vs, b2vs, b3vs, b4vs);
    verso.stage.update();
  }
}

/**
 *
 * @param {*} event
 * @param {*} sidename
 * @param {*} compass
 */
function resizeBox(event, sidename, compass) {
  let mouseX = event.stageX;
  if (sidename == 'verso') {
    mouseX = recto.stage.canvas.width - mouseX;
  }
  const mouseY = event.stageY;

  let x = recto.mask.box[0][0];
  let y = recto.mask.box[0][1];
  let w = recto.mask.box[2][0];
  let h = recto.mask.box[2][1];

  if (compass == 'nw') {
    x = Math.min(mouseX, w);
    y = Math.min(mouseY, h);
  } else if (compass == 'sw') {
    x = Math.min(mouseX, w);
    h = Math.max(y, mouseY);
  } else if (compass == 'se') {
    w = Math.max(mouseX, x);
    h = Math.max(mouseY, y);
  } else if (compass == 'ne') {
    w = Math.max(mouseX, x);
    y = Math.min(mouseY, h);
  }

  recto.mask.box = [[x, y], [x, h], [w, h], [w, y]];
  updateVersoMask();
  drawBoxMask();
}

/**
 *
 * @param {*} pointsArray
 * @returns
 */
function createPolygon(pointsArray) {
  if (pointsArray.length > 0) {
    const polygon = new createjs.Shape();
    const p0 = pointsArray[0];
    polygon.graphics.beginStroke('black');
    polygon.graphics.moveTo(p0[0], p0[1]);
    for (let i = 1; i < pointsArray.length; i++) {
      const p = pointsArray[i];
      polygon.graphics.lineTo(p[0], p[1]);
    }
    polygon.graphics.lineTo(p0[0], p0[1]);
    return polygon;
  } else {
    return null;
  }
}

/**
 *
 * @param {*} point
 * @param {*} circle
 * @returns
 */
function createVertex(point, circle=false) {
  const size = 10;
  const x = point[0] - size/2;
  const y = point[1] - size/2;
  const vertex = new createjs.Shape();
  vertex.graphics.setStrokeStyle(1).beginStroke('green');
  vertex.graphics.beginFill('lightgreen');
  if (circle) {
    vertex.graphics.drawCircle(point[0], point[1], size*0.66);
  } else {
    vertex.graphics.drawRect(x, y, size, size);
  }

  vertex.on('mouseover', vertexMouseIn);
  vertex.on('mouseout', vertexMouseOut);

  return vertex;
}

/**
 *
 * @param {*} event
 */
function vertexMouseIn(event) {
  const c = event.target.graphics.command;
  event.target.graphics.clear();
  event.target.graphics.beginFill('green');
  if ('radius' in c) {
    event.target.graphics.drawCircle(c.x, c.y, c.radius);
  } else {
    event.target.graphics.drawRect(c.x, c.y, c.w, c.h);
  }
  recto.stage.update();
  verso.stage.update();
}

/**
 *
 * @param {*} event
 */
function vertexMouseOut(event) {
  const c = event.target.graphics.command;
  event.target.graphics.clear();
  event.target.graphics.beginFill('lightgreen');
  event.target.graphics.setStrokeStyle(1).beginStroke('green');
  if ('radius' in c) {
    event.target.graphics.drawCircle(c.x, c.y, c.radius);
  } else {
    event.target.graphics.drawRect(c.x, c.y, c.w, c.h);
  }
  recto.stage.update();
  verso.stage.update();
}

/**
 *
 */
function mirrorPoints(pointArray) {
  const canvasWidth = recto.stage.canvas.width;
  const result = [];
  pointArray.forEach((point) => {
    result.push([canvasWidth-point[0], point[1]]);
  });
  result.reverse();
  return result;
}

/**
 *
 */
function drawPolygonMask() {
  // RECTO
  if (recto.content.img) {
    const polygonRecto = createPolygon(recto.mask.polygon);
    recto.content.img.mask = polygonRecto;
    recto.mask.group.removeAllChildren();
    recto.mask.group.addChild(polygonRecto);
    recto.mask.polygon.forEach((point, index) => {
      let vertex;
      if (index == recto.mask.polygon.length - 1) {
        vertex = createVertex(point, true);
      } else {
        vertex = createVertex(point);
      }
      vertex.on('pressmove', (event) => {
        moveVertex(event, 'recto', index);
      });
      vertex.on('click', () => {
        if (actionMode == 'polygon_remove') {
          removePolygonNode(index);
        }
      });
      recto.mask.group.addChild(vertex);
    });
    recto.stage.update();
  }

  // VERSO
  if (verso.content.img) {
    const polygonVerso = createPolygon(verso.mask.polygon);
    verso.content.img.mask = polygonVerso;
    verso.mask.group.removeAllChildren();
    verso.mask.group.addChild(polygonVerso);
    verso.mask.polygon.forEach((point, index) => {
      let vertex;
      if (index == 0) {
        vertex = createVertex(point, true);
      } else {
        vertex = createVertex(point);
      }
      vertex.on('pressmove', (event) => {
        moveVertex(event, 'verso', verso.mask.polygon.length-index-1);
      });
      vertex.on('click', () => {
        if (actionMode == 'polygon_remove') {
          removePolygonNode(verso.mask.polygon.length-index-1);
        }
      });
      verso.mask.group.addChild(vertex);
    });
    verso.stage.update();
  }
}

/**
 *
 * @param {*} event
 * @param {*} sidename
 * @param {*} index
 */
function moveVertex(event, sidename, index) {
  let mouseX = event.stageX;
  if (sidename == 'verso') {
    mouseX = recto.stage.canvas.width - mouseX;
  }
  const mouseY = event.stageY;

  recto.mask.polygon[index] = [mouseX, mouseY];
  updateVersoMask();
  drawMasks();
}

/**
 *
 */
function clearPolygon() {
  recto.mask.polygon = [];
  verso.mask.polygon = [];
  drawMasks();
}

/**
 *
 */
function undoPolygonNode() {
  if (recto.mask.polygon.length > 0) {
    recto.mask.polygon.pop();
    updateVersoMask();
  }
  drawMasks();
}

/**
 *
 * @param {*} point
 * @param {*} sidename
 */
function addPolygonNode(point, sidename) {
  let x = point[0];
  if (sidename == 'verso') {
    x = recto.stage.canvas.width - x;
  }
  const y = point[1];
  recto.mask.polygon.push([x, y]);
  updateVersoMask();
  drawMasks();
}

/**
 *
 * @param {*} index
 */
function removePolygonNode(index) {
  recto.mask.polygon.splice(index, 1);
  updateVersoMask();
  drawMasks();
}

/**
 *
 */
function updateVersoMask() {
  verso.mask.box = mirrorPoints(recto.mask.box);
  verso.mask.polygon = mirrorPoints(recto.mask.polygon);
}

function updateRectoMask() {
  recto.mask.box = mirrorPoints(verso.mask.box);
  recto.mask.polygon = mirrorPoints(verso.mask.polygon);
}

/**
 *
 */
function startAddPolygonNodes() {
  endActiveModes();
  actionMode = 'polygon';
  $('#mask_control_polygon_add').addClass('active');
  $('canvas').addClass('addPolygonNode');
}

/**
 *
 */
function endAddPolygonNodes() {
  actionMode = null;
  $('.addPolygonNode').removeClass('addPolygonNode');
  $('#mask_control_polygon_add').removeClass('active');
}

/**
 *
 */
function startRemovePolygonNodes() {
  endActiveModes();
  actionMode = 'polygon_remove';
  $('#mask_control_polygon_remove').addClass('active');
  $('canvas').addClass('removePolygonNode');
}

/**
 *
 */
function endRemovePolygonNodes() {
  actionMode = null;
  $('.removePolygonNode').removeClass('removePolygonNode');
  $('#mask_control_polygon_remove').removeClass('active');
}

/**
 *
 */
function endActiveModes() {
  endAddPolygonNodes();
  endRemovePolygonNodes();
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
function clearMask() {
  if (recto.content.img) {
    recto.content.img.mask = null;
    recto.mask.group.removeAllChildren();
    recto.stage.update();
  }
  if (verso.content.img) {
    verso.content.img.mask = null;
    verso.mask.group.removeAllChildren();
    verso.stage.update();
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

function activateMaskMode(mode) {
  if (maskMode == 'polygon' && mode != 'polygon') {
    endAddPolygonNodes();
  }
  $('.selected').removeClass('selected');
  maskMode = mode;
  $('.list_item.'+maskMode).addClass('selected');
  $('.mask_controls.'+maskMode).addClass('selected');
  $('.mask_explanation.'+maskMode).addClass('selected');
  checkGUI();
  drawMasks();
}

/* INTERACTIVE ELEMENTS */

// $(window).on('keyup', (event) => {
  // checkRequiredFields();
// });

// $(window).on('resize', (event) => {
  // updateCanvasSize();
// });

// $(window).on('mousewheel', (event) => {
  // handleMousewheel(event);
// });

/* Buttons */
// $('.local_upload').on('click', (event) => {
  // if (currentUpload == null) {
    // const canvas = $(event.target).attr('canvas');
    // currentUpload = canvas;
    // LOGGER.send('UPLOAD', 'server-upload-image');
    // ipcRenderer.send('server-upload-image');
  // }
// });
// $('.www_upload').on('click', (event) => {
  // if (currentUpload == null) {
    // const canvas = $(event.target).attr('canvas');
    // currentUpload = canvas;
    
    // try {
      // dialogs.prompt('Enter image URL:', function(url) {
        // if (url != '' && url != null) {
          // getSide(kcurrentUpload).content.filepath = url;
          // getSide(currentUpload).content.www = true;
          // draw(currentUpload);
          // currentUpload = null;
        // } else {
          // currentUpload = null;
        // }
      // });
    // } catch {
      // alert('Please make sure your image URL leads to an image file (jpg, png)!');
      // currentUpload = null;
    // }
  // }
// });
// $('.delete').on('click', (event) => {
  // const canvas = $(event.target).attr('canvas');
  // clearCanvas(canvas);
// });
// $('.rotate_90').on('click', (event) => {
  // const canvas = $(event.target).attr('canvas');
  // rotateByAngle(90, canvas);
// });
// $('.center').on('click', (event) => {
  // const side = getSide($(event.target).attr('canvas'));
  // centerImage(side);
// });
$('.measure').on('click', (event) => {
  const target = $(event.target).attr('canvas');
  const button = $(event.target).parent();
  $('canvas').removeClass('scale');

  if (button.hasClass('active')) {
    // (this) scale mode was active, deactivate
    endScaling();
  } else {
    // (this) scale mode was inactive, activate it
    button.addClass('active');
    $('#'+target+'_canvas').addClass('scale');
    startScaling(target);
  }
});
// $('#move').on('click', (event) => {
  // $('.active_mode').removeClass('active_mode');
  // $('#move').addClass('active_mode');
  // mode = 'move';
// });
$('#swap').on('click', (event) => {
  swap();
});
// $('#rotate').on('click', (event) => {
  // $('.active_mode').removeClass('active_mode');
  // $('#rotate').addClass('active_mode');
  // mode = 'rotate';
// });

// $('#manual_instructions').on('click', (event) => {
  // $('#tutorial_region').removeClass('unrendered');
// });
// $('#tutorial_close').on('click', (event) => {
  // $('#tutorial_region').addClass('unrendered');
// });
// $('#tutorial_shadow').on('click', (event) => {
  // $('#tutorial_region').addClass('unrendered');
// });

// $('html').keydown(function(event) {
  // if (event.keyCode == 27) {
    // // ESC
    // if (!$('tutorial_region').hasClass('unrendered')) {
      // $('#tutorial_region').addClass('unrendered');
    // }
    // endScaling();
  // }k
// });

$('.list_item').on('click', (event) => {
  const list = $('.list');
  if (list.hasClass('open')) {
    list.removeClass('open');
    let listItem = $(event.target);
    if (!listItem.hasClass('list_item')) {
      listItem = listItem.parent();
    }
    activateMaskMode(listItem.attr('mask_mode'));
  } else {
    list.addClass('open');
  }
});

$('#mask_control_box_reset').click(() => {
  setDefaultBox();
  drawMasks();
});
$('#mask_control_polygon_undo').click(() => {
  undoPolygonNode();
});
$('#mask_control_polygon_clear').click(() => {
  clearPolygon();
});
$('#mask_control_polygon_add').click(() => {
  if ($('#mask_control_polygon_add').hasClass('active')) {
    endAddPolygonNodes();
  } else {
    startAddPolygonNodes();
  }
});
$('#mask_control_polygon_remove').click(() => {
  if ($('#mask_control_polygon_remove').hasClass('active')) {
    endRemovePolygonNodes();
  } else {
    startRemovePolygonNodes();
  }
});

$('#upload_button').click(() => {
  if (!$('#upload_button').hasClass('disabled')) {
    uploadData();
  }
});

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

$('#mask_control_brush_slider').on('change input', (event) => {
  for (const side of [recto, verso]) {
    side.cursor.graphics = new createjs.Graphics().beginStroke('black').drawCircle(0,0,$('#mask_control_brush_slider').val())
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
$('#tpop-button-close').click(function() {
  $('#tpop-select-overlay').addClass('unrendered');
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

$('#open-settings').click(function() {
  LOGGER.send('UPLOAD', 'server-open-settings');
  ipcRenderer.send('server-open-settings');
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

/* Input Fields */

$('.input_ppi').on('input', (event) => {
  // checkRequiredFields();
  scaleImages();
});


/* List */


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

ipcRenderer.on('tensorflow-checked', (event, tensorflowCheck) => {
  LOGGER.receive('UPLOAD', 'tensorflow-checked', tensorflowCheck);
  if (tensorflowCheck == true) {
    tensorflow = true;
    $('#mask_control_automatic_selection_panel').removeClass('unrendered');
    drawAutoMask();
    const request = {
      'code': 'SEG',
      'requiredCapacities': ['papyrus'],
    }
    LOGGER.send('UPLOAD', 'server-get-ml-models', request);
    ipcRenderer.send('server-get-ml-models', request);
  } else {
    $('#mask_control_tensorflow_panel').removeClass('unrendered');
  }
});

ipcRenderer.on('tensorflow-installed', (event, tensorflowInstalled) => {
  LOGGER.receive('UPLOAD', 'tensorflow-installed', tensorflowInstalled);
  if (tensorflowInstalled) {
    $('#mask_control_tensorflow_panel').addClass('unrendered');
    $('#mask_control_automatic_selection_panel').removeClass('unrendered');
    tensorflow = true;
  }
})

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

ipcRenderer.on('ml-models', (event, models) => {
  LOGGER.receive('UPLOAD', 'ml-models');
  // for every entry in models, add a new option to #mask_automatic_model
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
});
