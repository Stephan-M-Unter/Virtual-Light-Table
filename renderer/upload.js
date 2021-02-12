'use strict';

const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const dialogs = new Dialogs();

const recto = {
  'stage': null,
  'cropbox': new createjs.Shape(),
  'crop_nw': new createjs.Shape(),
  'crop_ne': new createjs.Shape(),
  'crop_sw': new createjs.Shape(),
  'crop_se': new createjs.Shape(),
  'url': null,
  'offset_x': null,
  'offset_y': null,
  'rotation': 0,
  'polygon': new createjs.Shape(),
  'img': null,
};

const verso = {
  'stage': null,
  'cropbox': new createjs.Shape(),
  'crop_nw': new createjs.Shape(),
  'crop_ne': new createjs.Shape(),
  'crop_sw': new createjs.Shape(),
  'crop_se': new createjs.Shape(),
  'url': null,
  'offset_x': null,
  'offset_y': null,
  'rotation': 0,
  'polygon': new createjs.Shape(),
  'img': null,
};

let name;
let isNameSuggested = false;
let mode = 'crop';
let action = 'move';
let lastUpload = null;
let cropX; let cropY; let cropW; let cropH;
let polygon = [];
let mousestartX; let mousestartY;

/**
 * TODO
 */
function checkIfReady() {
  if (recto.url && verso.url && $('#name').val() != '') {
    $('#load_button').removeClass('disabled');
  } else {
    $('#load_button').addClass('disabled');
  }
}

/**
 * TODO
 * @param {*} wrapper
 */
function deactivateCanvas(wrapper) {
  // background -> grau
  wrapper.find('.canvas').css('backgroundColor', 'rgb(50,50,50)');
  // upload_button -> her
  wrapper.find('.upload_button').css('display', 'block');
  // button_wrapper -> weg
  wrapper.find('.button_wrapper').css('visibility', 'hidden');
  wrapper.find('.resolution_wrapper').css('visibility', 'hidden');
}

/**
 * TODO
 * @param {*} wrapper
 */
function activateCanvas(wrapper) {
  // background -> white
  wrapper.find('.canvas').css('backgroundColor', 'white');
  // upload_button -> weg
  wrapper.find('.upload_button').css('display', 'none');
  // button_wrapper -> her
  wrapper.find('.button_wrapper').css('visibility', 'visible');
  wrapper.find('.resolution_wrapper').css('visibility', 'visible');
}

/**
 * TODO
 * @param {*} stage
 */
function clearCanvas(stage) {
  stage.removeAllChildren();
  stage.update();
}

/**
 * TODO
 */
function clearPolygon() {
  recto.stage.removeChild(recto.polygon);
  verso.stage.removeChild(verso.polygon);
  recto.polygon = new createjs.Shape();
  verso.polygon = new createjs.Shape();
  polygon = [];
  if (recto.img) recto.img.mask = null;
  if (verso.img) verso.img.mask = null;
  recto.stage.update();
  verso.stage.update();
}

/**
 * TODO
 */
function draw() {
  clearCanvas(recto.stage);
  clearCanvas(verso.stage);
  if (recto.url) drawCanvas('recto_canvas', recto.url);
  if (verso.url) drawCanvas('verso_canvas', verso.url);
  drawMasks();
}

/**
 * @return {*}
 */
function mirrorPolygon() {
  const polyVerso = [];
  for (const node in polygon) {
    if (Object.prototype.hasOwnProperty.call(polygon, node)) {
      const coord = polygon[node];
      coord[0] = verso.stage.canvas.width - polygon[node][0];
      polyVerso.push(coord);
    }
  }
  return polyVerso;
}

/**
 * TODO
 * @param {*} canvas
 * @param {*} url
 */
