'use strict';

const { UploadCanvas } = require('./UploadCanvas');

class UploadController {

    constructor(canvas_id_recto, canvas_id_verso) {
        this.recto = new UploadCanvas(this, canvas_id_recto);
        this.verso = new UploadCanvas(this, canvas_id_verso);
    }

    sideHasContent(side) {
        if (side === 'recto') {
            return this.recto.hasContent();
        }
        else if (side === 'verso') {
            return this.verso.hasContent();
        }
    }

    resize() {
        this.recto.resize();
        this.verso.resize();
    }

    update(side) {
        if (side === 'recto') {
            this.recto.update();
        }
        else if (side === 'verso') {
            this.verso.update();
        }
        else {
            this.recto.update();
            this.verso.update();
        }
    }

    deleteContent(side) {
        if (side === 'recto') {
            this.recto.deleteContent();
        }
        else if (side === 'verso') {
            this.verso.deleteContent();
        }
        else {
            this.recto.deleteContent();
            this.verso.deleteContent();
        }
    }

    rotateImage(side, angle) {
        if (side === 'recto') {
            this.recto.rotateImage(angle);
        }
        else if (side === 'verso') {
            this.verso.rotateImage(angle);
        }
        else {
            this.recto.rotateImage(angle);
            this.verso.rotateImage(angle);
        }
    }

    centerImage(side) {
        if (side === 'recto') {
            this.recto.centerImage();
        }
        else if (side === 'verso') {
            this.verso.centerImage();
        }
        else {
            this.recto.centerImage();
            this.verso.centerImage();
        }
    }

    setProperty(side, key, value) {
        if (side === 'recto') {
            this.recto.setProperty(key, value);
        }
        else if (side === 'verso') {
            this.verso.setProperty(key, value);
        }
        else {
            this.recto.setProperty(key, value);
            this.verso.setProperty(key, value);
        }
    }

    zoom(zoomDirection) {
        const zoomStepSize = 0.05;
        const zoomRectoPossible = this.recto.isZoomPossible(zoomDirection, zoomStepSize);
        const zoomVersoPossible = this.verso.isZoomPossible(zoomDirection, zoomStepSize);
        if (zoomRectoPossible && zoomVersoPossible) {
            this.recto.zoom(zoomDirection, zoomStepSize);
            this.verso.zoom(zoomDirection, zoomStepSize);
        };
        this.update();
    }

    swap() {}

    draw(side) {
        if (side === 'recto') {
            this.recto.draw();
        }
        else if (side === 'verso') {
            this.verso.draw();
        }
        else {
            this.recto.draw();
            this.verso.draw();
        }
    }

}

module.exports.UploadController = UploadController;