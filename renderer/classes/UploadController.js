'use strict';

const { UploadCanvas } = require('./UploadCanvas');

class UploadController {

    constructor(canvas_id_recto, canvas_id_verso) {
        this.recto = new UploadCanvas(this, canvas_id_recto);
        this.verso = new UploadCanvas(this, canvas_id_verso);

        this.cursorMode = 'move';
        this.maskMode = 'no_mask';
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

    setCursorMode(mode) {
        const validModes = ['move', 'rotate', 'add_polygon_node', 'remove_polygon_node'];
        if (validModes.includes(mode)) {
            this.cursorMode = mode;
        }
    }

    setMaskMode(mode) {
        const validMaskModes = ['no_mask', 'boundingbox', 'polygon', 'automatic'];
        if (validMaskModes.includes(mode)) {
            console.log(`Setting mask mode to ${mode}`);
            this.maskMode = mode;
            this.recto.draw();
            this.verso.draw();
        }
    }

    getMaskMode() {
        return this.maskMode;
    }

    getCursorMode() {
        return this.cursorMode;
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

    swap() {
        const content_recto = this.recto.getContent();
        const content_verso = this.verso.getContent();

        this.recto.deleteContent();
        this.verso.deleteContent();

        this.recto.setContent(content_verso);
        this.verso.setContent(content_recto);

        this.update();
    }

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

    handleMouseDown(event, side) {
        if (side === 'recto') {
            this.recto.handleMouseDown(event);
        }
        else if (side === 'verso') {
            this.verso.handleMouseDown(event);
        }
        else {
            this.recto.handleMouseDown(event);
            this.verso.handleMouseDown(event);
        }
    }

    handleMouseUp(event, cursorMode, side) {
        if (side === 'recto') {
            this.recto.handleMouseUp(event, cursorMode);
        }
        else if (side === 'verso') {
            this.verso.handleMouseUp(event, cursorMode);
        }
        else {
            this.recto.handleMouseUp(event, cursorMode);
            this.verso.handleMouseUp(event, cursorMode);
        }
    }

    handlePressMove(event, cursorMode, side) {
        if (side === 'recto') {
            this.recto.handlePressMove(event, cursorMode);
        }
        else if (side === 'verso') {
            this.verso.handlePressMove(event, cursorMode);
        }
        else {
            this.recto.handlePressMove(event, cursorMode);
            this.verso.handlePressMove(event, cursorMode);
        }
    }

    mirrorBox(source_id, box_polygons) {
        if (source_id.includes('recto')) {
            this.verso.mirrorBox(box_polygons);
        } else {
            this.recto.mirrorBox(box_polygons);
        }
    }
    
    mirrorPolygon(source_id, polygon) {
        if (source_id.includes('recto')) {
            this.verso.mirrorPolygon(polygon);
        } else {
            this.recto.mirrorPolygon(polygon);
        }
    }

    resetBox() {
        this.recto.resetBox();
    }

    clearPolygonMask() {
        this.recto.clearPolygon();
        this.verso.clearPolygon();
    }

    undoPolygonNode() {
        this.recto.undoPolygonNode();
        // we only do this on the recto; the result will
        // be mirrored to the verso! If we did it on both,
        // we would be caught in a loop.
    }

    scaleImages(ppi_recto, ppi_verso) {
        this.recto.scaleImage(ppi_recto);
        this.verso.scaleImage(ppi_verso);
    }
}

module.exports.UploadController = UploadController;