function drawCanvas(canvas, url) {
  let stage;
  let side;
  if (canvas == 'recto_canvas') {
    stage = recto.stage;
    side = 'rt';
  } else {
    stage = verso.stage;
    side = 'vs';
  }
  canvas = $('#'+canvas);
  stage.canvas.width = canvas.width();
  stage.canvas.height = canvas.height();

  const image = new Image();
  image.src = url;
  image.onload = function() {
    // creating the images
    const imgBack = new createjs.Bitmap(image);
    const img = new createjs.Bitmap(image);

    try {
      EXIF.getData(image, function() {
        const exifs = EXIF.getAllTags(image);
        if (exifs.XResolution) {
          const ppi = exifs.XResolution.numerator/exifs.XResolution.denominator;
          if (side == 'rt') {
            $('#left_resolution').val(ppi);
          } else {
            $('#right_resolution').val(ppi);
          }
        } else {
          if (side == 'rt') {
            $('#left_resolution').val('');
          } else {
            $('#right_resolution').val('');
          }
        }
      });
    } catch {
      console.log('Input image has no EXIF data.');
      if (side == 'rt') {
        $('#left_resolution').val('');
      } else {
        $('#right_resolution').val('');
      }
    }

    // getting the current sizes of images and canvas
    const imgWidth = img.image.width;
    const imgHeight = img.image.height;
    const canvasWidth = stage.canvas.width;
    const canvasHeight = stage.canvas.height;

    imgBack.regX = img.regX = imgWidth / 2;
    imgBack.regY = img.regY = imgHeight / 2;

    // determining width and height ratio
    const ratioW = imgWidth / canvasWidth;
    const ratioH = imgHeight / canvasHeight;
    const ratio = Math.max(ratioW, ratioH);

    // reading the saved offset
    let offsetX; let offsetY; let rotation;
    if (side == 'rt') {
      offsetX = recto.offset_x;
      offsetY = recto.offset_y;
      rotation = recto.rotation;
    } else {
      offsetX = verso.offset_x;
      offsetY = verso.offset_y;
      rotation = verso.rotation;
    }

    let x = 0;
    let y = 0;
    if (ratio <= 1) {
      x = (canvasWidth/2); // - (img_width/2);
      y = (canvasHeight/2); // - (img_height/2);
    } else {
      x = (canvasWidth/2); // - ((img_width/ratio)/2);
      y = (canvasHeight/2); // - ((img_height/ratio)/2);
      img.scale /= ratio;
      imgBack.scale /= ratio;
    }
    if (offsetX && offsetY) {
      x = offsetX;
      y = offsetY;
    }
    img.x = imgBack.x = x;
    img.y = imgBack.y = y;

    img.rotation = imgBack.rotation = rotation;

    if (side == 'rt') {
      // img.mask = recto.cropbox;
      recto.img = img;
    } else {
      // img.mask = verso.cropbox;
      verso.img = img;
    }

    const shadow = new createjs.Shape();
    shadow.graphics.beginFill('white');
    shadow.graphics.drawRect(0, 0, canvasWidth, canvasHeight);
    shadow.graphics.endFill();
    shadow.alpha=0.7;

    // adding eventlisteners
    img.on('mousedown', (event) => {
      handleMouseDown(event);
    });
    imgBack.on('mousedown', (event) => {
      handleMouseDown(event);
    });
    shadow.on('mousedown', (event) => {
      handleMouseDown(event);
    });
    img.on('pressmove', (event) => {
      handlePressMove(event);
    });
    imgBack.on('pressmove', (event) => {
      handlePressMove(event);
    });
    shadow.on('pressmove', (event) => {
      handlePressMove(event);
    });

    /**
     * TODO
     * @param {*} event
     */
    function handlePressMove(event) {
      // if mode is rotate, image should be rotated, not moved
      if (action == 'rotate') {
        rotateImage(event, imgBack, img, side);
      } else if (action == 'move') {
        // if mode is move, move the image
        moveImage(event, imgBack, img, side);
      }
    }

    /**
     * TODO
     * @param {*} event
     */
    function handleMouseDown(event) {
      imgBack.offset_x = event.stageX - imgBack.x;
      imgBack.offset_y = event.stageY - imgBack.y;
      mousestartX = event.stageX;
      mousestartY = event.stageY;
    }

    stage.addChildAt(imgBack, shadow, img, 0);
    drawMasks();
    stage.update();
  };
}

/**
 * TODO
 * @param {*} side
 */
function drawPolygon(side) {
  if (polygon.length == 0) return;

  if (side == 'rt') {
    recto.stage.removeChild(recto.polygon);
  } else {
    verso.stage.removeChild(verso.polygon);
  }

  const poly= new createjs.Shape();
  poly.graphics.beginStroke('green');

  let started = false;

  polygon.push(polygon[0]);

  for (const node in polygon) {
    if (Object.prototype.hasOwnProperty.call(polygon, node)) {
      let x;
      if (side == 'rt') {
        x = polygon[node][0];
      } else {
        x = verso.stage.canvas.width - polygon[node][0];
      }
      const y = polygon[node][1];
      if (!started) {
        started = true;
        poly.graphics.moveTo(x, y);
      } else {
        poly.graphics.lineTo(x, y);
      }
    }
  }

  polygon.pop();
  if (side == 'rt') {
    recto.polygon = poly;
    if (recto.img) recto.stage.addChild(recto.polygon);
  } else {
    verso.polygon = poly;
    if (verso.img) verso.stage.addChild(verso.polygon);
  }
}

