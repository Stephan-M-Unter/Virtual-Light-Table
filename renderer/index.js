'use strict'

// Loading Requirements...
const { ipcRenderer } = require('electron');

const development = true;
const print_communication = false;


// Settings

const transitionSpeed = 200;
var scalingFactor = 1;

var light_mode = 'dark';


// Initialisation

var stage;
var dark_background;
var zoom_slider;
var selected_image;
var touch1, touch2;

var zoom = {
    screen : {
      x : 0,
      y : 0,
    },
    world : {
      x : 0,
      y : 0,
    },
  };
  
  var mouse = {
    screen : {
      x : 0,
      y : 0,
    },
    world : {
      x : 0,
      y : 0,
    },
  };

  var scale = {
    length : function(number) {
      return Math.floor(number * scalingFactor);
    },
    x : function(number) {
      return Math.floor((number - zoom.world.x) * scalingFactor + zoom.screen.x);
    },
    y : function(number) {
      return Math.floor((number - zoom.world.y) * scalingFactor + zoom.screen.y);
    },
    x_INV : function(number) {
      return Math.floor((number - zoom.screen.x) * (1 / scalingFactor) + zoom.world.x);
    },
    y_INV : function(number) {
      return Math.floor((number - zoom.screen.y) * (1 / scalingFactor) + zoom.world.y);
    },
  };


/*
    SENDING MESSAGES

    When the following functions are called, they send an ipcRenderer message to the main
    thread which serves as a controller.
*/

/*
    The following function is a generic function which allows for multiple messages to be sent.
    In general, these messages are just quick notifications for the controller (the main procress)
    to do something, e.g. to save the current table, to provide an update for the canvas, to
    flip all items or to clear the whole table. Instead of creating individual functions for every
    such action, simply pass the necessary message to this function and it will be
    transported.

    So far, the following codes have been implemented:
    -> 'clear-table'
    -> 'save-table'
    -> 'load-table'
    -> 'hor-flip'
    -> 'vert-flip'
    -> 'duplicate'
    -> 'update-canvas'
*/
function send_message(code){
    let acceptedMessages = [
        'clear-table',
        'save-table',
        'load-table',
        'hor-flip',
        'vert-flip',
        'duplicate',
        'update-canvas',
        'get-folder'
    ]
    if (print_communication) {console.log("Sending message with code \'" + code + "\' to main process.");}
    if (acceptedMessages.indexOf(code) >= 0) {
        ipcRenderer.send(code);
    } else {
        console.log("Error: the code \'" + code + "\' has not been recognised.");
    }
};

function send_message_with_data(code, data){
    if (print_communication) {console.log("Sending message with code \'" + code + "\' including additional data to main process.")}
    ipcRenderer.send(code, data);
}



/*
    RECEIVING MESSAGES

    The following listeners fire whenever a corresponding message has been received by the main
    task, the controller. Some messages simply notify the UI to do something, others
    include data which should be handled accordingly.

    So far, the following messages will be accepted:

    <- update-canvas
            This message notifies the UI to update itself because of otherwise invisible changes
            which have been made under the hood. The message includes a JS object with all
            items to draw and their respective location information, i.e. x and y position
            as well as rotation.

            Please note that there are three potential cases:
                1. the image is not yet on the canvas - then draw it
                2. the image is already on the canvas - then update its location
                3. the image is on the canvas, but not in the dataset anymore - then
                    remove it from the canvas, as the canvasManager is the only
                    reliable source
*/
ipcRenderer.on('update-canvas', function(event, stageData, imageData){
    console.log("Received \'update-canvas\' message from main controller.");
    update_canvas(stageData, imageData);
});

