'use strict';

class UploadCanvas {

    constructor(controller, canvas_id) {
        this.controller = controller;

        this.stage = new createjs.Stage(canvas_id);
        this.canvas = $('#' + canvas_id);
        this.canvas_id = canvas_id;

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
            scale: null,
            ppi: 96,
            cursor: null,
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
            maskMode: 'no_mask',
            displayed: [],
        }
    }

    resize() {
        this.stage.canvas.width = this.canvas.width();
        this.stage.canvas.height = this.canvas.height();
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
                image.scaleX = this.prop.scale;
                image.scaleY = this.prop.scale;
            }
        }
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
        }
        else if (maskMode === 'polygon') {
            this.__drawPolygon();
        }
        else if (maskMode === 'automatic') {

        }
        else {
            this.prop.image.mask = null;
        }
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
        this.prop.displayed.push(this.prop.maskGroup);
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
        if (vertices.length < 3) {
            return;
        }
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

    __createVertex(vertex_coordinates, circle=false) {
        const size = 10;
        const x = vertex_coordinates[0] - (size / 2);
        const y = vertex_coordinates[1] - (size / 2);
        const vertex = new createjs.Shape();
        vertex.graphics.setStrokeStyle(1).beginStroke('green');
        vertex.graphics.beginFill('lightgreen');
        if (circle) {
            vertex.graphics.drawCircle(x+(size/2), y+(size/2), size / 2);
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
            
        this.prop.displayed.push(this.prop.maskGroup);
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
                console.log(`PPI: ${ppi}`);
                // $('#'+sidename+'_ppi').val(ppi);
                // checkRequiredFields();
              } else {
                console.log(`Input image (${this.canvas_id}) has no EXIF data.`);
              }
            });
          } catch {
            console.log(`Input image (${this.canvas_id}) has no EXIF data.`);
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
            const imageScale = (96/this.prop.ppi) * this.prop.scale;
            this.prop.image.scale = imageScale;
            this.prop.background_image.scale = imageScale;
        } else {
            const scaleToFit = this.__getScaleToFit();
            this.prop.scale = scaleToFit;
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
        this.draw();
    }

    handleMouseDown(event) {
        const pageX = event.pageX;
        const pageY = event.pageY;
        const stageX = pageX - this.canvas.offset().left;
        const stageY = pageY - this.canvas.offset().top;
        this.mouse.x = stageX;
        this.mouse.y = stageY;

        const cursorMode = this.controller.getCursorMode();

        if (cursorMode === 'add_polygon_node') {
            this.__addPolygonNode(stageX, stageY);
        }
    }
    handleMouseUp() {
        this.mouse.x = null;
        this.mouse.y = null;
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

    scaleImage(ppi) {
        if (isNaN(ppi)) {
            return;
        }
        
        this.prop.ppi = ppi;
        this.draw();
    }
}

module.exports.UploadCanvas = UploadCanvas;