/**
 * TODO
 */
class Measurement {
  /**
     * Constructor for new Measurement.
     * @param {*} stage
     * @param {int} id - Individual, unique ID for a measurement.
     * @param {String} color - Color code.
     */
  constructor(stage, id, color) {
    this.stage = stage;
    this.id = id;
    this.color = color;
    this.p1 = null;
    this.p2 = null;
    this.measurement = new createjs.Container();
    this.measurement.id = id;
  }

  /**
   * Sets the coordinates of the first point for this measurement.
   * @param {[x, y]} point
   */
  setP1(point) {
    this.p1 = point;
  }

  /**
   * Sets the coordinates of the second point for this measurement.
   * @param {[x, y]} point
   */
  setP2(point) {
    this.p2 = point;
  }

  /**
   * TODO
   * @param {*} point
   */
  setPoint(point) {
    if (!this.p1) {
      this.p1 = point;
    } else {
      this.p2 = point;
    }
  }

  /**
   * TODO
   */
  clearPoints() {
    this.p1 = null;
    this.p2 = null;
    this.measurement.removeAllChildren();
  }

  /**
   * Returns measurement ID.
   * @return {int}
   */
  getID() {
    return this.id;
  }

  /**
   * Returns the coordinates of the first point for this measurement.
   * @return {[x, y]}
   */
  getP1() {
    return this.p1;
  }

  /**
   * Returns the coordinates of the second point for this measurement.
   * @return {[x, y]}
   */
  getP2() {
    return this.p2;
  }

  /**
   * Calculates distance between points 1 and 2 based on the given
   * scaling factor and returns in distance in pixels.
   * @param {double} scalingFactor
   * @return {double}
   */
  getDistanceInPixel() {
    if (this.p1 && this.p2) {
      const dx = this.p1[0] - this.p2[0];
      const dy = this.p1[1] - this.p2[1];
      const dist = Math.sqrt(dx*dx + dy*dy);
      return dist;
    } else {
      return '?';
    }
  }

  /**
   * Calculates distance between points 1 and 2 based on the given
   * scaling factor and returns in distance in cm.
   * @param {double} scalingFactor
   * @return {double}
   */
  getDistanceInCm() {
    if (this.p1 && this.p2) {
      const dist = this.getDistanceInPixel();
      const CmInPx = 38 * this.stage.stage.scaling/100;
      const distInCm = Math.round(dist/CmInPx*100)/100;
      return distInCm;
    } else {
      return '?';
    }
  }

  /**
   * TODO
   * @param {double} scale
   * @return {*}
   */
  drawMeasurement() {
    if (this.p1 && this.p2) {
      this.measurement.removeAllChildren();

      // Measurement Line
      const mLine = new createjs.Shape();
      mLine.graphics.setStrokeStyle(2)
          .beginStroke(this.color)
          .moveTo(this.p1[0], this.p1[1])
          .lineTo(this.p2[0], this.p2[1])
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
        this.setP1([p1[0]+deltaX, p1[1]+deltaY]);
        this.setP2([p2[0]+deltaX, p2[1]+deltaY]);
        this.drawMeasurement();
        this.stage.update();
        this.stage.updateMeasurements();
      });

      // Point 1
      const mPoint1 = new createjs.Shape();
      mPoint1.name = 'p1';
      mPoint1.graphics.beginFill(this.color)
          .drawCircle(0, 0, 5);
      mPoint1.x = this.p1[0];
      mPoint1.y = this.p1[1];

      mPoint1.on('pressmove', (event) => {
        this.setP1([event.stageX, event.stageY]);
        this.drawMeasurement();
        this.stage.update();
        this.stage.updateMeasurements();
      });

      // Point 2
      const mPoint2 = new createjs.Shape();
      mPoint2.name = 'p2';
      mPoint2.graphics.beginFill(this.color)
          .drawCircle(0, 0, 5);
      mPoint2.x = this.p2[0];
      mPoint2.y = this.p2[1];

      mPoint2.on('pressmove', (event) => {
        this.setP2([event.stageX, event.stageY]);
        this.drawMeasurement();
        this.stage.update();
        this.stage.updateMeasurements();
      });

      // Text and Text Shadow
      const distInCm = this.getDistanceInCm(this.stage.stage.scaling/100);
      const mTextShadow = new createjs.Text(distInCm + ' cm', '', 'grey');
      const mTextShadow2 = new createjs.Text(distInCm + ' cm', '', 'black');
      const mText = new createjs.Text(distInCm + ' cm', '', this.color);
      mText.scale = mTextShadow.scale = mTextShadow2.scale = 1.7;
      const mTextBounds = mText.getBounds();
      mText.x = (this.p1[0] + (this.p2[0]-this.p1[0])/2) -
            mTextBounds.width * mText.scale/3;
      mText.y = (this.p1[1] + (this.p2[1]-this.p1[1])/2) + 20;
      mTextShadow.x = mText.x + 1;
      mTextShadow.y = mText.y + 1;
      mTextShadow2.x = mText.x - 1;
      mTextShadow2.y = mText.y - 1;

      this.measurement.addChild(mLine);
      this.measurement.addChild(mPoint1);
      this.measurement.addChild(mPoint2);
      this.measurement.addChild(mTextShadow);
      this.measurement.addChild(mTextShadow2);
      this.measurement.addChild(mText);
    } else {
      // if not both end points are given, return empty container
      this.measurement.removeAllChildren();
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
}

module.exports.Measurement = Measurement;
