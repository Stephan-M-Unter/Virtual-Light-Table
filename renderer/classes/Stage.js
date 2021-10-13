'use strict';

const {Fragment} = require('./Fragment');
const {Scaler} = require('./Scaler');
const {Util} = require('./Util');

/**
 * This class represents the stage/canvas of the Virtual Light Table. It holds references to the elements
 * shown on the table, and provides methods for interaction with and display of items.
 */
class Stage {
  /**
     * @constructs
     * Stage Constructor. Creates a new stage from scratch and
     * sets sets default values for necessary settings. Default hereby means: values that create an
     * empty stage without any fragments loaded.
     *
     * @param {UIController} controller Instance of the UIController class
     * which is reponsible for the communication between application
     * components. Usually, this controller is also the instance creating this
     * Stage object.
     * @param {String} DOMelement ID of the HTML canvas element the
     * new stage will set upon.
     */
  constructor(controller, DOMelement) {
    /** @constant {UIController} */
    this.controller = controller;
    /** @constant {Stage} */
    this.stage = new createjs.Stage(DOMelement);

    this.stage.canvas.width = this.width = window.innerWidth;
    this.stage.canvas.height = this.height = window.innerHeight;
    this.stage.enableMouseOver();
    createjs.Touch.enable(this.stage);

    /** @constant {Object} */
    this.fragmentList = {};
    /** @constant {Object} */
    this.selectedList = {};
    /** @member {Int} */
    this.fragmentLabel = 0;

    /** @member {double} */
    this.stage.scaling = 100;

    /** @member {double} */
    this.ppi = 96;

    /** @constant {Object} */
    this.lines = {
      'horizontal': null,
      'vertical': null,
    };

    // adding display elements
    /** @member {createjs.Container} */
    this.background = new createjs.Container();
    this.addToBackground(this._createBackground(), 0);
    this.stage.addChildAt(this.background, 0);
    /** @member {createjs.Container} */
    this.overlay = new createjs.Container();
    this.overlay.name = 'Overlay Container';
    this.stage.addChild(this.overlay);
    // Grid
    /** @member {Boolean} */
    this.gridMode = false;
    /** @member {createjs.Container} */
    this.grid = new createjs.Container();
    this.addToBackground(this.grid);
    // Scale
    /** @member {Boolean} */
    this.scaleMode = false;
    /** @member {createjs.Container} */
    this.scale = new createjs.Container();
    this.addToOverlay(this.scale, 0);

    /** @constant {Selector} */
    this.selector = new Selector(this.controller);

    /** @constant {createjs.LoadQueue} */
    this.loadqueue = new createjs.LoadQueue();
    this.loadqueue.addEventListener('fileload', (event) => {
      this._createFragment(event);
    });
    this.loadqueue.on('complete', () => {
      this.controller.finishedLoading();
      this.fitToScreen();
      this.update();
      this.controller.saveToModel(true);
    });

    this.controller.sendToServer('server-gather-ppi');
  }

  /**
   * @private
   * Creates nearly invisible background element necessary for
   * mouse interactions. In order to register mouse events, the
   * background is set to a minimal transparency.
   * @return {createjs.Shape} Returns the background shape object.
   */
  _createBackground() {
    const background = new createjs.Shape();
    background.graphics.beginFill('#333333')
        .drawRect(0, 0, this.width, this.height);
    background.alpha = 0.01;
    background.name = 'background';

    // Interactions on Background
    background.on('mousedown', (event) => {
      this.controller.clearSelection();
      this.update();
      this.mouseClickStart = {x: event.stageX, y: event.stageY};
    });
    background.on('pressmove', (event) => {
      this._panScene(event);
    });

    return background;
  }

  /**
   * Updates all GUI elements regarding measurements to the new PPI ratio.
   * @param {double} ppi PPI ratio given by the calibration tool.
   */
  setPPI(ppi) {
    this.ppi = ppi;
    this.updateGrid();
    this.updateScale();
    this.setScaling(this.stage.scaling);
    this.controller.update();
  }

  /**
   * Returns current PPI ratio on the stage.
   * @return {double}
   */
  getPPI() {
    return this.ppi;
  }

  /**
   *
   * @param {*} node
   * @param {*} pos
   */
  addToOverlay(node, pos) {
    if (pos) {
      this.overlay.addChildAt(node, pos);
    } else {
      this.overlay.addChild(node);
    }
  }

  /**
   *
   * @param {*} node
   */
  addBeforeOverlay(node) {
    const overlayIndex = this.stage.getChildIndex(this.overlay);
    this.stage.addChildAt(node, overlayIndex);
  }

  /**
   *
   * @param {*} node
   */
  removeFromOverlay(node) {
    this.overlay.removeChild(node);
  }

  /**
   *
   * @param {*} node
   * @param {*} pos
   */
  addToBackground(node, pos) {
    if (pos) {
      this.background.addChildAt(node, 0);
    } else {
      this.background.addChild(node);
    }
  }

  /**
   *
   * @param {*} node
   */
  removeFromBackground(node) {
    this.background.removeChild(node);
  }

  /**
   *
   * @param {*} node
   */
  addAfterBackground(node) {
    this.stage.addChildAt(node, 1);
  }

