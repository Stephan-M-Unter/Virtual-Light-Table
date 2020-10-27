'use strict';

const { ipcRenderer } = require("electron");
const Dialogs = require('dialogs');
const dialogs = Dialogs();

var rectoStage = null;
var versoStage = null;
var rectoURL = null;
var versoURL = null;
var name;
var isNameSuggested = false;
var rectoImage = null;
var versoImage = null;
var lastUpload = null;
var clippingActive = false;
var clipping_x = 100;
var clipping_y = 100;
var clipping_width = 200;
var clipping_height = 100;

function checkIfReady(){
    if (rectoURL && versoURL && $('#name').val() != '') {
        $('#load_button').removeClass('disabled');
    } else {
        $('#load_button').addClass('disabled');
    }
}

function deactivateCanvas(wrapper) {
    // background -> grau
    wrapper.find(".canvas").css('backgroundColor', 'rgb(50,50,50)');
    // upload_button -> her
    wrapper.find(".upload_button").css('display', 'block');
    // button_wrapper -> weg
    wrapper.find('.button_wrapper').css('visibility', 'hidden');
}

function activateCanvas(wrapper) {    
    // background -> white
    wrapper.find(".canvas").css('backgroundColor', 'white');
    // upload_button -> weg
    wrapper.find(".upload_button").css('display', 'none');
    // button_wrapper -> her
    wrapper.find('.button_wrapper').css('visibility', 'visible');
}

function clearCanvas(stage) {
    stage.removeAllChildren();
    stage.update();
}

function draw() {
    clearCanvas(rectoStage);
    clearCanvas(versoStage);
    if (rectoURL) {
        drawCanvas('recto_canvas', rectoURL);
    }
    // if there is a versoURL; 
    if (versoURL) {
        drawCanvas('verso_canvas', versoURL);
    }
}

function drawCanvas(canvas, url) {
    let stage;
    if (canvas == "recto_canvas") {
        stage = rectoStage;
    } else {
        stage = versoStage;
    }
    canvas = $('#'+canvas);
    stage.canvas.width = canvas.width();
    stage.canvas.height = canvas.height();
    
    let image = new Image();
    image.src = url;
    image.onload = function(){
        let img = new createjs.Bitmap(image);

        let img_width = img.image.width;
        let img_height = img.image.height;
        let canvas_width = stage.canvas.width;
        let canvas_height = stage.canvas.height;

        let ratio_w = img_width / canvas_width;
        let ratio_h = img_height / canvas_height;
        let ratio = Math.max(ratio_w, ratio_h);
        
        let x = 0;
        let y = 0;
        if (ratio <= 1) {
            x = (canvas_width/2) - (img_width/2);
            y = (canvas_height/2) - (img_height/2);
        } else {
            x = (canvas_width/2) - ((img_width/ratio)/2);
            y = (canvas_height/2) - ((img_height/ratio)/2);
            img.scale /= ratio;
        }
        img.x = x;
        img.y = y;
        stage.addChild(img);
        stage.update();
    };
  }

$(document).ready(function(){
    rectoStage = new createjs.Stage('recto_canvas');
    versoStage = new createjs.Stage('verso_canvas');
});

$('.bin_button').click(function(){
    let wrapper = $(this).parent().parent();
    deactivateCanvas(wrapper);

    if ($(this).attr('id') == 'left_bin_button') {
        rectoURL = null;
        rectoImage = null;
        clearCanvas(rectoStage);
    } else {
        versoURL = null;
        versoImage = null;
        clearCanvas(versoStage);
    }
    checkIfReady();
});

$('.local_upload_button').click(function(){
    if ($(this).attr('id') == 'left_local_upload') {
        lastUpload = "recto";
    } else {
        lastUpload = "verso";
    }

    ipcRenderer.send('upload-new-image');
});

$('#name').on('keyup', function(){
    if ($(this).val() == '') {
        isNameSuggested = false;
    } else {
        isNameSuggested = true;
    }
    checkIfReady();
});

$('.www_upload_button').click(function(){
    if ($(this).attr('id') == 'left_www_upload') {
        lastUpload = "recto";
    } else {
        lastUpload = "verso";
    }

    dialogs.prompt("Enter Image-URL:", function(url){
        if (url != '' && url != null) {
            if (lastUpload == "recto") {
                rectoURL = url;
                activateCanvas($('#recto_canvas_wrapper'));
                drawCanvas('recto_canvas', url);
            } else {
                versoURL = url;
                activateCanvas($('#verso_canvas_wrapper'));
                drawCanvas('verso_canvas', url);
            }
            lastUpload = null;
            checkIfReady();
        }
    });
});

$('#load_button').click(function(){
    if (!$(this).hasClass("disabled")){
        let fragment_data = {
            "rectoURL": rectoURL,
            "versoURL": versoURL,
            "recto": true,
            "name": "Test",
            "rotation": 0,
        };
        ipcRenderer.send('server-upload-ready', fragment_data);
    }
});

$('#switch_button').click(function(){
    let temp = rectoURL;
    rectoURL = versoURL;
    versoURL = temp;

    if (rectoURL) {
        activateCanvas($('#recto_canvas_wrapper'));
    }
    else {
        deactivateCanvas($('#recto_canvas_wrapper'));
    }

    if (versoURL) {
        activateCanvas($('#verso_canvas_wrapper'));
    }
    else {
        deactivateCanvas($('#verso_canvas_wrapper'));
    }

    draw();
});

/*ipcRenderer.on('upload-image-path', (event, filepath) => {
    if (!rectoURL) {
        rectoURL = filepath;
        activateCanvas($('#recto_canvas_wrapper'));
        draw('recto_canvas', filepath);
    } else {
        versoURL = filepath;
        activateCanvas($('#verso_canvas_wrapper'));
        draw('verso_canvas', filepath);
    }
});*/

ipcRenderer.on('new-upload-image', (event, filepath) => {
    name = filepath.split('\\').pop().split('/').pop();
    name = name.replace(/\.[^/.]+$/, "");

    if (!isNameSuggested) {
        $('#name').val(name);
        isNameSuggested = true;
    }

    if (lastUpload == "recto") {
        rectoURL = filepath;
        activateCanvas($('#recto_canvas_wrapper'));
        drawCanvas('recto_canvas', filepath);
    } else {
        activateCanvas($('#verso_canvas_wrapper'));
        versoURL = filepath;
        drawCanvas('verso_canvas', filepath);
    }
    lastUpload = null;
    checkIfReady();
});