/*global window */
/*global createjs */
/*global document */
/*global console */

'use strict';

// Loading Requirements...
const { ipcRenderer } = require('electron');

// Settings
const trans_speed = 200;
var light_mode = 'dark';

// Initialisation
var stage, dark_background, zoom_slider, zoom_value, selected_image;
var touch1, touch2;

var zoom  = {screen  : {x : 0, y : 0},
             world   : {x : 0, y : 0}};
  
var mouse = {screen : {x : 0, y : 0},
             world  : {x : 0, y : 0}};

var scale = {length : function(number) {
                return Math.floor(number * inv_scale(stage.scalingFactor));
            },
             x : function(number) {
                return Math.floor((number - zoom.world.x) * inv_scale(stage.scalingFactor) + zoom.screen.x);
            },
             y : function(number) {
                return Math.floor((number - zoom.world.y) * inv_scale(stage.scalingFactor) + zoom.screen.y);
            },
             x_INV : function(number) {
                return Math.floor((number - zoom.screen.x) * (1 / inv_scale(stage.scalingFactor)) + zoom.world.x);
            },
             y_INV : function(number) {
                return Math.floor((number - zoom.screen.y) * (1 / inv_scale(stage.scalingFactor)) + zoom.world.y);
            }};



// ###### SENDING MESSAGES ###### //

// -> all messages
function send_message(code, data=null){
    ipcRenderer.send(code, data);
}


// ###### RECEIVING MESSAGES ###### //

// <- client-reload-whole-canvas
// <- client-update-canvas
// <- client-update-image

ipcRenderer.on('client-reload-whole-canvas', (event, stage_info, canvas_info) => {
    clear_stage();
    setup_stage_from_model(stage_info);
    update_images(canvas_info);
});

ipcRenderer.on('client-update-canvas', (event, canvas_info) => {
    update_images(canvas_info);
});

ipcRenderer.on('client-update-image', (event, image_info) => {
    // TODO client-update-image
    // update single image
});



// HANDLING USER EVENTS

// Clear Table Button
$('#clear_table').click(function(){send_message('server-clear-table');});
// Save Table Button
$('#save_table').click(function(){send_message('server-save-table');});
// Load Table Button
$('#load_table').click(function(){send_message('server-load-table');});
// Duplicate Button
$('#duplicate_table').click(function(){send_message('server-duplicate');});
// Horizontal Flip Button
$('#hor_flip_table').click(function(){send_message('server-hor-flip');});
// Vertical Flip Button
$('#vert_flip_table').click(function(){send_message('server-vert-flip');});
// Export Button
$('#export').click(function(){export_canvas();});

// Light Switch Button
$('#light_switch').click(function(){
    if (light_mode == "dark") {
        // the current light_mode is dark, thus change to bright
        dark_background = $('body').css('background');
        $('body').css({background: "linear-gradient(356deg, rgba(255,255,255,1) 0%, rgba(240,240,240,1) 100%)"});
        light_mode = "bright";
    } else {
        // the current light_mode is bright, thus change to dark
        $('body').css({background: dark_background});
        light_mode = "dark";
    }
});

// Fragment Tray Button
$('#tray_handle').click(function(){    
    let bottom = $('#fragment_tray').css('bottom');

    // toggle mechanism - depending on its current state, show or hide the fragment tray
    if (bottom == "-200px") {
        // this fires when the tray with height 200px is hidden under the window, thus move it up
        $('#fragment_tray, #tableButtons').stop().animate({bottom: "+=200"}, trans_speed);
    } else {
        // this fires when the tray is visible, thus move it 200px down to hide it under the screen
        $('#fragment_tray, #tableButtons').stop().animate({bottom: "-=200"}, trans_speed);
    }
});

// Fragment Selector Button
$('#selector_handle').click(function(){
    let left = $('#fragment_selector').css('left');

    // toggle mechanism - depending on its current state, show or hide the fragment selector
    if (left == "0px") {
        // this fires if the fragment selector is visible, thus move it to left until it's hidden
        $('#fragment_selector').stop().animate({left: "-=400"}, trans_speed);
    } else {
        // this fires if the fragment selector is hidden left of the screen, thus move it right to make it visible
        $('#fragment_selector').stop().animate({left: "+=400"}, trans_speed);
    }
});