  /**
   * If this.gridMode == true, this function creates new grid lines indicating the current scaling of the stage.
   * This grid size is based on the stage's scaling (which can be gathered via this.stage.scaling) and the constant
   * resolution of the canvas object, where a factor of 38 seems appropriate to mimic the real world size relations.
   * If this.gridMode == false, the grid will just be emptied, but not refilled with a new grid.
   * NOTE: This function does NOT update the stage.
   */
  updateGrid() {
    this.grid.removeAllChildren();

    if (this.gridMode) {
      const CmInPx = (this.ppi/2.54) * this.stage.scaling / 100;

      for (let i = 0; i < this.width; i += CmInPx) {
        const line = new createjs.Shape();
        line.graphics.setStrokeStyle(1).beginStroke('rgba(0,0,0,0.4)');
        line.graphics.moveTo(i, 0);
        line.graphics.lineTo(i, this.height);
        line.graphics.endStroke();
        this.grid.addChild(line);
      }

      for (let i = 0; i < this.height; i += CmInPx) {
        const line = new createjs.Shape();
        line.graphics.setStrokeStyle(1).beginStroke('rgba(0,0,0,0.4)');
        line.graphics.moveTo(0, i);
        line.graphics.lineTo(this.width, i);
        line.graphics.endStroke();
        this.grid.addChild(line);
      }
    }
  }

  /**
   * If this.scaleMode == true, this function creates a new scale display in the top bottom right corner
   * of the stage. The scale, which is a createjs.Container by itself, contains three shapes for the scale
   * distance and two little stoppers at the ends, and the text indicating the size. In general, the unit size
   * is 1cm. However, if the full viewport is capable of displaying more than 50 units with the current
   * scaling factor, the unit is changed to 10cm.
   */
  updateScale() {
    this.scale.removeAllChildren();

    if (this.scaleMode) {
      let cm = (this.ppi/2.54) * this.stage.scaling / 100;
      let unit = '1 cm';

      if (this.width / cm > 50) {
        cm *= 10;
        unit = '10 cm';
      }

      const endX = this.width - 150;
      const endY = this.height - 50;

      const scale = new createjs.Shape();
      scale.graphics.setStrokeStyle(1).beginStroke('rgba(0,0,0,1)');
      scale.graphics.moveTo(endX, endY);
      scale.graphics.lineTo(endX-cm, endY);
      scale.graphics.endStroke();
      this.scale.addChild(scale);

      const start = new createjs.Shape();
      start.graphics.setStrokeStyle(1).beginStroke('rgba(0,0,0,1)');
      start.graphics.moveTo(endX, endY);
      start.graphics.lineTo(endX, endY-10);
      start.graphics.endStroke();
      this.scale.addChild(start);

      const end = new createjs.Shape();
      end.graphics.setStrokeStyle(1).beginStroke('rgba(0,0,0,1)');
      end.graphics.moveTo(endX-cm, endY);
      end.graphics.lineTo(endX-cm, endY-10);
      end.graphics.endStroke();
      this.scale.addChild(end);

      const text = new createjs.Text(unit);
      text.scale = 1.5;
      const bounds = text.getBounds();
      text.x = endX - bounds.width*text.scale;
      text.y = endY + bounds.height*text.scale - 5;
      this.scale.addChild(text);
    }
  }

  /**
   * Toggles the grid mode, calls for a grid update, and then refreshes the whole stage.
   * @return {Boolean} Return value for the new status flag of the gridMode.
   */
  toggleGridMode() {
    this.gridMode = !this.gridMode;
    this.updateGrid();
    this.update();
    return this.gridMode;
  }

  /**
   * Toggles the scale mode, calls for a scale update, and then refreshes the whole stage.
   * @return {Boolean} Return value for the new status flag of the scaleMode.
   */
  toggleScaleMode() {
    this.scaleMode = !this.scaleMode;
    this.updateScale();
    this.update();
    return this.scaleMode;
  }

