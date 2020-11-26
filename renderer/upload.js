'use strict';

const { ipcRenderer } = require("electron");
const Dialogs = require('dialogs');
const dialogs = Dialogs();

var recto = {
    "stage"     : null,
    "cropbox"   : new createjs.Shape(),
    "crop_nw"   : new createjs.Shape(),
    "crop_ne"   : new createjs.Shape(),
    "crop_sw"   : new createjs.Shape(),
    "crop_se"   : new createjs.Shape(),
    "url"       : null,
    "offset_x"  : null,
    "offset_y"  : null,
    "rotation"  : 0,
    "polygon"   : new createjs.Shape(),
    "img"       : null
}

var verso = {
    "stage"     : null,
    "cropbox"   : new createjs.Shape(),
    "crop_nw"   : new createjs.Shape(),
    "crop_ne"   : new createjs.Shape(),
    "crop_sw"   : new createjs.Shape(),
    "crop_se"   : new createjs.Shape(),
    "url"       : null,
    "offset_x"  : null,
    "offset_y"  : null,
    "rotation"  : 0,
    "polygon"   : new createjs.Shape(),
    "img"       : null
}

var name;
var isNameSuggested = false;
var mode = "crop";
var action = "move";
var lastUpload = null;
var crop_x, crop_y, crop_w, crop_h;
var polygon = [];
var mousestart_x, mousestart_y;

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

function draw() {
    clearCanvas(recto.stage);
    clearCanvas(verso.stage);
    if (recto.url) drawCanvas('recto_canvas', recto.url);
    if (verso.url) drawCanvas('verso_canvas', verso.url);
    drawMasks();
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
        // creating the images
        let img_back = new createjs.Bitmap(image);
        let img = new createjs.Bitmap(image);

        // getting the current sizes of images and canvas
        let img_width = img.image.width;
        let img_height = img.image.height;
        let canvas_width = stage.canvas.width;
        let canvas_height = stage.canvas.height;

        img_back.regX = img.regX = img_width / 2;
        img_back.regY = img.regY = img_height / 2;

        // determining width and height ratio
        let ratio_w = img_width / canvas_width;
        let ratio_h = img_height / canvas_height;
        let ratio = Math.max(ratio_w, ratio_h);
        
        // reading the saved offset
        let offset_x, offset_y, rotation;
        if (side == "rt") {
            offset_x = recto.offset_x;
            offset_y = recto.offset_y;
            rotation = recto.rotation;
        } else {
            offset_x = verso.offset_x;
            offset_y = verso.offset_y;
            rotation = verso.rotation;
        }
        
        let x = 0;
        let y = 0;
        if (ratio <= 1) {
            x = (canvas_width/2)//; - (img_width/2);
            y = (canvas_height/2)//; - (img_height/2);
        } else {
            x = (canvas_width/2);// - ((img_width/ratio)/2);
            y = (canvas_height/2);// - ((img_height/ratio)/2);
            img.scale /= ratio;
            img_back.scale /= ratio;
        }
        if (offset_x && offset_y) {
            x = offset_x;
            y = offset_y;
        }
        img.x = img_back.x = x;
        img.y = img_back.y = y;

        img.rotation = img_back.rotation = rotation;
        
        if (side == "rt") {
            //img.mask = recto.cropbox;
            recto.img = img;
        } else {
            //img.mask = verso.cropbox;
            verso.img = img;
        }
        
        var shadow = new createjs.Shape();
        shadow.graphics.beginFill("white");
        shadow.graphics.drawRect(0, 0, canvas_width, canvas_height);
        shadow.graphics.endFill();
        shadow.alpha=0.7;
        
        // adding eventlisteners
        img.on("mousedown", (event) => {handleMouseDown(event)});
        img_back.on("mousedown", (event) => {handleMouseDown(event)});
        shadow.on("mousedown", (event) => {handleMouseDown(event)});
        img.on("pressmove", (event) => {handlePressMove(event)});
        img_back.on("pressmove", (event) => {handlePressMove(event)});
        shadow.on("pressmove", (event) => {handlePressMove(event)});
        
        function handlePressMove(event) {
            // if mode is rotate, image should be rotated, not moved
            if (action == "rotate") {
                rotateImage(event, img_back, img, side);
            } else if (action == "move") {
                // if mode is move, move the image
                moveImage(event, img_back, img, side);
            }
        }

        function handleMouseDown(event) {
            img_back.offset_x = event.stageX - img_back.x;
            img_back.offset_y = event.stageY - img_back.y;
            mousestart_x = event.stageX;
            mousestart_y = event.stageY;
        }
        
        stage.addChildAt(img_back, shadow, img, 0);
        drawMasks();
        stage.update();
    };
}