// Negative Zoom Button
$('#minus_zoom').click(function(){
    update_zoom(-10);
});

// Positive Zoom Button
$('#plus_zoom').click(function(){
    update_zoom(10);
});

// Zoom Slider itself
$('#zoom_slider').on("change", (event) => {
    let deltaScale = $('#zoom_slider').val() - stage.scalingFactor;
    update_zoom(deltaScale);
});

/* 
    Function to handle key strokes. The following keyboard interactions or shortcuts have
    been defined so far:

    - Arrow Keys: If an image is selected, its position can also be manipulated by using the
        keyboard's arrow keys. The arrow indicates the direction into which the image is moved.
        Pressing Ctrl (1) or Shift (100) changes the movement steps (default: 10). Pressing Alt changes from
        translating the image to rotating the image.
*/
function handleKey(event){
    let deltaValue = 10;
    if (event.shiftKey){
        deltaValue = 100;
    }
    else if (event.ctrlKey){
        deltaValue = 1;
    }
    switch(event.key) {
        case "ArrowRight":
            if (event.altKey) {
                rotate_image_by_value(deltaValue);
            } else {
                move_image_by_value(deltaValue, 0);
            }
            break;
        case "ArrowLeft":
            if (event.altKey){
                rotate_image_by_value(-deltaValue);
            } else {
                move_image_by_value(-deltaValue, 0);
            }
            break;
        case "ArrowUp":
            move_image_by_value(0, -deltaValue);
            break;
        case "ArrowDown":
            move_image_by_value(0, deltaValue);
            break;
    }
}

// Function that handles mousewheel events when fire while hovering over canvas.
function handle_canvas_mousewheel(event){
    let deltaValue = 10;
    if (event.ctrlKey){
        deltaValue = 1;
    }
    else if (event.shiftKey){
        deltaValue = 100;
    }

    if (event.deltaY < 0){
        update_zoom(deltaValue, event);
    } else {
        update_zoom(-deltaValue, event);
    }
}



$(document).ready(function(){
    // Setting up the stage and defining its width and height
    stage = new createjs.Stage('table');
    
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.offset = {x: 0, y:0};
    stage.scalingFactor = 100;
    stage.name = "Virtual Light Table";
    stage.enableMouseOver();
    createjs.Touch.enable(stage);
    
    update_zoom();
    setup_invisible_canvas_background();
    save_stage_to_model();
    
    // TODO: What if the window is resized? Only allow fullscreen or handling it?
    
    // setting up key handling
    document.onkeydown = handleKey;
    document.getElementById('table').addEventListener('mousewheel', handle_canvas_mousewheel);
    
    // add listener for resize of window
    window.addEventListener('resize', resize_canvas);
});



/*
    GENERAL FUNCTIONS

    This contains several functions which are not directly useful for sending or receiving messages,
    don't handle user interface functions and are not necessarily called directly after page load.
*/

/*
    This function will be called every time the canvas needs to be updated. To do so, the main process
    sends a file with all registered images and their location positioning, i.e. x and y position, rotation
    and whatever comes to your mind (cf. receiver function for 'update-canvas').

    There are three potential scenarios:
        1. the image is not yet on the canvas - then draw it
        2. the image is already on the canvas - then update its location
        3. the image is on the canvas, but not in the dataset anymore - then
            remove it from the canvas, as the canvasManager is the only
            reliable source

    First, there will be a check for every element in the image_set given by the main task, if the
    image is already on the canvas. If not, it is drawn at the position given by its meta information.
    If so, the already existing image is redrawn at the position given by its meta information.
    
    In a second step, all elements on the stage are checked if they are in the image_set. If not,
    they will be removed.
    */
