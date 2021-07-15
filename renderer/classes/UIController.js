'use strict';

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
const Dialogs = require('dialogs');
const dialogs = new Dialogs();

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
    this.hasUnsaved = false;

    this.devMode = false;
  }

  /**
   * Communication method for sending messages back to the server.
   * @param {*} message - Control sequence according to
   *                      the server/client protocol.
   * @param {*} data - Object containing the information needed
   *                   by the server to proceed with the given action.
   */
  sendToServer(message, data) {
    if (data) {
      if (this.devMode) console.log('Sending ' + message + '; data:', data);
      ipcRenderer.send(message, data);
    } else {
      if (this.devMode) console.log('Sending ' + message + '; no data.');
      ipcRenderer.send(message);
    }
  }

  /**
   * Input function. When triggered, the user is asked to enter a name or initials. This
   * data will be sent to the server together with a screenshot. During the process, hotkeys
   * are disabled to avoid interferences between typing and the canvas actions. Data is only
   * sent if a name is provided.
   */
  saveTable() {
    this.disableHotkeys();
    dialogs.prompt('Please enter your name(s)/initials:', (editor) => {
      if (editor != '' && editor != null) {
        const screenshot = this.exportCanvas('png', true, true);
        const data = {
          'editor': editor,
          'screenshot': screenshot,
        };
        this.sendToServer('server-save-file', data);
        this.hasUnsaved = false;
      }
      this.enableHotkeys();
    });
  }

  /**
   * Relay function - triggering load table procedure. Only proceed if there
   * have been no changes or user confirms.
   */
  loadTable() {
    if (!this.hasUnsaved) {
      this.sendToServer('server-open-load');
    } else if (this.confirmClearTable()) {
      this.sendToServer('server-open-load');
    }
  }

  /**
   * Relay function - saving table to model.
   * @param {Object} data - Object containing all information about the stage
   *                   configuration and the fragments to be saved to the model.
   */
  saveToModel(data) {
    this.hasUnsaved = true;
    this.sendToServer('server-save-to-model', data);
  }

  /**
   * Relay function - clear table if no unsaved changes or user confirms.
   */
  clearTable() {
    if (!this.hasUnsaved) {
      this.clearMeasurements();
      this.sendToServer('server-clear-table');
      this.hasUnsaved = false;
    } else if (this.confirmClearTable()) {
      this.clearMeasurements();
      this.sendToServer('server-clear-table');
      this.hasUnsaved = false;
    }
  }

  /**
   * Input function - asks user for clarification that unsaved changes can be
   * overwritten.
   * @return {Boolean} True if changes can be overwritten, false otherwise.
   */
  confirmClearTable() {
    const confirmation = confirm('You still have unsaved changes '+
    'on your table. Are you sure you want to proceed?');
    return confirmation;
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
   * Selects fragment with given ID in all responsible UI elements.
   * @param {String} fragmentId
   */
  selectFragment(fragmentId) {
    this.stage.selectFragment(fragmentId);
    this.sidebar.selectFragment(fragmentId);
  }

  /**
   * Deselects fragment with given ID in all responsible UI elements.
   * @param {String} fragmentId
   */
  deselectFragment(fragmentId) {
    this.stage.deselectFragment(fragmentId);
    this.sidebar.deselectFragment(fragmentId);
  }

  /**
   * Removes all fragment selections in all responsible UI elements.
   */
  clearSelection() {
    this.stage.clearSelection();
    this.sidebar.clearSelection();
  }

  /**
   * Notifies all responsible UI elements that a fragment with given ID is currently
   * being highlighted.
   * @param {String} fragmentId
   */
  highlightFragment(fragmentId) {
    this.stage.highlightFragment(fragmentId);
    this.sidebar.highlightFragment(fragmentId);
  }

  /**
   * Notifies all responsible UI elements that a fragment with a given ID has stopped being
   * highlighted.
   * @param {String} fragmentId
   */
  unhighlightFragment(fragmentId) {
    this.stage.unhighlightFragment(fragmentId);
    this.sidebar.unhighlightFragment(fragmentId);
  }

  /**
   * Gathers the current list of fragments on the table (fragmentList) and the list of
   * actively selected fragments (selectedList) from the stage and updates the sidebar accordingly.
   */
  updateFragmentList() {
    const fragmentList = this.stage.getFragmentList();
    const selectedList = this.stage.getSelectedList();
    this.sidebar.updateFragmentList(fragmentList, selectedList);
  }

  /**
   * Input method - Asks the user for confirmation that the selected fragments shall be deleted. If so, the
   * selected items are removed from the table and sidebar is updated. Does NOT notify the server about removal, this has
   * to happen in stage object after changes.
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
   * Input method - Asks the user for confirmation to remove a specific fragment with given ID
   * from the table. If so, the task is relayed to the stage.
   * @param {String} id
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
   * Only allows for a scaling between (const scaleMin) and (const scaleMax).
   *
   * @param {*} scalingValue Value for new scaling ratio; this value
   * is the ratio * 100, e.g. not 1.0 but 100.
   * @param {*} scaleX x position of scaling center if not window center.
   * @param {*} scaleY y position of scaling center if not window center.
   */
  setScaling(scalingValue, scaleX, scaleY) {
    const scaleMin = 10;
    const scaleMax = 300;

    if (scalingValue < scaleMin) {
      scalingValue = scaleMin;
    } else if (scalingValue > scaleMax) {
      scalingValue = scaleMax;
    }

    this.stage.setScaling(scalingValue, scaleX, scaleY);
    $('#zoom_slider').val(scalingValue);
    $('#zoom_factor').text('x'+Math.round((scalingValue/100)*100)/100);
  }

  /**
   * TODO
   * @return {*}
   */
  getScaling() {
    return this.stage.getScaling();
  }

  /**
   * TODO
   * @param {*} width
   * @param {*} height
   */
  resizeCanvas(width, height) {
    this.stage.resizeCanvas(width, height);
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
   */
  resetZoom() {
    this.setScaling(100);
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
  addMeasurement() {
    // only add new measurement if not already in measure mode
    if (!this.stage.hasMeasureMode()) {
      // STAGE
      const newId = this.stage.getNewMeasurementID();
      this.stage.startMeasurement(newId);
      // SIDEBAR
      const color = this.stage.getMeasureColor(newId);
      this.sidebar.addMeasurement(newId, color);
    }
  }

  /**
   * TODO
   * @param {*} id
   */
  deleteMeasurement(id) {
    // STAGE
    this.stage.deleteMeasurement(id);
    // SIDEBAR
    this.sidebar.deleteMeasurement(id);
  }

  /**
   * TODO
   */
  clearMeasurements() {
    this.stage.clearMeasurements();
    // SIDEBAR
    this.sidebar.clearMeasurements();
  }

  /**
   * TODO
   * @param {int} id
   */
  redoMeasurement(id) {
    // STAGE
    this.stage.startMeasurement(id);
    // SIDEBAR
  }

  /**
   * TODO
   * @param {*} measurements
   */
  updateMeasurements(measurements) {
    this.sidebar.updateMeasurements(measurements);
  }

  /**
   * Functionality of certain hotkeys is provided. (note: "certain"
   * means that there are hotkeys which cannot break the overall functioning
   * of the application in any state; they will still work)
   */
  enableHotkeys() {
    this.hotkeysOn = true;
  }

  /**
   * Functionality of certain hotkeys is not provided anymore.
   */
  disableHotkeys() {
    this.hotkeysOn = false;
  }

  /**
   * TODO
   * @return {*}
   */
  getHotkeysOn() {
    return this.hotkeysOn;
  }

  /**
   * TODO
   */
  update() {
    this.stage.update();
  }

  /**
   * TODO
   * @param {*} horizontal
   */
  flipTable(horizontal) {
    this.stage.flipTable(horizontal);
  }

  /**
   * TODO
   * @param {*} horizontal
   */
  showFlipLine(horizontal) {
    this.stage.showFlipLine(horizontal);
  }

  /**
   * TODO
   */
  hideFlipLines() {
    this.stage.hideFlipLines();
  }

  /**
   * Relay function.
   */
  fitToScreen() {
    this.stage.fitToScreen();
  }

  /**
   * Provides a flag for the whole client whether dev mode is activated
   * or not. Changing the boolean flag on top of the file will activate
   * or deactivate all dev_mode related functions.
   * @return {Boolean}
   */
  isDevMode() {
    return this.devMode;
  }

  /**
   * Toggles dev_mode flag.
   */
  toggleDevMode() {
    this.devMode = !this.devMode;
    if (this.devMode) console.log('Dev_Mode activated. Deactivate with [CTRL+ALT+D].');
    else console.log('Dev_Mode deactivated.');
  }
}

module.exports.UIController = UIController;