/*
    <- redraw-canvas
            This message is sent when more than just some item locations might have changed.
            For example, after loading a whole new configuration, there would be an overload
            of image IDs in the canvas manager: while a completely new image with ID 1 would be
            registered in the canvas manager, the stage in this file still has information
            about the old image (given that there had already been another setup on screen). To
            avoid any complications and to avoid double-checking every single information between
            canvas manager and UI, the redraw function simply removes all existent images
            from the stage and redraws a new set.

            Please note: stage.children.getChildAt(0) has to be kept, this is the background
            shape which is necessary for capturing user clicks on the screen.
*/
ipcRenderer.on('redraw-canvas', function(event, stageData, imageData){
    console.log("Received \'redraw-canvas\' message from main controller.");

    // TODO das kann man sicher noch schöner machen
    for (let x = 0; x < stage.children.length; x++){
        if (x == 0) {
            // index 0 is reserved for the background, which should NOT be removed!
            continue;
        } else {
            // remove all other children, i.e. canvas items
            stage.removeChildAt(1);
        }
    }
    stage.update();

    update_canvas(stageData, imageData);
});




/*
    HANDLING BUTTON CLICKS

    The following functions handle clicks and interactions with user interface elements.
*/
// Clear Table Button
$('#clear_table').click(function(){
    send_message('clear-table');
});

// Save Table Button
$('#save_table').click(function(){
    send_message('save-table');
});

// Load Table Button
$('#load_table').click(function(){
    send_message('load-table');
});

// Duplicate Button
$('#duplicate_table').click(function(){
    send_message('duplicate');
    console.log(stage.children[1]);
});

// Horizontal Flip Button
$('#hor_flip_table').click(function(){
    send_message('hor-flip');
});

// Vertical Flip Button
$('#vert_flip_table').click(function(){
    send_message('vert-flip');
});

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

// Export Button
$('#export').click(function(){
    export_canvas();
});

// Fragment Tray Button
$('#tray_handle').click(function(){    
    let bottom = $('#fragment_tray').css('bottom');

    // toggle mechanism - depending on its current state, show or hide the fragment tray
    if (bottom == "-200px") {
        // this fires when the tray with height 200px is hidden under the window, thus move it up
        $('#fragment_tray, #tableButtons').stop().animate({bottom: "+=200"}, transitionSpeed);
    } else {
        // this fires when the tray is visible, thus move it 200px down to hide it under the screen
        $('#fragment_tray, #tableButtons').stop().animate({bottom: "-=200"}, transitionSpeed);
    }
});

// Fragment Selector Button
$('#selector_handle').click(function(){
    let left = $('#fragment_selector').css('left');

    // toggle mechanism - depending on its current state, show or hide the fragment selector
    if (left == "0px") {
        // this fires if the fragment selector is visible, thus move it to left until it's hidden
        $('#fragment_selector').stop().animate({left: "-=400"}, transitionSpeed);
    } else {
        // this fires if the fragment selector is hidden left of the screen, thus move it right to make it visible
        $('#fragment_selector').stop().animate({left: "+=400"}, transitionSpeed);
    }
});

// Negative Zoom Button
$('#minus_zoom').click(function(){
    zoom_slider.value -= 10;
    update_zoom();
});

// Positive Zoom Button
$('#plus_zoom').click(function(){
    zoom_slider.value = parseInt(zoom_slider.value) + 10;
    update_zoom();
});

