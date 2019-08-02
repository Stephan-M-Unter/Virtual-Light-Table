/*
    Name:           Virtual Light Table - Event Handlers
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     12/06/19
    Last Change:    24/07/19
    
    Description:    TODO
*/

'use strict'

const { ipcRenderer } = require('electron');

var development = false;

function clearTable(){
    console.log("User Click: Clearing Table.");
    ipcRenderer.send('clear-table')
}

function horFlipTable(){
    console.log("User Click: Horizonally Flipping Table.");
    // TODO
}

function vertFlipTable(){
    console.log("User Click: Vertically Flipping Table.");
}

function saveTable(){
    console.log("User Click: Saving Table.");
    ipcRenderer.send('save-table');
}

function loadTable(){
    console.log("User Click: Loading Table");
    ipcRenderer.send('load-table');
    // TODO
}

function duplicateTable(){
    console.log("User Click: Duplicating Table.");
    ipcRenderer.send('new-pic', 'https://images-na.ssl-images-amazon.com/images/I/71vntClRfjL._SX425_.jpg'); // TODO Just a test case
    // TODO
}

function toggleFragmentTray(){
    var bottom = $("#fragment_tray").css("bottom");
    var transitionSpeed = 180;
    if (bottom == "-200px") {
        $("#fragment_tray, #tableButtons").stop().animate({
            bottom: "+=200"
        }, transitionSpeed);
    } else {
        $("#fragment_tray, #tableButtons").stop().animate({
            bottom: "-=200"
        }, transitionSpeed);
    }
}

function toggleFragmentSelector(){
    var left = $("#fragment_selector").css("left");
    var transitionSpeed = 180;
    if (left == "0px") {
        $("#fragment_selector").stop().animate({
            left: "-=400"
        }, transitionSpeed);
    } else {
        $("#fragment_selector").stop().animate({
            left: "+=400"
        }, transitionSpeed);
    }
}

function startScreen(){
    $("#start_header").css({'display': 'block'});
    var delay = 600
    var delay = 2 // TODO remove - only for testing to speed things up
    $("#header1").stop().delay(delay).animate({
        opacity: "1"
    }, delay*2, function(){
        $("#start_header").delay(delay*9).animate({
            opacity: "0"
        }, delay*2, function(){
            $("#start_header").css({"display": "none"});
        });
    });
    
    $("#header2").stop().delay(delay*4).animate({
        opacity: "1"
    }, delay*2, function(){
        $("#header2").delay(delay*4).animate({
            opacity: "0"
        }, delay*2);
    });
    $("#header3").stop().delay(delay*5).animate({
        opacity: "1"
    }, delay*2, function(){
        $("#header3").delay(delay*2).animate({
            opacity: "0"
        }, delay*2);
    });
}

