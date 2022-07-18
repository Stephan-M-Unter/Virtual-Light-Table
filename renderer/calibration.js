'use strict';

const {ipcRenderer} = require('electron');

let mode = '1cm';
let ppi;
const ppcmFactor = 0.393701;
let stage;
let pointA;
let textA;
let line;
let pointB;

$(document).ready(function() {
  ipcRenderer.send('server-gather-ppi');

  stage = new createjs.Stage('calibration_stage');
  stage.canvas.width = $('#calibration_stage').width();
  stage.canvas.height =$('#calibration_stage').height();

  stage.on('stagemousedown', (event) => {
    // calculate new ppi
    const x = Math.abs(event.stageX - pointA.x);
    const y = Math.abs(event.stageY - pointA.y);
    const distance = Math.sqrt(x*x+y*y);

    if (mode == '1cm') {
      ppi = distance / ppcmFactor;
    } else if (mode == '10cm') {
      ppi = distance / (10*ppcmFactor);
    } else if (mode == '1inch') {
      ppi = distance;
    } else if (mode == '4inch') {
      ppi = distance / 4;
    }

    updateRelations();
    drawDistance(event.stageX, event.stageY);
  });

  window.addEventListener('resize', (event) => {
    stage.canvas.width = $('#calibration_stage').width();
    stage.canvas.height =$('#calibration_stage').height();
    stage.update();
  });
  initaliseA();
});


$('.size_button').click(function(event) {
  $('.active').removeClass('active');
  $(event.target).addClass('active');
  mode = $(event.target).attr('id');
  drawDistance();
});

$('#calibrate').click(function(event) {
  ipcRenderer.send('server-calibrate', ppi);
});

/**
 * TODO
 */
function initaliseA() {
  stage.removeChild(pointA);
  stage.removeChild(textA);
  pointA = new createjs.Container();
  drawX(pointA, 'red');

  pointA.x = 20;
  pointA.y = stage.canvas.height/2;

  textA = new createjs.Text('A', '', 'red');
  textA.scale = 1.5;
  textA.x = pointA.x - 5;
  textA.y = pointA.y + 15;

  stage.addChild(pointA);
  stage.addChild(textA);
  stage.update();
}

/**
 * TODO
 * @param {*} container
 * @param {*} colour
 */
function drawX(container, colour) {
  const lineUp = new createjs.Shape();
  lineUp.graphics.setStrokeStyle(1).beginStroke(colour);
  lineUp.graphics.moveTo(-5, -5);
  lineUp.graphics.lineTo(5, 5);
  lineUp.graphics.endStroke();
  const lineDown = new createjs.Shape();
  lineDown.graphics.setStrokeStyle(1).beginStroke(colour);
  lineDown.graphics.moveTo(-5, 5);
  lineDown.graphics.lineTo(5, -5);
  lineDown.graphics.endStroke();

  container.addChild(lineUp);
  container.addChild(lineDown);
}

/**
 * TODO
 * @param {Double} x
 * @param {Double} y
 */
function drawDistance(x, y) {
  stage.removeChild(pointB);
  stage.removeChild(line);

  pointB = new createjs.Container();
  drawX(pointB, 'blue');

  if (x && y) {
    pointB.x = x;
    pointB.y = y;
  } else {
    let distance;
    // currently hardcoded, parsing the mode would be nicer but costs too much time right now
    if (mode == '1cm') {
      distance = ppi*ppcmFactor;
    } else if (mode == '10cm') {
      distance = 10*ppi*ppcmFactor;
    } else if (mode == '1inch') {
      distance = ppi;
    } else if (mode == '4inch') {
      distance = 4*ppi;
    }
    pointB.x = pointA.x + distance;
    pointB.y = pointA.y;
  }

  line = new createjs.Shape();
  line.graphics.setStrokeStyle(1).beginStroke('red');
  line.graphics.moveTo(pointA.x, pointA.y);
  line.graphics.lineTo(pointB.x, pointB.y);
  line.graphics.endStroke();

  stage.addChild(line);
  stage.addChild(pointB);
  stage.update();
}

/**
 * TODO
 */
function updateRelations() {
  $('#cm_px').html((ppi*ppcmFactor).toFixed(2));
  $('#inch_px').html(ppi.toFixed(2));
}

/**
 * TODO
 * @param {Double} pixelsPerInch
 */
function setPPI(pixelsPerInch) {
  ppi = Number(pixelsPerInch);
  updateRelations();
  drawDistance();
}

ipcRenderer.on('calibration-set-ppi', (event, ppi) => {
  setPPI(ppi);
});
