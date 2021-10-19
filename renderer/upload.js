'use strict';

const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const dialogs = new Dialogs();

/* Variables */

let currentUpload = null;
const mode = $('.active').attr('mode');

const recto = {
  'stage': new createjs.Stage('recto_canvas'),
  'canvas': $('#recto_canvas'),
  'content': {
    'filepath': null,
  },
};
const verso = {
  'stage': new createjs.Stage('verso_canvas'),
  'canvas': $('#verso_canvas'),
  'content': {
    'filepath': null,
  },
};

/* DOCUMENT READY */

$(document).ready(function() {
  recto.stage.canvas.width = recto.canvas.width();
  recto.stage.canvas.height = recto.canvas.height();
  verso.stage.canvas.widht = verso.canvas.width();
  verso.stage.canvas.height = verso.canvas.height();
});

/* FUNCTIONS */

/**
 *
 */
function showFullGUI() {
  $('#button_region').removeClass('hidden');
  $('#mask_region').removeClass('unrendered');
  $('#load_region').removeClass('unrendered');
}

/**
 *
 */
function hideFullGUI() {
  $('#button_region').addClass('hidden');
  $('#mask_region').addClass('unrendered');
  $('#load_region').addClass('unrendered');
}

/**
 *
 * @param {'recto'|'verso'} side - String indicating which canvas needs to show the control buttons.
 */
function showSideButtons(side) {
  $('#'+side+'_button_region').removeClass('hidden');
  $('#'+side+'_upload_wrapper').addClass('unrendered');
}

/**
 *
 * @param {'recto'|'verso'} side - String indicating which canvas needs to hide the control buttons.
 */
function hideSideGUI(side) {
  $('#'+side+'_button_region').addClass('hidden');
  $('#'+side+'_upload_wrapper').removeClass('unrendered');
}

/**
 *
 * @param {'recto'|'verso'} side - String indicating which canvas needs to be initialised.
*/
function startCanvas(sidename) {
  const side = sides[sidename];
  if (side.filepath != null) {
    if (side.img == null) {
    // create a new image first from file
      createImage(sidename);
    } else {
    // load the image to the scene
      showSideButtons(sidename);
      $('#'+sidename+'_canvas').addClass('active');

      // get width/height of image and canvas
      const iWidth = side.img.image.width;
      const iHeight = side.img.image.height;
      const cWidth = stages[sidename].canvas.width;
      const cHeight = stages[sidename].canvas.height;

      // setting regCoordinates for img and imgBack
      side.imgBackground.regX = side.img.regX = iWidth / 2;
      side.imgBackground.regY = side.img.regY = iHeight / 2;

      // set x, y - if there is an offset, take it,
      // otherwise center image to canvas
      const x = side.offsetX || cWidth / 2;
      const y = side.offsetY || cHeight / 2;
      side.img.x = side.imgBackground.x = x;
      side.img.y = side.imgBackground.y = y;
      side.img.rotation = side.imgBackground.rotation = side.rotation;

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
        handleMouseDown(event);
      });
      shadow.on('pressmove', (event) => {
        handlePressMove(event);
      });

      stages[sidename].addChildAt(side.imgBackground, shadow, side.img, 0);
      //   drawMasks();
      stages[sidename].update();
    }
  }
}

/**
 *
 * @param {*} sidename
 */
function createImage(sidename) {
  const side = sides[sidename];
  const newImage = new Image();
  newImage.src = side.filepath;
  newImage.onload = function() {
    readExifPPI(newImage, sidename);

    const image = new createjs.Bitmap(newImage);
    const imageBackground = new createjs.Bitmap(newImage);
    side.img = image;
    side.imgBackground = imageBackground;

    // register event listeners
    side.img.on('mousedown', (event) => {
      handleMouseDown(event);
    });
    side.imgBackground.on('mousedown', (event) => {
      handleMouseDown(event);
    });
    side.img.on('pressmove', (event) => {
      handlePressMove(event);
    });
    side.imgBackground.on('pressmove', (event) => {
      handlePressMove(event);
    });

    startCanvas(sidename);
  };
}

/**
 * TODO
 * @param {*} image
 * @param {*} sidename
 */
function readExifPPI(image, sidename) {
  try {
    EXIF.getData(image, function() {
      const exifs = EXIF.getAllTags(image);
      if (exifs.XResolution) {
        const ppi = exifs.XResolution.numerator/exifs.XResolution.denominator;
        sides[sidename].ppi = ppi;
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
 * @param {'recto'|'verso'} sidename - String indicating which canvas needs to be cleared.
 */
function clearCanvas(sidename) {
  const side = sides[sidename];
  side.filepath = null;
  side.ppi = null;
  $('#'+sidename+'_ppi').val('');
  hideSideGUI(sidename);
  $('#'+sidename+'_canvas').removeClass('active');

  // if both sides are empty, rewind GUI back to start
  if (sides.recto.filepath == null && sides.verso.filepath == null) {
    hideFullGUI();
  }
}

/**
 *
 */
function swap() {
  // deactivate active rendering of both stages
  $('#recto_canvas').removeClass('active');
  $('#verso_canvas').removeClass('active');
  hideSideGUI('recto');
  hideSideGUI('verso');

  // swap data
  const temp = sides.recto;
  sides.recto = sides.verso;
  sides.verso = temp;

  // reactivate canvases
  startCanvas('recto');
  startCanvas('verso');
}

/**
 *
 */
function checkRequiredFields() {
  let requirementFulfilled = true;
  if (sides.recto.filepath) {
    if ($('#recto_ppi').val() == null) {
      requirementFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if ($('#recto_ppi').val() == '') {
      requirementFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if (isNaN($('#recto_ppi').val())) {
      requirementFulfilled = false;
      $('#recto_ppi').addClass('missing');
    }
    if (requirementFulfilled) {
      $('#recto_ppi').removeClass('missing');
    }
  }
  if (sides.verso.filepath) {
    if ($('#verso_ppi').val() == null) {
      requirementFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if ($('#verso_ppi').val() == '') {
      requirementFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if (isNaN($('#verso_ppi').val())) {
      requirementFulfilled = false;
      $('#verso_ppi').addClass('missing');
    }
    if (requirementFulfilled) {
      $('#verso_ppi').removeClass('missing');
    }
  }
  if ($('#objectname').val() == null || $('#objectname').val() == '') {
    requirementFulfilled = false;
    $('#objectname').addClass('missing');
  } else {
    $('#objectname').removeClass('missing');
  }

  if (requirementFulfilled) {
    $('#upload_button').removeClass('disabled');
  } else {
    $('#upload_button').addClass('disabled');
  }
}


/* INTERACTIVE ELEMENTS */

$(window).on('keyup', (event) => {
  checkRequiredFields();
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
  console.log('Rotate 90', canvas);
});
$('.measure').on('click', (event) => {
  const canvas = $(event.target).attr('canvas');
  console.log('Measure', canvas);
});
$('#move').on('click', (event) => {
  console.log('Move');
});
$('#swap').on('click', (event) => {
  swap();
});
$('#rotate').on('click', (event) => {
  console.log('Rotate');
});

/* Input Fields */

$('.input_ppi').on('input', (event) => {
  checkRequiredFields();
});


/* List */


/* IP-COMMUNICATION */

// Event receiving the filepath to an image, be it local or from the internet.
ipcRenderer.on('upload-receive-image', (event, filepath) => {
  showFullGUI();
  sides[currentUpload].filepath = filepath;
  startCanvas(currentUpload);
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
