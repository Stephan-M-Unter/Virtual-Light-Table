'use strict';

const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const dialogs = new Dialogs();

/* Variables */

let currentUpload = null;
let mode = $('.active_mode').attr('mode');
let maskMode = 'no_mask';
let scaleMode = null;
let scalePoint = null;
let scale = 1;
const mousestart = {};

let recto = {
  'stage': new createjs.Stage('recto_canvas'),
  'canvas': $('#recto_canvas'),
  'sidename': 'recto',
  'content': {
    'filepath': null,
    'img': null,
    'img_bg': null,
    'rotation': 0,
  },
};
let verso = {
  'stage': new createjs.Stage('verso_canvas'),
  'canvas': $('#verso_canvas'),
  'sidename': 'verso',
  'content': {
    'filepath': null,
    'img': null,
    'img_bg': null,
    'rotation': 0,
  },
};

/* DOCUMENT READY */

$(document).ready(function() {
  recto.stage.sidename = 'recto';
  verso.stage.sidename = 'verso';
  updateCanvasSize();
});

/* FUNCTIONS */

/**
 * Reading the current width and height of the canvas DOM element and feeding it into
 * the createjs.Stage().canvas object.
 */
function updateCanvasSize() {
  recto.stage.canvas.width = recto.canvas.width();
  recto.stage.canvas.height = recto.canvas.height();
  verso.stage.canvas.width = verso.canvas.width();
  verso.stage.canvas.height = verso.canvas.height();
  recto.stage.update();
  verso.stage.update();
}

/**
 * Helper function to declutter code a little bit.
 * @param {'recto'|'verso'} sidename
 * @return {Object}
 */
function getSide(sidename) {
  if (sidename == 'recto') {
    return recto;
  } else if (sidename == 'verso') {
    return verso;
  }
}

/**
 *
 * @param {'recto'|'verso'} sidename
 */
function createEmptySide(sidename) {
  const newSide = {
    'stage': new createjs.Stage(sidename+'_canvas'),
    'canvas': $('#'+sidename+'_canvas'),
    'sidename': sidename,
    'content': {
      'filepath': null,
      'img': null,
      'img_bg': null,
      'rotation': 0,
    },
  };
  if (sidename == 'recto') {
    recto = newSide;
  } else if (sidename == 'verso') {
    verso = newSide;
  }
}

/**
 *
 * @param {'recto'|'verso'} sidename - String indicating which canvas needs to be initialised.
*/
function draw(sidename) {
  const side = getSide(sidename);
  side.stage.removeAllChildren();
  if (side.content.filepath != null) {
    if (side.content.img == null) {
    // create a new image first from file
      createImage(sidename);
    } else {
      // draw canvas
      // get width/height of image and canvas
      const iWidth = side.content.img.image.width;
      const iHeight = side.content.img.image.height;
      const cWidth = side.stage.canvas.width;
      const cHeight = side.stage.canvas.height;

      // setting regCoordinates for img and img_bg
      side.content.img_bg.regX = side.content.img.regX = iWidth / 2;
      side.content.img_bg.regY = side.content.img.regY = iHeight / 2;

      // set x, y - if there is an offset, take it,
      // otherwise center image to canvas
      // const x = side.content.offsetX || cWidth / 2;
      // const y = side.content.offsetY || cHeight / 2;
      side.content.img.x = side.content.img_bg.x = side.content.x;
      side.content.img.y = side.content.img_bg.y = side.content.y;
      side.content.img.rotation = side.content.img_bg.rotation = side.content.rotation;
      // side.img.scale = getFittingScale(side);
      // side.imgBackground.scale = getFittingScale(side);

      // creating white "shadow" layer to visually indicate mask
      const shadow = new createjs.Shape();
      shadow.graphics.beginFill('white')
          .drawRect(0, 0, cWidth, cHeight)
          .endFill();
      shadow.alpha = 0.7;
      shadow.side = side;

      // shadow event listeners
      shadow.on('mousedown', (event) => {
        handleMouseDown(event, event.target.side.sidename);
      });
      shadow.on('pressmove', (event) => {
        handlePressMove(event, event.target.side.sidename);
      });

      side.stage.addChildAt(side.content.img_bg, shadow, side.content.img, 0);
      //   drawMasks();
    }
  }
  side.stage.update();
  checkGUI();
}

/**
 *
 * @param {*} sidename
 */
function createImage(sidename) {
  const side = getSide(sidename);
  const newImage = new Image();
  newImage.src = side.content.filepath;
  newImage.onload = function() {
    // extract PPI from EXIF if possible
    readExifPPI(newImage, sidename);

    // create new Bitmap objects
    const image = new createjs.Bitmap(newImage);
    const imageBackground = new createjs.Bitmap(newImage);
    side.content.img = image;
    side.content.img_bg = imageBackground;

    side.content.x = side.stage.canvas.width / 2;
    side.content.y = side.stage.canvas.height / 2;

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
    draw(sidename);
  };
}

/**
 * Reading PPI resolution from EXIF data if available. If so, the result will be added
 * to the input field connected to the given side (recto/verso).
 * @param {Image} image
 * @param {'recto'|'verso'} sidename
 */
