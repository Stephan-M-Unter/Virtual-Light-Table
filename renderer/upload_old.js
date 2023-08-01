}/* Variables */

let brushMode = false;
let brushing = false;
const modelsDownloaded = {};


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

      // let color = 'red';
      // if ($('#mask_control_automatic_draw').hasClass('active')) {
        // color = 'green';
      // }

      if (newSide.stage.getChildByName('brushDrawing') && brushing) {
        // const stroke = $('#mask_control_brush_slider').val()*2;
        // newSide.mask.auto.drawing.graphics
        // .ss(stroke, 'round', 'round')
        // .s(color)
        // .mt(newSide.canvas.oldX,newSide.canvas.oldY)
        // .lt(newSide.stage.mouseX, newSide.stage.mouseY);
        
        // newSide.mask.auto.drawing.alpha = 0.5;
      // }

      // newSide.canvas.oldX = newSide.stage.mouseX;
      // newSide.canvas.oldY = newSide.stage.mouseY;
      
      // newSide.stage.update();
    // }
  });
  
  $(newSide.canvas).on('mousedown', (event) => {
    if (brushMode && event.button != 2) {
      // let color = 'red';
      // if ($('#mask_control_automatic_draw').hasClass('active')) {
        // color = 'green';
      // }

      // newSide.mask.auto.drawing = new createjs.Shape();
      // newSide.mask.auto.drawing.name = 'brushDrawing';
      // newSide.mask.auto.drawing.alpha = 0.5;
      newSide.stage.addChildAt(newSide.mask.auto.drawing, newSide.stage.children.length-1);
      // const stroke = $('#mask_control_brush_slider').val()*2;
      // newSide.mask.auto.drawing.graphics
        // .clear()
        // .ss(stroke, 'round', 'round')
        // .s(color)
        // .moveTo(newSide.stage.mouseX, newSide.stage.mouseY)
        // .lineTo(newSide.stage.mouseX+0.1, newSide.stage.mouseY+0.1);

      newSide.canvas.oldX = newSide.stage.mouseX;
      newSide.canvas.oldY = newSide.stage.mouseY;

      // brushing = true;
    }
  });
  
  $(newSide.canvas).on('mouseup', (event) => {
    if (brushMode && brushing) {
      // newSide.mask.auto.drawing.graphics.endStroke();
      
      newSide.stage.removeChild(newSide.mask.auto.drawing);
      sendChange(newSide);
      newSide.stage.update();
    }
  });

  // $(document).on('mouseup', () => {
    brushing = false;
  // });
  
  $(newSide.canvas).on('mouseout', (event) => {
    newSide.stage.removeChild(newSide.cursor);
    $(newSide.canvas).removeClass('brush');
    newSide.stage.update();
  });

  return newSide;
}

// function sendChange(side) {
  // const bounds = side.content.img.getTransformedBounds();
  
  // const w = bounds.width;
  // const h = bounds.height;
  // const x = bounds.x;
  // const y = bounds.y;
  // const scale = recto.content.img.scale;

  // side.mask.auto.drawing.cache(x, y, w, h, scale);
  // const dataURL = side.mask.auto.drawing.cacheCanvas.toDataURL();

  // const activeModelID = $('#mask_automatic_model').find(":selected").val();
  // const maskURL = side.mask.auto.paths[activeModelID];

  // const data = {
    // modelID: activeModelID,
    // canvas: side.sidename,
    // maskURL: maskURL,
    // change: dataURL,
    // add: $('#mask_control_automatic_draw').hasClass('active'),
  // };

  // ipcRenderer.send('server-edit-auto-mask', data);
// }




/* Buttons */

$('#mask_selection_automatic_button').click(() => {
  const modelButtonMode = $('#mask_selection_automatic_button').attr('mode')
  const modelID = $('#mask_automatic_model').find(':selected').val();
  if (modelButtonMode == 'download') {
    modelsDownloaded[modelID] = 'processing';
    updateAutomaticModelSelectionButtons();
    LOGGER.send('UPLOAD', 'server-download-model', modelID);
    ipcRenderer.send('server-download-model', modelID);

  // } else if (modelButtonMode == 'compute') {
    
  // }
});


function updateAutomaticModelSelectionButtons() {
  // const modelID = $('#mask_automatic_model').find(':selected').val();
  // const selectionButton = $('#mask_selection_automatic_button');
  // const buttonLabel = $('#mask_selection_automatic_button label');
  // const buttonImage = $('#mask_selection_automatic_button img');
  // const deleteButton = $('#mask_selection_delete_model');
  // let targetMode = 'download';

  // if ((modelID in modelsDownloaded) && (modelsDownloaded[modelID] == true)) {
    // targetMode = 'compute';
  // } else if ((modelID in modelsDownloaded) && (modelsDownloaded[modelID] == 'processing')) {
    // targetMode = 'processing';
  // }

  selectionButton.removeClass('loading');
  if (targetMode == 'download') {
    buttonLabel.html('Download Model');
    buttonImage.attr('src', '../imgs/symbol_download.png');
    selectionButton.attr('mode', targetMode);
    deleteButton.addClass('unrendered');
  } else if (targetMode == 'compute') {
    // buttonLabel.html('Compute Mask(s)');
    // buttonImage.attr('src', '../imgs/symbol_ml.png');
    // selectionButton.attr('mode', targetMode);
    // deleteButton.removeClass('unrendered');
  } else if (targetMode == 'processing') {
    buttonLabel.html('Loading...');
    buttonImage.attr('src', '../imgs/symbol_gear.png');
    selectionButton.addClass('loading');
    selectionButton.attr('mode', targetMode);
  }
}