/**
 * TODO
 * @param {*} event
 * @param {*} imgBack
 * @param {*} img
 * @param {*} side
 */
function rotateImage(event, imgBack, img, side) {
  const radsOld = Math.atan2(mousestartY - recto.stage.canvas.height/2,
      mousestartX - recto.stage.canvas.width/2);
  const radsNew = Math.atan2(event.stageY - recto.stage.canvas.height/2,
      event.stageX - recto.stage.canvas.width/2);
  const rads = radsNew - radsOld;
  const deltaAngle = rads * (180 / Math.PI);

  imgBack.rotation = (imgBack.rotation + deltaAngle)%360;
  img.rotation = (img.rotation + deltaAngle)%360;

  mousestartX = event.stageX;
  mousestartY = event.stageY;

  if (side == 'rt') {
    recto.rotation = img.rotation;
    recto.stage.update();
  } else {
    verso.rotation = img.rotation;
    verso.stage.update();
  }
}

/**
 * TODO
 * @param {*} event
 * @param {*} imgBack
 * @param {*} img
 * @param {*} side
 */
function moveImage(event, imgBack, img, side) {
  imgBack.x = img.x = event.stageX - imgBack.offset_x;
  imgBack.y = img.y = event.stageY - imgBack.offset_y;

  if (side == 'rt') {
    recto.stage.update();
    recto.offset_x = imgBack.x;
    recto.offset_y = imgBack.y;
  } else {
    verso.stage.update();
    verso.offset_x = imgBack.x;
    verso.offset_y = imgBack.y;
  }
}

/**
 * TODO
 * @param {*} side
 */
function drawCropBox(side) {
  let overlay;

  if (side == 'rt') {
    if (!recto.url) {
      return;
    }
    overlay = recto;
  } else {
    if (!verso.url) {
      return;
    }
    overlay = verso;
  }

  let cropSideX = cropX;
  if (side == 'vs') {
    cropSideX = overlay.stage.canvas.width - cropX - cropW;
  }

  overlay.stage.removeChild(overlay.cropbox, overlay.crop_nw,
      overlay.crop_ne, overlay.crop_sw, overlay.crop_se);

  overlay.cropbox.graphics.clear();
  overlay.cropbox.graphics.setStrokeStyle(1);
  overlay.cropbox.graphics.beginStroke('red');
  overlay.cropbox.graphics.drawRect(cropSideX, cropY, cropW, cropH);

  overlay.crop_nw.graphics.clear();
  overlay.crop_nw.graphics.beginFill('darkred');
  overlay.crop_nw.graphics.drawRect(cropSideX-5, cropY-5, 10, 10);
  overlay.crop_nw.graphics.endFill();

  overlay.crop_ne.graphics.clear();
  overlay.crop_ne.graphics.beginFill('darkred');
  overlay.crop_ne.graphics.drawRect(cropSideX+cropW-5, cropY-5, 10, 10);
  overlay.crop_ne.graphics.endFill();

  overlay.crop_sw.graphics.clear();
  overlay.crop_sw.graphics.beginFill('darkred');
  overlay.crop_sw.graphics.drawRect(cropSideX-5, cropY+cropH-5, 10, 10);
  overlay.crop_sw.graphics.endFill();

  overlay.crop_se.graphics.clear();
  overlay.crop_se.graphics.beginFill('darkred');
  overlay.crop_se.graphics.drawRect(cropSideX+cropW-5, cropY+cropH-5, 10, 10);
  overlay.crop_se.graphics.endFill();

  overlay.stage.addChild(overlay.cropbox, overlay.crop_nw,
      overlay.crop_ne, overlay.crop_sw, overlay.crop_se);
  overlay.stage.update();
}

/**
 * TODO
 * @param {*} event
 * @param {*} loc
 * @param {*} side
 */
