'use strict';

const { ipcRenderer } = require("electron");
const Dialogs = require('dialogs');
const dialogs = Dialogs();

var recto = {
    "stage"     : null,
    "url"       : null,
    "image"     : null,
    "cropbox"   : new createjs.Shape(),
    "crop_nw"   : new createjs.Shape(),
    "crop_ne"   : new createjs.Shape(),
    "crop_sw"   : new createjs.Shape(),
    "crop_se"   : new createjs.Shape()
}

var verso = {
    "stage"     : null,
    "url"       : null,
    "image"     : null,
    "cropbox"   : new createjs.Shape(),
    "crop_nw"   : new createjs.Shape(),
    "crop_ne"   : new createjs.Shape(),
    "crop_sw"   : new createjs.Shape(),
    "crop_se"   : new createjs.Shape()
}

var name;
var isNameSuggested = false;
var lastUpload = null;
var crop_x = 150;
var crop_y = 100;
var crop_w = 80;
var crop_h = 100;

function checkIfReady(){
    if (recto.url && verso.url && $('#name').val() != '') {
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
    clearCanvas(recto.stage);
    clearCanvas(verso.stage);
    if (recto.url) {
        drawCanvas('recto_canvas', recto.url);
        drawCropBox("rt");
    }
    // if there is a verso.url; 
    if (verso.url) {
        drawCanvas('verso_canvas', verso.url);
        drawCropBox("vs");
    }
}

function drawCanvas(canvas, url) {
    let stage;
    let side;
    if (canvas == "recto_canvas") {
        stage = recto.stage;
        side = "rt";
    } else {
        stage = verso.stage;
        side = "vs";
    }
    canvas = $('#'+canvas);
    stage.canvas.width = canvas.width();
    stage.canvas.height = canvas.height();
    
    let image = new Image();
    image.src = url;
    image.onload = function(){
        let img_back = new createjs.Bitmap(image);
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
            img_back.scale /= ratio;
        }
        img.x = img_back.x = x;
        img.y = img_back.y = y;

        if (side == "rt") {
            img.mask = recto.cropbox;
        } else {
            img.mask = verso.cropbox;
        }

        var shadow = new createjs.Shape();
        shadow.graphics.beginFill("white");
        shadow.graphics.drawRect(0, 0, canvas_width, canvas_height);
        shadow.graphics.endFill();
        shadow.alpha=0.7;

        stage.addChildAt(img_back, shadow, img, 0);
        stage.update();
    };
}