function drawPolygon(side) {
    if (polygon.length == 0) return;

    if (side == "rt") {
        recto.stage.removeChild(recto.polygon);
    } else {
        verso.stage.removeChild(verso.polygon);
    }

    let poly= new createjs.Shape();
    poly.graphics.beginStroke('green');
    
    let started = false;

    polygon.push(polygon[0]);

    for (let node in polygon) {
        let x;
        if (side == "rt") {
            x = polygon[node][0];
        } else {
            x = verso.stage.canvas.width - polygon[node][0];
        }
        let y = polygon[node][1];
        if (!started) {
            started = true;
            poly.graphics.moveTo(x, y);
        } else {
            poly.graphics.lineTo(x, y);
        }
    }

    polygon.pop();
    if (side == "rt") {
        recto.polygon = poly;
        if (recto.img) recto.stage.addChild(recto.polygon);
    } else {
        verso.polygon = poly;
        if (verso.img) verso.stage.addChild(verso.polygon);
    }
}

function rotateImage(event, img_back, img, side) {
    var rads_old = Math.atan2(mousestart_y - recto.stage.canvas.height/2, mousestart_x - recto.stage.canvas.width/2);
    var rads_new = Math.atan2(event.stageY - recto.stage.canvas.height/2, event.stageX - recto.stage.canvas.width/2);
    var rads = rads_new - rads_old;
    var delta_angle = rads * (180 / Math.PI);

    img_back.rotation = (img_back.rotation + delta_angle)%360;
    img.rotation = (img.rotation + delta_angle)%360;

    mousestart_x = event.stageX;
    mousestart_y = event.stageY;

    if (side == "rt") {
        recto.rotation = img.rotation;
        recto.stage.update();
    } else {
        verso.rotation = img.rotation;
        verso.stage.update();
    }
    
}

function moveImage(event, img_back, img, side) {
    img_back.x = img.x = event.stageX - img_back.offset_x;
    img_back.y = img.y = event.stageY - img_back.offset_y;

    if (side == "rt") {
        recto.stage.update();
        recto.offset_x = img_back.x;
        recto.offset_y = img_back.y;
    } else {
        verso.stage.update();
        verso.offset_x = img_back.x;
        verso.offset_y = img_back.y;
    }
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

    drawMasks();
}

function drawMasks() {
    recto.stage.removeChild(recto.crop_ne, recto.crop_nw, recto.crop_se, recto.crop_sw, recto.cropbox);
    recto.stage.removeChild(recto.polygon);
    verso.stage.removeChild(verso.crop_ne, verso.crop_nw, verso.crop_se, verso.crop_sw, verso.cropbox);
    verso.stage.removeChild(verso.polygon);
    if (mode == "cut") {
        drawPolygon("rt");
        if (recto.img) recto.img.mask = recto.polygon;
        drawPolygon("vs");
        if (verso.img) verso.img.mask = verso.polygon;
    } else if (mode == "crop") {
        drawCropBox("rt");
        if (recto.img) recto.img.mask = recto.cropbox;
        drawCropBox("vs");
        if (verso.img) verso.img.mask = verso.cropbox;
    }
    recto.stage.update();
    verso.stage.update();
}

