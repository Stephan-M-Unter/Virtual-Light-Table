'use strict';

const {Measurement} = require('./Measurement');

/**
 * TODO
 */
class MeasurementTool {
  /**
     * TODO
     * @param {UIController} controller
     * @param {String} lighttable String ID of the lighttable DOM element (=canvas).
     * @constructs
     */
  constructor(controller, lighttable) {
    this.controller = controller;
    this.stage = this.controller.getStage();
    this.lighttable = $('#'+lighttable);
    this.runningID = 0;
    this.measureMode = false;
    this.activeMeasurement = false;
    this.activeColor = false;
    this.measurements = {};
    this.measurementsContainer = new createjs.Container();
    this.measurementsContainer.name = 'measurementsContainer';
    this.stage.addToOverlay(this.measurementsContainer);

    $(window).on('mousedown', (event) => this.handleMouseDown(event));
    $(window).on('mouseup', (event) => this.handleMouseUp(event));
    $(window).on('mousemove', (event) => this.handleMouseMove(event));
  }

  /**
   * TODO
   * @param {Object} point
   */
  measure(point) {
    const p1 = this.activeMeasurement.getP1();
    if (!p1) {
      // setting first point
      this.activeMeasurement.setPoint([point.x, point.y]);
    } else if (p1[0] != point.x && p1[1] != point.y) {
      // setting second point, finishing measurement
      this.activeMeasurement.setPoint([point.x, point.y]);
      this.stopMeasuring();
    }
    this.update();
  }

  /**
   *
   * @param {*} event
   */
  handleMouseDown(event) {
    if (this.measureMode) {
      const point = {x: event.pageX, y: event.pageY};
      this.measure(point);
    }
  }

  /**
   *
   * @param {*} event
   */
  handleMouseUp(event) {
    if (this.measureMode) {
      const point = {x: event.pageX, y: event.pageY};
      this.measure(point);
    }
  }

  /**
   * TODO
   * @param {*} event
   */
  handleMouseMove(event) {
    if (this.measureMode && this.activeMeasurement && this.activeMeasurement.getP1()) {
      const mousePoint = {x: event.pageX, y: event.pageY};
      this.activeMeasurement.drawMeasurement(mousePoint);
    }
  }

  /**
   * TODO
   */
  update() {
    for (const id in this.measurements) {
      if (Object.prototype.hasOwnProperty.call(this.measurements, id)) {
        const measurement = this.measurements[id];
        measurement.drawMeasurement();
      }
    }
    this.stage.update();
    this.controller.updateSidebarMeasurements(this.measurements);
  }

  panMeasurements(dx, dy) {
    for (const id in this.measurements) {
      if (Object.prototype.hasOwnProperty.call(this.measurements, id)) {
        const measurement = this.measurements[id];
        measurement.pan(dx, dy);
      }
    }
  }

  scaleMeasurements() {
    for (const id in this.measurements) {
      if (Object.prototype.hasOwnProperty.call(this.measurements, id)) {
        const measurement = this.measurements[id];
        measurement.scale();
      }
    }
  }

  /**
   *
   * @param {[String]} id Only needed to update an existing measurement, e.g. when correcting the end points.
   * @return {Measurement}
   */
  startMeasuring(id) {
    this.measureMode = true;
    this.lighttable.addClass('measure');

    this.controller.setPermission('move_scene', false);
    this.controller.setPermission('move_fragment', false);

    if (id && id in this.measurements) {
      // IF there is an ID and it is already registered, update the existing measurement
      this.activeMeasurement = this.measurements[id];
      this.activeMeasurement.clearPoints();
      // TODO: update?
    } else {
      // if no ID given (or not registered), create a new measurement
      const id = 'm_'+this.runningID;
      this.runningID += 1;
      this.activeMeasurement = new Measurement(this.controller, id, this._newColor());
      this.measurements[id] = this.activeMeasurement;
      this.measurementsContainer.addChild(this.activeMeasurement.getMeasurement());
    }

    return this.activeMeasurement;
  }

  /**
     * TODO
     * @return {[String]}
     */
  stopMeasuring() {
    this.measureMode = false;
    this.lighttable.removeClass('measure');

    this.controller.setPermission('move_scene', true);
    this.controller.setPermission('move_fragment', true);

    let id = null;
    if (this.activeMeasurement) id = this.activeMeasurement.getID();
    this.activeColor = null;
    this.activeMeasurement = null;
    return id;
  }

  /**
   * TODO
   * @param {String} id Measurement ID, example: "m_0".
   */
  delete(id) {
    const measurement = this.measurements[id];
    if (measurement) {
      this.measurementsContainer.removeChild(measurement.getMeasurement());
    }
    delete this.measurements[id];
    this.update();
  }

  /**
   * Stop current measuring (if active) and delete all available measurements.
   */
  deleteAll() {
    this.stopMeasuring();
    this.measurements = {};
    this.measurementsContainer.removeAllChildren();
    this.update();
  }

  /**
   * TODO
   * @return {Boolean}
   */
  isMeasuring() {
    return this.measureMode;
  }

  /**
   * TODO
   * @return {String}
   */
  _newColor() {
    const letters = '0123456789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
      color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
  }
}

module.exports.MeasurementTool = MeasurementTool;
