'use strict';

class UploadCanvas {

    constructor(controller, canvas_id) {
        this.controller = controller;

        this.stage = new createjs.Stage(canvas_id);
        this.canvas = $('#' + canvas_id);
        this.canvas_id = canvas_id;

        this.clearProp();
        this.stage.enableMouseOver();
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
            image.x = width / 2;
            image.y = height / 2;
        }
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
        console.log(direction, stepSize);
        if (this.prop.filepath === null) {
            return true;
        }
        this.prop.scale += (direction * stepSize);
        for (const image of this.prop.displayed) {
            image.scaleX = this.prop.scale;
            image.scaleY = this.prop.scale;
        }
    }

    hasContent() {
        return this.prop.filepath !== null;
    }

    draw() {
        this.stage.removeAllChildren();
        this.prop.displayed = [];

        if (this.prop.filepath === null) {
            this.update();
            return false;
        }

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

        this.__addDisplayedToStage();
        this.update();  
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
            this.prop.image.scale = this.prop.scale;
            this.prop.background_image.scale = this.prop.scale;
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

        this.prop.shadow.on('mousedown', (event) => {});
        this.prop.shadow.on('pressmove', (event) => {});
    }

    deleteContent() {
        this.clearProp();
        this.draw();
    }

}

module.exports.UploadCanvas = UploadCanvas;