  /**
   * @private
   * Removes all objects from the table. First, all registered elements in
   * "this.fragmentList" are removed from the stage, then the selection
   * and the fragmentList itself are cleared. Finally, the stage is updated
   * to display the changes onscreen.
   */
  _clearTable() {
    // remove fragments from canvas
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        this.stage.removeChild(this.fragmentList[idx].getContainer());
      }
    }
    this.clearSelection();
    this._clearFragmentList();
  }

  /**
   * Function to load a new fragment scene from data. First, the stage
   * is cleared, then both variables for the stage configuration (like
   * scalingfactors etc.) are set (or set to default values),
   * followed by adding the saved fragments.
   * Finally, the stage is updated to display changes onscreen.
   * @param {Object} data
   * @param {Object} data.fragments - Contains all information regarding the fragments. Keys: Fragment IDs (e.g. "f_0").
   * @param {Object} data.stage - Contains all information regarding the stage.
   */
  loadScene(data) {
    this._clearTable();
    this.controller.clearMeasurements();

    if (data && data.fragments) {
      this._loadFragments(data.fragments);
    }

    if (data && data.stage) {
      this._loadStageConfiguration(data.stage);
    } else {
      this._loadStageConfiguration();
    }

    this.update();
  }

  /**
   * TODO
   * @param {*} data
   */
  redoScene(data) {
    if (data && data.stage) {
      if (this.controller.isDevMode()) console.log('data.stage:', data.stage);
      this._loadStageConfiguration(data.stage);
    }
    if (data && data.fragments) {
      if (this.controller.isDevMode()) console.log('data.fragments:', data.fragments);
      this._redoFragments(data.fragments);
    }
  }

  /**
   * @private
   * Loads Stage settings from input settings object. If no settings
   * are provided, loads default values.
   * @param {Object} dataStage
   * @param {double} dataStage.scaling - Scaling value that had been stored in the savefile. This value is not the ratio,
   * but the ratio * 100. E.g., 100 instead of 1.0.
   */
  _loadStageConfiguration(dataStage) {
    this.stage.scaling = 100; // default value

    if (dataStage) {
      if (dataStage.scaling) {
        this.controller.setScaling(dataStage.scaling);
      }
    }
  }

  /**
   * Getter method for stage data.
   * @return {Object} Contains '.scaling'.
   */
  getStageData() {
    return {
      'scaling': this.stage.scaling,
    };
  }

  /**
   * Getter method for fragments data.
   * @return {Object} Contains fragment data, key values are fragment IDs, e.g. "f_0".
   */
  getFragmentsData() {
    const fragmentData = {};

    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        fragmentData[idx] = this.fragmentList[idx].getData();
      }
    }

    return fragmentData;
  }

  /**
   * Getter Method for table data, i.e. stage settings and fragments.
   * @return {Object} Contains '.stage' with stage settings and
   * '.fragments' with loaded fragments.
   */
  getData() {
    const stageData = this.getStageData();
    const fragmentsData = this.getFragmentsData();

    return {
      'stage': stageData,
      'fragments': fragmentsData,
    };
  }

  /**
   * Getter Method for this.fragmentList.
   * @return {Object} Returns current list of fragments. Keys are fragment IDs (e.g. "f_0"), values are fragment objects.
   */
  getFragmentList() {
    return this.fragmentList;
  }

  /**
   * Getter Method for this.selectedList.
   * @return {Object} Return current list of selected items. Keys are fragment IDs (e.g. "f_0"), values are fragment objects.
   */
  getSelectedList() {
    return this.selectedList;
  }

  /**
   * Getter Method for stage center.
   * @return {Object} Returns object with '.x' and '.y' being the coordinates of the stage's center.
   */
  getCenter() {
    const cx = this.width / 2;
    const cy = this.height / 2;
    return {'x': cx, 'y': cy};
  }

  /**
   * Getter Method for current scaling factor.
   * @return {int} Returns the current scaling factor.
   */
  getScaling() {
    return this.stage.scaling;
  }

  /**
   * Method to set the scaling of a scene.  Updates the scaling value
   * accordingly and then invokes the following scaling of all items
   * on stage.
   * @param {int} scaling New scaling value (as given by zoom slider, e.g.
   * values between 10 and 300, not 0.1 and 3.0)
   * @param {int} [scaleCenterX]
   * @param {int} [scaleCenterY]
   */
  setScaling(scaling, scaleCenterX, scaleCenterY) {
    this.controller.clearSelection();
    this.clearSelection();
    let distX = 0;
    let distY = 0;
    this.stage.scaling = scaling;

    // zoom at screen center
    const center = this.getCenter();
    Scaler.zoom.screen.x = Math.floor(center.x);
    Scaler.zoom.screen.y = Math.floor(center.y);

    // overwrite center if specific zoom center is given
    if (scaleCenterX && scaleCenterY) {
      distX = center.x - scaleCenterX;
      distY = center.y - scaleCenterY;
      this.moveStage(distX, distY);
    }

    Scaler.zoom.world.x = Scaler.zoom.screen.x;
    Scaler.zoom.world.y = Scaler.zoom.screen.y;

    // Scaler.scaling = scaling/100;
    Scaler.scaling = (this.ppi/96)*this.stage.scaling/100;
    this._scaleObjects();

    this.moveStage(-distX, -distY);
    this.updateGrid();
    this.updateScale();
    this.controller.update();
  }

  /**
   * Resizes the stage canvas to a new given size and recreates the
   * necessary background in an according size.
   * Note: Updates the stage.
   * @param {*} width - Width of the new canvas in px.
   * @param {*} height - Height of the new canvas in px.
   */
  resizeCanvas(width, height) {
    this.stage.canvas.width = this.width = width;
    this.stage.canvas.height = this.height = height;

    const oldBackground = this.background.getChildAt(0);
    this.removeFromBackground(oldBackground);
    this.addToBackground(this._createBackground(), 0);
    this.update();
  }

  /**
   * TODO
   * Helper method for visual reasons, simply updates the stage to
   * show potential changes onscreen.
   */
  update() {
    this.stage.update();
  }

  /**
   * TODO
   * @private
   * @param {*} imageList
   */
  _loadFragments(imageList) {
    for (const id in imageList) {
      if (Object.prototype.hasOwnProperty.call(imageList, id)) {
        let url = imageList[id].rectoURL;
        if (!imageList[id].recto) {
          url = imageList[id].versoURL;
        }
        this.loadqueue.loadManifest([{id: id, src: url,
          properties: imageList[id]}], false);
      }
    }
    // TODO: necessary to check that image can only be added once?
    this.loadqueue.load();
  }

  /**
   * TODO
   * @param {*} fragmentData
   */
  _redoFragments(fragmentData) {
    const fragmentLists = Util.compareDicts(fragmentData, this.fragmentList);
    const newFragments = fragmentLists.l1;
    const deletedFragments = fragmentLists.l2;
    const updatedFragments = fragmentLists.intersection;

    // update those fragments which have been there and are still there
    updatedFragments.forEach((id) => {
      this.fragmentList[id].setData(fragmentData[id]);
    });
    // create fragments which you deleted in the last step
    newFragments.forEach((id) => {
      this.controller.addFragment(fragmentData[id]);
      // TODO This should only create a fragment, but at a later point i would have to fill in the new data!
    });
    // remove fragments which you created in the last step
    deletedFragments.forEach((id) => {
      this.controller.removeFragment(id);
    });

    this._updateBb();
    this.update();
  }

  /**
   * TODO
   * @private
   * @param {*} event
   */
  _createFragment(event) {
    let newId;
    if (event.item.id && event.item.id != 'upload') {
      newId = event.item.id;
    } else {
      newId = this.getNewFragmentId();
    }
    const newFragment = new Fragment(this.controller, newId, event);
    this.fragmentList[newId] = newFragment;
    const fragmentContainer = newFragment.getContainer();
    this.addBeforeOverlay(fragmentContainer);

    this.controller.updateSidebarFragmentList();
  }

  /**
   * TODO
   * @param {String} id - Fragment ID, e.g. "f_0".
   */
  removeFragment(id) {
    // iterate over fragmentList and match items with requested id
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        if (fragment.id == id) {
          // remove correct fragment both from stage and fragmentList
          const fragmentContainer = fragment.getContainer();
          this.stage.removeChild(fragmentContainer);
          delete this.fragmentList[fragment.id];
          this.controller.clearSelection();
          this.controller.saveToModel(false);
          this.stage.update();
        }
      }
    }
  }

  /**
   * Takes all fragments registered in this.selectedList and calls the removal function for each of them. As the whole selection
   * is then deleted, the selection can be cleared, and both model and view are updated accordingly.
   */
  deleteSelectedFragments() {
    for (const id in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, id)) {
        this.removeFragment(id);
      }
    }

    this.controller.clearSelection();
    this.update();
    this.controller.saveToModel(false);
  }

  /**
   * TODO
   * @param {*} image
   */
  registerImageEvents(image) {
    image.on('mousedown', (event) => {
      const clickedId = event.target.id;
      if (event.nativeEvent.ctrlKey == false && !this.selectedList[clickedId]) {
        // if ctrl key is not pressed, old selection will be cleared
        this.controller.clearSelection();
      }
      if (event.nativeEvent.ctrlKey == true && this.selectedList[clickedId]) {
        // if ctrl key is pressed AND object is already selected:
        // -> remove selection for this object
        this.controller.deselectFragment(clickedId);
      } else {
        // in all other cases, add object to selection
        if (!this.measureMode) {
          // but NOT, if measure mode is currently active
          this.controller.selectFragment(clickedId);
        }
      }
      this._moveToTop(this.fragmentList[clickedId]);
      this.update();

      this.mouseClickStart = {x: event.stageX, y: event.stageY};
    });

    image.on('pressmove', (event) => {
      this._moveObjects(event);
    });

    image.on('pressup', (event) => {
      this.controller.saveToModel(false);
    });

    image.on('mouseover', (event) => {
      const id = event.target.id;
      if (!this.measureMode) {
        this.controller.highlightFragment(id);
      }
    });

    image.on('mouseout', (event) => {
      const id = event.target.id;
      this.controller.unhighlightFragment(id);
    });
  }

  /**
   * Selects a fragment by adding it to the selection list and creating the shadow background to give a
   * visual indicator. A newly selected fragment will also be pushed to the top of the canvas stack to make
   * it fully visible.
   * @param {String} id - Fragment identifier, e.g. "f_0".
   */
  selectFragment(id) {
    const fragment = this.fragmentList[id];
    if (fragment) {
      this.selectedList[id] = this.fragmentList[id];
      this.fragmentList[id].getImage().shadow = new createjs.Shadow(
          '#f15b40', 0, 0, 10);
      this._moveToTop(this.fragmentList[id]);
    }
    this._updateBb();
    this.update();
  }

  /**
   * Deselects a specific fragment with given ID by removing its entry from the selectedList, removing the shadow background
   * as visual indicator, and by calling for an update of the selection boundin box.
   * @param {String} id - Fragment identifier, e.g. "f_0".
   */
  deselectFragment(id) {
    delete this.selectedList[id];
    this.fragmentList[id].getImage().shadow = null;
    this._updateBb();
  }

  /**
   * TODO
   * @return {String[]}
   */
  clearSelection() {
    const temp = [];
    for (const id in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, id)) {
        this.selectedList[id].getImage().shadow = null;
        temp.push(id);
      }
    }
    this.selectedList = {};
    this._updateBb();
    return temp;
  }

  /**
   * TODO
   * @param {String[]} savedSelection List of fragmentIDs which were originally selected.
   */
  setSelection(savedSelection) {
    if (savedSelection) {
      console.log(savedSelection);
      savedSelection.forEach((fragmentID) => {
        if (fragmentID in this.fragmentList) {
          this.selectedList[fragmentID] = this.fragmentList[fragmentID];
        }
      });
      this._updateBb();
    }
  }

  /**
   * TODO
   * @param {*} id
   */
  highlightFragment(id) {
    this.fragmentList[id].getImage().shadow = new createjs.Shadow(
        '#A4042A', 0, 0, 10);
    this.update();
  }

  /**
   * TODO
   * @param {*} id
   */
  unhighlightFragment(id) {
    if (id in this.selectedList) {
      this.fragmentList[id].getImage().shadow = new createjs.Shadow(
          '#f15b40', 0, 0, 10);
    } else if (id in this.fragmentList) {
      this.fragmentList[id].getImage().shadow = null;
    }
    this.update();
  }

  /**
 * TODO
 * @private
 */
  _clearFragmentList() {
    this.fragmentList = {};
  }

  /**
   * TODO
   * @private
   * @param {*} event
   * @return {[null]}
   */
  _panScene(event) {
    if (!this.controller.getPermission('move_scene')) return null;
    const currentMouseX = event.stageX;
    const currentMouseY = event.stageY;

    const deltaX = currentMouseX - this.mouseClickStart.x;
    const deltaY = currentMouseY - this.mouseClickStart.y;

    this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

    this.moveStage(deltaX, deltaY);
  }

  /**
   * TODO
   * @private
   * @param {*} fragment
   * @return {[null]}
   */
  _moveToTop(fragment) {
    if (!this.controller.getPermission('move_fragment')) return null;
    const container = fragment.getContainer();
    this.addBeforeOverlay(container);
  }

  /**
   * TODO
   * @private
   * @param {*} event
   * @return {[null]}
   */
  _rotateObjects(event) {
    if (!this.controller.getPermission('move_fragment')) return null;
    const radsOld = Math.atan2(this.mouseClickStart.y - this.rotator.y,
        this.mouseClickStart.x - this.rotator.x);
    const radsNew = Math.atan2(event.stageY - this.rotator.y,
        event.stageX - this.rotator.x);
    const rads = radsNew - radsOld;
    const deltaAngle = rads * (180 / Math.PI);

    for (const idx in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, idx)) {
        const fragment = this.selectedList[idx];
        fragment.rotateByAngle(deltaAngle);
      }
    }

    this.bb.rotation += deltaAngle;
    this.flipper.rotation += deltaAngle;
    this.rotator.rotation += deltaAngle;
    this.ghoster.rotation += deltaAngle;

    this.mouseClickStart = {x: event.stageX, y: event.stageY};

    this.update();
  }

  /**
   * TODO
   * @private
   * @param {*} event
   * @return {[null]}
   */
  _moveObjects(event) {
    if (!this.controller.getPermission('move_fragment')) return null;
    let movedObject = event.target;

    if (movedObject.name == 'Image') {
      movedObject = movedObject.parent;
    }

    const currentMouseX = event.stageX;
    const currentMouseY = event.stageY;

    const deltaX = currentMouseX - this.mouseClickStart.x;
    const deltaY = currentMouseY - this.mouseClickStart.y;

    this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

    for (const idx in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, idx)) {
        const fragment = this.selectedList[idx];
        if (fragment) fragment.moveByDistance(deltaX, deltaY);
      }
    }

    this._updateBb();
    this.update();
  }

  /**
   * TODO
   * @param {*} deltaX
   * @param {*} deltaY
   */
  moveStage(deltaX, deltaY) {
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        fragment.moveByDistance(deltaX, deltaY);
      }
    }

    this._updateBb();
    this.update();
  }

  /**
   * TODO
   * IDEA
   * @private
   */
  _scaleObjects() {
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        const xNew = Scaler.x(fragment.getBaseX());
        const yNew = Scaler.y(fragment.getBaseY());
        fragment.moveToPixel(xNew, yNew);
        fragment.scaleToValue(Scaler.scaling);
      }
    }

    this._updateBb();
    this._updateRotator();
    this.update();
  }

  /**
   * TODO
   * @param {*} horizontalFlip
   */
  flipTable(horizontalFlip=true) {
    this.controller.clearSelection();

    const yAxis = this.stage.canvas.width/2;
    const xAxis = this.stage.canvas.height/2;

    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        const oldRotation = fragment.getRotation();
        fragment.flip();

        const x = fragment.getX();
        const y = fragment.getY();

        let xNew; let yNew;

        if (fragment.isRecto) {
          fragment.rotateByAngle(-2*fragment.getRotation());
        } else {
          fragment.rotateByAngle(-2*oldRotation);
        }


        if (horizontalFlip) {
          xNew = 2*yAxis - x;
          yNew = y;
        } else {
          xNew = x;
          yNew = 2*xAxis - y;
          fragment.rotateToAngle(180+fragment.getRotation());
        }
        fragment.moveByDistance(-(x-xNew), -(y-yNew));
      }
    }
    this.update();
    this.controller.saveToModel(false);
    this.controller.updateSidebarFragmentList();
  }

  /**
   * TODO
   * @private
   */
  _updateBb() {
    this.stage.removeChild(this.bb);
    this.selector.updateBb(this.selectedList, this.stage.scaling/100);
    this.bb = this.selector.getBb();
    this.addBeforeOverlay(this.bb);
    this._updateFlipper(this.bb.center.x, this.bb.center.y,
        this.bb.width, this.bb.height);
    this._updateRotator(this.bb.center.x, this.bb.center.y, this.bb.height);
    this._updateGhoster(this.bb.center.x, this.bb.center.y,
        this.bb.width, this.bb.height);
  }

  /**
   * TODO
   * @private
   * @param {*} x
   * @param {*} y
   * @param {*} width
   * @param {*} height
   */
  _updateFlipper(x, y, width, height) {
    this.stage.removeChild(this.flipper);

    if (Object.keys(this.selectedList).length == 1) {
      this.flipper = new createjs.Container();

      const circle = new createjs.Shape();
      circle.graphics
          .beginFill('white').drawCircle(0, 0, 20);
      this.flipper.addChild(circle);

      const bmp = new createjs.Bitmap('../imgs/symbol_flip.png');
      bmp.scale = 1;
      bmp.x = bmp.y = -15;
      bmp.onload = function() {
        this.update();
      };
      this.flipper.addChild(bmp);

      this.flipper.x = x;
      this.flipper.y = y;
      this.flipper.regX = -width/2-30;
      this.flipper.regY = -height/2+30;
      this.flipper.name = 'Flip Button';

      if (this.flipper.x - this.flipper.regX > this.stage.canvas.width) {
        this.flipper.regX *= -1;
      }

      this.flipper.on('click', (event) => {
        // the flip button is only accessible if only
        // one element is selected
        // TODO: oder doch für mehrere auch?
        const id = Object.keys(this.selectedList)[0];
        const fragment = this.selectedList[id];
        fragment.flip();
        this._updateBb();
        this.controller.saveToModel(false);
      });

      this.flipper.on('mousedown', () => {
        this.flipper.getChildAt(0).graphics.clear()
            .beginFill('#1C5A9C').drawCircle(0, 0, 20).endFill();
        this.update();
      });

      this.flipper.on('pressup', () => {
        this.flipper.getChildAt(0).graphics.clear()
            .beginFill('white').drawCircle(0, 0, 20).endFill();
        this.update();
      });

      this.addBeforeOverlay(this.flipper);
    }
  }


  /**
   * TODO
   * @private
   * @param {*} x
   * @param {*} y
   * @param {*} width
   * @param {*} height
   */
  _updateGhoster(x, y, width, height) {
    this.stage.removeChild(this.ghoster);

    if (Object.keys(this.selectedList).length == 1) {
      this.ghoster = new createjs.Container();

      const circle = new createjs.Shape();
      circle.graphics
          .beginFill('grey').drawCircle(0, 0, 20).endFill();
      this.ghoster.addChild(circle);

      const bmp = new createjs.Bitmap('../imgs/symbol_ghost.png');
      bmp.scale = 1;
      bmp.x = bmp.y = -15;
      bmp.onload = function() {
        this.update();
      };
      this.ghoster.addChild(bmp);

      this.ghoster.x = x;
      this.ghoster.y = y;
      this.ghoster.regX = -width/2-30;
      this.ghoster.regY = -height/2+75;
      this.ghoster.name = 'Flip Button';

      if (this.ghoster.x - this.ghoster.regX > this.stage.canvas.width) {
        this.ghoster.regX *= -1;
      }

      this.ghoster.on('mousedown', (event) => {
        this.ghoster.getChildAt(0).graphics.clear()
            .beginFill('#1C5A9C').drawCircle(0, 0, 20).endFill();
        const id = Object.keys(this.selectedList)[0];
        const fragment = this.selectedList[id];
        fragment.ghost(true);
      });

      this.ghoster.on('pressup', (event) => {
        this.ghoster.getChildAt(0).graphics.clear()
            .beginFill('grey').drawCircle(0, 0, 20).endFill();
        const id = Object.keys(this.selectedList)[0];
        const fragment = this.selectedList[id];
        fragment.ghost(false);
      });

      this.addBeforeOverlay(this.ghoster);
    }
  }

  /**
   * TODO
   * @private
   * @param {*} x
   * @param {*} y
   * @param {*} height
   */
  _updateRotator(x, y, height) {
    this.stage.removeChild(this.rotator);

    if (Object.keys(this.selectedList).length == 1) {
      this.rotator = new createjs.Container();

      const circle = new createjs.Shape();
      circle.graphics
          .beginFill('#f5842c').drawCircle(0, 0, 20);
      this.rotator.addChild(circle);

      const bmp = new createjs.Bitmap('../imgs/symbol_rotate.png');
      bmp.scale = 1;
      bmp.x = bmp.y = -15;
      this.rotator.addChild(bmp);

      this.rotator.x = x;
      this.rotator.y = y;
      this.rotator.regX = 0;
      this.rotator.regY = height/2+25;
      if (this.rotator.y - this.rotator.regY < 0) {
        this.rotator.regY *= -1;
      }
      this.rotator.name = 'Rotation Anchor';

      this.addBeforeOverlay(this.rotator);

      this.rotator.on('mousedown', (event) => {
        this.rotator.getChildAt(0).graphics.clear()
            .beginFill('#1C5A9C').drawCircle(0, 0, 20).endFill();
        this.mouseClickStart = {x: event.stageX, y: event.stageY};
        this.update();
      });
      this.rotator.on('pressmove', (event) => {
        this._rotateObjects(event);
      });
      this.rotator.on('pressup', (event) => {
        this.flipper.getChildAt(0).graphics.clear()
            .beginFill('#f5842c').drawCircle(0, 0, 20).endFill();
        this._updateBb();
        this.update();
        this.controller.saveToModel(false);
      });
    }
  }

  /**
   * TODO
   * @param {*} fileFormat "png", "jpg", "jpeg"
   * @param {*} full
   * @param {*} thumb
   * @return {*}
   */
  exportCanvas(fileFormat, full=true, thumb=false) {
    let changeParameters = {
      x: 0,
      y: 0,
      scale: this.stage.scaling,
    };
    if (full) {
      changeParameters = this.fitToScreen(false);
    }

    // remove UI elements
    const savedSelection = this.controller.clearSelection();

    const pseudoLink = document.createElement('a');
    let extension; let type;

    if (fileFormat == 'jpg' || fileFormat == 'jpeg') {
      extension = 'jpg';
      type = 'image/jpeg';
      const backgroundColor = $('.color_button.selected')
          .css('background-color');

      // creating a pseudo canvas, filling it with background color
      // then, drawing VLT canvas on top
      const pseudoCanvas = document.createElement('canvas');
      pseudoCanvas.width = this.stage.canvas.width;
      pseudoCanvas.height = this.stage.canvas.height;
      const pseudoContext = pseudoCanvas.getContext('2d');
      pseudoContext.fillStyle = backgroundColor;
      pseudoContext.fillRect(0, 0, this.stage.canvas.width,
          this.stage.canvas.height);
      pseudoContext.drawImage(this.stage.canvas, 0, 0);
      pseudoLink.href = pseudoCanvas.toDataURL(); // TODO
    } else if (fileFormat == 'tiff') {
      extension = 'tif';
      type = 'image/tiff';
      pseudoLink.href = document.getElementById('lighttable').toDataURL(type);
    } else if (fileFormat == 'png') {
      extension = 'png';
      type = 'image/png';
      pseudoLink.href = document.getElementById('lighttable').toDataURL(type);
    }

    if (thumb) {
      const screenshot = document.getElementById('lighttable')
          .toDataURL('image/png');
      this.moveStage(-changeParameters.x, -changeParameters.y);
      this.controller.setScaling(changeParameters.scale);
      this.setSelection(savedSelection);
      this.update();
      // this._saveToModel();
      return screenshot;
    }
    this.setSelection(savedSelection);

    // creating artificial anchor element for download
    pseudoLink.download = 'reconstruction.' + extension;
    pseudoLink.style.display = 'none';

    // temporarily appending the anchor, "clicking" on it, and removing it again
    document.body.appendChild(pseudoLink);
    pseudoLink.click();
    document.body.removeChild(pseudoLink);

    if (full) {
      // revert stage to original configuration
      this.moveStage(-changeParameters.x, -changeParameters.y);
      this.controller.setScaling(changeParameters.scale);
    }
    this.update();
  }

  /**
   * TODO
   * @return {*}
   */
  getNewFragmentId() {
    let newId = 'f_' + this.fragmentLabel;
    this.fragmentLabel = this.fragmentLabel + 1;
    if (newId in this.fragmentList) {
      newId = this.getNewFragmentId();
    }
    return newId;
  }

  /**
   * Getter method for single fragments by their ID.
   * @param {String} id - Fragment identifier, e.g. "f_0".
   * @return {null | Fragment} Either fragment with given ID or null if not available.
   */
  getFragment(id) {
    if (id in this.fragmentList) {
      return this.fragmentList[id];
    } else {
      return null;
    }
  }

  /**
   * TODO
   * @param {*} horizontal
   */
  showFlipLine(horizontal) {
    if (horizontal) {
      const line = new createjs.Shape();
      line.graphics.setStrokeStyle(4)
          .beginStroke('rgba(0,0,0,0.2)')
          .setStrokeDash([10, 8])
          .moveTo(this.width/2, 0)
          .lineTo(this.width/2, this.height)
          .endStroke();
      this.lines.horizontal = line;
      this.addToOverlay(this.lines.horizontal);
      this.update();
    } else {
      const line = new createjs.Shape();
      line.graphics.setStrokeStyle(4)
          .beginStroke('rgba(0,0,0,0.2)')
          .setStrokeDash([10, 8])
          .moveTo(0, this.height/2)
          .lineTo(this.width, this.height/2)
          .endStroke();
      this.lines.vertical = line;
      this.addToOverlay(this.lines.vertical);
      this.update();
    }
  }

  /**
   * TODO
   */
  hideFlipLines() {
    if (this.lines.horizontal != null) {
      this.removeFromOverlay(this.lines.horizontal);
      this.lines.horizontal = null;
    }
    if (this.lines.vertical != null) {
      this.removeFromOverlay(this.lines.vertical);
      this.lines.vertical = null;
    }
    this.update();
  }

  /**
   * This function iterates over all fragments on stage and determines the most left,
   * right, bottom, and top pixels within the stage coordinate system. It also calculates
   * the overall width and height plus the center of all fragments on stage.
   * @return {Object} Object containing stage bounds: left, right, top, bottom, widht, height, center.x, center.y.
   */
  getMBR() {
    const dimensions = {};

    let left; let top; let right; let bottom;
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        const bounds = fragment.getGlobalBounds();
        const xLeft = bounds.left;
        const xRight = bounds.right;
        const yBottom = bounds.bottom;
        const yTop = bounds.top;

        (!left ? left = xLeft : left = Math.min(left, xLeft));
        (!top ? top = yTop : top = Math.min(top, yTop));
        (!right ? right = xRight : right = Math.max(right, xRight));
        (!bottom ? bottom = yBottom : bottom = Math.max(bottom, yBottom));
      }
    }

    dimensions.left = left;
    dimensions.right = right;
    dimensions.top = top;
    dimensions.bottom = bottom;
    dimensions.center = {};
    if (left != null && right != null) {
      dimensions.width = Math.abs(left - right);
      dimensions.center.x = left + dimensions.width / 2;
    }
    if (top != null && bottom != null) {
      dimensions.height = Math.abs(top - bottom);
      dimensions.center.y = top + dimensions.height / 2;
    }

    return dimensions;
  }

  /**
   * TODO
   * @param {Boolean} includeSidebar
   *    True: fit screen to visible scene next to sidebar
   *    False: fit screen to full visible area (e.g. for screenshots)
   * @return {*}
   */
  fitToScreen(includeSidebar=true) {
    let dimensions = this.getMBR();
    const sidebar = $('#left_sidebar').width(); // TODO: MOVE INTO CONTROLLER
    let width = this.width;
    if (includeSidebar) width -= sidebar;
    const oldScaling = this.stage.scaling;
    const scalingHeight = this.stage.scaling * this.height / dimensions.height;
    const scalingWidth = this.stage.scaling * width / dimensions.width;
    const scaling = Math.min(scalingWidth, scalingHeight);
    if (Math.abs(this.stage.scaling - scaling) > 1) {
      this.controller.setScaling(scaling);
    }

    dimensions = this.getMBR();
    const center = this.getCenter();
    let distX = center.x - dimensions.center.x;
    if (includeSidebar) distX += sidebar/2;
    const distY = center.y - dimensions.center.y;
    this.moveStage(distX, distY);
    return {
      x: distX,
      y: distY,
      scale: oldScaling,
    };
  }
}


