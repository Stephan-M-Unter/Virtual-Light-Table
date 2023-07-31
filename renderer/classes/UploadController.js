'use strict';

const { UploadCanvas } = require('./UploadCanvas');

class UploadController {

    constructor(canvas_id_recto, canvas_id_verso, notifyRenderer, sendMaskChange) {
        this.recto = new UploadCanvas(this, canvas_id_recto);
        this.verso = new UploadCanvas(this, canvas_id_verso);
        this.notifyRenderer = notifyRenderer;
        this.sendMaskChange = sendMaskChange;

        this.cursorMode = 'move';
        this.maskMode = 'no_mask';
    }

    hasContent(side) {
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

    getProperty(side, key) {
        if (side === 'recto') {
            return this.recto.getProperty(key);
        }
        else if (side === 'verso') {
            return this.verso.getProperty(key);
        }
    }

    setCursorMode(mode) {
        this.cursorMode = mode;
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
        const notMeasuring = (!(this.recto.isMeasuring()) && !(this.verso.isMeasuring()));
        if (zoomRectoPossible && zoomVersoPossible && notMeasuring) {
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
        this.notifyRenderer();
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

    scaleImages(ppi, side) {
        if (side === 'recto') {
            this.recto.scaleImage(ppi);
        }
        else if (side === 'verso') {
            this.verso.scaleImage(ppi);
        }
        else {
            this.recto.scaleImage(ppi);
            this.verso.scaleImage(ppi);
        }
    }

    setBrushSize(size) {
        this.recto.setBrushSize(size);
        this.verso.setBrushSize(size);
    }

    handleMouseMove(event, side) {
        if (side === 'recto') {
            this.recto.handleMouseMove(event);
        }
        else if (side === 'verso') {
            this.verso.handleMouseMove(event);
        }
        else {
            this.recto.handleMouseMove(event);
            this.verso.handleMouseMove(event);
        }
    }

    unpackData(data) {
        if ('recto' in data) {
            if ('edit' in data && data.edit === true) {
                data.recto.edit = true;
            }
            this.recto.unpackData(data.recto);
        }
        if ('verso' in data) {
            if ('edit' in data && data.edit === true) {
                data.verso.edit = true;
            }
            this.verso.unpackData(data.verso);
        }
        this.notifyRenderer();
    }

    getData() {
        const dataRecto = this.recto.getData();
        const dataVerso = this.verso.getData();

        const data = {
            'recto': dataRecto,
            'verso': dataVerso,
            'maskMode': this.maskMode,
            'showRecto': this.recto.hasContent(),
        }

        return data;
    }

    setModel(modelID) {
        this.recto.setModel(modelID);
        this.verso.setModel(modelID);
    }

    setMask(side, path) {
        if (side === 'recto') {
            this.recto.setMask(path);
        }
        else if (side === 'verso') {
            this.verso.setMask(path);
        }
    }

    getAutoMask(side, modelID) {
        if (side === 'recto') {
            return this.recto.getAutoMask(modelID);
        }
        else if (side === 'verso') {
            return this.verso.getAutoMask(modelID);
        }
    }

    setCut(side, path) {
        if (side === 'recto') {
            this.recto.setCut(path);
        }
        else if (side === 'verso') {
            this.verso.setCut(path);
        }
    }

    setMaskOpacity(opacity) {
        this.recto.setMaskOpacity(opacity);
        this.verso.setMaskOpacity(opacity);
    }

    autoDeleteCut(modelID) {
        this.recto.autoDeleteCut(modelID);
        this.verso.autoDeleteCut(modelID);
    }

    isBrushing() {
        return this.cursorMode === 'auto-draw' || this.cursorMode === 'auto-erase';
    }

    getBrushColor() {
        if (this.cursorMode === 'auto-draw') {
            return 'green';
        }
        else if (this.cursorMode === 'auto-erase') {
            return 'red';
        }
        else {
            return null;
        }
    }

    removeAutoMask(modelID) {
        this.recto.removeAutoMask(modelID);
        this.verso.removeAutoMask(modelID);
    }

    handleMouseOut(event, side) {
        if (side === 'recto') {
            this.recto.handleMouseOut(event);
        }
        else if (side === 'verso') {
            this.verso.handleMouseOut(event);
        }
    }

    handleMouseEnter(event, side) {
        if (side === 'recto') {
            this.recto.handleMouseEnter(event);
        }
        else if (side === 'verso') {
            this.verso.handleMouseEnter(event);
        }
    }
}

module.exports.UploadController = UploadController;