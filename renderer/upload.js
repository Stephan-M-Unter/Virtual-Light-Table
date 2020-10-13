'use strict';

const { ipcRenderer } = require("electron");

var rectoURL = null;
var versoURL = null;
var name;
var isNameSuggested = false;

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

function draw(canvas, url) {
    var ctx = canvas[0].getContext('2d');
    var img = new Image();
    var src = url;
  
    img.src = src;
    img.onload = function(){
      ctx.drawImage(img,0,0);
    };
  }

$(document).ready(function(){});

$('.bin_button').click(function(){
    let wrapper = $(this).parent().parent();
    deactivateCanvas(wrapper);

    if ($(this).attr('id') == 'left_bin_button') {
        rectoURL = null;
    } else {
        versoURL = null;
    }
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

    if (rectoURL) { activateCanvas($('#recto_canvas_wrapper')); }
    else { deactivateCanvas($('#recto_canvas_wrapper')); }

    if (versoURL) { activateCanvas($('#verso_canvas_wrapper')); }
    else { deactivateCanvas($('#verso_canvas_wrapper')); }
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
        draw($('#recto_canvas'), filepath);
    } else {
        versoURL = filepath;
        activateCanvas($('#verso_canvas_wrapper'));
        draw($('#verso_canvas'), filepath);
    }
});