function cropSize(event, loc, side) {
  let dx = cropX - event.stageX;
  const dy = cropY - event.stageY;
  if (side == 'rt') {
    if (loc == 'nw') {
      cropX = Math.min(event.stageX, cropX + cropW);
      cropY = Math.min(event.stageY, cropY+cropH);
      cropW = Math.max(cropW + dx, 0);
      cropH = Math.max(cropH + dy, 0);
    } else if (loc == 'ne') {
      cropY = Math.min(event.stageY, cropY+cropH);
      cropH = Math.max(cropH + dy, 0);
      cropW = Math.max(-dx, 0);
    } else if (loc == 'sw') {
      cropX = Math.min(event.stageX, cropX + cropW);
      cropW = Math.max(cropW + dx, 0);
      cropH = Math.max(-dy, 0);
    } else if (loc == 'se') {
      cropW = Math.max(-dx, 0);
      cropH = Math.max(-dy, 0);
    }
  } else {
    const l = verso.stage.canvas.width - cropX - cropW;
    dx = l - event.stageX;
    if (loc == 'nw') {
      cropW = Math.max(cropW + dx, 0);
      cropX = Math.max(recto.stage.canvas.width - event.stageX - cropW, cropX);
      cropY = Math.min(event.stageY, cropY+cropH);
      cropH = Math.max(cropH + dy, 0);
    } else if (loc == 'ne') {
      cropW = Math.max(-dx, 0);
      cropX = Math.min(recto.stage.canvas.width - event.stageX, cropX+cropW);
      cropY = Math.min(event.stageY, cropY+cropH);
      cropH = Math.max(cropH + dy, 0);
    } else if (loc == 'sw') {
      cropW = Math.max(cropW + dx, 0);
      cropX = Math.max(recto.stage.canvas.width - event.stageX - cropW, cropX);
      cropH = Math.max(-dy, 0);
    } else if (loc == 'se') {
      cropW = Math.max(-dx, 0);
      cropX = Math.min(recto.stage.canvas.width - event.stageX, cropX+cropW);
      cropH = Math.max(-dy, 0);
    }
  }

  drawMasks();
}

/**
 * TODO
 */
function drawMasks() {
  recto.stage.removeChild(recto.crop_ne, recto.crop_nw,
      recto.crop_se, recto.crop_sw, recto.cropbox);
  recto.stage.removeChild(recto.polygon);
  verso.stage.removeChild(verso.crop_ne, verso.crop_nw,
      verso.crop_se, verso.crop_sw, verso.cropbox);
  verso.stage.removeChild(verso.polygon);
  if (mode == 'cut') {
    drawPolygon('rt');
    if (recto.img) recto.img.mask = recto.polygon;
    drawPolygon('vs');
    if (verso.img) verso.img.mask = verso.polygon;
  } else if (mode == 'crop') {
    drawCropBox('rt');
    if (recto.img) recto.img.mask = recto.cropbox;
    drawCropBox('vs');
    if (verso.img) verso.img.mask = verso.cropbox;
  }
  recto.stage.update();
  verso.stage.update();
}

/**
 * TODO
 * @param {*} event
 * @param {*} side
 */
function addPolygonNode(event, side) {
  if (mode == 'cut' && action == 'cut') {
    let node;
    if (side == 'rt') {
      node = [event.stageX, event.stageY];
    } else {
      node = [verso.stage.canvas.width - event.stageX, event.stageY];
    }
    polygon.push(node);
    drawMasks();
  }
}

/**
 * TODO
 */
function updateModeButtons() {
  // check for mode - if crop, hide cut buttons, if cut, show them
  if (mode == 'crop') {
    $('#cut_button').addClass('hidden');
    $('#clear_polygon').addClass('hidden');
    $('#undo_button').addClass('hidden');
  } else {
    $('#cut_button').removeClass('hidden');
    $('#clear_polygon').removeClass('hidden');
    $('#undo_button').removeClass('hidden');
  }

  // check for action and color according button
  $('.active').removeClass('active');
  if (action == 'move') {
    $('#move_button').addClass('active');
  } else if (action == 'rotate') {
    $('#rotate_button').addClass('active');
  } else if (action == 'cut') {
    $('#cut_button').addClass('active');
  }
}