function update_images(canvas_info) {
    var loadQueue = new createjs.LoadQueue(); // loading queue for totally new images
    loadQueue.addEventListener('complete', draw_new_images);
    var new_image_ids = [];
    var changeQueue = new createjs.LoadQueue(); // loading queue for existing images which have to be changed
    changeQueue.addEventListener('complete', change_existing_images);
    var images_to_change = [];

    // UPDATE images already existing on the canvas (update position or remove from canvas)
    for (let x in stage.children) {
        let stage_element = stage.children[x];
        if (stage_element.canvasID && stage_element.canvasID in canvas_info) {
            // if the element has a canvasID AND this ID is in the canvas_info,
            // then it is case 2 and the location must be updated
            let image_properties = canvas_info[stage_element.canvasID];

            if (stage_element.recto != image_properties.recto) {
                // if recto/verso have been changed, put the respective other side into the loadqueue
                let image_url = '';
                if (image_properties.recto) { image_url = image_properties.recoURLlocal; }
                else { image_url = image_properties.versoURLlocal; }

                changeQueue.loadManifest([{id: stage_element.canvasID, src: image_url}], false);
                change_existing_images.push(stage_element.getChildAt(0));
            }

            set_new_position(stage.element, image_properties.xPos, image_properties.yPos);
            stage_element.rotation = image_properties.rotation;
            // now set image.updated to true
            canvas_info[stage_element.canvasID].updated = true;
        } else if (stage_element.canvasID && !(stage_element.canvasID in canvas_info)) {
            // this means there is an element on the canvas which has no equivalent in the canvas_info
            // simply remove it from the canvas, it's not legitimate anymore
            stage.removeChild(stage_element);
        }
    }
    stage.update();
    changeQueue.load(); // start queue after all stage elements have been processed
    
    // ADD new images
    for (let id in canvas_info) {
        if (canvas_info[id].updated) {
            // images which have been updated in the step before have this attribute
            continue;
        } else {
            // all other images have not been processed and thus need to be added to the canvas
            let image_properties = canvas_info[id];
            let image_url;
            if (image_properties.recto == true) {
                image_url = image_properties.rectoURLlocal;
            } else {
                image_url = image_properties.versoURLlocal;
            }
            // add the new image to the loadqueue, register its id in a special set and set the
            // updated property just to make sure it won't get processed again
            loadQueue.loadManifest([{id: id, src: image_url}], false);
            new_image_ids.push(id);
            image_properties.updated = true;
        }
    }
    loadQueue.load(); // load queue after adding all new files

    function draw_new_images(event){
        // load metadata for and create every image whose id is in the new_image_ids set
        for (let x in new_image_ids){
            let id = new_image_ids[x];
            let image_props = canvas_info[id];

            // create the new image itself as a createjs bitmap
            // also, add all the information given by the image_props to the image
            let image = new createjs.Bitmap(loadQueue.getResult(id));
            image.name = "image_"+image_props.name;
            image.canvasID = id;
            image.selected = false;
            image.cursor = "pointer";
            image.scale = inv_scale(stage.scalingFactor);
            image.recto = image_props.recto;
            image.x = 0;
            image.y = 0;

            // now, create a container which will contain the image and the elements
            // necessary for the selection environment
            let container = new createjs.Container();
            container.name = "container_"+image_props.name;
            container.canvasID = id;
            set_new_position(container, image_props.xPos, image_props.yPos);
            container.rotation = image_props.rotation;
            container.recto = image_props.recto;
            // setting the registration points of the container to the center
            // necessary such that pivot point for rotation is the center of an image
            container.regX = image.image.width / 2 * inv_scale(stage.scalingFactor);
            container.regY = image.image.height / 2 * inv_scale(stage.scalingFactor);

            container.addChild(image);
            stage.addChild(container);
            stage.update();

            image.on("mousedown", (event) => {
                register_click_offset(event);
                select_element(event);
            });
            image.on("pressmove", move_image);
            image.on("pressup", (event) => {
                save_image_to_model(container);
            });
        }
    }

    function change_existing_images(event){
        for (let bitmap in change_existing_images){
            bitmap.image = changeQueue.getResult(bitmap.canvasID);
        }
        stage.update();
    }
}

function update_image(image_info) {
    // checken ob bild bereits auf der canvas liegt
    // falls ja: location information übernehmen
    // hat sich das bild selbst geändert? (recto != verso) -> neu laden
}

