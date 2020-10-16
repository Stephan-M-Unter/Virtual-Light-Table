'use strict';

const { ipcRenderer } = require("electron");

var rectoURL = null;
var versoURL = null;
var name;
var isNameSuggested = false;
var rectoImage = null;
var versoImage = null;
var lastUpload = null;

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

function clearCanvas(canvas_id) {
    let canvas = document.getElementById(canvas_id);
    let ctx = canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);
}

function draw(canvas, url) {
    canvas = document.getElementById(canvas);
    canvas.width = parseInt($(canvas).css('width'))-2;
    canvas.height = parseInt($(canvas).css('height'))-2;

    var ctx = canvas.getContext('2d');
    var img = new Image();
    img.src = url;

    img.onload = function(){
        if (canvas == 'recto_canvas') {
            rectoImage = img;
        } else {
            versoImage = img;
        }
        let img_width = img.width;
        let img_height = img.height;
        let canvas_width = $(canvas).width();
        let canvas_height = $(canvas).height();
        let ratio_w = img_width / canvas_width;
        let ratio_h = img_height / canvas_height;
        let ratio = Math.max(ratio_w, ratio_h);

        let x = 0;
        let y = 0;
        let width = img_width;
        let height = img_height;

        if (ratio <= 1) {
            x = (canvas_width/2) - (img_width/2);
            y = (canvas_height/2) - (img_height/2);
        } else {
            width /= ratio;
            height /= ratio;
            x = (canvas_width/2) - (width/2);
            y = (canvas_height/2) - (height/2);
        }

        console.log("Drawing Image:", x, y, width, height);
        ctx.drawImage(img,x,y,width,height);
    };
  }

$(document).ready(function(){});

$('.bin_button').click(function(){
    let wrapper = $(this).parent().parent();
    deactivateCanvas(wrapper);

    if ($(this).attr('id') == 'left_bin_button') {
        rectoURL = null;
        rectoImage = null;
        clearCanvas('recto_canvas');
    } else {
        versoURL = null;
        versoImage = null;
        clearCanvas('verso_canvas');
    }
});

$('.upload_button').click(function(){
    if ($(this).attr('id') == 'left_upload') {
        lastUpload = "recto";
    } else {
        lastUpload = "verso";
    }

    ipcRenderer.send('upload-new-image');
});

$('#load_button').click(function(){
    let fragment_data = {
        "rectoURL": rectoURL,
        "versoURL": versoURL,
        "recto": true,
        "name": "Test",
        "rotation": 0,
    };
    ipcRenderer.send('server-upload-ready', fragment_data);
});

$('#switch_button').click(function(){
    let temp = rectoURL;
    rectoURL = versoURL;
    versoURL = temp;

    clearCanvas('recto_canvas');
    clearCanvas('verso_canvas');

    if (rectoURL) {
        activateCanvas($('#recto_canvas_wrapper'));
        draw('recto_canvas', rectoURL);
    }
    else {
        deactivateCanvas($('#recto_canvas_wrapper'));
    }

    if (versoURL) {
        activateCanvas($('#verso_canvas_wrapper'));
        draw('verso_canvas', versoURL);
    }
    else {
        deactivateCanvas($('#verso_canvas_wrapper'));
    }
});

ipcRenderer.on('upload-image-path', (event, filepath) => {
    name = filepath.split('\\').pop().split('/').pop();
    name = name.replace(/\.[^/.]+$/, "");

    if (!isNameSuggested) {
        $('#name').val(name);
        isNameSuggested = true;
    }

    if (!rectoURL) {
        rectoURL = filepath;
        activateCanvas($('#recto_canvas_wrapper'));
        draw('recto_canvas', filepath);
    } else {
        versoURL = filepath;
        activateCanvas($('#verso_canvas_wrapper'));
        draw('verso_canvas', filepath);
    }
});

ipcRenderer.on('new-upload-image', (event, filepath) => {
    if (lastUpload == "recto") {
        rectoURL = filepath;
        activateCanvas($('#recto_canvas_wrapper'));
        draw('recto_canvas', filepath);
    } else {
        activateCanvas($('#verso_canvas_wrapper'));
        versoURL = filepath;
        draw('verso_canvas', filepath);
    }
    lastUpload = null;
});