$(document).ready(function() {
  recto.stage = new createjs.Stage('recto_canvas');
  verso.stage = new createjs.Stage('verso_canvas');

  recto.stage.on('click', function(event) {
    addPolygonNode(event, 'rt');
  }, true);
  verso.stage.on('click', function(event) {
    addPolygonNode(event, 'vs');
  }, true);

  recto.crop_nw.on('pressmove', (event)=>{
    cropSize(event, 'nw', 'rt');
  });
  recto.crop_ne.on('pressmove', (event)=>{
    cropSize(event, 'ne', 'rt');
  });
  recto.crop_sw.on('pressmove', (event)=>{
    cropSize(event, 'sw', 'rt');
  });
  recto.crop_se.on('pressmove', (event)=>{
    cropSize(event, 'se', 'rt');
  });

  verso.crop_nw.on('pressmove', (event)=>{
    cropSize(event, 'nw', 'vs');
  });
  verso.crop_ne.on('pressmove', (event)=>{
    cropSize(event, 'ne', 'vs');
  });
  verso.crop_sw.on('pressmove', (event)=>{
    cropSize(event, 'sw', 'vs');
  });
  verso.crop_se.on('pressmove', (event)=>{
    cropSize(event, 'se', 'vs');
  });

  cropW = Math.floor($('#recto_canvas').width()/2);
  cropH = Math.floor($('#recto_canvas').height()/2);
  cropX = cropW/2;
  cropY = cropH/2;
});

$('.bin_button').click(function() {
  const wrapper = $(this).parent().parent();
  deactivateCanvas(wrapper);

  if ($(this).attr('id') == 'left_bin_button') {
    recto.url = null;
    recto.image = null;
    recto.offset_x = null;
    recto.offset_y = null;
    recto.rotation = 0;
    clearCanvas(recto.stage);
  } else {
    verso.url = null;
    verso.image = null;
    verso.offset_x = null;
    verso.offset_y = null;
    verso.rotation = 0;
    clearCanvas(verso.stage);
  }
  checkIfReady();
});

$('.local_upload_button').click(function() {
  if ($(this).attr('id') == 'left_local_upload') {
    lastUpload = 'recto';
  } else {
    lastUpload = 'verso';
  }

  ipcRenderer.send('upload-new-image');
});

$('#clear_polygon').click(function() {
  if (mode == 'cut') {
    clearPolygon();
  }
});

$('#name').on('keyup', function() {
  if ($(this).val() == '') {
    isNameSuggested = false;
  } else {
    isNameSuggested = true;
  }
  checkIfReady();
});

$('.www_upload_button').click(function() {
  if ($(this).attr('id') == 'left_www_upload') {
    lastUpload = 'recto';
  } else {
    lastUpload = 'verso';
  }

  dialogs.prompt('Enter Image-URL:', function(url) {
    if (url != '' && url != null) {
      if (lastUpload == 'recto') {
        recto.url = url;
        activateCanvas($('#recto_canvas_wrapper'));
        drawCanvas('recto_canvas', url);
      } else {
        verso.url = url;
        activateCanvas($('#verso_canvas_wrapper'));
        drawCanvas('verso_canvas', url);
      }
      lastUpload = null;
      checkIfReady();
    }
  });
});

$('#load_button').click(function() {
  if (!$('#load_button').hasClass('disabled')) {
    /*
    3. alle polygonpunkte müssten umgerechnet werden
    in relation zum eigentlichen bild
    */
    const polygonRecto = [];
    const polygonVerso = [];

    if (mode == 'crop') {
      // cropMode is active - infer polygon nodes from vertices
      const xRecto = cropX - recto.img.x;
      const yRecto = cropY - recto.img.y;
      polygonRecto.push([xRecto, yRecto]);
      polygonRecto.push([xRecto, yRecto+cropH]);
      polygonRecto.push([xRecto+cropW, yRecto+cropH]);
      polygonRecto.push([xRecto+cropW, yRecto]);
      polygonRecto.push([xRecto, yRecto]);

      const xVerso = verso.stage.canvas.width - cropX - cropW - verso.img.x;
      const yVerso = cropY - verso.img.y;
      polygonVerso.push([xVerso, yVerso]);
      polygonVerso.push([xVerso, yVerso+cropH]);
      polygonVerso.push([xVerso+cropW, yVerso+cropH]);
      polygonVerso.push([xVerso+cropW, yVerso]);
      polygonVerso.push([xVerso, yVerso]);
    } else {
      // cutMode is active
      let temp = [...polygon];
      temp.push(temp[0]);
      for (const node in temp) {
        if (Object.prototype.hasOwnProperty.call(temp, node)) {
          const coord = temp[node];
          polygonRecto.push([coord[0]-recto.img.x, coord[1]-recto.img.y]);
        }
      }

      temp = mirrorPolygon();
      temp.push(temp[0]);
      for (const node in temp) {
        if (Object.prototype.hasOwnProperty.call(temp, node)) {
          const coord = temp[node];
          polygonVerso.push([coord[0]-verso.img.x, coord[1]-verso.img.y]);
        }
      }
    }

    const fragmentData = {
      'rectoURL': recto.url,
      'versoURL': verso.url,
      'recto': true,
      'name': $('#name').val(),
      'rotation': 0,
      'rectoMask': polygonRecto,
      'versoMask': polygonVerso,
    };
    ipcRenderer.send('server-upload-ready', fragmentData);
  }
});