function addPolygonNode(event, side) {
    if (mode == "cut" && action == "cut") {
        let node;
        if (side == "rt") {
            node = [event.stageX, event.stageY];
        } else {
            node = [verso.stage.canvas.width - event.stageX, event.stageY];
        }
        polygon.push(node);
        drawMasks();
    }
}

function updateModeButtons(){
    // check for mode - if crop, hide cut buttons, if cut, show them
    if (mode == "crop") {
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
    if (action == "move") {
        $('#move_button').addClass('active');
    } else if (action == "rotate") {
        $('#rotate_button').addClass('active');
    } else if (action == "cut") {
        $('#cut_button').addClass('active');
    }
}

$(document).ready(function(){
    recto.stage = new createjs.Stage('recto_canvas');
    verso.stage = new createjs.Stage('verso_canvas');

    recto.stage.on('click', function(event){addPolygonNode(event, "rt")}, true);
    verso.stage.on('click', function(event){addPolygonNode(event, "vs")}, true);

    recto.crop_nw.on("pressmove", (event)=>{cropSize(event, 'nw', "rt")});
    recto.crop_ne.on("pressmove", (event)=>{cropSize(event, 'ne', "rt")});
    recto.crop_sw.on("pressmove", (event)=>{cropSize(event, 'sw', "rt")});
    recto.crop_se.on("pressmove", (event)=>{cropSize(event, 'se', "rt")});

    verso.crop_nw.on("pressmove", (event)=>{cropSize(event, 'nw', "vs")});
    verso.crop_ne.on("pressmove", (event)=>{cropSize(event, 'ne', "vs")});
    verso.crop_sw.on("pressmove", (event)=>{cropSize(event, 'sw', "vs")});
    verso.crop_se.on("pressmove", (event)=>{cropSize(event, 'se', "vs")});

    crop_w = Math.floor($('#recto_canvas').width()/2);
    crop_h = Math.floor($('#recto_canvas').height()/2);
    crop_x = crop_w/2;
    crop_y = crop_h/2;
});

$('.bin_button').click(function(){
    let wrapper = $(this).parent().parent();
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

$('.local_upload_button').click(function(){
    if ($(this).attr('id') == 'left_local_upload') {
        lastUpload = "recto";
    } else {
        lastUpload = "verso";
    }

    ipcRenderer.send('upload-new-image');
});

$('#clear_polygon').click(function(){
    if (mode == "cut") {
        clearPolygon();
    }
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
        // TODO create masks for recto + verso
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
    crop_x = recto.stage.canvas.width - crop_x - crop_w;

    let new_polygon = [];
    for (let idx in polygon) {
        let x = verso.stage.canvas.width - polygon[idx][0];
        let y = polygon[idx][1];
        new_polygon.push([x,y]);
    }
    polygon = new_polygon;

    deactivateCanvas($('#recto_canvas_wrapper'));
    deactivateCanvas($('#verso_canvas_wrapper'));
    if (recto.url) activateCanvas($('#recto_canvas_wrapper'));
    if (verso.url) activateCanvas($('#verso_canvas_wrapper'));
    draw();
});

$('#cut_button').click(function(){
    action = "cut";
    updateModeButtons();
    if (recto.img) recto.img.mask = recto.polygon;
    if (verso.img) verso.img.mask = verso.polygon;
    drawMasks();
});

$('#cropcut_button').click(function(){
    if (mode == "crop") {
        // switch to cut mode
        mode = "cut";
        if (polygon.length == 0) {
            action = "cut";
        }
        $('#cropcut_button img').attr('src', '../imgs/symbol_cut.png');
    } else {
        // switch to crop mode
        mode = "crop";
        action = "move";
        $('#cropcut_button img').attr('src', '../imgs/symbol_crop.png');
    }
    updateModeButtons();
    drawMasks();
});

$('#move_button').click(function(){
    action = "move";
    updateModeButtons();
});

$('#rotate_button').click(function(){
    action ="rotate";
    updateModeButtons();
})

$('#undo_button').click(function(){
    polygon.pop();
    drawMasks();
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