'use strict';

const {Scaler} = require('../../statics/SCALER');

/**
 * TODO
 */
class Measurement {
  /**
   * @constructs
   * Constructor for new Measurement, setting up variables for both end points and the container
   * for the final measurement line.
   * @param {UIController} controller - Stage object where the measurement will be added to.
   * @param {Int} id - Individual, unique ID for a measurement.
   * @param {String} color - Color code.
   */
  constructor(controller, id, color) {
    /** @member {UIController} */
    this.controller = controller;
    /** @member {Stage} */
    this.stage = controller.getStage();
    /** @member {Int} */
    this.id = id;
    /** @member {String} */
    this.color = color;
    /** @member {double[]} */
    this.p1 = null;
    /** @member {double[]} */
    this.p2 = null;
    /** @member {createjs.Container} */
    this.measurement = new createjs.Container();
    this.measurement.id = id;
    this.scaling = Scaler.scaling;

    this.distanceInPixels = 0;
    this.distanceInCms = 0;
  }

  /**
   * Sets the coordinates of the first point for this measurement.
   * @param {double[]} point - Coordinate set [x,y].
   */
  setP1(point) {
    const scaling = this.stage.getScaling() / 100;
    const offset = this.stage.getOffset();
    this.p1 = {
      x: point[0],
      y: point[1],
      baseX: Scaler.x_INV(point[0]),
      baseY: Scaler.y_INV(point[1]),
    };
    this.calculateDistance();
  }

  /**
   * Sets the coordinates of the second point for this measurement.
   * @param {double[]} point - Coordinate set [x,y].
   */
  setP2(point) {
    const scaling = this.stage.getScaling() / 100;
    const offset = this.stage.getOffset();
    this.p2 = {
      x: point[0],
      y: point[1],
      baseX: Scaler.x_INV(point[0]),
      baseY: Scaler.y_INV(point[1]),
    };
    this.calculateDistance();
  }

  /**
   * TODO
   * @param {double[]} point - Coordinate set [x,y].
   */
  setPoint(point) {
    if (!this.p1) {
      this.setP1(point);
    } else {
      this.setP2(point);
    }
  }

  /**
   * Remove all previously entered coordinates for end points and the corresponding connection line.
   */
  clearPoints() {
    this.p1 = null;
    this.p2 = null;
    this.measurement.removeAllChildren();
  }

  calculateDistance() {
    if (this.p1 && this.p2) {
      this.distanceInPixels = this.getDistanceInPixel();
      const CmInPx = (this.stage.getPPI()/2.54) * this.stage.getScaling()/100;
      this.distanceInCms = Math.round((this.distanceInPixels/CmInPx)*100)/100;
    }
  }

  /**
   * Returns measurement ID.
   * @return {Int}
   */
  getID() {
    return this.id;
  }

  /**
   * Returns the coordinates of the first point for this measurement.
   * @return {double[]} Coordinate set [x,y].
   */
  getP1() {
    return this.p1;
  }

  /**
   * Returns the coordinates of the second point for this measurement.
   * @return {double[]} Coordinate set [x,y].
   */
  getP2() {
    return this.p2;
  }

  /**
   * Calculates distance between points 1 and 2 based on the given
   * scaling factor and returns in distance in pixels.
   * @return {double} Distance between P1 and P2 in pixels.
   */
  getDistanceInPixel() {
    if (this.p1 && this.p2) {
      const dx = this.p1.x - this.p2.x;
      const dy = this.p1.y - this.p2.y;
      const dist = Math.sqrt(dx*dx + dy*dy);
      return dist;
    } else {
      return '?';
    }
  }

  /**
   * Calculates distance between points 1 and 2 based on the given
   * scaling factor and returns in distance in cm.
   * @return {double} Distance between P1 and P2 in cm.
   */
  getDistanceInCm() {
    return this.distanceInCms;
    /*
    if (this.p1 && this.p2) {
      const dist = this.getDistanceInPixel();
      const CmInPx = (this.stage.getPPI()/2.54) * this.stage.getScaling()/100;
      const distInCm = Math.round((dist/CmInPx)*100)/100;
      return distInCm;
    } else {
      return '?';
    }*/
  }

  pan(dx, dy) {
    if (this.p1) {
      this.p1.x += dx;
      this.p1.y += dy;
      this.p1.baseX = this.p1.baseX + (dx / this.scaling);
      this.p1.baseY = this.p1.baseY + (dy / this.scaling);
    } 
    if (this.p2) {
      this.p2.x += dx;
      this.p2.y += dy;
      this.p2.baseX = this.p2.baseX + (dx / this.scaling);
      this.p2.baseY = this.p2.baseY + (dy / this.scaling);
    }
    this.drawMeasurement();
  }

