/*
    The UI Controller is the controller instance
    for the whole view; it controls all individual
    view elements, e.g. the canvas stage or the sidebar,
    such that changes can be updated in all places
    accordingly. Mainly used for communicaton with
    the server process and for distribution of
    signals which are relevant for multiple view elements.
*/
const {Sidebar} = require('./Sidebar');
const {Stage} = require('./Stage');
const {AnnotationPopup} = require('./AnnotationPopup');
const {ipcRenderer} = require('electron');

/**
 * TODO
 */
class UIController {
  /**
     * TODO
     * @param {*} DOMElement
     * @param {*} width
     * @param {*} height
     */
  constructor(DOMElement, width, height) {
    this.stage = new Stage(this, DOMElement, width, height);
    this.sidebar = new Sidebar(this);
    this.annotationPopup = new AnnotationPopup(this);
  }

  /**
   * TODO
   * @param {*} message
   * @param {*} data
   */
  sendToServer(message, data) {
    if (data) {
      ipcRenderer.send(message, data);
    } else {
      ipcRenderer.send(message);
    }
  }

  /**
   * TODO
   * @param {*} id
   */
  sendAnnotation(id) {
    if (id) {
      this.annotationPopup.updateAnnotation(id);
    } else {
      this.annotationPopup.addAnnotation();
    }
  }

  /**
   * TODO
   * @param {*} annotationElement
   */
  deleteAnnotation(annotationElement) {

  }

  /**
   * TODO
   * @param {*} annotationElement
   */
  updateAnnotation(annotationElement) {

  }

  /**
   * TODO
   */
  toggleAnnotSubmitButton() {
    this.annotationPopup.toggleAnnotSubmitButton();
  }

  /**
   * TODO: send selection signal to all view elements necessary
   * @param {*} fragmentId
   */
  selectFragment(fragmentId) {
    this.stage.selectFragment(fragmentId);
    this.sidebar.selectFragment(fragmentId);
  }

  /**
   * TODO: send deselection signal to all view elements necessary
   * @param {*} fragmentId
   */
  deselectFragment(fragmentId) {
    this.stage.deselectFragment(fragmentId);
    this.sidebar.deselectFragment(fragmentId);
  }

  /**
   * TODO: inform all necessary view elements to clear their selection lists
   */
  clearSelection() {
    this.stage.clearSelection();
    this.sidebar.clearSelection();
  }

  /**
   * TODO
   * @param {*} fragmentId
   */
  highlightFragment(fragmentId) {
    this.stage.highlightFragment(fragmentId);
    this.sidebar.highlightFragment(fragmentId);
  }

  /**
   * TODO
   * @param {*} fragmentId
   */
  unhighlightFragment(fragmentId) {
    try {
      this.stage.unhighlightFragment(fragmentId);
      this.sidebar.unhighlightFragment(fragmentId);
    } catch (err) {

    }
  }

  /**
   * TODO: update sidebar fragment list according to fragments on stage
   */
  updateFragmentList() {
    const fragmentList = this.stage.getFragmentList();
    const selectedList = this.stage.getSelectedList();
    this.sidebar.updateFragmentList(fragmentList, selectedList);
  }

  /**
   * TODO: ask for delete confirmation; if approved, send removal
   * signal to stage and update sidebar fragment list accordingly
   */
  removeFragments() {
    const confirmation = confirm('Do you really want to remove this' +
        'fragment/these fragments from the light table? (the original' +
        'files will not be deleted)');

    if (confirmation) {
      this.stage.deleteSelectedFragments();
      this.updateFragmentList();
    }
  }

  /**
   * TODO
   * @param {*} id
   */
  removeFragment(id) {
    const confirmation = confirm('Do you really want to remove this fragment' +
            'from the light table? (the original files will not be deleted)');

    if (confirmation) {
      this.stage.removeFragment(id);
      this.updateFragmentList();
    }
  }

  /**
   * TODO
   * @param {*} fragmentData
   */
  addFragment(fragmentData) {
    this.stage._loadFragments({'upload': fragmentData});
    this.updateFragmentList();
    $('.arrow.down').removeClass('down');
    $('.expanded').removeClass('expanded');
    // second, rotate arrow down and expand clicked segment
    $('#fragment_list').find('.arrow').addClass('down');
    $('#fragment_list').addClass('expanded');
  }

  /**
   * TODO
   * @return {*}
   */
  getCanvasCenter() {
    return this.stage.getCenter();
  }

  /**
   * TODO: reroute new stage/fragment data to stage, then update sidebar
   * @param {*} data
   */
  loadScene(data) {
    this.annotationPopup.loadAnnotations(data.annots);
    this.stage.loadScene(data);
    this.updateFragmentList();
  }

  /**
   * TODO
   * @param {*} id
   */
  centerToFragment(id) {
    // get fragment center coordinates
    // move panel such that fragment center is in center of window

    const stageC = this.stage.getCenter();
    const fragmentC = this.stage.getFragmentList()[id].getPosition();

    const deltaX = stageC.x - fragmentC.x;
    const deltaY = stageC.y - fragmentC.y;

    this.stage.moveStage(deltaX, deltaY);
  }

  // Getter Methods

  /**
   * TODO
   * @return {*}
   */
  getStage() {
    return this.stage;
  }

  /**
   * TODO
   * @return {*}
   */
  getSidebar() {
    return this.sidebar;
  }
}

module.exports.UIController = UIController;