/* 
    Function to handle key strokes. The following keyboard interactions or shortcuts have
    been defined so far:

    - Arrow Keys: If an image is selected, its position can also be manipulated by using the
        keyboard's arrow keys. The arrow indicates the direction into which the image is moved.
        Pressing Ctrl (10) or Shift (100) increases the movement steps. Pressing Alt changes from
        translating the image to rotating the image.
*/
function handleKey(event){
    let deltaValue = 1;
    if (event.shiftKey){
        deltaValue = 100;
    }
    else if (event.ctrlKey){
        deltaValue = 10;
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
    let deltaValue = 1;
    if (event.ctrlKey){
        deltaValue = 10;
    }
    else if (event.shiftKey){
        deltaValue = 100;
    }

    if (event.deltaY >= 0){
        zoom_slider.value = parseInt(zoom_slider.value) - deltaValue;
    } else {
        zoom_slider.value = parseInt(zoom_slider.value) + deltaValue;
    }
    update_zoom(event);
}



$(document).ready(function(){
    // Setting up the stage and defining its width and height
    stage = new createjs.Stage('table');
    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.offset = {x: 0, y:0};
    stage.name = "Lighttable";
    stage.enableMouseOver();
    createjs.Touch.enable(stage);

    // TODO: What if the window is resized? Only allow fullscreen or handling it?

    draw_background();

    // setting up zoom elements
    zoom_slider = document.getElementById('zoom_slider');
    $('#zoom_factor').html("Table Zoom<br/>x"+zoom_slider.value/100);
    zoom_slider.oninput = update_zoom;

    // setting up key handling
    document.onkeydown = handleKey;
    document.getElementById('table').addEventListener('mousewheel', handle_canvas_mousewheel);

    // add listener for resize of window
    window.addEventListener('resize', resize_canvas);

    stage.on("mousedown", function(event){
        if (event.pointerID == 0 || event.pointerID == -1) {
            touch1 = new createjs.Point(stage.globalToLocal(event.stageX, 0).x, stage.globalToLocal(0, event.stageY).y);
        } else if (event.pointerID == 1) {
            touch2 = new createjs.Point(stage.globalToLocal(event.stageX, 0).x, stage.globalToLocal(0, event.stageY).y);
        }

        console.log(touch1, touch2);
    });

    stage.on("pressup", function(event){
        if (event.pointerID == 0 || event.pointerID == -1) {
            touch1 = null;
        } else if (event.pointerID == 1) {
            touch2 = null;
        }

        console.log(touch1, touch2);
    });

    stage.on("pressmove", function(event){
        if (event.pointerID == -1 || event.pointerID == 0) {
            var touch = touch1;
        } else if (event.pointerID == 1) {
            var touch = touch2;
        }

        var dX = stage.globalToLocal(event.stageX, 0).x - touch.x;
        var dY = stage.globalToLocal(0, event.stageY).y - touch.y;

        if (touch1 && touch2) {
            var oldDist = distance_of_points(touch1, touch2);
        }

        touch.x += dX;
        touch.y += dY;

        if (touch1 && touch2) {
            var newDist = distance_of_points(touch1, touch2);
            var newZoom = newDist / oldDist;

            if (newZoom > 1) {
                newZoom = 0.1;
            } else if (newZoom < 1) {
                newZoom = -0.1;
            }

            console.log(newZoom);

            dX /= 2;
            dY /= 2;
        }
    });


    //save_stage_properties();
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
function update_canvas(stageData, image_set){
    var loadQueue = new createjs.LoadQueue(); // loading queue for new images
    loadQueue.addEventListener('complete', draw_images);

    // if the current model contains offset information, accept them; otherwise, set offset to 0
    if (stage.offset && stageData.stage_offset){
        stage.offset = stageData.stage_offset;
    } else {
        stage.offset = {x: 0, y:0};
    }

    // if the model contains a scaling factor, use it; otherwise, it is set to 1.0 (no scaling)
    if (stage.scale) {
        scalingFactor = stage.scale;
    } else {
        scalingFactor = 1.0;
    }
    zoom_slider.value = scalingFactor * 100;

    // first, handle those images which need updates or have to be removed from canvas
    for (let x in stage.children) {
        let stage_element = stage.children[x];
        if (stage_element.canvasID && stage_element.canvasID in image_set) {
            // if the element has a canvasID AND this ID is in the image_set,
            // then it's case 2 and the location must be updated
            let image_props = image_set[stage_element.canvasID];

            set_new_position(stage.element, image_props.xPos, image_props.yPos);
            stage_element.rotation = image_props.rotation;
            // now set image.updated to true
            stage.update();
            image_set[stage_element.canvasID]['updated'] = true;
            console.log("Image (ID: " + stage_element.canvasID + ") has been updated.");
        } else if (stage_element.canvasID && !(stage_element.canvasID in image_set)) {
            // this means there is an element on the canvas which has no equivalent in the image_set
            // simply remove it from the canvas, it's not legitimate anymore
            // TODO: Remove Image
        }
    }
    
    // now all stage items to be removed are removed and all items which have been on the canvas
    // and still should be on the canvas are updated; last step: add new items:
    var new_image_ids = [];
    for (let id in image_set) {
        if (image_set[id].updated) {
            // images which have been updated in the step before have this attribute
            continue;
        } else {
            // all other images have not been processed and thus need to be added to the canvas
            let image = image_set[id];
            let image_url;
            if (image.recto = true) {
                image_url = image.rectoURLlocal;
            } else {
                image_url = image.versoURLlocal;
            }
            // add the new image to the loadqueue, register its id in a special set and set the
            // updated property just to make sure it won't get processed again
            loadQueue.loadManifest([{id: id, src: image_url}], false);
            new_image_ids.push(id);
            image.updated = true;
        }
    }

    // after adding all new files, load the queue
    loadQueue.load();

    function draw_images(event){
        // load metadata for and create every image whose id is in the new_image_ids set
        for (let x in new_image_ids){
            let id = new_image_ids[x];
            let image_props = image_set[id];

            // create the new image itself as a createjs bitmap
            // also, add all the information given by the image_props to the image
            let image = new createjs.Bitmap(loadQueue.getResult(id));
            image.name = "image_"+image_props.name;
            image.canvasID = id;
            image.selected = false;
            image.cursor = "pointer";
            image.scale = scalingFactor;
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
            container.regX = image.image.width / 2 * scalingFactor;
            container.regY = image.image.height / 2 * scalingFactor;

            container.addChild(image);
            stage.addChild(container);
            stage.update();

            // function call when image is clicked upon - then, image should be selected
            image.on("mousedown", select_element);
            // function call when image is dragged - move the image according to the cursor
            image.on("pressmove", move_image);
            // function call when drag procedure is ended - send new location information to main process
            image.on("pressup", save_image_location);
        }
    }
};

function set_new_position(container, baseXPos, baseYPos){
    container.baseX = baseXPos;
    container.baseY = baseYPos;

    container.x = baseXPos * scalingFactor + stage.offset.x;
    container.y = baseYPos * scalingFactor + stage.offset.y;
}

// This function handles the rotation of images - of course not the image itself, but the whole
// container will be rotated, such that the selection environment agrees
function rotate_image(event){
    let rotation_anchor = event.target;
    let rotated_container = rotation_anchor.parent.parent;

    rotation_anchor.cursor = "grabbing";
    var rads = Math.atan2(stage.mouseY - rotated_container.y, stage.mouseX - rotated_container.x);
    var angle = rads * (180 / Math.PI);
    var difference = rotated_container.rotation - angle;
    rotated_container.rotation -= difference;
    stage.update();
}

function rotate_image_by_value(deltaRot){
    if (selected_image){
        selected_image.parent.rotation += deltaRot;
    }
    save_image_location();
    stage.update();
}

// When this function is called, all elements on the stage will be deselected, i.e. their "selected" entry
// will be set to false and bounding boxes/rotation anchors will be removed
function deselect_all(){
    for (let x in stage.children){
        let element = stage.children[x];
        if (element.selected){
            element.removeChildAt(1); // removes the anchor_container, which is at position 1 (0 is the image)
            element.selected = false;
            element.getChildAt(0).cursor = "pointer"; // change cursor behaviour for the image
        }
    }
    selected_image = null;
    stage.update();
}

// When this function is called, one particular element (the one which the user has clicked on) should
// be selected, i.e. there should be a highlighting bounding box to indicate its measurements, a rotation
// anchor, maybe some other buttons and the option to move it around.
function select_element(event){
    // additionally to selecting the image, also register the cursor offset
    let posX = event.stageX;
    let posY = event.stageY;
    event.target.parent.offset = {x: event.target.parent.x - posX, y: event.target.parent.y - posY};

    let clicked_element = event.target;
    // first when selecting a new object, deselect all other objects (which, in normal case, should
    // only be one, but you never know); this is only necessary if the clicked element is
    // not the selected one per se, otherwise there is no need to deselect things and reselect the element
    if (!clicked_element.parent.selected){
        deselect_all();
        selected_image = event.target;
        create_selection(selected_image);
    }
}

function reselect(){
    if (selected_image){
        let element = selected_image;
        element.parent.removeChildAt(1);
        create_selection(element);
    }
}

function create_selection(clicked_element) {
    clicked_element.parent.selected = true; // registering the current element as the selected one
    clicked_element.cursor = "move"; // now that the element is selected, indicate it can be moved

    // make sure the selected element is now last element in the stage children array
    // thus, the element will show up on top
    stage.setChildIndex(clicked_element.parent, stage.children.length-1);

    // create a new container which will hold the bounding rectangle and the rotation anchor
    let anchor_container = new createjs.Container();
    anchor_container.name = "container_anchor";

    // get the boundings of the image itself
    let bounds = clicked_element.getBounds();
    let image_width = clicked_element.image.width;// * scalingFactor;
    let image_height = clicked_element.image.height;// * scalingFactor;

    // create the rotation anchor, needed to rotate an image
    let rotation_anchor = new createjs.Shape();
    let rotation_size = 20 / scalingFactor;
    rotation_anchor.graphics.setStrokeStyle(1).beginStroke('#e75036').beginFill('#f5842c').drawCircle(0, 0, rotation_size);
    rotation_anchor.x = image_width + 2 * rotation_size;
    rotation_anchor.y = image_height / 2 + rotation_size / 2;
    rotation_anchor.cursor = "grab";
    rotation_anchor.name = "rotation_anchor";
    rotation_anchor.on("pressmove", rotate_image);
    rotation_anchor.on("pressup", function(event){
        this.cursor = "grab"
        save_image_location(event);
    });

    // create the bounding box
    let bounding_box = new createjs.Shape();
    let stroke_strength = 2 / scalingFactor;
    bounding_box.graphics.beginStroke('#f5842c').setStrokeDash([15,5]).setStrokeStyle(stroke_strength).drawRect(0, 0, image_width, image_height);

    // add new elements to the hierarchy
    anchor_container.addChild(bounding_box);
    anchor_container.addChild(rotation_anchor);
    clicked_element.parent.addChild(anchor_container);

    stage.update();
}

// This function controls the movement of selected and dragged objects
function move_image(event){
    let element = event.target;
    let posX = event.stageX;
    let posY = event.stageY;
    // the element.parent.offset is defined by the mouseclick such that it will stick to the cursor
    let old_scaled_position_x = element.parent.x;
    let old_scaled_position_y = element.parent.y;
  
    element.parent.x = posX + element.parent.offset.x;
    element.parent.y = posY + element.parent.offset.y;

    let distance_x = ((element.parent.x - old_scaled_position_x) / scalingFactor);
    let distance_y = ((element.parent.y - old_scaled_position_y) / scalingFactor);

    element.parent.baseX += distance_x;
    element.parent.baseY += distance_y;

    stage.update();
}

// This function allows exact movement of the selected image by values
function move_image_by_value(deltaX, deltaY){
    if (selected_image){
        let container = selected_image.parent;

        container.x += deltaX;
        container.y += deltaY;

        container.baseX = container.x / scalingFactor;
        container.baseY = container.y / scalingFactor;

        save_image_location();

        stage.update();
    }
}

// When this function is called, the new location information of the selected element will be
// transmitted to the main process and then registered at the canvasManager
function save_image_location(event){
    let moved_element = selected_image;
    let moved_container = selected_image.parent;

    // create an JS object containing all the relevant information about the current location
    let location_update = {
        "id":moved_element.canvasID,
        "xPos":moved_container.baseX,
        "yPos":moved_container.baseY,
        "rotation":moved_container.rotation,
        "scale":moved_element.scale,
        "recto":moved_element.recto
    }

    send_message_with_data('update-location', location_update);
}

function save_stage_properties(){
    let stage_properties = {
        "stage_width": stage.canvas.width,
        "stage_height": stage.canvas.height,
        "stage_children": stage.children.length,
        "stage_offset": stage.offset,
        "stage_scale": scalingFactor
    }

    send_message_with_data('update-stage', stage_properties);
}

function export_canvas() {
    // TODO Vorher muss der canvas noch so skaliert werden, dass alle Inhalte angezeigt werden können
    deselect_all();
    var element = document.createElement('a');
    element.href = document.getElementById('table').toDataURL('image/png');
    element.download = 'reconstruction.png';
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function update_zoom(event){
    let old_scale = scalingFactor;
    scalingFactor = zoom_slider.value / 100;
    $('#zoom_factor').html("Table Zoom<br/>x"+scalingFactor);
    // TODO Inkonsistent, wieso wird teilweise im handler, teilweise hier was an den Daten geändert?

    resize_canvas();

    stage.offset.x = (stage.offset.x / old_scale) * scalingFactor;
    stage.offset.y = (stage.offset.y / old_scale) * scalingFactor;

    if (event) {
        trackMouse(event);
    } else {
        simulateMouse();
    }
    zoom.screen.x	= mouse.screen.x;
    zoom.screen.y	= mouse.screen.y;
    zoom.world.x	= mouse.world.x;
    zoom.world.y	= mouse.world.y;
    /* else {
        console.log("no mouse event");
        zoom.screen.x = stage.canvas.width / 2 + stage.offset.x;
        zoom.screen.y = stage.canvas.height / 2 + stage.offset.y;
        zoom.world.x = scale.x_INV(mouse.screen.x);
        zoom.world.y = scale.y_INV(mouse.screen.y);
    }*/
    
    for (let item in stage.children) {
        if (item > 0) {
            let stage_element = stage.children[item];
        
            stage_element.x = scale.x(stage_element.baseX) + stage.offset.x;
            stage_element.y = scale.y(stage_element.baseY) + stage.offset.y;
            stage_element.scale = scalingFactor;
        }
    }
    
    reselect();
    save_stage_properties();
    stage.update();
}

function trackMouse(e) {
    mouse.screen.x	= e.clientX;
    mouse.screen.y	= e.clientY;
    mouse.world.x	= scale.x_INV(mouse.screen.x);
    mouse.world.y	= scale.y_INV(mouse.screen.y);
}

function simulateMouse() {
    mouse.screen.x = Math.floor(stage.canvas.width / 2);
    mouse.screen.y = Math.floor(stage.canvas.height / 2);
    mouse.world.x = scale.x_INV(mouse.screen.x);
    mouse.world.y = scale.y_INV(mouse.screen.y);
}

function resize_canvas(event){
    let w = window.innerWidth;
    let h = window.innerHeight;
    stage.canvas.width = w;
    stage.canvas.height = h;

    save_stage_properties();

    draw_background();
    stage.update();
}

function draw_background(){
    // Creating a background shape for the canvas. This shape is necessary in order to capture clicks
    // on the canvas itself, as clicks are only registered as long as they hit non-transparent pixels.
    var background = new createjs.Shape();
    background.graphics.beginFill('#333333').drawRect(0, 0, window.innerWidth, window.innerHeight);
    background.name= "Background";
    background.alpha = 0.01;

    // function call for clicks on background - deselect all items
    background.on("mousedown", handle_mousedown_on_background);
    // function call for pressmove on background - move all objects
    background.on('pressmove', move_all_images);

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

    for (let x in stage.children){
        if (x != 0){
            let element = stage.getChildAt(x);
            element.x += new_offset_x;
            element.y += new_offset_y;
        }
    }

    save_stage_properties();
    stage.update();
}

function handle_mousedown_on_background(event){
    deselect_all();

    stage.lastClick = {x: event.stageX, y: event.stageY};
}

function distance_of_points(point1, point2) {
    return Math.sqrt(Math.pow(point2.x - point1.x, 2) + Math.pow(point2.y - point1.y, 2));
}