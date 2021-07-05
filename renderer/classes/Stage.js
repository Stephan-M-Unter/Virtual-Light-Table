// const {TouchBarScrubber, TouchBarSlider} = require('electron');
const {Fragment} = require('./Fragment');
const {Measurement} = require('./Measurement');
const {Scaler} = require('./Scaler');

/**
 * TODO The Stage Class holds methods for everyting happening
 * on the (main) stage of the VLT.
 */
class Stage {
  /**
     * Stage Constructor. Creates a new stage from scratch and
     * sets sets default values for necessary settings.
     *
     * @param {*} controller Instance of the UI Controller class
     * which is reponsible for the communication between application
     * components.
     * @param {*} DOMelement Reference to the HTML canvas element the
     * new stage will setup upon.
     */
  constructor(controller, DOMelement) {
    // create new stage and set to given DOMelement
    this.controller = controller;
    this.stage = new createjs.Stage(DOMelement);
    this.stage.canvas.width = this.width = window.innerWidth;
    this.stage.canvas.height = this.height = window.innerHeight;
    this.stage.enableMouseOver();
    createjs.Touch.enable(this.stage);

    this.fragmentList = {};
    this.selectedList = {};
    this.fragmentLabel = 0;

    this.stage.scaling = 100;

    this.lines = {
      'horizontal': null,
      'vertical': null,
    };

    this.gridMode = false;
    this.grid = new createjs.Container();
    this.stage.addChild(this.grid);
    this.scaleMode = false;
    this.scale = new createjs.Container();
    this.stage.addChild(this.scale);
    this.background = this._createBackground();
    this.stage.addChild(this.background);

    this.measureMode = false;
    this.activeMeasurement = null;
    this.mColor = null;
    this.measurements = {};
    this.measurementsContainer = new createjs.Container();
    this.stage.addChild(this.measurementsContainer);

    window.addEventListener('click', (event) => {
      if (this.measureMode) {
        this.measure(event);
      }
    });

    // selection box
    this.selector = new Selector(this.controller);

    // LoadQueue object for the images
    this.loadqueue = new createjs.LoadQueue();
    this.loadqueue.addEventListener('fileload', (event) => {
      this._createFragment(event);
    });
    this.loadqueue.on('complete', () => {
      this.fitToScreen();
      this.update();
    });
  }

