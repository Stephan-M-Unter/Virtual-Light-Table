/*
    The UI Controller is the controller instance for the whole view; it controls all individual
    view elements, e.g. the canvas stage or the sidebar, such that changes can be updated in
    all places accordingly. Mainly used for communicaton with the server process and for distribution
    of signals which are relevant for multiple view elements.
*/
const { Sidebar } = require("./Sidebar");
const { Stage } = require("./Stage");
const { AnnotationPopup } = require("./AnnotationPopup");
const { ipcRenderer } = require("electron");

class UIController {
    constructor(DOMElement, width, height){
        this.stage = new Stage(this, DOMElement, width, height);
        this.sidebar = new Sidebar(this);
        this.annotationPopup = new AnnotationPopup(this);
    }

    sendToServer(message, data){
        if (data) {
            ipcRenderer.send(message, data);
        } else {
            ipcRenderer.send(message);
        }
    }
    
    sendAnnotation(id){
        if (id) {
            this.annotationPopup.updateAnnotation(id);
        } else {
            this.annotationPopup.addAnnotation();
        }
    }
    deleteAnnotation(annotationElement){

    }
    updateAnnotation(annotationElement){

    }

    toggleAnnotSubmitButton(){ this.annotationPopup.toggleAnnotSubmitButton(); }

    // send selection signal to all view elements necessary
    selectFragment(fragmentId){
        this.stage.selectFragment(fragmentId);
        this.sidebar.selectFragment(fragmentId);
    }
    // send deselection signal to all view elements necessary
    deselectFragment(fragmentId){
        this.stage.deselectFragment(fragmentId);
        this.sidebar.deselectFragment(fragmentId);
    }
    // inform all necessary view elements to clear their selection lists
    clearSelection(){
        this.stage.clearSelection();
        this.sidebar.clearSelection();
    }

    highlightFragment(fragmentId) {
        this.stage.highlightFragment(fragmentId);
        this.sidebar.highlightFragment(fragmentId);
    }
    unhighlightFragment(fragmentId) {
        try {
            this.stage.unhighlightFragment(fragmentId);
            this.sidebar.unhighlightFragment(fragmentId);
        } catch(err) {

        }
    }

    // update sidebar fragment list according to fragments on stage
    updateFragmentList(){
        let fragmentList = this.stage.getFragmentList();
        let selectedList = this.stage.getSelectedList();
        this.sidebar.updateFragmentList(fragmentList, selectedList);
    }

    // ask for delete confirmation; if approved, send removal signal to stage and update
    // sidebar fragment list accordingly
    removeFragments(){
        let confirmation = confirm("Do you really want to remove this fragment/these fragments?");

        if (confirmation) {
            this.stage.deleteSelectedFragments();
            this.updateFragmentList();
        }
    }
    removeFragment(id){
        let confirmation = confirm("Do you really want to remove this fragment?");

        if (confirmation){
            this.stage.removeFragment(id);
            this.updateFragmentList();
        }
    }

    // reroute new stage/fragment data to stage, then update sidebar
    loadScene(data) {
        this.annotationPopup.loadAnnotations(data.annots);
        this.stage.loadScene(data);
        this.updateFragmentList();
    }

    centerToFragment(id){
        // get fragment center coordinates
        // move panel such that fragment center is in center of window

        let stage_c = this.stage.getCenter();
        let fragment_c = this.stage.getFragmentList()[id].getPosition();

        let delta_x = stage_c.x - fragment_c.x;
        let delta_y = stage_c.y - fragment_c.y;

        this.stage.moveStage(delta_x, delta_y);
    }

    // Getter Methods
    getStage(){ return this.stage; }
    getSidebar(){ return this.sidebar; }
}

module.exports.UIController = UIController;