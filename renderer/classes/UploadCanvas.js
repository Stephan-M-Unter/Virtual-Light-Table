'use strict';

class UploadCanvas {

    constructor(controller, canvas_id) {
        this.controller = controller;

        this.stage = new createjs.Stage(canvas_id);
        this.canvas = $('#' + canvas_id);
        this.canvas_id = canvas_id;
        this.side = canvas_id.split('_')[0];
        
        this.brushing = false;
        this.ppi1 = null;
        this.ppi2 = null;
        this.scaleGroup = null;
        this.scaleLine = null;
        this.borderSize = 4;
        
        this.brushSize = 50;
        this.cursor = new createjs.Shape(new createjs.Graphics().beginStroke('black').drawCircle(0,0,this.brushSize));

        this.clearProp();
        this.stage.enableMouseOver();

        this.mouse = {
            x: null,
            y: null,
        };
    }

    clearProp() {
        this.prop = {
            filepath: null,
            image: null,
            background_image: null,
            shadow: null,
            rotation: 0,
            x: null,
            y: null,
            scale: 1,
            maskOpacity: 0.7,
            ppi: null,
            is_www: false,
            maskGroup: null,
            maskBox: [],
            maskPolygon: [],
            autoMaskPaths: {},
            autoMasks: {},
            autoCutPaths: {},
            autoCuts: {},
            activeMask: null,
            activeCut: null,
            activeModelID: null,
            manualDrawing: null,
            displayed: [],
        }
    }

    resize() {
        this.stage.canvas.width = this.canvas.width();
        this.stage.canvas.height = this.canvas.height();
        this.update();
    }

    update() {
        this.stage.update();
    }

    setProperty(key, value) {
        this.prop[key] = value;
    }

    getProperty(key) {
        if (key in this.prop) {
            return this.prop[key];
        }
        return null;
    }

    rotateImage(angle) {
        this.prop.rotation = (this.prop.rotation + angle) % 360;
        this.draw();
    }

    rotateImageTo(angle) {
        this.prop.rotation = angle % 360;
        this.draw();
    }

    centerImage() {
        const width = this.canvas.innerWidth();
        const height = this.canvas.innerHeight();
        for (const image of this.prop.displayed) {
            if (image.zoomable) {
                image.x = width / 2;
                image.y = height / 2;
            }
        }
        this.prop.x = width / 2;
        this.prop.y = height / 2;
        this.draw();
    }

    isZoomPossible(direction, stepSize) {
        if (this.prop.filepath === null) {
            // there is no content registered, so
            // zooming is possible (for the other canvas)
            return true;
        }
        const scaleAfterZoom = this.prop.scale + (direction * stepSize);
        return scaleAfterZoom > stepSize;
    }

    zoom(direction, stepSize) {
        if (this.prop.filepath === null) {
            return true;
        }
        this.prop.scale += (direction * stepSize);
        for (const image of this.prop.displayed) {
            if (image.zoomable) {
                const ppi = this.prop.ppi || 96;
                image.scaleX = (96/ppi) * this.prop.scale;
                image.scaleY = (96/ppi) * this.prop.scale;
            }
        }
        this.draw();
    } 

    hasContent() {
        return this.prop.filepath !== null;
    }

    draw() {
        this.stage.removeAllChildren();
        this.prop.displayed = [];

        if (this.prop.filepath === null) {
            this.canvas.removeClass('active');
            this.update();
            return false;
        }

        this.canvas.addClass('active');

        this.__drawImages();
        if (this.prop.image !== null) {
            this.__drawMask();
        }

        if (this.scaleGroup !== null) {
            this.prop.displayed.push(this.scaleGroup);
        }

        if (this.controller.isBrushing()) {
            this.prop.displayed.push(this.cursor);
        }

        this.__addDisplayedToStage();
        this.update();  
    }

    __drawImages() {
        const imageLoaded = (this.prop.image !== null);
        if (!imageLoaded) {
            this.__createImage();
        } else {
            this.__drawImage();
            if (!this.prop.shadow) {
                this.__drawShadow();
            }
            this.prop.displayed.push(this.prop.background_image);
            this.prop.displayed.push(this.prop.shadow);
            this.prop.displayed.push(this.prop.image);
        }
    }