  /**
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
   * TODO
   */
  updateGrid() {
    this.grid.removeAllChildren();

    if (this.gridMode) {
      const CmInPx = 38 * this.stage.scaling / 100;

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
   * TODO
   */
  updateScale() {
    this.scale.removeAllChildren();

    if (this.scaleMode) {
      let cm = 38 * this.stage.scaling / 100;
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

    this.stage.removeChild(this.scale);
    this.stage.addChild(this.scale);
  }

  /**
   * TODO
   * @return {*}
   */
  toggleGridMode() {
    this.gridMode = !this.gridMode;
    this.updateGrid();
    this.update();
    return this.gridMode;
  }

  /**
   * TODO
   * @return {*}
   */
  toggleScaleMode() {
    this.scaleMode = !this.scaleMode;
    this.updateScale();
    this.update();
    return this.scaleMode;
  }

  /**
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
   * @param {*} data
   */
  loadScene(data) {
    // IDEA Ask users if they want to save yet unsaved changes?
    this._clearTable();
    this.clearMeasurements();

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
   * Loads Stage settings from input settings object. If no settings
   * are provided, loads default values.
   * @param {*} settings
   */
  _loadStageConfiguration(settings) {
    // default values
    this.stage.scaling = 100;

    if (settings) {
      if (settings.scaling) {
        this.controller.setScaling(settings.scaling);
      }
    }
  }

  /**
   * Getter Method for stage settings.
   * @return {Object} Contains '.scaling'.
   */
  getData() {
    return {
      'scaling': this.stage.scaling,
    };
  }

  /**
   * Getter Method for full stage configuration, i.e. stage settings
   * and loaded fragments.
   * @return {Object} Contains '.stage' with stage settings and
   * '.fragments' with loaded fragments.
   */
  getConfiguration() {
    const stageData = this.getData();
    const itemsData = {};

    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        itemsData[idx] = this.fragmentList[idx].getData();
      }
    }

    return {
      'stage': stageData,
      'fragments': itemsData,
    };
  }

  /**
   * Getter Method for this.fragmentList.
   * @return {Object} Returns current list of fragments.
   */
  getFragmentList() {
    return this.fragmentList;
  }

  /**
   * Getter Method for this.selectedList.
   * @return {Object} Return current list of selected items.
   */
  getSelectedList() {
    return this.selectedList;
  }

  /**
   * Getter Method for stage center.
   * @return {Object} Returns object with '.x' and '.y' being
   * the coordinates of the stage's center.
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
   * Collects the full stage configuration information and sends it
   * to the server to save it to model.
   */
  _saveToModel() {
    const dataObject = this.getConfiguration();
    this.controller.saveToModel(dataObject);
  }

  /**
   * Method to set the scaling of a scene.  Updates the scaling value
   * accordingly and then invokes the following scaling of all items
   * on stage.
   * @param {int} scaling New scaling value (as given by zoom slider, e.g.
   * values between 10 and 300, not 0.1 and 3.0)
   * @param {int} scaleCenterX
   * @param {int} scaleCenterY
   * IDEA
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
      // Scaler.zoom.screen.x = Math.floor(scaleCenterX);
      // Scaler.zoom.screen.y = Math.floor(scaleCenterY);
      distX = center.x - scaleCenterX;
      distY = center.y - scaleCenterY;
      this.moveStage(distX, distY);
      // distX = (distX * scaling * -1) / oldScaling;
      // distY = (distY * scaling * -1) / oldScaling;
    }

    Scaler.zoom.world.x = Scaler.zoom.screen.x;
    Scaler.zoom.world.y = Scaler.zoom.screen.y;

    Scaler.scaling = scaling/100;
    this._scaleObjects();

    this.moveStage(-distX, -distY);
    this.updateGrid();
    this.updateScale();
    this.updateMeasurements();
    this.update();
  }

  /**
   * Resizes the stage canvas to a new given size and recreates the
   * necessary background in an according size.
   * @param {*} width Width of the new canvas in px.
   * @param {*} height Height of the new canvas in px.
   */
  resizeCanvas(width, height) {
    this.stage.canvas.width = this.width = width;
    this.stage.canvas.height = this.height = height;

    this.stage.removeChild(this.background);
    this.background = this._createBackground();
    this.stage.addChildAt(this.background, 0);

    this.update();
  }

  /**
   * Helper method for visual reasons, simply updates the stage to
   * show potential changes onscreen.
   */
  update() {
    this.stage.removeChild(this.measurementsContainer);
    this.stage.addChild(this.measurementsContainer);
    this.stage.update();
  }

  /**
   * TODO
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
   * @param {*} event
   */
  _createFragment(event) {
    let newId;
    if (event.item.id && event.item.id != 'upload') {
      newId = event.item.id;
    } else {
      newId = this.getNewFragmentId();
    }
    const newFragment = new Fragment(this.controller, this, newId, event);
    this.fragmentList[newId] = newFragment;
    const fragmentContainer = newFragment.getContainer();
    const fragmentImage = newFragment.getImage();
    this.stage.addChild(fragmentContainer);

    this.registerImageEvents(fragmentImage);

    this.controller.updateFragmentList();
  }

  /**
   * TODO
   * @param {*} id
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
          this.stage.update();
        }
      }
    }
  }

  /**
   * TODO
   */
  deleteSelectedFragments() {
    for (const id in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, id)) {
        this.removeFragment(id);
      }
    }
    this.controller.clearSelection();
    this.update();
  }