  scale() {
    this.scaling = Scaler.scaling;
    if (this.p1) {
      this.p1.x = Scaler.x(this.p1.baseX);
      this.p1.y = Scaler.y(this.p1.baseY);
    }
    if (this.p2) {
      this.p2.x = Scaler.x(this.p2.baseX);
      this.p2.y = Scaler.y(this.p2.baseY);
    }
  }

  /**
   * Takes the currently saved coordinates for end points P1 and P2 and creates all necessary easelJS graphics elements
   * to draw the measurement line. The output consists of a Container object which encompasses Shapes for the end points,
   * a Shape for the line, and Text objects for the distance label.
   * @param {Object} mouse - mouse.x: current x position of mouse; mouse.y: current y position of mouse
   * @return {createjs.Container} CreateJS Container containing graphics for end points and measurement line.
   */
  drawMeasurement(mouse) {
    this.measurement.removeAllChildren();

    // Point 1
    if (this.p1) {
      const mPoint1 = new createjs.Shape();
      mPoint1.name = 'p1';
      mPoint1.graphics.beginFill(this.color)
          .drawCircle(0, 0, 5);
      mPoint1.x = this.p1.x;
      mPoint1.y = this.p1.y;

      mPoint1.on('pressmove', (event) => {
        this.setP1([event.stageX, event.stageY]);
        this.drawMeasurement();
        this.controller.update();
      });

      this.measurement.addChild(mPoint1);
    }

    // Point 2
    if (this.p2) {
      const mPoint2 = new createjs.Shape();
      mPoint2.name = 'p2';
      mPoint2.graphics.beginFill(this.color)
          .drawCircle(0, 0, 5);
      mPoint2.x = this.p2.x;
      mPoint2.y = this.p2.y;

      mPoint2.on('pressmove', (event) => {
        this.setP2([event.stageX, event.stageY]);
        this.drawMeasurement();
        this.controller.update();
      });

      this.measurement.addChild(mPoint2);
    }

    const mLine = new createjs.Shape();
    if (this.p1 && !this.p2 && mouse) {
      // Line from P1 to Mouse if P2 not yet decided
      mLine.graphics.setStrokeStyle(2)
          .beginStroke(this.color)
          .moveTo(this.p1.x, this.p1.y)
          .lineTo(mouse.x, mouse.y)
          .endStroke();
      this.measurement.addChildAt(mLine, 0);
      this.stage.update();
    } else if (this.p1 && this.p2) {
      // Line from P1 to P2, now movable
      mLine.graphics.setStrokeStyle(2)
          .beginStroke(this.color)
          .moveTo(this.p1.x, this.p1.y)
          .lineTo(this.p2.x, this.p2.y)
          .endStroke();

      mLine.on('mousedown', (event) => {
        mLine.mouseX = event.stageX;
        mLine.mouseY = event.stageY;
      });
      mLine.on('pressmove', (event) => {
        const deltaX = event.stageX - mLine.mouseX;
        const deltaY = event.stageY - mLine.mouseY;
        mLine.mouseX = event.stageX;
        mLine.mouseY = event.stageY;
        const p1 = this.getP1();
        const p2 = this.getP2();
        this.setP1([p1.x+deltaX, p1.y+deltaY]);
        this.setP2([p2.x+deltaX, p2.y+deltaY]);
        this.drawMeasurement();
        this.controller.update();
      });

      this.measurement.addChildAt(mLine, 0);
    }


    if (this.p1 && this.p2) {
      // Text and Text Shadow
      const mTextShadow = new createjs.Text(this.distanceInCms + ' cm', '', 'grey');
      const mTextShadow2 = new createjs.Text(this.distanceInCms + ' cm', '', 'black');
      const mText = new createjs.Text(this.distanceInCms + ' cm', '', this.color);
      mText.scale = mTextShadow.scale = mTextShadow2.scale = 1.7;
      const mTextBounds = mText.getBounds();
      mText.x = (this.p1.x + (this.p2.x-this.p1.x)/2) -
            mTextBounds.width * mText.scale/3;
      mText.y = (this.p1.y + (this.p2.y-this.p1.y)/2) + 20;
      mTextShadow.x = mText.x + 1;
      mTextShadow.y = mText.y + 1;
      mTextShadow2.x = mText.x - 1;
      mTextShadow2.y = mText.y - 1;

      this.measurement.addChild(mTextShadow);
      this.measurement.addChild(mTextShadow2);
      this.measurement.addChild(mText);
    }
    return this.measurement;
  }

  /**
   * TODO
   * @return {*}
   */
  getMeasurement() {
    return this.measurement;
  }

  /**
   * TODO
   * @return {*} color
   */
  getColor() {
    return this.color;
  }

  /**
   * TODO
   * @return {Boolean}
   */
  isComplete() {
    if (this.p1 && this.p2) {
      return true;
    } else {
      return false;
    }
  }
}

module.exports.Measurement = Measurement;
