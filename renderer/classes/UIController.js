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
     */
  constructor(DOMElement) {
    this.stage = new Stage(this, DOMElement);
    this.sidebar = new Sidebar(this);
    this.annotationPopup = new AnnotationPopup(this);
    this.hotkeysOn = true;
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
    const confirmation = confirm('Do you really want to remove this ' +
        'fragment/these fragments from the light table? (the original ' +
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
   */
  toggleGridMode() {
    const gridMode = this.stage.toggleGridMode();
    if (gridMode) {
      $('#grid_box').prop('checked', true);
    } else {
      $('#grid_box').prop('checked', false);
    }
  }

  /**
   * TODO
   */
  toggleScaleMode() {
    const scaleMode = this.stage.toggleScaleMode();
    if (scaleMode) {
      $('#scale_box').prop('checked', true);
    } else {
      $('#scale_box').prop('checked', false);
    }
  }

  /**
   * TODO
   */
  toggleFibreMode() {
    // TODO Not yet implemented
  }

  /**
   * TODO
   * @return {*}
   */
  getCanvasCenter() {
    return this.stage.getCenter();
  }

  /**
   * Function to update the whole table with a new scaling value, i.e.
   * both the stage itself (with the fragments to rescale and move) and
   * the zoom slider which should always show the acurate scaling factor.
   *
   * @param {*} scalingValue Value for new scaling ratio; this value
   * gives is the ratio * 100, e.g. not x1.0 but 100.
   * @param {*} scaleX x position of scaling center if not window center.
   * @param {*} scaleY y position of scaling center if not window center.
   */
  setScaling(scalingValue, scaleX, scaleY) {
    this.stage.setScaling(scalingValue, scaleX, scaleY);
    $('#zoom_slider').val(scalingValue);
  }

  /**
   * TODO: reroute new stage/fragment data to stage, then update sidebar
   * @param {*} data
   */
  loadScene(data) {
    this.annotationPopup.loadAnnotations(data.annots);
    this.sidebar.updateDoButtons(data);
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

  /**
   * TODO
   * @param {*} titleText Text to be displayed as title of the feedback box.
   * @param {*} descText Text to be displayed as description
   * of the feedback box.
   * @param {*} color Color of the feedback box. If no color is given, the
   * box will be rendered in white.
   * @param {*} duration Display duration of the message. If no duration
   * is given, the duration is adjusted to the total length of the
   * message, with a minimum of 2000ms.
   */
  showVisualFeedback(titleText, descText, color, duration) {
    if (!color) {
      color = 'white';
    }
    if (!duration) {
      duration = (titleText.length + descText.length) * 40;
      duration = Math.max(duration, 1500);
    }
    $('#vf_title').empty().text(titleText);
    $('#vf_desc').empty().text(descText);
    $('#visual_feedback').css('background-color', color);
    $('#visual_feedback').css('display', 'block');
    $('#visual_feedback').css('left', '50%');
    $('#visual_feedback').css('left', '-=30px');

    $('#visual_feedback').stop().animate({
      opacity: '1.0',
      left: '+=15px',
    }, 700, function() {
      $('#visual_feedback')
          .delay(duration)
          .animate({
            opacity: '0.0',
            left: '+=15px',
          }, 700, function() {
            $('#visual_feedback')
                .css('display', 'none')
                .css('left', '50%');
          });
    });
  }

  /**
   * TODO
   * @param {*} fileFormat
   * @param {*} full
   * @param {*} thumb
   * @return {*}
   */
  exportCanvas(fileFormat, full, thumb) {
    return this.stage.exportCanvas(fileFormat, full, thumb);
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

  /**
   * TODO
   */
  startMeasure() {
    if (this.stage.hasMeasureMode()) {
      // deactivate measure mode
      this.stage.clearMeasure();
    } else {
      // activate measure mode
      this.stage.startMeasure();
    }
    $('#tool_clear_measure').removeClass('hidden');
  }

  /**
   * TODO
   */
  endMeasure() {
    this.stage.clearMeasure();
    this.stage.endMeasure();
    $('#tool_clear_measure').addClass('hidden');
  }

  /**
   * TODO
   * @param {*} hotkeysOn
   */
  setHotkeysOn(hotkeysOn) {
    this.hotkeysOn = hotkeysOn;
  }

  /**
   * TODO
   * @return {*}
   */
  getHotkeysOn() {
    return this.hotkeysOn;
  }
}

module.exports.UIController = UIController;