  /**
   * TODO
   * @param {*} image
   */
  registerImageEvents(image) {
    image.on('mousedown', (event) => {
      const clickedId = event.target.id;
      if (event.nativeEvent.ctrlKey == false && !this._isSelected(clickedId)) {
        // if ctrl key is not pressed, old selection will be cleared
        this.controller.clearSelection();
      }
      if (event.nativeEvent.ctrlKey == true && this._isSelected(clickedId)) {
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

      this._updateBb();
      this.mouseClickStart = {x: event.stageX, y: event.stageY};
    });

    image.on('pressmove', (event) => {
      this._moveObjects(event);
    });

    image.on('pressup', (event) => {
      this._saveToModel();
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
   * TODO
   * @param {*} id
   * @return {*}
   */
  _isSelected(id) {
    return this.selectedList[id];
  }

  /**
   * TODO
   * @param {*} id
   */
  selectFragment(id) {
    this.selectedList[id] = this.fragmentList[id];
    this.fragmentList[id].getImage().shadow = new createjs.Shadow(
        '#f15b40', 0, 0, 10);
    this._moveToTop(this.fragmentList[id]);
    this._updateBb();
    this.update();
  }

  /**
   * TODO
   * @param {*} id
   */
  deselectFragment(id) {
    delete this.selectedList[id];
    this.fragmentList[id].getImage().shadow = null;
    this._updateBb();
  }

  /**
   * TODO
   */
  clearSelection() {
    for (const id in this.selectedList) {
      if (Object.prototype.hasOwnProperty.call(this.selectedList, id)) {
        this.selectedList[id].getImage().shadow = null;
      }
    }
    this.selectedList = {};
    this._updateBb();
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
    } else {
      this.fragmentList[id].getImage().shadow = null;
    }
    this.update();
  }

  /**
 * TODO
 */
  _clearFragmentList() {
    this.fragmentList = {};
  }

  /* MEASUREMENT */

  /**
   * This method removes all measurements and updates the stage.
   */
  clearMeasurements() {
    this.endMeasurement();
    this.measurements = {};
    this.measurementsContainer.removeAllChildren();
    this.update();
  }

  /**
   * TODO
   * @param {*} id
   */
  startMeasurement(id) {
    this.measureMode = true;
    $('#lighttable').addClass('measure');

    if (id in this.measurements) {
      // redo of existing measurement
      const measurement = this.measurements[id];
      measurement.clearPoints();
      this.mColor = measurement.getColor();
      this.activeMeasurement = measurement;
    } else {
      // create new measurement
      this.mColor = this.getRandomColor();
      const measurement = new Measurement(this, id, this.mColor);
      this.measurements[id] = measurement;
      this.measurementsContainer.addChild(measurement.getMeasurement());
      this.activeMeasurement = measurement;
    }
    this.update();
  }

  /**
   * TODO
   */
  endMeasurement() {
    $('#lighttable').removeClass('measure');
    this.measureMode = false;
    this.mColor = null;
    this.activeMeasurement = null;
    this.updateMeasurements();
    this.update();
  }

  /**
   * TODO
   */
  updateMeasurements() {
    this.controller.updateMeasurements(this.measurements);
    for (const id in this.measurements) {
      if (Object.prototype.hasOwnProperty.call(this.measurements, id)) {
        const measurement = this.measurements[id];
        measurement.drawMeasurement();
      }
    }
  }

  /**
   * TODO
   * @return {boolean}
   */
  hasMeasureMode() {
    return this.measureMode;
  }

  /**
   * TODO
   * @param {*} event
   */
  measure(event) {
    const point = [event.pageX, event.pageY];
    this.activeMeasurement.setPoint(point);

    if (this.activeMeasurement.getP2()) {
      const id = this.activeMeasurement.getID();
      const scalingFactor = this.stage.scaling / 100;
      const distance = this.activeMeasurement.getDistanceInCm(scalingFactor);
      this.activeMeasurement.drawMeasurement(scalingFactor);
      this.endMeasurement();
    }
  }

  /**
   * This method checks for the first empty measurement ID
   * available in the set of measurements.
   * @return {int}
   */
  getNewMeasurementID() {
    let emptyIdFound = false;
    let id = 0;
    while (!emptyIdFound) {
      if (id in this.measurements) {
        id = id + 1;
      } else {
        emptyIdFound = true;
      }
    }
    return id;
  }

  /**
   * TODO
   * @return {*} color
   */
  getRandomColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }

  /**
   * TODO
   * @param {*} id
   * @return {*}
   */
  getMeasureColor(id) {
    return this.measurements[id].getColor();
  }

  /**
   * TODO
   * @param {*} id
   */
  deleteMeasurement(id) {
    const measurement = this.measurements[id].getMeasurement();
    this.measurementsContainer.removeChild(measurement);
    delete this.measurements[id];
    this.update();
  }

  /**
   * TODO
   * @param {*} event
   */
  _panScene(event) {
    const currentMouseX = event.stageX;
    const currentMouseY = event.stageY;

    const deltaX = currentMouseX - this.mouseClickStart.x;
    const deltaY = currentMouseY - this.mouseClickStart.y;

    this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

    this.moveStage(deltaX, deltaY);
  }

  /**
   * TODO
   * @param {*} fragment
   */
  _moveToTop(fragment) {
    const container = fragment.getContainer();
    this.stage.removeChild(container);
    this.stage.addChild(container);
  }

  /**
   * TODO
   * @param {*} event
   */
  _rotateObjects(event) {
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
   * @param {*} event
   */
  _moveObjects(event) {
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
        fragment.moveByDistance(deltaX, deltaY);
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

    /*
    for (const index in this.measurePoints) {
      if (Object.prototype.hasOwnProperty.call(this.measurePoints, index)) {
        const node = this.measurePoints[index];
        this.measurePoints[index] = {
          x: node.x + deltaX,
          y: node.y + deltaY,
          baseX: node.baseX + (deltaX/(this.stage.scaling/100)),
          baseY: node.baseY + (deltaY/(this.stage.scaling/100)),
        };
      }
    }
    this._updateMeasure();
    */

    this.update();
  }

  /**
   * TODO
   * IDEA
   */
  _scaleObjects() {
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        const xNew = Scaler.x(fragment.getBaseX());
        const yNew = Scaler.y(fragment.getBaseY());
        fragment.moveToPixel(xNew, yNew);
        fragment.scaleToValue(this.stage.scaling/100);
      }
    }

    /*
    for (const idx in this.measurePoints) {
      if (Object.prototype.hasOwnProperty.call(this.measurePoints, idx)) {
        const node = this.measurePoints[idx];
        const xNew = Scaler.x(node.baseX);
        const yNew = Scaler.y(node.baseY);
        this.measurePoints[idx] = {
          x: xNew,
          y: yNew,
          baseX: node.baseX,
          baseY: node.baseY,
        };
      }
    }
    this._updateMeasure();
    */
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

        let xNew; let ynew;

        if (fragment.isRecto) {
          fragment.rotateByAngle(-2*fragment.getRotation());
        } else {
          fragment.rotateByAngle(-2*oldRotation);
        }


        if (horizontalFlip) {
          xNew = 2*yAxis - x;
          ynew = y;
        } else {
          xNew = x;
          ynew = 2*xAxis - y;
          fragment.rotateToAngle(180+fragment.getRotation());
        }
        fragment.moveToPixel(xNew, ynew);
      }
    }
    this.update();
    this._saveToModel();
    this.controller.updateFragmentList();
  }

  /**
   * TODO
   */
  _updateBb() {
    this.stage.removeChild(this.bb);
    this.selector.updateBb(this.selectedList);
    this.bb = this.selector.getBb();
    this.bb.scale = this.stage.scaling / 100;
    this.stage.addChild(this.bb);
    this._updateFlipper(this.bb.center.x, this.bb.center.y,
        this.bb.width, this.bb.height);
    this._updateRotator(this.bb.center.x, this.bb.center.y, this.bb.height);
    this._updateGhoster(this.bb.center.x, this.bb.center.y,
        this.bb.width, this.bb.height);
  }

  /**
   * TODO
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
        this._saveToModel();
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

      this.stage.addChild(this.flipper);
    }
  }


  /**
   * TODO
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

      this.stage.addChild(this.ghoster);
    }
  }

  /**
   * TODO
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

      this.stage.addChild(this.rotator);

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
        this._saveToModel();
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
    const dimensions = this.getMBR();
    const center = this.getCenter();
    const distX = center.x - dimensions.center.x;
    const distY = center.y - dimensions.center.y;
    const oldScaling = this.stage.scaling;
    if (full) {
      // change stage such that all fragments are visible
      this.moveStage(distX, distY);
      const scalingHeight = this.stage.scaling *
          this.height / dimensions.height;
      const scalingWidth = this.stage.scaling * this.width / dimensions.width;
      const scaling = Math.min(scalingWidth, scalingHeight);
      if (Math.abs(this.stage.scaling - scaling) > 1) {
        this.controller.setScaling(scaling);
      }
    }

    // remove UI elements
    this.controller.clearSelection();
    this._updateBb();

    const pseudoLink = document.createElement('a');
    let extension; let type;

    if (fileFormat == 'jpg' || fileFormat == 'jpeg') {
      extension = 'jpg';
      type = 'image/jpeg';
      const backgroundColor = $('.color_button.selected')
          .css('background-color');
      console.log(backgroundColor);

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
      pseudoLink.href = pseudoCanvas.toDataURL();
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
      this.controller.setScaling(oldScaling);
      this.moveStage(-distX, -distY);
      this.update();
      this._saveToModel();
      return screenshot;
    }

    // creating artificial anchor element for download
    pseudoLink.download = 'reconstruction.' + extension;
    pseudoLink.style.display = 'none';

    // temporarily appending the anchor, "clicking" on it, and removing it again
    document.body.appendChild(pseudoLink);
    pseudoLink.click();
    document.body.removeChild(pseudoLink);

    if (full) {
      // revert stage to original configuration
      this.controller.setScaling(oldScaling);
      this.moveStage(-distX, -distY);
      this.update();
    }
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
      this.stage.addChild(this.lines.horizontal);
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
      this.stage.addChild(this.lines.vertical);
      this.update();
    }
  }

  /**
   * TODO
   */
  hideFlipLines() {
    if (this.lines.horizontal != null) {
      this.stage.removeChild(this.lines.horizontal);
      this.lines.horizontal = null;
    }
    if (this.lines.vertical != null) {
      this.stage.removeChild(this.lines.vertical);
      this.lines.vertical = null;
    }
    this.update();
  }

  /**
   * This function determines the position of the most extreme pixels for
   * top, bottom, left, right, as well as the width and height of the
   * resulting box.
   * @return {Object} Object containing the abovementioned information.
   */
  getMBR() {
    const dimensions = {};

    let left; let top; let right; let bottom;
    for (const idx in this.fragmentList) {
      if (Object.prototype.hasOwnProperty.call(this.fragmentList, idx)) {
        const fragment = this.fragmentList[idx];
        const container = fragment.getInnerContainer();

        const bounds = container.getTransformedBounds();
        const xLeft = bounds.x;
        const yTop = bounds.y;
        const xRight = bounds.x + bounds.width;
        const yBottom = bounds.y + bounds.height;

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
    if (left && right) {
      dimensions.width = Math.abs(left - right);
      dimensions.center.x = left + dimensions.width / 2;
    }
    if (top && bottom) {
      dimensions.height = Math.abs(top - bottom);
      dimensions.center.y = top + dimensions.height / 2;
    }

    return dimensions;
  }

  /**
   * TODO
   */
  fitToScreen() {
    let dimensions = this.getMBR();
    const sidebar = $('#left_sidebar').width();
    const width = this.width - sidebar;
    const scalingHeight = this.stage.scaling * this.height / dimensions.height;
    const scalingWidth = this.stage.scaling * width / dimensions.width;
    const scaling = Math.min(scalingWidth, scalingHeight);
    if (Math.abs(this.stage.scaling - scaling) > 1) {
      this.controller.setScaling(scaling);
    }

    dimensions = this.getMBR();
    const center = this.getCenter();
    const distX = center.x - dimensions.center.x + sidebar/2;
    const distY = center.y - dimensions.center.y;
    this.moveStage(distX, distY);
  }
}


/**
 * TODO
 */
class Selector {
  /**
     * TODO
     * @param {*} controller
     */
  constructor(controller) {
    this.controller = controller;
    this.x = 0;
    this.y = 0;
    this.width = 100;
    this.height = 100;
  }

  /**
   * TODO
   * @param {*} selectionList
   */
  updateBb(selectionList) {
    let left; let top; let right; let bottom;
    const center_x = [];
    const center_y = [];
    for (const idx in selectionList) {
      if (Object.prototype.hasOwnProperty.call(selectionList, idx)) {
        const fragment = selectionList[idx];
        const container = fragment.getContainer();
        const innerContainer = fragment.getInnerContainer();
        const image = fragment.getImage();
        // let image = fragment.getImage().image;

        let xLeft; let yTop; let xRight; let yBottom;

        if (fragment.getMaskBounds()) {
          let mask = fragment.maskRecto;
          if (!fragment.isRecto) {
            mask = fragment.maskVerso;
          }
          const maskPolygon = mask.polygon;

          for (const node in maskPolygon) {
            if (Object.prototype.hasOwnProperty.call(maskPolygon, node)) {
              const globalPoint = fragment.getInnerContainer()
                  .localToGlobal(maskPolygon[node][0], maskPolygon[node][1]);
              const x = globalPoint.x;
              const y = globalPoint.y;

              (!xLeft ? xLeft = x : xLeft = Math.min(xLeft, x));
              (!xRight ? xRight = x : xRight = Math.max(xRight, x));
              (!yTop ? yTop = y : yTop = Math.min(yTop, y));
              (!yBottom ? yBottom = y : yBottom = Math.max(yBottom, y));

              const globalCenter = fragment.getInnerContainer().localToGlobal(0, 0);
              center_x.push(globalCenter.x);
              center_y.push(globalCenter.y);
            }
          }
        } else {
          // const bounds = container.getTransformedBounds();
          const bounds = innerContainer.getTransformedBounds();
          if (!bounds) return;
          xLeft = bounds.x+container.x;
          yTop = bounds.y+container.y;
          xRight = bounds.x+container.x + bounds.width;
          yBottom = bounds.y+container.y + bounds.height;
        }
        (!left ? left = xLeft : left = Math.min(left, xLeft));
        (!top ? top = yTop : top = Math.min(top, yTop));
        (!right ? right = xRight : right = Math.max(right, xRight));
        (!bottom ? bottom = yBottom : bottom = Math.max(bottom, yBottom));
      }
    }

    this.width = right-left;
    this.height = bottom-top;

    if (center_x.length > 0) {
      let avg_center_x = 0;
      let avg_center_y = 0;

      for ( let i = 0; i < center_x.length; i++ ) {
        avg_center_x += parseInt( center_x[i], 10 );
      }
      avg_center_x /= center_x.length;

      for ( let i = 0; i < center_y.length; i++ ) {
        avg_center_y += parseInt( center_y[i], 10 );
      }
      avg_center_y /= center_y.length;

      this.x = avg_center_x-this.width/2;
      this.y = avg_center_y-this.height/2;
    } else {
      this.x = left;
      this.y = top;
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
    // .setStrokeDash([15.5])
    // .setStrokeStyle(2)
        .drawRect(0, 0, this.width, this.height);
    bb.center = {x: this.x + this.width/2, y: this.y + this.height/2};
    bb.x = bb.center.x;
    bb.y = bb.center.y;
    bb.regX = this.width/2;
    bb.regY = this.height/2;
    bb.height = this.height;
    bb.width = this.width;
    return bb;
  }
}

module.exports.Stage = Stage;
