'use strict';

const {Sidebar} = require('./Sidebar');
const {Stage} = require('./Stage');
const {AnnotationPopup} = require('./AnnotationPopup');
const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const dialogs = new Dialogs();

/**
 *  The UI Controller is the controller instance for the whole view; it controls all individual
 *  view elements, e.g. the canvas stage or the sidebar, such that changes can be updated in all places
 *  accordingly. Mainly used for communicaton with the server process and for distribution of
 *  signals which are relevant for multiple view elements.
 */
class UIController {
  /**
   * When a new UIController instance is created, it automatically produces further control elements for various
   * UI sections, like the sidebar, the annotations window or the stage itself. This helps to keep methods to
   * the regions where they are actually needed.
   * @constructs
   * @param {String} DOMElement - ID reference of the HTML canvas object that will hold the stage representation.
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
   * @param {String} message - Control sequence according to
   *                      the server/client protocol.
   * @param {Object} [data] - Object containing the information needed
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
   * Asks the user to enter a name or initials, which will be sent to the server together with
   * a screenshot of the current table configuration. During the process, hotkeys are disabled
   * to avoid interferences between typing and the canvas actions. Data is only sent if a name is provided.
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
   * Triggers load table procedure by sending request
   * to the server. Only proceeds if there have been no changes or user confirms.
   */
  loadTable() {
    if (!this.hasUnsaved) {
      this.sendToServer('server-open-load');
    } else if (this.confirmClearTable()) {
      this.sendToServer('server-open-load');
    }
  }

  /**
   * Gathers table configuration from stage and sends save request to server.
   * @param {Object} data - Object containing all information about the stage
   *                   configuration and the fragments to be saved to the model.
   */
  saveToModel(data) {
    this.hasUnsaved = true;
    this.sendToServer('server-save-to-model', data);
  }