function readExifPPI(image, sidename) {
  try {
    EXIF.getData(image, function() {
      const exifs = EXIF.getAllTags(image);
      if (exifs.XResolution) {
        const ppi = exifs.XResolution.numerator/exifs.XResolution.denominator;
        $('#'+sidename+'_ppi').val(ppi);
        checkRequiredFields();
      } else {
        console.log('Input image has no EXIF data.');
      }
    });
  } catch {
    console.log('Input image has no EXIF data.');
  }
}

/**
 *
 * @param {*} event
 * @param {*} sidename
 */
function handleMouseDown(event, sidename) {
  const side = getSide(sidename);
  if (sidename == scaleMode) {
    doScaling(event.stageX, event.stageY);
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
}

/**
 *
 * @param {*} event
 */
function handleMousewheel(event) {
  const zoomStep = 0.05;
  const zoomDirection = Math.sign(event.originalEvent.wheelDelta); // positive: zoom in; negative: zoom out
  if (recto.content.filepath != null || verso.content.filepath != null) {
    // only zoom if at least one canvas has content
    // TODO zooming
    if ((scale > zoomStep && zoomDirection < 0) || zoomDirection > 0) {
      scale = scale + (zoomStep * zoomDirection);
      scale = Math.round(scale*100)/100;
      if (recto.content.img) {
        let rectoPPI = $('#recto_ppi').val();
        if (rectoPPI == '') {
          rectoPPI = 96;
        }
        let rectoScale = (96 * (96/rectoPPI) * scale) / 96;
        rectoScale = Math.round(rectoScale*100) / 100;
        recto.content.img.scale = rectoScale;
        recto.content.img_bg.scale = rectoScale;
        console.log("Recto:", recto.content.img.scale);
      }
      if (verso.content.img) {
        let versoPPI = $('#verso_ppi').val();
        if (versoPPI == '') {
          versoPPI = 96;
        }
        let versoScale = (96 * (96/versoPPI) * scale) / 96;
        versoScale = Math.round(versoScale*100) / 100;
        verso.content.img.scale = versoScale;
        verso.content.img_bg.scale = versoScale;
        console.log("Verso:", verso.content.img.scale);
      }
      recto.stage.update();
      verso.stage.update();
      console.log("Scale:", scale);
    }
  }
}

/**
 *
 * @param {'recto'|'verso'} sidename - String indicating which canvas needs to be cleared.
 */
function clearCanvas(sidename) {
  // remove data
  if (sidename == 'recto') {
    createEmptySide('recto');
  } else if (sidename == 'verso') {
    createEmptySide('verso');
  }

  // clearing fields
  $('#'+sidename+'_ppi').val('');
  draw(sidename);
}

/**
 *
 */
function swap() {
  // swap side data
  let temp = recto.content;
  recto.content = verso.content;
  verso.content = temp;

  // swap ppi
  temp = $('#recto_ppi').val();
  $('#recto_ppi').val($('#verso_ppi').val());
  $('#verso_ppi').val(temp);

  draw('recto');
  draw('verso');
}

/**
 *
 */
function checkRequiredFields() {
  let rectoFulfilled = true;
  let versoFulfilled = true;
  let nameFulfilled = true;
  if (recto.content.filepath) {
    if ($('#recto_ppi').val() == null) {
      rectoFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if ($('#recto_ppi').val() == '') {
      rectoFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if (isNaN($('#recto_ppi').val())) {
      rectoFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if (rectoFulfilled) {
      $('#recto_ppi').removeClass('missing');
    }
  }
  if (verso.content.filepath) {
    if ($('#verso_ppi').val() == null) {
      versoFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if ($('#verso_ppi').val() == '') {
      versoFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if (isNaN($('#verso_ppi').val())) {
      versoFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if (versoFulfilled) {
      $('#verso_ppi').removeClass('missing');
    }
  }
  if ($('#objectname').val() == null || $('#objectname').val() == '') {
    nameFulfilled = false;
    $('#objectname').addClass('missing');
  } else {
    $('#objectname').removeClass('missing');
  }

  if (rectoFulfilled && versoFulfilled && nameFulfilled) {
    $('#upload_button').removeClass('disabled');
  } else {
    $('#upload_button').addClass('disabled');
  }
}

/**
 *
 */
function checkGUI() {
  // show/hide side GUI elements according to the status of the connected side
  if (recto.content.filepath) {
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
  if (verso.content.filepath) {
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
  // hide full GUI if both sides are empty
  if (recto.content.filepath == null && verso.content.filepath == null) {
    $('#button_region').addClass('hidden');
    $('#load_region').addClass('unrendered');
    $('#mask_region').addClass('unrendered');
  }
  checkRequiredFields();
}

/**
 *
 * @param {*} deltaAngle
 * @param {*} sidename
 */
function rotateByAngle(deltaAngle, sidename) {
  const side = getSide(sidename);
  side.content.rotation += deltaAngle;
  side.content.rotation = side.content.rotation % 360;
  draw(sidename);
}

/**
 *
 * @param {*} targetAngle
 * @param {*} sidename
 */
function rotateToAngle(targetAngle, sidename) {
  const side = getSide(sidename);
  side.content.rotation = (targetAngle%360);
  draw(sidename);
}

/**
 * 
 * @param {'recto'|'verso'} target 
 */
function startScaling(target) {
  scaleMode = target;
  console.log("Starting Scale Mode for:", scaleMode);

}

function endScaling() {
  console.log("Ending Scale Mode for:", scaleMode);
  scaleMode = null;
  scalePoint = null;
  $('.measure').removeClass('active');
  $('canvas').removeClass('scale');

}

function doScaling(x, y) {
  if (scalePoint == null) {
    // this click determines the first point
    console.log("First point:", x, y);
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

function scaleImages() {
  if (recto.content.filepath) {
    const rectoPPI = $('#recto_ppi').val();
    if (rectoPPI != '') {
      const rectoScale = (96 * (96/rectoPPI) * scale) / 96;
      // const rectoScale = 96/ (rectoPPI*scale);
      recto.content.img.scale = rectoScale;
      recto.content.img_bg.scale = rectoScale;
    }
  }
  if (verso.content.filepath) {
    const versoPPI = $('#verso_ppi').val();
    if (versoPPI != '') {
      const versoScale = (96 * (96/versoPPI) * scale) / 96;
      // const versoScale = 96 / (versoPPI*scale);
      verso.content.img.scale = versoScale;
      verso.content.img_bg.scale = versoScale;
    }
  }
  recto.stage.update();
  verso.stage.update();
}


/* INTERACTIVE ELEMENTS */

$(window).on('keyup', (event) => {
  checkRequiredFields();
});

$(window).on('resize', (event) => {
  updateCanvasSize();
});

$(window).on('mousewheel', (event) => {
  handleMousewheel(event);
});

/* Buttons */
$('.local_upload').on('click', (event) => {
  if (currentUpload == null) {
    const canvas = $(event.target).attr('canvas');
    currentUpload = canvas;
    ipcRenderer.send('server-upload-image');
  }
});
$('.www_upload').on('click', (event) => {
  if (currentUpload == null) {
    const canvas = $(event.target).attr('canvas');
    currentUpload = canvas;
    console.log('WWW Upload', canvas);
  }
});
$('.delete').on('click', (event) => {
  const canvas = $(event.target).attr('canvas');
  clearCanvas(canvas);
});
$('.rotate_90').on('click', (event) => {
  const canvas = $(event.target).attr('canvas');
  rotateByAngle(90, canvas);
});
$('.measure').on('click', (event) => {
  const target = $(event.target).attr('canvas');
  const button = $(event.target).parent();
  $('.measure').removeClass('active');
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
$('#move').on('click', (event) => {
  $('.active_mode').removeClass('active_mode');
  $('#move').addClass('active_mode');
  mode = 'move';
});
$('#swap').on('click', (event) => {
  swap();
});
$('#rotate').on('click', (event) => {
  $('.active_mode').removeClass('active_mode');
  $('#rotate').addClass('active_mode');
  mode = 'rotate';
});

$('#manual_instructions').on('click', (event) => {
  $('#tutorial_region').removeClass('unrendered');
});
$('#tutorial_close').on('click', (event) => {
  $('#tutorial_region').addClass('unrendered');
});
$('#tutorial_shadow').on('click', (event) => {
  $('#tutorial_region').addClass('unrendered');
});

$('html').keydown(function(event) {
  if (event.keyCode == 27) {
    // ESC
    if (!$('tutorial_region').hasClass('unrendered')) {
      $('#tutorial_region').addClass('unrendered');
    }
  }
});

$('.list_item').on('click', (event) => {
  const list = $('.list');
  if (list.hasClass('open')) {
    list.removeClass('open');
    $('.selected').removeClass('selected');
    let listItem = $(event.target);
    if (!listItem.hasClass('list_item')) {
      listItem = listItem.parent();
    }
    listItem.addClass('selected');
    maskMode = listItem.attr('mask_mode');
    $('.mask_controls.'+maskMode).addClass('selected');
    $('.mask_explanation.'+maskMode).addClass('selected');
    console.log('Mask Mode:', maskMode);
  } else {
    list.addClass('open');
  }
});

/* Input Fields */

$('.input_ppi').on('input', (event) => {
  checkRequiredFields();
  scaleImages();
});


/* List */


/* IP-COMMUNICATION */

// Event receiving the filepath to an image, be it local or from the internet.
ipcRenderer.on('upload-receive-image', (event, filepath) => {
  updateCanvasSize();
  const side = getSide(currentUpload);
  side.content.filepath = filepath;
  draw(currentUpload);
  currentUpload = null;

  if ($('#objectname').val() == '') {
    let name = filepath.split('\\').pop().split('/').pop();
    name = name.replace(/\.[^/.]+$/, '');
    $('#objectname').val(name);
    checkRequiredFields();
  }
});

// TODO: umbenennen auf 'upload-edit-fragment'
// Event triggered if window is opened to edit an already existing fragment, providing
// the necessary data/information about the fragment.
ipcRenderer.on('upload-change-fragment', (event, fragment) => {

});