function setup_stage_from_model(stage_info) {
    // implement any offset information given, otherwise set offset to 0|0
    if (stage_info.stage_offset) {
        stage.offset = stage_info.stage_offset;
    } else {
        stage.offset = {x: 0, y: 0};
    }

    // implement any scaling factor given - if none, set to 1.0
    if (stage_info.stage_scale) {
        stage.scalingFactor = stage_info.stage_scale;
    } else {
        stage.scalingFactor = 100;
    }
    $('#zoom_slider').val(stage.scalingFactor);
    $('#zoom_factor').html("Table Zoom<br/>x"+inv_scale(stage.scalingFactor));
    update_zoom();
}

function set_new_position(container, baseXPos, baseYPos){
    container.baseX = baseXPos; // save xPos in scale 1.0
    container.baseY = baseYPos; // save yPos in scale 1.0

    container.x = baseXPos * inv_scale(stage.scalingFactor) + stage.offset.x; // scale position, add offset
    container.y = baseYPos * inv_scale(stage.scalingFactor) + stage.offset.y; // scale position, add offset
}

// This function handles the rotation of images - of course not the image itself, but the whole
// container will be rotated, such that the selection environment agrees
function rotate_image(event){
    let rotation_anchor = event.target;
    let rotated_token = rotation_anchor.parent.parent;

    var rads = Math.atan2(stage.mouseY - rotated_token.y, stage.mouseX - rotated_token.x);
    var angle = rads * (180 / Math.PI);
    var difference = rotated_token.rotation - angle;
    rotated_token.rotation -= difference;

    save_image_to_model(rotated_token);

    stage.update();
}

function rotate_image_by_value(deltaRot){
    if (selected_image){
        selected_image.parent.rotation += deltaRot;
    }

    save_image_to_model(selected_image.parent); // unlike in rotate_image here useful as only one rotation step per keystroke
    stage.update();
}

// When this function is called, all elements on the stage will be deselected, i.e. their "selected" entry
// will be set to false and bounding boxes/rotation anchors will be removed
function deselect_all(){
    if (selected_image) {
        selected_image.parent.removeChildAt(1); // removes the anchor_container, which is at position 1 (0 is the image)
        selected_image.cursor = "pointer"; // change cursor behaviour for the image
        selected_image = null;
        stage.update();
    }
}

// When this function is called, one particular element (the one which the user has clicked on) should
// be selected, i.e. there should be a highlighting bounding box to indicate its measurements, a rotation
// anchor, maybe some other buttons and the option to move it around.
function select_element(event){
    let clicked_element = event.target;
    // first when selecting a new object, deselect all other objects (which, in normal case, should
    // only be one, but you never know); this is only necessary if the clicked element is
    // not the selected one per se, otherwise there is no need to deselect things and reselect the element
    if (selected_image != clicked_element){
        deselect_all();
        selected_image = event.target;
        create_selection(selected_image);
    }
}

function register_click_offset(event) {
    let posX = event.stageX;
    let posY = event.stageY;
    event.target.parent.offset = {x: event.target.parent.x - posX, y: event.target.parent.y - posY};
}

function reselect(){
    if (selected_image){
        let element = selected_image;
        element.parent.removeChildAt(1);
        create_selection(element);
    }
}

function create_selection(clicked_element) {
    clicked_element.cursor = "move"; // now that the element is selected, indicate it can be moved

    // show element on top
    stage.setChildIndex(clicked_element.parent, stage.children.length-1);

    // create a new container for selection elements
    let anchor_container = new createjs.Container();
    anchor_container.name = "container_anchor";

    // get the boundings of the image itself
    let image_width = clicked_element.image.width;
    let image_height = clicked_element.image.height;

    // create the rotation anchor, needed to rotate an image
    let rotation_anchor = new createjs.Shape();
    let rotation_size = 20 / inv_scale(stage.scalingFactor);
    rotation_anchor.graphics.setStrokeStyle(1).beginStroke('#e75036').beginFill('#f5842c').drawCircle(0, 0, rotation_size);
    rotation_anchor.x = image_width + 2 * rotation_size;
    rotation_anchor.y = image_height / 2 + rotation_size / 2;
    rotation_anchor.cursor = "grab";
    rotation_anchor.name = "rotation_anchor";

    rotation_anchor.on("pressmove", (event) => {
        rotation_anchor.cursor = "grabbing";
        rotate_image(event);
    });
    rotation_anchor.on("pressup", (event) => {
        rotation_anchor.cursor = "grab";
        save_image_to_model(selected_image.parent);
    });

    // create flipping button for individual fragment
    let flipping_button = new createjs.Shape();
    let flipping_size = 10 / inv_scale(stage.scalingFactor);
    flipping_button.graphics.setStrokeStyle(1).beginStroke('black').beginFill('white').drawCircle(0,0,flipping_size);
    flipping_button.x = image_width + 2 * flipping_size;
    flipping_button.y = image_height - 2 * flipping_size;
    flipping_button.cursor = 'pointer';
    flipping_button.name = "flipping_button";
    flipping_button.on('click', flip_image);

    // create the bounding box
    let bounding_box = new createjs.Shape();
    let stroke_strength = 2 / inv_scale(stage.scalingFactor);
    bounding_box.graphics.beginStroke('#f5842c').setStrokeDash([15,5]).setStrokeStyle(stroke_strength).drawRect(0, 0, image_width, image_height);

    // add new elements to the hierarchy
    anchor_container.addChild(bounding_box);
    anchor_container.addChild(rotation_anchor);
    anchor_container.addChild(flipping_button);
    clicked_element.parent.addChild(anchor_container);

    stage.update();
}

