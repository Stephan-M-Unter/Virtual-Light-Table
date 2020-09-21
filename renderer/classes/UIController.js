/*
    The UI Controller is the controller instance for the whole view; it controls all individual
    view elements, e.g. the canvas stage or the sidebar, such that changes can be updated in
    all places accordingly. Mainly used for communicaton with the server process and for distribution
    of signals which are relevant for multiple view elements.
*/
const { Sidebar } = require("./Sidebar");
const { Stage } = require("./Stage");

class UIController {
    constructor(DOMElement, width, height){
        this.stage = new Stage(this, DOMElement, width, height);
        this.sidebar = new Sidebar(this);
    }

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

    // update sidebar fragment list according to fragments on stage
    updateFragmentList(){
        let fragmentList = this.stage.getFragmentList();
        this.sidebar.updateFragmentList(fragmentList);
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

    // Getter Methods
    getStage(){ return this.stage; }
    getSidebar(){ return this.sidebar; }
}

module.exports.UIController = UIController;