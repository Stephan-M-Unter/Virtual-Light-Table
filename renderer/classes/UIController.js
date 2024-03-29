'use strict';

const {Sidebar} = require('./Sidebar');
const {Rulers} = require('./Rulers');
const {Stage} = require('./Stage');
const {AnnotationPopup} = require('./AnnotationPopup');
const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const {MeasurementTool} = require('./MeasurementTool');
const {Topbar} = require('./Topbar');
const { ContextMenu } = require('./ContextMenu');
const LOGGER = require('../../statics/LOGGER');
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
    this.rulers = new Rulers(this);
    this.contextmenu = new ContextMenu(this);
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
    this.darkBackground = null;
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
    this.pinningMode = false;

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
    LOGGER.send('UIController', message, data);
    ipcRenderer.send(message, data);
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

  startLoading(tableID) {
    if (this.activeTable == tableID) {
      $('#overlay').removeClass('hidden');
    }
    this.topbar.startLoading(tableID);
  }

  stopLoading() {
    $('#overlay').addClass('hidden');
    $('#progress-name').addClass('hidden');
    $('#progress-status').addClass('hidden');
    $('#progress-wrapper').addClass('hidden');
    this.topbar.stopLoading(this.activeTable);
  }

  openUpload() {
    this.sendToServer('server-open-upload', this.getActiveTable());
  }

  openExport() {
    this.sendToServer('server-open-export');
  }

  /**
   * TODO
   * @param {Boolean} isQuicksave
   *    if TRUE, the VLT will try to overwrite the pre-existing file
   *    if FALSE, the VLT will automatically ask for a new savefile
   */
  save(isQuicksave) {
    this.saveToModel(true);
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
    this.sendToServer('server-open-load', this.activeTable);
  }

  /**
   * Gathers table configuration from stage and sends save request to server.
   * @param {Boolean} skipDoStep - if TRUE, tell server to not register this save as a
   * "do step" which could be undone; if FALSE, make a do step.
   */
  saveToModel(skipDoStep) {
    const tableData = this.stage.getData();
    tableData['annots'] = this.annotationPopup.getData();
    const data = {
      tableID: this.activeTable,
      tableData: tableData,
      skipDoStep: skipDoStep,
    };
    if (!skipDoStep) this.setUnsavedState(this.activeTable, true);
    if (Object.keys(this.stage.getFragmentList()).length === 0) {
      this.sidebar.enableExport(false);
    }
    this.sendToServer('server-save-to-model', data);
  }

  /**
   * Relay function. Resets a potentially active measurement process and requests empty table
   * from server. Only works if there are no currently unsaved changes or if user confirms.
   */
  clearTable() {
    if (!this.unsaved[this.activeTable] || this.confirmClearTable()) {
      this.sendToServer('server-clear-table', this.activeTable);
      this.setUnsavedState(this.activeTable, false);
      this.firstSave = true;
      this.resetPermissions();
    }
  }

  panScene(dX, dY) {
    this.updateRulers();
    this.stage.updateWorkarea();
    this.stage.moveStage(dX, dY);
  }

  /**
   * Relay function. Passing the PPI value to the stage.
   * @param {double} ppi Value for pixels per inch given by the screen calibration.
   */
  setPPI(ppi) {
    this.stage.setPPI(ppi);
  }

  setZoom(minZoom, maxZoom, stepZoom) {
    this.stage.setZoom(minZoom, maxZoom, stepZoom);
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
    this.annotationPopup.write(id);
  }

  cancelAnnotation() {
    this.annotationPopup.cancel();
  }

  /**
   * TODO
   */
  toggleAnnotSubmitButton() {
    this.annotationPopup.check();
  }

  /**
   * Notifies GUI elements that the fragment with a given ID needs to be displayed as selected.
   * @param {String} fragmentId - Fragment identifer, e.g. "f_0".
   */
  selectFragment(fragmentId) {
    this.stage.selectFragment(fragmentId);
    this.sidebar.selectFragment(fragmentId);
  }

  selectAll() {
    const fragmentList = this.stage.getFragmentList();
    for (const fID of Object.keys(fragmentList)) {
      this.selectFragment(fID);
    }
  }

  /**
   * Notifies GUI elements to deselect the fragment with given ID.
   * @param {String} fragmentId - Fragment identifier, e.g. "f_0".
   */
  deselectFragment(fragmentId) {
    this.stage.deselectFragment(fragmentId);
    this.sidebar.deselectFragment(fragmentId);
  }

  toggleSelect(fragmentId) {
    if (this.stage.fragmentIsSelected(fragmentId)) {
      this.deselectFragment(fragmentId);
    } else {
      this.selectFragment(fragmentId);
    }
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
    const objectList = this.stage.getFragmentList();
    const selectedList = this.stage.getSelectedList();
    const objectOrder = this.stage.getObjectOrder();
    this.sidebar.updateFragmentList(objectList, selectedList, objectOrder);
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
    if (fragmentData.id == null) {
      this.stage._loadFragments({'upload': fragmentData});
    } else {
      this.stage._loadFragments({'edit': fragmentData});
    }
    this.updateSidebarFragmentList();
    $('.arrow.down').removeClass('down');
    $('.expanded').removeClass('expanded');
    // second, rotate arrow down and expand clicked segment
    $('#fragment_list').find('.arrow').addClass('down');
    $('#fragment_list').addClass('expanded');
    this.sidebar.enableExport(true);
  }

  /**
   * Toggles the grid mode on the stage object to show or hide the background grid. The method call returns
   * the new status of the gridMode. Notifies the sidebar to toggle GUI elements accordingly.
   */
  toggleGridMode() {
    const gridMode = this.stage.toggleGridMode();
    // TODO Move to sidebar
    if (gridMode) {
      $('#grid-wrapper').addClass('button_active');
    } else {
      $('#grid-wrapper').removeClass('button_active');
    }
  }

  toggleRulerMode() {
    const rulerMode = !$('#ruler-wrapper').hasClass('button_active');
    
    if (rulerMode) {
      $('#ruler-wrapper').addClass('button_active');
      $('#table_button_wrapper').addClass('up');
      $('#rulers').removeClass('hidden');
      this.updateRulers();
    } else {
      $('#ruler-wrapper').removeClass('button_active');
      $('#table_button_wrapper').removeClass('up');
      $('#rulers').addClass('hidden');
    }
  }
  
  updateRulers(event) {
    const rulerMode = $('#ruler-wrapper').hasClass('button_active');
    if (rulerMode) {
      const ppi = this.stage.getPPI();
      const offset = this.stage.getOffset();
      const scale = this.stage.getScaling() / 100;
      const bounds = this.stage.getMBR();
      const area = this.stage.getArea();
      this.rulers.updateRulers(ppi, scale, offset, bounds, area, event);
    }
  }

  clearWorkarea() {
    $('#workarea-width').val('');
    $('#workarea-height').val('');
    this.updateWorkarea();
  }

  updateWorkarea() {
    let valid = true;
    const w = $('#workarea-width').val();
    const h = $('#workarea-height').val();

    // show "clear area" button if at least one field is filled
    if ((w && w != '') || (h && h != '')) {
      $('#workarea_clear').removeClass('hidden');
    } else {
      $('#workarea_clear').addClass('hidden');
    }

    // mark width field with error if input is invalid, i.e. no number
    if (!Number(w) && w != '') {
      $('#workarea-width').addClass('error');
      valid = false;
    } else {
      $('#workarea-width').removeClass('error');
    }
    // mark height field with error if input is invalid, i.e. no number
    if (!Number(h) && h != '') {
      $('#workarea-height').addClass('error');
      valid = false;
    } else {
      $('#workarea-height').removeClass('error');
    }
    
    // mark width field with error if input is smaller than 0
    if (w < 0) {
      valid = false;
      $('#workarea-width').addClass('error');
    }
    // mark height field with error if input is smaller than 0
    if (h < 0) {
      valid = false;
      $('#workarea-height').addClass('error');
    }

    // don't accept area input if either width or height or both are empty/null
    if (!w || w == ''|| !h || h == '') {
      valid = false;
    }

    if (valid) {
      this.stage.updateWorkarea(parseFloat(w), parseFloat(h));
    } else {
      this.stage.updateWorkarea(0,0);
    }
    this.updateRulers();
    this.saveToModel(true);
  }
  
  showContextMenu(event, context, id) {
    const x = event.screenX;
    const y = event.screenY;
    this.contextmenu.load(x, y, context, id);
  }
  
  hideContextMenu() {
    this.contextmenu.hide();
  }

  /**
   * Toggles the scale mode on the stage object to show or hide the scale. The method call returns
   * the new status of the scaleMode. Notifies the sidebar to toggle GUI elements accordingly.
   */
  toggleScaleMode() {
    const scaleMode = this.stage.toggleScaleMode();
    if (scaleMode) {
      $('#scale-wrapper').addClass('button_active');
    } else {
      $('#scale-wrapper').removeClass('button_active');
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

  toggleColorInversion(color) {
    this.sidebar.toggleColorInversion(color);
    this.sendGraphicsFilterToServer();
  }

  resetGraphicsFilters() {
    this.sidebar.resetGraphicsFilters();
    this.sendToServer('server-reset-graphics-filter', this.activeTable);
  }

  sendGraphicsFilterToServer() {
    const filters = {
      // 'brightness': $('#graphics-brightness').val(),
      // 'contrast': $('#graphics-contrast').val(),
      'invertR': $('.flip-button.R').hasClass('inverted'),
      'invertG': $('.flip-button.G').hasClass('inverted'),
      'invertB': $('.flip-button.B').hasClass('inverted'),
      'blackwhite': $('#graphics-bw').hasClass('inverted'),
    };

    // get all sliders of class .graphics-slider and add their values to the filters object
    // the keyword is stored as data-attribute, the value is the value of the slider
    $('.graphics-slider').each(function() {
      const keyword = $(this).attr('data');
      const value = $(this).val();
      filters[keyword] = value;
    });

    const data = {
      tableID: this.activeTable,
      urls: this.stage.getActiveFragmentUrls(),
      filters: filters,
    }
   
    this.sendToServer('server-graphics-filter-from-client', data);
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
    const scaleMin = $('#zoom_slider').attr('min');
    const scaleMax = $('#zoom_slider').attr('max');

    scalingValue = Math.max(scalingValue, scaleMin);
    scalingValue = Math.min(scalingValue, scaleMax);

    this.stage.setScaling(scalingValue, scaleX, scaleY);
    $('#zoom_slider').val(scalingValue);
    $('#zoom_factor').text('x'+Math.round((scalingValue/100)*100)/100);
  }

  moveMeasurements(dX, dY) {
    this.measurementTool.panMeasurements(dX, dY);
  }

  scaleMeasurements() {
    this.measurementTool.scaleMeasurements();
  }

  setMeasurementColor(id, color) {
    this.measurementTool.setColor(id, color);
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
    this.stage.loadScene(data.tableData);
    this.annotationPopup.load(data.tableData.annots);
    this.updateSidebarFragmentList();
    this.updateRulers();

    if ('area' in data.tableData.stage) {
      const w = data.tableData.stage.area.w;
      const h = data.tableData.stage.area.h;
      this.sidebar.updateWorkAreaFields(w, h);
    }

    let graphicFilters = null;
    if ('graphicFilters' in data.tableData) graphicFilters = data.tableData.graphicFilters;
    this.sidebar.updateGraphicFilters(graphicFilters);

    if (Object.keys(data.tableData.fragments).length > 0) {
      this.sidebar.enableExport(true);
    } else {
      this.sidebar.enableExport(false);
    }
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
    this.annotationPopup.load(data.annots);
    this.stage.redoScene(data);
    this.updateWorkarea();
    this.updateSidebarFragmentList();
  }

  updateDisplayOrder(orderedIDList) {
    this.stage.updateDisplayOrder(orderedIDList);
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

  centerToOrigin() {
    const stageC = this.stage.getCenter();
    const offset = this.stage.getOffset();
    const dx = stageC.x - offset.x;
    const dy = stageC.y - offset.y;
    this.stage.moveStage(dx, dy);
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

  toggleLock(fragmentID) {
    const lockStatus = this.stage.toggleLock(fragmentID);
    this.sidebar.setLock(fragmentID, lockStatus);
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

  resetPosition(fragmentID) {
    const offset = this.stage.getOffset();
    this.stage.moveFragmentTo(fragmentID, offset.x, offset.y);
  }

  resetRotation(fragmentID) {
    this.stage.rotateFragmentTo(fragmentID, 0);
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

  flipFragment(id) {
    this.stage.flipFragment(id);
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
    if (this.devMode) LOGGER.log('MAIN VIEW', 'Dev_Mode activated. Deactivate with [CTRL+ALT+D].');
    else LOGGER.log('MAIN VIEW', 'Dev_Mode deactivated.');
  }

  inspect(id) {
    if (id.indexOf('f_') != -1) {
      LOGGER.log('MAIN VIEW', this.stage.getFragment(id));
    }
  }

  /**
   * Triggers when the user wants to change the upload settings for a particular fragment, e.g. replacing one or both images with
   * other versions, changing the masks or the ppi information. This only works if exactly one fragment is selected (because otherwise
   * it is unclear which fragment to change). The request together with the necessary fragment data will be sent to the server.
   */
  changeFragment(id) {
    if (id) {
      const data = {
        tableID: this.activeTable,
        fragmentID: id,
      }
      this.sendToServer('server-change-fragment', data);
    } else {
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
      $('#light-wrapper').addClass('button_active');
      $('#zoom_slider').css('background-color', 'grey');
      this.lightMode = 'bright';
    } else {
      // current light_mode is "bright" => change to "dark"
      $('body').css({background: this.darkBackground});
      $('#light_switch').removeClass('button_active');
      $('#light-wrapper').removeClass('button_active');
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

  togglePermission(permissionHandle) {
    if (permissionHandle in this.permissions) {
      this.permissions[permissionHandle] = !this.permissions[permissionHandle];
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
    if (!this.unsaved[tableID] || this.confirmClearTable()) {
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

  toggleHiddenAnnotations() {
    this.annotationPopup.toggleHidden();
  }

  handleESC() {
    this.clearSelection();
    this.endMeasurement();
    if (this.pinningMode) {
      this.annotationPopup.cancel();
      this.endPinning();
    } else if (this.annotationPopup.hasFormOpen()) {
      this.annotationPopup.cancel();
    }
    else this.closeAnnotationPopup();
  }

  toggleAnnotationPopup(event) {
    this.togglePermission('hotkeys');
    this.annotationPopup.toggle(event);
  }

  openAnnotationPopup(event) {
    this.setPermission('hotkeys', false);
    this.annotationPopup.open(event);
  }

  closeAnnotationPopup(event) {
      this.setPermission('hotkeys', true);
      this.annotationPopup.close(event);
  }

  deactivateAnnotations() {
    this.annotationPopup.deactivatePins();
  }

  startPinning(event) {
    this.pinningMode = true;
    this.closeAnnotationPopup(event);
    this.annotationPopup.newPin();
    this.updateCursor(event);
    $('#lighttable').on('mousemove', (event) => {
      this.updateCursor(event);
    });
    $('#lighttable').on('click', (event) => {
      this.setPin(event);
    });
  }

  setPin(event) {
    this.endPinning();
    const targets = this.stage.getObjectsUnderPoint(event.screenX, event.screenY);
    const target = {
      type: 'stage',
      id: 'stage',
      object: null,
    };
    for (const element of targets) {
      if (element.name.indexOf('Fragment') != -1) {
        target.type = 'fragment';
        target.id = element.id;
      }
    }
    this.annotationPopup.setPin(target);
  }

  removePin() {
    this.annotationPopup.unpin();
  }

  endPinning() {
    this.pinningMode = false;
    $('#lighttable').off('mousemove');
    $('#lighttable').off('click');
    const pin = this.annotationPopup.getPin();
    if (pin) {
      const pinData = pin.getData();
      this.openAnnotationPopup({screenX: pinData.pos.x, screenY: pinData.pos.y});
    } else {
      this.openAnnotationPopup(); 
    }
  }

  openAnnotationForm() {
    this.annotationPopup.openForm();
  }

  updateCursor(event) {
    if (this.pinningMode) {
      this.annotationPopup.getPin().moveTo(event.screenX, event.screenY);
    }
  }
}

module.exports.UIController = UIController;
