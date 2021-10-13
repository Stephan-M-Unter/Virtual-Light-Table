'use strict';

const {Sidebar} = require('./Sidebar');
const {Stage} = require('./Stage');
const {AnnotationPopup} = require('./AnnotationPopup');
const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const {MeasurementTool} = require('./MeasurementTool');
const {Topbar} = require('./Topbar');
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
    /** @constant {Stage} */
    this.stage = new Stage(this, DOMElement);
    /** @constant {Sidebar} */
    this.sidebar = new Sidebar(this);
    /** @constant {Topbar} */
    this.topbar = new Topbar(this);
    /** @constant {AnnotationPopup} */
    this.annotationPopup = new AnnotationPopup(this);
    /** @constant {MeasurementTool} */
    this.measurementTool = new MeasurementTool(this, 'lighttable');
    /** @member {Boolean} */
    this.unsaved = {};
    /** @member {Boolean} */
    this.firstSave = true;
    /** @member {String} */
    this.editor = '';
    /** @member {'dark' | 'bright'} */
    this.lightMode = 'dark';
    /** @member {String} */
    this.darkBackground;
    /** @member {Object} */
    this.permissions = {};
    /** @member {String[]} */
    this.permissionList = ['move_fragment', 'move_scene', 'hotkeys'];
    this.resetPermissions();
    /** @member {String[]} */
    this.tables = [];
    /** @member {String} */
    this.activeTable = null;
    /** @member {Boolean} */
    this.devMode = true;
    /** @member {Boolean} */
    this.isLoading = false;

    this.sendToServer('server-new-session');
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
      if (this.devMode) console.log('DevMode: Sending ' + message + '; data:', data);
      ipcRenderer.send(message, data);
    } else {
      if (this.devMode) console.log('DevMode: Sending ' + message + '; no data.');
      ipcRenderer.send(message);
    }
  }

  /**
   *
   * @param {*} tableID ID of table, e.g. "table_1".
   * @param {*} hasUnsavedChanges TRUE if table has unsaved changes, FALSE otherwise.
   */
  setUnsavedState(tableID, hasUnsavedChanges) {
    this.unsaved[tableID] = hasUnsavedChanges;
    this.topbar.updateSavestates(this.unsaved);
  }

  /**
   * TODO
   * @param {Boolean} isQuicksave
   *    if TRUE, the VLT will try to overwrite the pre-existing file
   *    if FALSE, the VLT will automatically ask for a new savefile
   */
  save(isQuicksave) {
    const data = {};
    data.tableID = this.activeTable;
    data.screenshot = this.exportCanvas('png', true, true);
    data.quicksave = isQuicksave;

    this.topbar.updateScreenshot(this.activeTable, data.screenshot);

    if (isQuicksave && !this.firstSave && this.editor) {
      // not first quicksave, thus editor no longer needed
      this.sendToServer('server-save-file', data);
      this.setUnsavedState(this.activeTable, false);
    } else {
      if (this.editor) {
        data.editor = this.editor;
        this.sendToServer('server-save-file', data);
        this.setUnsavedState(this.activeTable, false);
        this.firstSave = false;
      } else {
        this.setPermission('hotkeys', false);
        dialogs.prompt('Please enter your name(s)/initials:', (editor) => {
          if (editor != '' && editor != null) {
            this.editor = editor;
            data.editor = editor;
            this.sendToServer('server-save-file', data);
            this.setUnsavedState(this.activeTable, false);
            this.firstSave = false;
          }
          this.setPermission('hotkeys', true);
        });
      }
    }
  }

  /**
   * Triggers load table procedure by sending request
   * to the server. Only proceeds if there have been no changes or user confirms.
   */
  loadTable() {
    if (!this.unsaved[this.activeTable]) {
      this.sendToServer('server-open-load', this.activeTable);
    } else if (this.confirmClearTable()) {
      this.sendToServer('server-open-load', this.activeTable);
    }
  }

  /**
   * Gathers table configuration from stage and sends save request to server.
   * @param {Boolean} skipDoStep - if TRUE, tell server to not register this save as a
   * "do step" which could be undone; if FALSE, make a do step.
   */
  saveToModel(skipDoStep) {
    const tableData = this.stage.getData();
    const data = {
      tableID: this.activeTable,
      tableData: tableData,
      skipDoStep: skipDoStep,
    };
    if (!skipDoStep) this.setUnsavedState(this.activeTable, true);
    this.sendToServer('server-save-to-model', data);
  }

  /**
   * Relay function. Resets a potentially active measurement process and requests empty table
   * from server. Only works if there are no currently unsaved changes or if user confirms.
   */
  clearTable() {
    if (!this.unsaved[this.activeTable]) {
      // this.clearMeasurements();
      this.sendToServer('server-clear-table', this.activeTable);
      this.setUnsavedState(this.activeTable, false);
      this.firstSave = true;
      this.resetPermissions();
    } else if (this.confirmClearTable()) {
      // this.clearMeasurements();
      this.sendToServer('server-clear-table', this.activeTable);
      this.setUnsavedState(this.activeTable, false);
      this.firstSave = true;
      this.resetPermissions();
    }
  }

  /**
   * Relay function. Passing the PPI value to the stage.
   * @param {double} ppi Value for pixels per inch given by the screen calibration.
   */
  setPPI(ppi) {
    this.stage.setPPI(ppi);
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
   * Check if the currently active table has any fragments or not.
   * @return {Boolean}
   */
  hasFragments() {
    const fragmentList = this.stage.getFragmentList();
    const numberFragments = Object.keys(fragmentList).length;
    if (numberFragments > 0) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * TODO
   * @param {String} [id] - ID of annotation, e.g. "a_0".
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
    if (Object.keys(this.stage.getSelectedList()).length > 0) {
      const confirmation = confirm('Do you really want to remove this ' +
          'fragment/these fragments from the light table? (the original ' +
          'files will not be deleted)');

      if (confirmation) {
        this.stage.deleteSelectedFragments();
        this.updateSidebarFragmentList();
      }
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
      this.updateSidebarFragmentList();
    }
  }

  /**
   * TODO
   * @param {*} fragmentData
   */
  addFragment(fragmentData) {
    this.stage._loadFragments({'upload': fragmentData});
    this.updateSidebarFragmentList();
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
   * Getter method for the active table ID.
   * @return {String} ID of active table, e.g. "table_1".
   */
  getActiveTable() {
    return this.activeTable;
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
    this.isLoading = true;
    this.activeTable = data.tableID;
    if (!this.tables.includes(this.activeTable)) {
      this.tables.push(this.activeTable);
      this.topbar.addTable(data.tableID, data.tableData);
    } else {
      this.topbar.updateTable(data.tableID, data.tableData);
    }
    if ('loading' in data.tableData) {
      this.firstSave = true;
    }
    this.topbar.setActiveTable(data.tableID);
    this.annotationPopup.loadAnnotations(data.tableData.annots);
    this.stage.loadScene(data.tableData);
    this.updateSidebarFragmentList();
  }

  /**
   *
   * @param {*} data
   */
  loadInactive(data) {
    if (!this.tables.includes(data.tableID)) {
      this.tables.push(data.tableID);
      this.topbar.addTable(data.tableID, data.tableData);
    } else {
      this.topbar.updateTable(data.tableID, data.tableData);
    }
  };

  /**
   * Relay function.
   * @param {Object} data
   */
  updateRedoUndo(data) {
    this.sidebar.updateRedoUndo(data);
  }

  /**
   * TODO
   * @param {Object} data
   */
  redoScene(data) {
    this.annotationPopup.loadAnnotations(data.annots);
    this.stage.redoScene(data);
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
    if (!this.measurementTool.isMeasuring()) {
      // STAGE
      const measurement = this.measurementTool.startMeasuring();
      const id = measurement.getID();
      const color = measurement.getColor();
      // SIDEBAR
      this.sidebar.addMeasurement(id, color);
    }
  }

  /**
   * TODO
   */
  endMeasurement() {
    const id = this.measurementTool.stopMeasuring();
    this.sidebar.deleteMeasurement(id);
  }

  /**
   * TODO
   * @param {*} id
   */
  deleteMeasurement(id) {
    // STAGE
    this.measurementTool.delete(id);
    // SIDEBAR
    this.sidebar.deleteMeasurement(id);
  }

  /**
   * TODO
   */
  clearMeasurements() {
    this.measurementTool.deleteAll();
    // SIDEBAR
    this.sidebar.clearMeasurements();
  }

  /**
   * TODO
   * @param {int} id
   */
  redoMeasurement(id) {
    // STAGE
    this.measurementTool.startMeasuring(id);
    // SIDEBAR
  }

  /**
   * TODO
   * @param {*} measurements
   */
  updateSidebarMeasurements(measurements) {
    this.sidebar.updateMeasurements(measurements);
  }

  /**
   * Triggers the update function of the Stage object and thus a complete redraw of the canvas.
   */
  update() {
    this.measurementTool.update();
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

  /**
   * Triggers when the user wants to change the upload settings for a particular fragment, e.g. replacing one or both images with
   * other versions, changing the masks or the ppi information. This only works if exactly one fragment is selected (because otherwise
   * it is unclear which fragment to change). The request together with the necessary fragment data will be sent to the server.
   */
  changeFragment() {
    const selectionList = this.stage.getSelectedList();
    if (Object.keys(selectionList).length == 1) {
      const fragmentID = Object.keys(selectionList)[0];
      const data = {
        tableID: this.activeTable,
        fragmentID: fragmentID,
      };
      this.sendToServer('server-change-fragment', data);
    }
  }

  /**
   * TODO
   */
  toggleLight() {
    if (this.lightMode == 'dark') {
      // current light_mode is "dark" => change to "bright"
      if (!this.darkBackground) this.darkBackground = $('body').css('background');
      $('body').css({backgroundColor: 'white'});
      $('#light_switch').addClass('button_active');
      $('#light_box').prop('checked', true);
      $('#zoom_slider').css('background-color', 'grey');
      this.lightMode = 'bright';
    } else {
      // current light_mode is "bright" => change to "dark"
      $('body').css({background: this.darkBackground});
      $('#light_switch').removeClass('button_active');
      $('#light_box').prop('checked', false);
      $('#zoom_slider').css('background-color', 'white');
      this.lightMode = 'dark';
    }
  }

  /**
   * TODO
   * @param {String} color
   * @param {Boolean} turnOn
   */
  previewBackground(color, turnOn) {
    if (!this.darkBackground && this.lightMode == 'dark') {
      this.darkBackground = $('body').css('background');
    }
    if (turnOn) {
      $('body').css({backgroundColor: color});
    } else {
      if (this.lightMode == 'dark') {
        $('body').css({background: this.darkBackground});
      } else {
        $('body').css({backgroundColor: 'white'});
      }
    }
  }

  /**
   * TODO
   */
  confirmAutosave() {
    const confirmMessage = 'A temporary save from your last '+
    'session is still available. Do you want to load it? '+
    'Otherwise, it will be removed permanently.';

    dialogs.confirm(confirmMessage, (confirmation) => {
      this.sendToServer('server-confirm-autosave', confirmation);
      if (confirmation) {
        this.closeTable(this.activeTable);
      }
    });
  }

  /**
   *
   */
  resetPermissions() {
    this.permissionList.forEach((permission) => {
      this.permissions[permission] = true;
    });
  }

  /**
   *
   * @param {'move_fragment'|'move_scene'|'hotkeys'} permissionHandle
   * @param {Boolean} permissionStatus
   * @return {[null]}
   */
  setPermission(permissionHandle, permissionStatus) {
    if (permissionHandle in this.permissions) {
      this.permissions[permissionHandle] = permissionStatus;
    } else {
      return null;
    }
  }

  /**
   *
   * @param {'move_fragment'|'move_scene'|'hotkeys'} permissionHandle
   * @return {Boolean|null}
   */
  getPermission(permissionHandle) {
    if (permissionHandle in this.permissions) {
      return this.permissions[permissionHandle];
    } else {
      return null;
    }
  }

  /**
   *
   */
  newTable() {
    if (!this.isLoading) {
      this.sendToServer('server-create-table');
    }
  }

  /**
   *
   * @param {*} tableID
   */
  closeTable(tableID) {
    if (!this.unsaved[tableID]) {
      this.sendToServer('server-close-table', tableID);
      this.topbar.removeTable(tableID);
    } else if (this.confirmClearTable()) {
      this.sendToServer('server-close-table', tableID);
      this.topbar.removeTable(tableID);
    }
  }

  /**
   *
   * @param {*} tableID
   */
  openTable(tableID) {
    if (!this.isLoading) {
      this.sendToServer('server-open-table', tableID);
    }
  }

  /**
   *
   */
  finishedLoading() {
    this.isLoading = false;
    const screenshot = this.stage.exportCanvas('png', true, true);
    const tableData = this.stage.getData();
    tableData.screenshot = screenshot;
    this.topbar.updateTable(this.activeTable, tableData);
    const data = {
      tableID: this.activeTable,
      screenshot: screenshot,
    };
    this.sendToServer('server-save-screenshot', data);
    this.topbar.finishedLoading(this.activeTable);
  }

  /**
   * TODO
   * @param {*} saveData
   */
  updateFilename(saveData) {
    this.topbar.updateFilename(saveData);
  }
}

module.exports.UIController = UIController;