function flip_image(event){
    let token = event.target.parent.parent;
    let image = token.getChildAt(0);
    image.recto = !(image.recto);
    save_image_to_model(token);
}

// This function controls the movement of selected and dragged objects
function move_image(event){
    let element = event.target;
    let token = element.parent;
    let posX = event.stageX;
    let posY = event.stageY;
    let old_scaled_position_x = token.x;
    let old_scaled_position_y = token.y;
    
    // the token.offset is defined by the mouseclick such that it will stick to the cursor
    token.x = posX + token.offset.x;
    token.y = posY + token.offset.y;

    let distance_x = ((token.x - old_scaled_position_x) / inv_scale(stage.scalingFactor));
    let distance_y = ((token.y - old_scaled_position_y) / inv_scale(stage.scalingFactor));

    token.baseX += distance_x;
    token.baseY += distance_y;

    save_image_to_model(token);

    stage.update();
}

// This function allows exact movement of the selected image by values
function move_image_by_value(deltaX, deltaY){
    if (selected_image){
        let token = selected_image.parent;

        token.x += deltaX;
        token.y += deltaY;

        token.baseX = token.x / inv_scale(stage.scalingFactor);
        token.baseY = token.y / inv_scale(stage.scalingFactor);

        save_image_to_model(token);

        stage.update();
    }
}

function clear_stage(){
    for (let index = 1; index < stage.children.length; index++) {
        stage.removeChildAt(1);
    }

    stage.scalingFactor = 100;
    $('#zoom_slider').val(stage.scalingFactor);
    $('#zoom_factor').html("Table Zoom<br/>x"+inv_scale(stage.scalingFactor));
    stage.offset = {x: 0, y: 0};
}

// When this function is called, the new location information of the selected element will be
// transmitted to the main process and then registered at the canvasManager
function save_image_to_model(token){
    let image_to_save = token.children[0];

    // create an JS object containing all the relevant information about the current location
    let image_update = {
        "id":image_to_save.canvasID,
        "xPos":token.baseX,
        "yPos":token.baseY,
        "rotation":token.rotation,
        "scale":image_to_save.scale,
        "recto":image_to_save.recto
    };
    send_message('server-update-image', image_update);
}

function save_all_images_to_model() {
    for (let index in stage.children) {
        if (index > 0) {
            let token = stage.children[index];
            save_image_to_model(token);
        }
    }
}

function save_stage_to_model(){
    let stage_properties = {
        "stage_width": stage.canvas.width,
        "stage_height": stage.canvas.height,
        "stage_children": stage.children.length - 1,
        "stage_offset": stage.offset,
        "stage_scale": stage.scalingFactor
    };

    send_message('server-update-stage', stage_properties);
}

function save_to_model() {
    save_stage_to_model();
    save_all_images_to_model();
}