$('#switch_button').click(function() {
  // switch image URL
  let temp = recto.url;
  recto.url = verso.url;
  verso.url = temp;

  // switch offset
  temp = recto.offset_x;
  recto.offset_x = verso.offset_x;
  verso.offset_x = temp;

  // switch offsets
  temp = recto.offset_y;
  recto.offset_y = verso.offset_y;
  verso.offset_y = temp;

  // switch rotation of images
  temp = recto.rotation;
  recto.rotation = verso.rotation;
  verso.rotation = temp;

  // switch imgs (which is the top image layer)
  temp = recto.img;
  recto.img = verso.img;
  verso.img = temp;

  // switch polygons
  temp = recto.polygon;
  recto.polygon = verso.polygon;
  verso.polygon = temp;

  // crop_x is the only thing changing when mirroring the
  // canvas horizontally; thus, it must be converted
  cropX = recto.stage.canvas.width - cropX - cropW;

  const newPolygon = [];
  for (const idx in polygon) {
    if (Object.prototype.hasOwnProperty.call(polygon, idx)) {
      const x = verso.stage.canvas.width - polygon[idx][0];
      const y = polygon[idx][1];
      newPolygon.push([x, y]);
    }
  }
  polygon = newPolygon;

  deactivateCanvas($('#recto_canvas_wrapper'));
  deactivateCanvas($('#verso_canvas_wrapper'));
  if (recto.url) activateCanvas($('#recto_canvas_wrapper'));
  if (verso.url) activateCanvas($('#verso_canvas_wrapper'));
  draw();
});

$('#cut_button').click(function() {
  action = 'cut';
  updateModeButtons();
  if (recto.img) recto.img.mask = recto.polygon;
  if (verso.img) verso.img.mask = verso.polygon;
  drawMasks();
});

$('#cropcut_button').click(function() {
  if (mode == 'crop') {
    // switch to cut mode
    mode = 'cut';
    if (polygon.length == 0) {
      action = 'cut';
    }
    $('#cropcut_button img').attr('src', '../imgs/symbol_cut.png');
  } else {
    // switch to crop mode
    mode = 'crop';
    action = 'move';
    $('#cropcut_button img').attr('src', '../imgs/symbol_crop.png');
  }
  updateModeButtons();
  drawMasks();
});

$('#move_button').click(function() {
  action = 'move';
  updateModeButtons();
});

$('#rotate_button').click(function() {
  action ='rotate';
  updateModeButtons();
});

$('#undo_button').click(function() {
  polygon.pop();
  drawMasks();
});


/* ipcRenderer.on('upload-image-path', (event, filepath) => {
    if (!recto.url) {
        recto.url = filepath;
        activateCanvas($('#recto_canvas_wrapper'));
        draw('recto_canvas', filepath);
    } else {
        verso.url = filepath;
        activateCanvas($('#verso_canvas_wrapper'));
        draw('verso_canvas', filepath);
    }
});*/

ipcRenderer.on('new-upload-image', (event, filepath) => {
  name = filepath.split('\\').pop().split('/').pop();
  name = name.replace(/\.[^/.]+$/, '');

  if (!isNameSuggested) {
    $('#name').val(name);
    isNameSuggested = true;
  }

  if (lastUpload == 'recto') {
    recto.url = filepath;
    activateCanvas($('#recto_canvas_wrapper'));
    // drawCanvas('recto_canvas', filepath);
  } else {
    verso.url = filepath;
    activateCanvas($('#verso_canvas_wrapper'));
    // drawCanvas('verso_canvas', filepath);
  }
  draw();
  lastUpload = null;
  checkIfReady();
});