    __drawMask() {
        if (this.prop.maskGroup === null) {
            this.prop.maskGroup = new createjs.Container();
            this.prop.maskGroup.name = 'maskGroup';
        }
        this.prop.maskGroup.removeAllChildren();
        this.prop.image.mask = null;
        const maskMode = this.controller.getMaskMode();

        if (maskMode === 'boundingbox') {
            this.__drawBox();
            this.prop.displayed.push(this.prop.maskGroup);
        }

        else if (maskMode === 'polygon') {
            this.__drawPolygon();
            this.prop.displayed.push(this.prop.maskGroup);
        }

        else if (maskMode === 'automatic') {
            const hasMask = this.prop.autoMaskPaths.hasOwnProperty(this.prop.activeModelID);
            const hasCut = this.prop.autoCutPaths.hasOwnProperty(this.prop.activeModelID);
            if (hasCut) {
                this.__drawAutoCut();
            }
            else if (hasMask) {
                this.__drawAutoMask();
                this.prop.displayed.push(this.prop.maskGroup);
            }
        }
        else {
            this.prop.image.mask = null;
        }
    }

    __drawAutoCut() {
        if (!(this.prop.autoCutPaths.hasOwnProperty(this.prop.activeModelID))) {
            return;
        }

        if (this.prop.autoCuts.hasOwnProperty(this.prop.activeModelID)) {
            this.prop.displayed = [];
            const cut = this.prop.autoCuts[this.prop.activeModelID];
            cut.regX = cut.image.width / 2;
            cut.regY = cut.image.height / 2;
            cut.x = this.canvas.width() / 2;
            cut.y = this.canvas.height() / 2;
            cut.scale = this.prop.image.scale;
            this.prop.displayed.push(this.prop.shadow);
            this.prop.displayed.push(cut);
        } else {
            const cut = new Image();
            const cutPath = this.prop.autoCutPaths[this.prop.activeModelID];
            cut.src = `${cutPath}?_=${Date.now()}`;
            cut.onload = () => {
                const bitmap = new createjs.Bitmap(cut);
                bitmap.name = `Automatic Cut (${this.prop.activeModelID})`;
                this.prop.autoCuts[this.prop.activeModelID] = bitmap;
                this.draw();
            };
        }
    }

    __drawAutoMask() {
        if (!(this.prop.autoMaskPaths.hasOwnProperty(this.prop.activeModelID))) {
            return;
        }

        if (this.prop.autoMasks.hasOwnProperty(this.prop.activeModelID)) {
            // the mask has already been loaded
            const mask = this.prop.autoMasks[this.prop.activeModelID];
            mask.x = this.prop.x;
            mask.y = this.prop.y;
            mask.regX = this.prop.image.regX;
            mask.regY = this.prop.image.regY;
            mask.rotation = this.prop.image.rotation;
            mask.scale = this.prop.image.scale;
            mask.alpha = this.prop.maskOpacity;
            this.prop.maskGroup.addChild(mask);

            if (this.prop.manualDrawing !== null) {
                this.prop.maskGroup.addChild(this.prop.manualDrawing);
            }
        } else {
            // we still need to load the image into a Bitmap
            const mask = new Image();
            const maskPath = this.prop.autoMaskPaths[this.prop.activeModelID];
            mask.src = `${maskPath}?_=${+new Date()}`;
            mask.onload = () => {
                const bitmap = new createjs.Bitmap(mask);
                bitmap.name = `Automatic Mask (${this.prop.activeModelID})`;
                this.prop.autoMasks[this.prop.activeModelID] = bitmap;
                this.draw();
            };
        }
    }

    setMaskOpacity(opacity) {
        this.prop.maskOpacity = opacity;
        this.draw();
    }

    __drawBox() {
        if (this.prop.maskBox.length === 0) {
            this.__createEmptyBox();
        }
        
        const box = this.__createPolygon(this.prop.maskBox);
        this.prop.image.mask = box;

        const b1 = this.__createVertex(this.prop.maskBox[0]);
        const b2 = this.__createVertex(this.prop.maskBox[1]);
        const b3 = this.__createVertex(this.prop.maskBox[2]);
        const b4 = this.__createVertex(this.prop.maskBox[3]);

        b1.name = 'nw';
        b2.name = 'ne';
        b3.name = 'se';
        b4.name = 'sw';

        b1.on('pressmove', (event) => {
            this.__boxResize(event);
        });
        b2.on('pressmove', (event) => {
            this.__boxResize(event);
        });
        b3.on('pressmove', (event) => {
            this.__boxResize(event);
        });
        b4.on('pressmove', (event) => {
            this.__boxResize(event);
        });

        this.prop.maskGroup.addChild(box, b1, b2, b3, b4);
    }