function export_canvas() {
    // TODO Vorher muss der canvas noch so skaliert werden, dass alle Inhalte angezeigt werden können

    deselect_all(); // we don't want the selection frame and other stuff in the exported image

    // creating artificial anchor element for download
    var element = document.createElement('a');
    element.href = document.getElementById('table').toDataURL('image/png');
    element.download = 'reconstruction.png';
    element.style.display = 'none';

    // temporarily appending the anchor, "clicking" on it, and removing it again
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function inv_scale(value) {
    return value / 100;
}

function update_zoom(deltaScale, event){
    if (deltaScale) {
        
        // if there is a change in scale, update both stage.scalingFactor and the zoom_slider
        let former_scaling_factor = stage.scalingFactor;
        let new_scaling_factor = stage.scalingFactor + deltaScale;

        if (new_scaling_factor >= 10 && new_scaling_factor <= 300){
            stage.scalingFactor += deltaScale;

            $('#zoom_slider').val(stage.scalingFactor); // not with deltaScale to make sure correlation with "model"
            $('#zoom_factor').html("Table Zoom<br/>x"+inv_scale(stage.scalingFactor));

            // scale stage.offset according to the new scale
            stage.offset.x = (stage.offset.x / inv_scale(former_scaling_factor)) * inv_scale(stage.scalingFactor);
            stage.offset.y = (stage.offset.y / inv_scale(former_scaling_factor)) * inv_scale(stage.scalingFactor);

            if (event) {
                mouse.screen.x	= event.clientX;
                mouse.screen.y	= event.clientY;
                mouse.world.x	= scale.x_INV(mouse.screen.x);
                mouse.world.y	= scale.y_INV(mouse.screen.y);
            } else {
                mouse.screen.x = Math.floor(stage.canvas.width / 2);
                mouse.screen.y = Math.floor(stage.canvas.height / 2);
                mouse.world.x = scale.x_INV(mouse.screen.x);
                mouse.world.y = scale.y_INV(mouse.screen.y);
            }

            zoom.screen.x	= mouse.screen.x;
            zoom.screen.y	= mouse.screen.y;
            zoom.world.x	= mouse.world.x;
            zoom.world.y	= mouse.world.y;
            
            // for every token scale their position and change their internal scale attribute
            for (let index in stage.children) {
                if (index > 0) {
                    let token = stage.children[index];
                    token.x = scale.x(token.baseX) + stage.offset.x;
                    token.y = scale.y(token.baseY) + stage.offset.y;
                    token.scale = inv_scale(stage.scalingFactor);
                }
            }
        }
            
            reselect(); // to ensure that selection frame is drawn correctly
            save_to_model(); // as there are changes both in stage and tokens
            stage.update();
        }
    }

function resize_canvas(event){
    let w = window.innerWidth;
    let h = window.innerHeight;
    stage.canvas.width = w;
    stage.canvas.height = h;

    save_stage_to_model();

    setup_invisible_canvas_background();
    stage.update();
}

function setup_invisible_canvas_background(){
    // Creating a background shape for the canvas. This shape is necessary in order to capture clicks
    // on the canvas itself, as clicks are only registered as long as they hit non-transparent pixels.
    var background = new createjs.Shape();
    background.graphics.beginFill('#333333').drawRect(0, 0, window.innerWidth, window.innerHeight);
    background.name= "Background";
    background.alpha = 0.01; // the pixels have to be barely visible

    // function call for clicks on background - deselect all items
    background.on("mousedown", (event) => {
        deselect_all();
        stage.lastClick = {x: event.stageX, y: event.stageY};
    });
    // function call for pressmove on background - move all objects
    background.on('pressmove', move_all_images);

    // TODO unschön
    if (stage.getChildAt(0)){
        stage.removeChildAt(0);
    }

    stage.addChildAt(background, 0);
    stage.update();
}

function move_all_images(event){
    let new_offset_x = event.stageX - stage.lastClick.x;
    let new_offset_y = event.stageY - stage.lastClick.y;

    stage.lastClick = {x: stage.lastClick.x + new_offset_x, y: stage.lastClick.y + new_offset_y};
    stage.offset = {x: stage.offset.x + new_offset_x, y: stage.offset.y + new_offset_y};

    for (let index in stage.children){
        if (index > 0){
            let token = stage.getChildAt(index);
            token.x += new_offset_x;
            token.y += new_offset_y;
        }
    }

    save_stage_to_model();
    stage.update();
}