function drawCropBox(side) {
    let overlay;

    if (side == "rt") {
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
    
    let crop_side_x = crop_x;
    if (side == "vs") {
        crop_side_x = overlay.stage.canvas.width - crop_x - crop_w;
    }

    overlay.stage.removeChild(overlay.cropbox, overlay.crop_nw, overlay.crop_ne, overlay.crop_sw, overlay.crop_se);
    
    overlay.cropbox.graphics.clear();
    overlay.cropbox.graphics.setStrokeStyle(1);
    overlay.cropbox.graphics.beginStroke('red');
    overlay.cropbox.graphics.drawRect(crop_side_x, crop_y, crop_w, crop_h);
    
    overlay.crop_nw.graphics.clear();
    overlay.crop_nw.graphics.beginFill("darkred");
    overlay.crop_nw.graphics.drawRect(crop_side_x-5, crop_y-5, 10, 10);
    overlay.crop_nw.graphics.endFill();
    
    overlay.crop_ne.graphics.clear();
    overlay.crop_ne.graphics.beginFill("darkred");
    overlay.crop_ne.graphics.drawRect(crop_side_x+crop_w-5, crop_y-5, 10, 10);
    overlay.crop_ne.graphics.endFill();
    
    overlay.crop_sw.graphics.clear();
    overlay.crop_sw.graphics.beginFill("darkred");
    overlay.crop_sw.graphics.drawRect(crop_side_x-5, crop_y+crop_h-5, 10, 10);
    overlay.crop_sw.graphics.endFill();

    overlay.crop_se.graphics.clear();
    overlay.crop_se.graphics.beginFill("darkred");
    overlay.crop_se.graphics.drawRect(crop_side_x+crop_w-5, crop_y+crop_h-5, 10, 10);
    overlay.crop_se.graphics.endFill();
    
    overlay.stage.addChild(overlay.cropbox, overlay.crop_nw, overlay.crop_ne, overlay.crop_sw, overlay.crop_se);
    overlay.stage.update();
    
}

function startCropSize(loc, side){
}

function cropSize(event, loc, side){
    let dx = crop_x - event.stageX;
    let dy = crop_y - event.stageY;
    if (side == "rt") {
        if (loc == "nw") {
            crop_x = Math.min(event.stageX, crop_x + crop_w);
            crop_y = Math.min(event.stageY, crop_y+crop_h);
            crop_w = Math.max(crop_w + dx, 0);
            crop_h = Math.max(crop_h + dy, 0);
        } else if (loc == "ne") {
            crop_y = Math.min(event.stageY, crop_y+crop_h);
            crop_h = Math.max(crop_h + dy, 0);
            crop_w = Math.max(-dx, 0);
        } else if (loc == "sw") {
            crop_x = Math.min(event.stageX, crop_x + crop_w);
            crop_w = Math.max(crop_w + dx, 0);
            crop_h = Math.max(-dy, 0);
        } else if (loc == "se") {
            crop_w = Math.max(-dx, 0);
            crop_h = Math.max(-dy, 0);
        }
    } else {
        let l = verso.stage.canvas.width - crop_x - crop_w;
        dx = l - event.stageX;
        if (loc == "nw") {
            crop_w = Math.max(crop_w + dx, 0);
            crop_x = Math.max(recto.stage.canvas.width - event.stageX - crop_w, crop_x);
            crop_y = Math.min(event.stageY, crop_y+crop_h);
            crop_h = Math.max(crop_h + dy, 0);
        } else if (loc == "ne") {
            crop_w = Math.max(-dx, 0);
            crop_x = Math.min(recto.stage.canvas.width - event.stageX, crop_x+crop_w);
            crop_y = Math.min(event.stageY, crop_y+crop_h);
            crop_h = Math.max(crop_h + dy, 0);
        } else if (loc == "sw") {
            crop_w = Math.max(crop_w + dx, 0);
            crop_x = Math.max(recto.stage.canvas.width - event.stageX - crop_w, crop_x);
            crop_h = Math.max(-dy, 0);
        } else if (loc == "se") {
            crop_w = Math.max(-dx, 0);
            crop_x = Math.min(recto.stage.canvas.width - event.stageX, crop_x+crop_w);
            crop_h = Math.max(-dy, 0);
        }
    }


    drawCropBox("rt");
    drawCropBox("vs");
}

function endCropSize(event){
    drawCropBox("rt");
    drawCropBox("vs");
}

$(document).ready(function(){
    recto.stage = new createjs.Stage('recto_canvas');
    verso.stage = new createjs.Stage('verso_canvas');

    recto.crop_nw.on("pressmove", (event)=>{cropSize(event, 'nw', "rt")});
    recto.crop_ne.on("pressmove", (event)=>{cropSize(event, 'ne', "rt")});
    recto.crop_sw.on("pressmove", (event)=>{cropSize(event, 'sw', "rt")});
    recto.crop_se.on("pressmove", (event)=>{cropSize(event, 'se', "rt")});

    verso.crop_nw.on("pressmove", (event)=>{cropSize(event, 'nw', "vs")});
    verso.crop_ne.on("pressmove", (event)=>{cropSize(event, 'ne', "vs")});
    verso.crop_sw.on("pressmove", (event)=>{cropSize(event, 'sw', "vs")});
    verso.crop_se.on("pressmove", (event)=>{cropSize(event, 'se', "vs")});

    //crop_w = Math.floor($('#recto_canvas').width()/2);
    crop_h = Math.floor($('#recto_canvas').height()/2);
    //crop_x = crop_w/2;
    crop_y = crop_h/2;
});

$('.bin_button').click(function(){
    let wrapper = $(this).parent().parent();
    deactivateCanvas(wrapper);

    if ($(this).attr('id') == 'left_bin_button') {
        recto.url = null;
        recto.image = null;
        clearCanvas(rectoStage);
    } else {
        verso.url = null;
        verso.image = null;
        clearCanvas(verso.stage);
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

$('#load_button').click(function(){
    if (!$(this).hasClass("disabled")){
        let fragment_data = {
            "rectoURL": recto.url,
            "versoURL": verso.url,
            "recto": true,
            "name": "Test",
            "rotation": 0,
        };
        ipcRenderer.send('server-upload-ready', fragment_data);
    }
});

$('#switch_button').click(function(){
    let temp = recto.url;
    recto.url = verso.url;
    verso.url = temp;

    crop_x = recto.stage.canvas.width - crop_x - crop_w;

    if (recto.url) {
        activateCanvas($('#recto_canvas_wrapper'));
    }
    else {
        deactivateCanvas($('#recto_canvas_wrapper'));
    }

    if (verso.url) {
        activateCanvas($('#verso_canvas_wrapper'));
    }
    else {
        deactivateCanvas($('#verso_canvas_wrapper'));
    }

    draw();
});

/*ipcRenderer.on('upload-image-path', (event, filepath) => {
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
    name = name.replace(/\.[^/.]+$/, "");

    if (!isNameSuggested) {
        $('#name').val(name);
        isNameSuggested = true;
    }

    if (lastUpload == "recto") {
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