    __createEmptyBox() {
        const canvasWidth = this.stage.canvas.width;
        const canvasHeight = this.stage.canvas.height;
        const left = canvasWidth * 0.25;
        const top = canvasHeight * 0.25;
        const right = canvasWidth * 0.75;
        const bottom = canvasHeight * 0.75;

        this.prop.maskBox.push([left, top]);
        this.prop.maskBox.push([right, top]);
        this.prop.maskBox.push([right, bottom]);
        this.prop.maskBox.push([left, bottom]);

        this.controller.mirrorBox(this.canvas_id, this.prop.maskBox);
    }

    resetBox() {
        this.prop.maskBox = [];
        this.__createEmptyBox();
        this.draw();
    }

    mirrorBox(box_polygons) {
        // box_polygons is a list of 4 points
        // each point is a list of 2 values (x, y)
        // the points are ordered clockwise
        // before using these polygon points, they need to be
        // mirrored along the y-axis

        const canvasWidth = this.stage.canvas.width;

        let box = [];
        for (const point of box_polygons) {
            const x = canvasWidth - point[0];
            const y = point[1];
            box.push([x, y]);
        }

        // invert order of vertices
        box = [box[1], box[0], box[3], box[2]];

        this.prop.maskBox = box;
        this.draw();
    }

    __createPolygon(vertices) {
        // if (vertices.length < 3) {
            // return;
        // }
        const polygon = new createjs.Shape();
        const p0 = vertices[0];
        polygon.graphics.beginStroke('black')
            .moveTo(p0[0], p0[1]);
        for (const point of vertices) {
            polygon.graphics.lineTo(point[0], point[1]);
        }
        polygon.graphics.closePath();
        return polygon;
    }

    __createVertex(vertex_coordinates, circle=false, color=null) {
        const fillColor = color || 'lightgreen';
        const outlineColor = color || 'green';

        const size = 10;
        const x = vertex_coordinates[0] - (size / 2);
        const y = vertex_coordinates[1] - (size / 2);
        const vertex = new createjs.Shape();
        vertex.graphics.setStrokeStyle(1).beginStroke(outlineColor).beginFill(fillColor);
        if (circle) {
            vertex.graphics.drawCircle(vertex_coordinates[0], vertex_coordinates[1], size / 2);
        } else {
            vertex.graphics.drawRect(x, y, size, size);
        }

        vertex.on('mouseover', (event) => {
            this.__vertexMouseIn(event);
            this.update();
        });
        vertex.on('mouseout', (event) => {
            this.__vertexMouseOut(event);
            this.update();
        });

        return vertex;
    }

    __boxResize(event) {
        let mouseX = event.stageX;
        const mouseY = event.stageY;

        const compass = event.target.name;

        let left = this.prop.maskBox[0][0];
        let top = this.prop.maskBox[0][1];
        let right = this.prop.maskBox[2][0];
        let bottom = this.prop.maskBox[2][1];

        if (compass == 'nw') {
            left = Math.min(mouseX, right);
            top = Math.min(mouseY, bottom);
        } else if (compass == 'sw') {
            left = Math.min(mouseX, right);
            bottom = Math.max(top, mouseY);
        } else if (compass == 'se') {
            right = Math.max(mouseX, left);
            bottom = Math.max(mouseY, top);
        } else if (compass == 'ne') {
            right = Math.max(mouseX, left);
            top = Math.min(mouseY, bottom);
        }

        this.prop.maskBox = [];
        this.prop.maskBox.push([left, top]);
        this.prop.maskBox.push([right, top]);
        this.prop.maskBox.push([right, bottom]);
        this.prop.maskBox.push([left, bottom]);

        this.draw();
        this.controller.mirrorBox(this.canvas_id, this.prop.maskBox);
    }

