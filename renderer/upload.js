'use strict';

const { ipcRenderer } = require("electron");

var rectoURL = null;
var versoURL = null;
var name;


$(document).ready(function(){});

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

    if (rectoURL) {
        $('#recto_canvas').css('backgroundColor', 'red');
    } else {
        $('#recto_canvas').css('backgroundColor', 'white');
    }
    if (versoURL) {
        $('#verso_canvas').css('backgroundColor', 'red');
    } else {
        $('#verso_canvas').css('backgroundColor', 'white');
    }
});

ipcRenderer.on('upload-image-path', (event, filepath) => {
    if (!rectoURL) {
        rectoURL = filepath;
        $('#recto_canvas').css('backgroundColor', 'red');
    } else {
        versoURL = filepath;
        $('#verso_canvas').css('backgroundColor', 'red');
    }
});