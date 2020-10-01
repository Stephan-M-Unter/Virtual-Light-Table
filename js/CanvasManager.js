/*
    Name:           CanvasManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     23/07/19
    Last Change:    29/07/19
    
    Description:    This manager is supposed to store all information about the papyri added
                    to the application's canvas and to return them to the view. The manager stores
                    information both about the stage and the canvas items in order to be able
                    to save the whole setup and recreate it.

                    The structure for the CanvasManager is as follows:

                    CanvasManager: {
                        stage: {
                            width: int,
                            height: int,
                            ...
                        },
                        items: {
                            ID1: {
                                name: String,
                                xPos: int,
                                yPos: int,
                                rotation: float,
                                recto: bool,
                                rectoURLoriginal: String,
                                versoURLoriginal: String,
                                rectoURLlocal: String,
                                versoURLlocal: String,
                                meta: {
                                    metaTag1: ...,
                                    metaTag2: ...,
                                    ...
                                }
                            }
                        }

                    }

                    Property Explanation:

                    Stage:      contains all information about the stage/canvas itself; might be necessary to reproduce
                                the position of fragments with respect to each other
                    Items:      contains all information about the loaded fragments
                    ID:         unique identifier for each fragment, only for internal use; this is not necessarily
                                a name given by TPOP or any other nomenclature, could also be a continous
                                numbering
                    xPos:       x-position of the fragment on the canvas, regarding the center (?) of the image
                    yPos:       y-position of the fragment on the canvas, regarding the center (?) of the image
                    rotation:   float indicating the rotation of a fragment; values from 0 to 180 (1st and 2nd quadrant)
                                and 0 to -180 (3rd and 4th quadrant)
                    recto:      a boolean flag indicating whether the recto or the verso of a fragment is shown
                    rectoURLoriginal:   URL of the original recto image such that it could be reloaded
                    rectoURLlocal:      file path to the locally saved version of the fragment's image
                    meta:       contains all meta information about an object as loaded from the database
*/

'use strict';

class CanvasManager {
    constructor() {
        this.clearAll();
    }

    _createFragmentID() {
        let id = "f_" + this.IDcounter;
        this.IDcounter += 1;
        return id;
    }

    clearAll(){
        this.stage = {
            "offset":{"x":0,"y":0},
            "scaling":100
        };
        this.fragments = {};
        this.editors = [];
        this.annots = [];
        this.IDcounter = 0;
    }

    clearFragments(){
        this.fragments = {};
    }

    addFragment(fragment_data){
        let id = this._createFragmentID;
        this.fragments[id] = fragment_data;
    }

    removeFragment(id){
        delete this.fragments[id];
    }

    updateFragment(id, fragment_data){
        this.fragments[id] = fragment_data;
    }

    updateFragments(fragments_data){
        this.fragments = fragments_data;
    }

    updateStage(stage_data){
        this.stage = stage_data;
    }

    getAll(){
        return {
            "stage":this.stage,
            "fragments":this.fragments,
            "editors": this.editors,
            "annots": this.annots
        };
    }

    getFragments(){
        return this.fragments;
    }

    getStage(){
        return this.stage;
    }

    getFragment(id){
        return this.fragments[id];
    }

    getEditors(){
        return this.editors;
    }

    getAnnots(){
        return this.annots;
    }

    addAnnot(annot_text, author){
        let time_ms = new Date().getTime();
        this.annots.push([author, time_ms, annot_text]);
    }

    loadFile(file) {
        this.clearAll();
        this.stage = file.stage;
        this.fragments = file.fragments;
        this.editors = file.editors;
        this.annots = file.annots;
    }

    addEditor(editor) {
        let time_ms = new Date().getTime();
        this.editors.push([editor, time_ms]);
    }
}

module.exports = CanvasManager;