    __vertexMouseIn(event) {
        const c = event.target.graphics.command;
        event.target.graphics.clear();
        event.target.graphics.beginFill('green');
        if ('radius' in c) {
            // circle, necessary for last vertex set in polygon mode
            event.target.graphics.drawCircle(c.x, c.y, c.radius);
        } else {
            event.target.graphics.drawRect(c.x, c.y, c.w, c.h);
        }
        this.canvas.addClass('pointer');
    }
    
    __vertexMouseOut(event) {
        const c = event.target.graphics.command;
        event.target.graphics.clear();
        event.target.graphics.beginFill('lightgreen');
        event.target.graphics.setStrokeStyle(1).beginStroke('green');
        if ('radius' in c) {
            // circle, necessary for last vertex set in polygon mode
          event.target.graphics.drawCircle(c.x, c.y, c.radius);
        } else {
          event.target.graphics.drawRect(c.x, c.y, c.w, c.h);
        }
        this.canvas.removeClass('pointer');
    }

    __drawPolygon() {
        this.prop.image.mask = null;

        if (this.prop.maskPolygon.length === 0) {
            return;
        }
        const polygon = this.__createPolygon(this.prop.maskPolygon);
        this.prop.image.mask = polygon;

        const polygonShape = this.__createPolygon(this.prop.maskPolygon);

        this.prop.maskGroup.addChild(polygonShape);
        
        // create a vertex for every point
        // the last point is supposed to be a circle
        for (let i = 0; i < this.prop.maskPolygon.length; i++) {
            const point = this.prop.maskPolygon[i];
            const isCircle = (i === this.prop.maskPolygon.length - 1);
            const vertex = this.__createVertex(point, isCircle);
            vertex.name = i;

            vertex.on('mousedown', (event) => {
                event.stopPropagation();
                if (this.controller.getCursorMode() === 'remove_polygon_node') {
                    this.__removePolygonNode(vertex.name);
                }
            });
            vertex.on('pressmove', (event) => {
                event.stopPropagation();
                const cursorMode = this.controller.getCursorMode();
                if (['add_polygon_node', 'remove_polygon_node'].includes(cursorMode)) {
                    return;
                }
                this.prop.maskPolygon[vertex.name] = [event.stageX, event.stageY];
                controller.mirrorPolygon(this.canvas_id, this.prop.maskPolygon);
                this.draw();
            });

            this.prop.maskGroup.addChild(vertex);
        }
    }

    __addPolygonNode(x, y) {
        if (isNaN(x) || isNaN(y)) {
            return;
        }
        this.prop.maskPolygon.push([x, y]);
        const polygonPoints = [];
        for (const point of this.prop.maskPolygon) {
            polygonPoints.push(point);
        }
        this.controller.mirrorPolygon(this.canvas_id, polygonPoints);
        this.draw();
    }

    __removePolygonNode(id) {
        this.prop.maskPolygon.splice(id, 1);
        this.controller.mirrorPolygon(this.canvas_id, this.prop.maskPolygon);
        this.draw();
    }

    undoPolygonNode() {
        this.prop.maskPolygon.pop();
        this.controller.mirrorPolygon(this.canvas_id, this.prop.maskPolygon);
        this.draw();
    }

    clearPolygon() {
        this.prop.maskPolygon = [];
        this.draw();
    }

    mirrorPolygon(polygon) {
        this.prop.maskPolygon = [];

        for (const point of polygon) {
            const x = this.stage.canvas.width - point[0];
            const y = point[1];
            this.prop.maskPolygon.push([x, y]);
        }

        this.draw();
    }

    __addDisplayedToStage() {
        for (const image of this.prop.displayed) {
            this.stage.addChild(image);
        }
    }

    __getScaleToFit() {
        const canvasHeight = this.canvas.innerHeight();
        const canvasWidth = this.canvas.innerWidth();
        const imageHeight = this.prop.image.image.height;
        const imageWidth = this.prop.image.image.width;
        const scaleX = Math.min(1, (canvasWidth / imageWidth));
        const scaleY = Math.min(1, (canvasHeight / imageHeight));
        const scale = Math.min(scaleX, scaleY);
        return scale;
    }