var stage;
$(document).ready(function() {   

    stage = new createjs.Stage("table");

    stage.canvas.width = window.innerWidth;
    stage.canvas.height = window.innerHeight;
    stage.name = "stage";

    let bg = new createjs.Shape();
    bg.graphics.beginFill("#333333").drawRect(0,0,stage.canvas.width,stage.canvas.height);
    bg.name = "background";
    stage.addChild(bg);

    stage.enableMouseOver();

    var selected_container;

    function load_pics(items) {
        for (var x in stage.children) {
            let stageChild = stage.children[x];
            console.log("StageItem: " + stageChild.canvasID);
            /*
            For every child node of the stage check if it is registered in the canvas manager;
            if so, update the position and remove it from the dictionary; thus, only
            new images remain in the set.
            */
            if (stageChild.canvasID && stageChild.canvasID in items) {
                console.log("StageItem " + stageChild.canvasID + " in items!");
                // TODO image already registered, only update position
                delete items[stageChild.canvasID];
            }
        }

        // now only new images are left which need to be freshly created

        for (var newItem in items) {
            let newImage = items[newItem];
            let image = new Image();
            image.src = newImage.rectoURLlocal;
            image.name = newImage.name;
            image.onload = load_pic(newItem, image, newImage);
        }
        stage.update();


        /*let image = new Image();
        image.src = "../imgs/cb_logo.png";
        image.name = "Image1";
        image.onload = load_pic;

        let image2 = new Image();
        image2.src = "../imgs/pap_dummy.jpg";
        image2.name = "Image2";
        image2.onload = load_pic;*/
    }

    function load_pic(canvasID, img, imgProps) {
        let xPos = imgProps.xPos;
        let yPos = imgProps.yPos;
        let rotation = imgProps.rotation;

        let container = new createjs.Container();
        container.name = imgProps.name;
        container.canvasID = canvasID;
        let image = new createjs.Bitmap(img);
        image.name = imgProps.name;
        image.canvasID = canvasID;
        image.selected = false;
        image.cursor = "pointer";
        image.scale = 0.5;
        image.x = 0;
        image.y = 0;
        container.x = xPos;
        container.y = yPos;
        image.regX = image.image.width / 2;
        image.regY = image.image.height / 2;
        container.rotation = rotation;



        container.addChild(image);
        stage.addChild(container);
        stage.update();

        function deselect(){
            if (selected_container) {
                selected_container.removeChildAt(1);
                let selected_image = selected_container.getChildAt(0);
                selected_image.selected = false;
                selected_image.cursor = "pointer";
                stage.update();
            }
        }

        bg.on("mousedown", function(event){
            deselect();
        });

        image.on("mousedown", function(event){
            var posX = event.stageX;
            var posY = event.stageY;
            this.parent.offset = {x: this.parent.x - posX, y: this.parent.y - posY};
            
            if (!event.target.selected) {
                deselect();
                stage.setChildIndex(this.parent, stage.children.length - 1);
                
                
                let anchorContainer = new createjs.Container();
                anchorContainer.name = "anchorContainer";
                let anchorsize = 20;
                
                let bounds = event.target.getBounds();
                let imageWidth = event.target.image.width * event.target.scaleX;
                let imageHeight = event.target.image.height * event.target.scaleY;
                
                let rotateArrows = new createjs.Bitmap("../imgs/symbol_rotate.png");
                let rotateArrowMatrix = new createjs.Matrix2D();
                rotateArrowMatrix.translate(0,0);
                rotateArrowMatrix.scale(0.1, 0.1);
                let circle = new createjs.Graphics()
                    .setStrokeStyle(2)
                    .beginStroke("#00aa00")
                    .beginFill("#00ff00")
                    .drawCircle(0,0,anchorsize);

                /*let anchor1 = new createjs.Shape(rect);
                anchor1.x = event.target.x - anchorsize/2 - imageWidth/2;
                anchor1.y = event.target.y - anchorsize/2 - imageHeight/2;
                anchor1.cursor = "grab";
                anchor1.on("pressmove", rotateImage);

                let anchor2 = new createjs.Shape(rect);
                anchor2.x = event.target.x - (anchorsize/2) + imageWidth - imageWidth/2;
                anchor2.y = event.target.y - anchorsize/2 - imageHeight/2;
                anchor2.cursor = "grab";
                anchor2.on("pressmove", rotateImage);
                
                let anchor3 = new createjs.Shape(rect);
                anchor3.x = event.target.x - anchorsize/2 - imageWidth/2;
                anchor3.y = event.target.y - (anchorsize/2) + imageHeight - imageHeight/2;
                anchor3.cursor = "grab";
                anchor3.on("pressmove", rotateImage);
                
                let anchor4 = new createjs.Shape(rect);
                anchor4.x = event.target.x - (anchorsize/2) + imageWidth - imageWidth/2;
                anchor4.y = event.target.y - (anchorsize/2) + imageHeight - imageHeight/2;
                anchor4.cursor = "grab";
                anchor4.on("pressmove", rotateImage);*/

                let rotateAnchor = new createjs.Shape(circle);
                rotateAnchor.x = imageWidth/2 + 40;
                rotateAnchor.y = -anchorsize/2;
                rotateAnchor.cursor = "grab";
                rotateAnchor.on("pressmove", rotateImage);
                rotateAnchor.on("pressup", function(event){
                    this.cursor = "grab";
                });

                function rotateImage(event){
                    this.cursor = "grabbing";
                    container = event.target.parent.parent;
                    var rads = Math.atan2(stage.mouseY - container.y, stage.mouseX - container.x);
                    var angle = rads * (180 / Math.PI);
                    var difference = container.rotation - angle;
                    container.rotation -= difference;
                    stage.update();
                }

                let border = new createjs.Shape();
                border.graphics.beginStroke("#f5842c");
                border.graphics.setStrokeDash([15,5]);
                border.graphics.setStrokeStyle(2);
                border.snapToPixel = true;
                border.graphics.drawRect(0,0,imageWidth,imageHeight);
                border.x = event.target.x - imageWidth/2;
                border.y = event.target.y - imageHeight/2;

                anchorContainer.addChild(border);
                anchorContainer.addChild(rotateAnchor);
                /*anchorContainer.addChild(anchor1);
                anchorContainer.addChild(anchor2);
                anchorContainer.addChild(anchor3);
                anchorContainer.addChild(anchor4);*/
                event.target.parent.addChild(anchorContainer);
                selected_container = event.target.parent;

                event.target.selected = true;
                event.target.cursor = "move";
            }
            stage.update();
        });

        image.on("pressmove", function(event){
            var posX = event.stageX;
            var posY = event.stageY;
            this.parent.x = posX + this.parent.offset.x;
            this.parent.y = posY + this.parent.offset.y;
            stage.update();
        });
        
        image.on("pressup", function(event){
            let imageName = event.target.name;
            let newX = event.target.parent.x;
            let newY = event.target.parent.y;
            let rotation = event.target.parent.rotation;
            let update = {
                imageName: imageName,
                newX: newX,
                newY: newY,
                rotation: rotation
            }
            ipcRenderer.send('update-position', update);
            stage.update();
        });
    }
    stage.update();

    



    $("#clear_table").click(function(){
        clearTable();
    });
    $("#save_table").click(function(){
        saveTable();
    });
    $("#load_table").click(function(){
        loadTable();
    });
    $("#duplicate_table").click(function(){
        duplicateTable();
    });
    $("#hor_flip_table").click(function(){
        horFlipTable();
    });
    $("#vert_flip_table").click(function(){
        vertFlipTable();
    });
    $("#tray_handle").click(function(){
        toggleFragmentTray();
    });
    $("#selector_handle").click(function(){
        toggleFragmentSelector();
    });
    
    if (development) {
        toggleFragmentTray();
    } else {
        startScreen();
    }
    
    // <- DRAW-PICTURE
    ipcRenderer.on('draw-picture', function(event, data) {
        
        let canvas = document.getElementById('table');
        let context = canvas.getContext('2d');
    
        let image = new Image();
        image.src = data;
        context.drawImage(image, 0, 0);
    });

    // <- UPDATE-CANVAS
    ipcRenderer.on('update-canvas', function(event, data) {
        load_pics(data);
    });

    ipcRenderer.send('update-position');
});