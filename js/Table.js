'use strict';

const {CONFIG} = require('../renderer/classes/CONFIG');

class Table {
    constructor(ID) {
        this.ID = ID;

        this.clearStage();
        this.clearFragments();
        this.editors = [];
        this.annots = {};
        this.screenshot = null;
        this.undoSteps = [];
        this.redoSteps = [];
        this.clearGraphicFilters();
        this.emptyTable = true;
    }

    clearFragments() {
        this.fragments = {};
    }
    clearStage() {
        this.stage = {scaling: 100,};
    }
    clearGraphicFilters() {
        this.graphicFilters = null;
    }

    getFragment(fragmentID) {
        if (fragmentID in this.fragments) {
            return this.fragments[fragmentID];
        } else {
            return null;
        }
    }
    hasFragments() {
        return Object.keys(this.fragments).length > 0;
    }

    addAnnotation(annotation) {
        this.annots[annotation.aID] = annotation;
    }
    removeAnnotation(annotationID) {
        if (annotationID in this.annots) {
            delete this.annots[annotationID];
        }
    }

    addEditor(editor) {
        const timeMs = new Date().getTime();
        this.editors.push([editor, timeMs]);
    }
    updateEditor() {
        const lastEditor = this.editors.pop();
        const timeMs = new Date().getTime();
        this.editors.push([lastEditor[0], timeMs]);
    }

    setGraphicFilters(graphicFilters) {
        this.graphicFilters = graphicFilters;
    }
    getGraphicFilters() {
        return this.graphicFilters;
    }

    setScreenshot(screenshot) {
        this.screenshot = screenshot;
    }

    saveStep() {
        this.redoSteps = [];

        if (this.emptyTable) {
            this.emptyTable = false;
        } else {
            const step = this.makeStep();
            this.undoSteps.push(step);
        }

        // remove the oldest saved steps when UNDO_STEPS_MAX is reached
        while (this.undoSteps.length > CONFIG.UNDO_STEPS_MAX) {
            this.undoSteps.shift();
        }
    }
    makeStep() {
        return {
            stage: this.stage,
            fragments: this.fragments,
            editors: this.editors,
            annots: this.annots,
            screenshot: this.screenshot,
            graphicFilters: this.graphicFilters,
        }
    }
    undo() {
        if (this.undoSteps.length == 0) {
            return null;
        }

        const currentStep = this.makeStep();
        this.redoSteps.push(currentStep);

        const oldStep = this.undoSteps.pop();
        Object.keys(oldStep).forEach((key) => {
            this[key] = oldStep[key];
        });

        return this.getTable();
    }
    redo() {
        if (this.redoSteps.length == 0) {
            return null;
        }

        const currentStep = this.makeStep();
        this.undoSteps.push(currentStep);

        const oldStep = this.redoSteps.pop();
        Object.keys(oldStep).forEach((key) => {
            this[key] = oldStep[key];
        });

        return this.getTable();
    }
    getStepNumbers() {
        return {
            undoSteps: this.undoSteps.length,
            redoSteps: this.redoSteps.length,
        };
    }

    updateTable(tableData, skipStepping) {
        if (!skipStepping && Object.keys(this.fragments).length > 0) {
            this.saveStep();
        }

        Object.keys(tableData).forEach((key) => {
            this[key] = tableData[key];
        });
    }

    getTable() {
        return {
            stage: this.stage,
            fragments: this.fragments,
            editors: this.editors,
            annots: this.annots,
            screenshot: this.screenshot,
            graphicFilters: this.graphicFilters,
        };
    }
    getTableBasics() {
        return {
            fragments: this.fragments,
            screenshot: this.screenshot,
        };
    }
    getTPOPIDs() {
        const tpopIDs = [];
        for (const k of Object.keys(this.fragments)) {
            const fragment = this.fragments[k];
            if ('tpop' in fragment) {
                tpopIDs.push(fragment.tpop);
            }
        }
        return tpopIDs;
    }

}

module.exports = Table;