    __createImage() {
        const new_image = new Image();
        new_image.src = this.prop.filepath;
        new_image.onload = () => {
            this.__readEXIF(new_image);
            this.prop.image = new createjs.Bitmap(new_image);
            this.prop.background_image = new createjs.Bitmap(new_image);

            this.prop.image.name = 'image';
            this.prop.background_image.name = 'background_image';

            this.prop.image.zoomable = true;
            this.prop.background_image.zoomable = true;

            this.__registerEvents(this.prop.image);
            this.__registerEvents(this.prop.background_image);

            // if x or y is not set, set it to the center of the canvas
            if (this.prop.x === null) {
                this.prop.x = this.stage.canvas.width / 2;
            }
            if (this.prop.y === null) {
                this.prop.y = this.stage.canvas.height / 2;
            }

            this.draw();
            this.controller.notifyRenderer();
        };
    }

    __registerEvents(bitmap) {
        bitmap.on('mousedown', (event) => {
            this.handleMouseDown(event);
        });
        bitmap.on('pressup', (event) => {
            this.handleMouseUp(event);
        });
        bitmap.on('pressmove', (event) => {
            this.handlePressMove(event);
        });
    }

    __readEXIF(image) {
        try {
            EXIF.getData(image, () => {
              const exifs = EXIF.getAllTags(image);
              if (exifs.XResolution) {
                const ppi = exifs.XResolution.numerator/exifs.XResolution.denominator;
                this.prop.ppi = ppi;
              } else {
                // console.log(`Input image (${this.canvas_id}) has no EXIF data.`);
              }
            });
          } catch {
            // console.log(`Input image (${this.canvas_id}) has no EXIF data.`);
          }
    }

    __drawImage() {
        const imageWidth = this.prop.image.image.width;
        const imageHeight = this.prop.image.image.height;
        const canvasWidth = this.stage.canvas.width;
        const canvasHeight = this.stage.canvas.height;

        // set the registration point to the center of the image
        this.prop.image.regX = imageWidth / 2;
        this.prop.image.regY = imageHeight / 2;

        this.prop.background_image.regX = imageWidth / 2;
        this.prop.background_image.regY = imageHeight / 2;

        // set the scale
        if (this.prop.scale !== null) {
            const ppi = this.prop.ppi ||96;
            const imageScale = (96/ppi) * this.prop.scale;
            this.prop.image.scale = imageScale;
            this.prop.background_image.scale = imageScale;
        } else {
            const scaleToFit = this.__getScaleToFit();
            // this.prop.scale = scaleToFit;
            this.prop.image.scale = scaleToFit;
            this.prop.background_image.scale = scaleToFit;
        }

        // set the position
        this.prop.image.x = this.prop.x;
        this.prop.image.y = this.prop.y;
        this.prop.background_image.x = this.prop.x;
        this.prop.background_image.y = this.prop.y;
        this.prop.image.rotation = this.prop.rotation;
        this.prop.background_image.rotation = this.prop.rotation;
    }

    __drawShadow() {
        const canvasWidth = this.stage.canvas.width;
        const canvasHeight = this.stage.canvas.height;
        this.prop.shadow = new createjs.Shape();
        this.prop.shadow.name = 'shadow';
        this.prop.shadow.graphics.beginFill('white')
            .drawRect(0, 0, canvasWidth, canvasHeight)
            .endFill();
        this.prop.shadow.alpha = 0.8;

        this.prop.shadow.on('mousedown', (event) => {
            this.handleMouseDown(event);
        });
        this.prop.shadow.on('pressmove', (event) => {
            this.handlePressMove(event);
        });
    }

    deleteContent() {
        this.clearProp();
        this.draw();
    }

    getContent() {
        return this.prop;
    }

    setContent(canvasContent) {
        this.prop = canvasContent;
        this.prop.image = null;
        this.draw();
    }

    __measure_ppi(x, y) {
        if (this.ppi1 === null) {
            this.scaleGroup = new createjs.Container();
            this.scaleGroup.name = 'scaleGroup';
            const p1 = this.__createVertex([x, y], true);
            this.scaleGroup.addChild(p1);
            this.scaleLine = new createjs.Shape();
            this.__drawScaleLine(x, y);
            this.scaleGroup.addChild(this.scaleLine);
            this.ppi1 = [x, y];
            this.draw();
        }
        else if (this.ppi2 === null) {
            this.scaleGroup = null;
            this.scaleLine = null;
            this.ppi2 = [x, y];

            const ppi = this.__computePPI(this.ppi1, this.ppi2);
            this.ppi1 = null;
            this.ppi2 = null;

            this.scaleImage(ppi);
            this.controller.notifyRenderer();
        }
    }