/**
 * TODO
 */
class Selector {
  /**
     * TODO
     * @constructs
     * @param {*} controller
     */
  constructor(controller) {
    this.controller = controller;
    this.setToDefault();
  }

  /**
   * TODO
   */
  setToDefault() {
    this.x = 0;
    this.y = 0;
    this.width = 0;
    this.height = 0;
    this.cx = 0;
    this.cy = 0;
  }

  /**
   * TODO
   * @param {*} selectionList
   * @param {*} scale
   */
  updateBb(selectionList, scale) {
    // only update the Bounding Box if there is anything selected at all
    if (!selectionList || Object.keys(selectionList).length == 0) {
      this.setToDefault();
    } else {
      let left = null;
      let right = null;
      let top = null;
      let bottom = null;
      let width = null;
      let height = null;
      // iteration over all selected elements
      for (const idx in selectionList) {
        if (Object.prototype.hasOwnProperty.call(selectionList, idx)) {
          const fragment = selectionList[idx];
          const fBounds = fragment.getGlobalBounds();
          if (!fBounds) return;

          (!left ? left = fBounds.left : left = Math.min(left, fBounds.left));
          (!right ? right = fBounds.right : right = Math.max(right, fBounds.right));
          (!top ? top = fBounds.top : top = Math.min(top, fBounds.top));
          (!bottom ? bottom = fBounds.bottom : bottom = Math.max(bottom, fBounds.bottom));
        }
      }

      width = right - left;
      height = bottom - top;
      this.x = left;
      this.y = top;
      this.width = width;
      this.height = height;
      this.cx = width/2;
      this.cy = height/2;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getBb() {
    const bb = new createjs.Shape();
    bb.name = 'Bounding Box';
    bb.graphics
        .beginStroke('#f5842c')
        .drawRect(0, 0, this.width, this.height);
    bb.center = {x: this.x + this.width/2, y: this.y + this.height/2};
    bb.x = bb.center.x;
    bb.y = bb.center.y;
    bb.regX = this.cx;
    bb.regY = this.cy;
    bb.height = this.height;
    bb.width = this.width;
    return bb;
  }
}

module.exports.Stage = Stage;