  /**
   * Relay function. Resets a potentially active measurement process and requests empty table
   * from server. Only works if there are no currently unsaved changes or if user confirms.
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
   * Input function. Asks user for confirmation that unsaved changes can be
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
   * @param {String} [id] - ID of annotation, e.g. "a_0".
   */
  sendAnnotation(id) {
    console.log("annotation id", id);
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
   * Notifies GUI elements that the fragment with a given ID needs to be displayed as selected.
   * @param {String} fragmentId - Fragment identifer, e.g. "f_0".
   */
  selectFragment(fragmentId) {
    this.stage.selectFragment(fragmentId);
    this.sidebar.selectFragment(fragmentId);
  }

  /**
   * Notifies GUI elements to deselect the fragment with given ID.
   * @param {String} fragmentId - Fragment identifier, e.g. "f_0".
   */
  deselectFragment(fragmentId) {
    this.stage.deselectFragment(fragmentId);
    this.sidebar.deselectFragment(fragmentId);
  }

  /**
   * Notifies GUI elements to deselect all fragments.
   */
  clearSelection() {
    this.stage.clearSelection();
    this.sidebar.clearSelection();
  }

  /**
   * Notifies GUI elements that a fragment with given ID is currently to be displayed as
   * being highlighted.
   * @param {String} fragmentId - Fragment identifier, e.g. "f_0".
   */
  highlightFragment(fragmentId) {
    this.stage.highlightFragment(fragmentId);
    this.sidebar.highlightFragment(fragmentId);
  }

  /**
   * Notifies GUI elements to remove the highlighting from a fragment with given ID.
   * @param {String} fragmentId - Fragment identifier, e.g. "f_0".
   */
  unhighlightFragment(fragmentId) {
    this.stage.unhighlightFragment(fragmentId);
    this.sidebar.unhighlightFragment(fragmentId);
  }

  /**
   * Gathers the current list of fragments on the table (fragmentList) and the list of
   * actively selected fragments (selectedList) from the stage and updates the sidebar accordingly.
   */
  updateSidebarFragmentList() {
    const fragmentList = this.stage.getFragmentList();
    const selectedList = this.stage.getSelectedList();
    this.sidebar.updateFragmentList(fragmentList, selectedList);
  }

  /**
   * Asks the user for confirmation that the selected fragments shall be deleted. If so, the
   * selected items are removed from the table and sidebar is updated. Does NOT notify the server about removal, this
   * is initialised by the stage object itself after removal.
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
   * Asks the user for confirmation to remove a specific fragment with given ID
   * from the table. If so, the task is relayed to the stage.
   * @param {String} id - Fragment identifier, e.g. "f_0".
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
   * Toggles the grid mode on the stage object to show or hide the background grid. The method call returns
   * the new status of the gridMode. Notifies the sidebar to toggle GUI elements accordingly.
   */
  toggleGridMode() {
    const gridMode = this.stage.toggleGridMode();
    // TODO Move to sidebar
    if (gridMode) {
      $('#grid_box').prop('checked', true);
    } else {
      $('#grid_box').prop('checked', false);
    }
  }

  /**
   * Toggles the scale mode on the stage object to show or hide the scale. The method call returns
   * the new status of the scaleMode. Notifies the sidebar to toggle GUI elements accordingly.
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
   * @private
   * Toggles the fibre mode on the stage object to show or hide the fibre orientation. The method call returns
   * the new status of the fibreMode. Notifies the sidebar to toggle GUI elements accordingly.
   * Not yet implemented.
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
   * Updates the whole table with a new scaling value, i.e.
   * both the stage itself (with the fragments to rescale and move) and
   * the zoom slider which should always show the acurate scaling factor.
   * Only allows for a scaling between (const scaleMin) and (const scaleMax).
   *
   * @param {double} scalingValue Value for new scaling ratio; this value
   * is the ratio * 100, e.g. not 1.0 but 100.
   * @param {double} scaleX - x position of scaling center if not window center.
   * @param {double} scaleY - y position of scaling center if not window center.
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
   * Relays resizing request to the stage object.
   * @param {double} width - New width value for canvas.
   * @param {double} height - New height value for canvas.
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
    this.updateSidebarFragmentList();
  }

  /**
   * Requests stage to perform a transformation such that the fragment with given id is centered in
   * the viewport.
   * @param {String} id - Fragment identifier, e.g. "f_0".
   */
  centerToFragment(id) {
    const stageC = this.stage.getCenter();
    const fragmentC = this.stage.getFragmentList()[id].getPosition();

    const deltaX = stageC.x - fragmentC.x;
    const deltaY = stageC.y - fragmentC.y;

    this.stage.moveStage(deltaX, deltaY);
  }

  /**
   * Triggers the display of a colored popup overlay to inform the user about something.
   * @param {String} titleText - Text to be displayed as title of the feedback box.
   * @param {String} descText - Text to be displayed as description
   * of the feedback box.
   * @param {String} [color] - Color of the feedback box. If no color is given, the
   * box will be rendered in white.
   * @param {Int} [duration] - Display duration of the message in milliseconds. If no duration
   * is given, the duration is adjusted to the total length of the message, with a minimum of 2000ms.
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
   * Comfort function to make the reset to a scale of 100 easier.
   */
  resetZoom() {
    this.setScaling(100);
  }

  /**
   * Relays the request for a table screenshot to the stage object.
   * @param {'jpg'|'png'|'tiff'} fileFormat - String indicating the extension of the desired screenshot format.
   * @param {Boolean} full - If true, the whole table configuration will be scaled to fit the screen before taking the
   * screenshot. If false, only the currently visible area will be screenshotted.
   * @param {Boolean} thumb - If true, the screenshot result will not be downloadable but be returned as return value.
   * @return {null | ImageFile} If thumb == true, then the return value will be the resulting image file. If thumb == false, the return
   * value will be null.
   */
  exportCanvas(fileFormat, full, thumb) {
    return this.stage.exportCanvas(fileFormat, full, thumb);
  }

  // Getter Methods

  /**
   * Returns the currently active Stage object.
   * @return {Stage}
   */
  getStage() {
    return this.stage;
  }

  /**
   * Returns the currently active Sidebar object.
   * @return {Sidebar}
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
   */
  endMeasurement() {
    this.stage.endMeasurement();
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
   * Sets a flag that disables specific hotkeys that might interfere with the input of custom text.
   */
  disableHotkeys() {
    this.hotkeysOn = false;
  }

  /**
   * Returns the current state of hotkey activation.
   * @return {Boolean} True: all hotkeys are available; false: hotkeys that might interfere with custom text input are disabled.
   */
  getHotkeysOn() {
    return this.hotkeysOn;
  }

  /**
   * Triggers the update function of the Stage object and thus a complete redraw of the canvas.
   */
  update() {
    this.stage.update();
  }

  /**
   * Requests the Stage object to flip all fragments on stage according to the horizontal or vertical mirror axis.
   * @param {Boolean} horizontal - if true, all fragments are flipped along the horizontal mirror axis. If false, all fragments
   * are flipped along the vertical mirror axis.
   */
  flipTable(horizontal) {
    this.stage.flipTable(horizontal);
  }

  /**
   * Requests the Stage object to display the mirror axis for a specific table flip action.
   * @param {Boolean} horizontal - if true, horizontal mirror axis is shown. If false, vertical mirror axis is shown.
   */
  showFlipLine(horizontal) {
    this.stage.showFlipLine(horizontal);
  }

  /**
   * Requests the Stage object to hide all mirror axes.
   */
  hideFlipLines() {
    this.stage.hideFlipLines();
  }

  /**
   * Requests the Stage object to transform the scene such that all fragments are visible in the viewport.
   */
  fitToScreen() {
    this.stage.fitToScreen();
  }

  /**
   * Checks the flag for the whole client whether dev mode is activated
   * or not
   * @return {Boolean} If True, dev_mode is activated and development related functions and outputs
   * should be activated. If false, dev_mode is deactivated and these outputs should be hidden.
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