    __computePPI() {
        if (this.ppi1 === null || this.ppi2 === null) {
            return;
        }
        const dx = Math.abs(this.ppi1[0] - this.ppi2[0]);
        const dy = Math.abs(this.ppi1[1] - this.ppi2[1]);
        const z = Math.sqrt((dx*dx) + (dy*dy));
        const ppi = (z*2.54)/this.prop.image.scale;
        return ppi;
    }

    isMeasuring() {
        return this.ppi1 !== null;
    }

    handleMouseDown(event) {
        const pageX = event.pageX;
        const pageY = event.pageY;
        const stageX = pageX - this.canvas.offset().left - this.borderSize;
        const stageY = pageY - this.canvas.offset().top - this.borderSize;
        this.mouse.x = stageX;
        this.mouse.y = stageY;

        const cursorMode = this.controller.getCursorMode();

        const targetIsCanvas = event.target instanceof HTMLCanvasElement;

        if (cursorMode === 'add_polygon_node') {
            this.__addPolygonNode(stageX, stageY);
        }
        else if (['measure_recto', 'measure_verso'].includes(cursorMode) && targetIsCanvas) {
            this.__measure_ppi(stageX, stageY);
        } else if (this.controller.isBrushing()) {
            const manualDrawing = new createjs.Shape();
            manualDrawing.name = "manualBrushDrawing";
            manualDrawing.alpha = 0.5;
            const color = this.controller.getBrushColor();

            manualDrawing.graphics
                .clear()
                .ss(this.brushsize * 2, 'round', 'round')
                .s(color)
                .mt(stageX, stageY)
                .lt(stageX+0.1, stageY+0.1);

            this.prop.manualDrawing = manualDrawing;
            this.brushing = true;
        }
    }
    
    handleMouseUp() {
        if (this.brushing) {
            this.__endBrushing();   
        }
        this.brushing = false;
        this.mouse.x = null;
        this.mouse.y = null;
    }

    __endBrushing() {
        this.prop.manualDrawing.graphics.endStroke();

        const side = this.side;
        const maskURL = this.prop.autoMaskPaths[this.prop.activeModelID];

        const bounds = this.prop.image.getTransformedBounds();
        this.prop.manualDrawing.cache(bounds.x, bounds.y, bounds.width, bounds.height, this.prop.image.scale);
        const changeURL = this.prop.manualDrawing.cacheCanvas.toDataURL();

        this.controller.sendMaskChange(side, maskURL, changeURL);

        this.prop.manualDrawing = null;
    }
    
    handlePressMove(event) {
        const dx = event.stageX - this.mouse.x;
        const dy = event.stageY - this.mouse.y;
        const cursorMode = this.controller.getCursorMode();
        if (cursorMode === 'move') {
            this.prop.x += dx;
            this.prop.y += dy;
        }
        else if (cursorMode === 'rotate') {
            const radsOld = Math.atan2(this.mouse.y - this.prop.y, this.mouse.x - this.prop.x);
            const radsNew = Math.atan2(event.stageY - this.prop.y, event.stageX - this.prop.x);
            const rads = radsNew - radsOld;
            const deltaAngle = rads * (180 / Math.PI);
            this.rotateImage(deltaAngle);
            this.mouse.x = event.stageX;
            this.mouse.y = event.stageY;
        }
        this.draw();
        this.mouse.x = event.stageX;
        this.mouse.y = event.stageY;
    }
    
    handleMouseMove(event) {
        const x = event.pageX - this.canvas.offset().left - this.borderSize;
        const y = event.pageY - this.canvas.offset().top - this.borderSize;

        console.log(x, y);

        this.__drawScaleLine(x, y);
        this.__moveBrush(x, y);
        this.draw();
    }

    __moveBrush(x, y) {
        if (this.brushing) {
            const color = this.controller.getBrushColor();
            this.prop.manualDrawing.graphics
                .ss(this.brushSize * 2, 'round', 'round')
                .s(color)
                .mt(this.cursor.x, this.cursor.y)
                .lt(x, y);
        }

        this.cursor.x = x;
        this.cursor.y = y;
    }
    
    __drawScaleLine(x, y) {
        if (this.ppi1 === null) {
            return;
        }
        this.scaleLine.graphics.clear();
        this.scaleLine.graphics.setStrokeStyle(2).beginStroke('lightgreen')
            .moveTo(this.ppi1[0], this.ppi1[1])
            .lineTo(x, y);
    }

    scaleImage(ppi) {
        if (isNaN(ppi)) {
            return;
        }
        
        this.prop.ppi = ppi;
        this.draw();
    }

    setBrushSize(size) {
        this.cursor.graphics = new createjs.Graphics().beginStroke('black').drawCircle(0,0,size)
        this.brushSize = size;
    }

    unpackData(data) {
        this.clearProp();

        this.prop.filepath = data.url;
        this.prop.is_www = data.www;
        if ('ppi' in data) {
            this.prop.ppi = data.ppi;
        }

        if ('upload' in data) {
            this.prop.x = data.upload.x;
            this.prop.y = data.upload.y;
            this.prop.rotation = data.rotation;
            this.prop.maskBox = data.upload.box;
            this.prop.maskPolygon = data.upload.polygon;
            this.prop.scale = data.upload.scale;
        }
        this.draw();
    }

    __canvasToImage(image, pointArray) {
        const result = [];
        if (pointArray.length > 0) {
            pointArray.forEach((p) => {
            const imagePoint = image.globalToLocal(p[0], p[1]);
            result.push(imagePoint);
            });
        }
        return result;
    }

    getData() {
        if (!this.hasContent()) {
            return {};
        }

        const data = {
            'rotation': this.prop.rotation,
            'url': this.prop.filepath,
            'ppi': this.prop.ppi,
            'cx': this.prop.x,
            'cy': this.prop.y, 
            'box': this.__canvasToImage(this.prop.image, this.prop.maskBox),
            'polygon': this.__canvasToImage(this.prop.image, this.prop.maskPolygon),
            'auto': {
                'modelID': null,
                'cut': null,
                'mask': null,
            },
            'www': this.prop.is_www,
            'upload': {
                'box': this.prop.maskBox,
                'polygon': this.prop.maskPolygon,
                'x': this.prop.x,
                'y': this.prop.y,
                'scale': this.prop.scale,
            },
        };

        if (this.controller.getMaskMode() === 'automatic') {
            data.auto.modelID = this.prop.activeModelID;
            data.auto.cut = this.prop.autoCutPaths[this.prop.activeModelID];
            data.auto.mask = this.prop.autoMaskPaths[this.prop.activeModelID];
        }

        return data;
    }

    setModel(modelID) {
        this.prop.activeModelID = modelID;
        this.draw();
    }

    setMask(maskPath) {
        this.prop.autoMaskPaths[this.prop.activeModelID] = maskPath;
        this.draw();
    }

    getAutoMask(modelID) {
        if (this.prop.autoMaskPaths.hasOwnProperty(modelID)) {
            return this.prop.autoMaskPaths[modelID];
        }
        return null;
    }

    setCut(cutPath) {
        if (cutPath !== null) {
            this.prop.autoCutPaths[this.prop.activeModelID] = cutPath;
            this.draw();
        }
    }

    autoDeleteCut(modelID) {
        if (this.prop.autoCutPaths.hasOwnProperty(modelID)) {
            delete this.prop.autoCutPaths[modelID];
        }
        if (this.prop.autoCuts.hasOwnProperty(modelID)) {
            delete this.prop.autoCuts[modelID];
        }
        this.draw();
    }

    removeAutoMask(modelID) {
        if (this.prop.autoMasks.hasOwnProperty(modelID)) {
            delete this.prop.autoMasks[modelID];
        }
    }

    handleMouseOut(event) {
        this.cursor.graphics.clear();
        this.draw();
    }

    handleMouseEnter(event) {
        this.cursor.graphics = new createjs.Graphics().beginStroke('black').drawCircle(0,0,this.brushSize)
        this.draw();
    }
}

module.exports.UploadCanvas = UploadCanvas;