const {TouchBarSlider, TouchBarOtherItemsProxy} = require('electron');

/**
 * TODO
 */
class Fragment {
  /**
     * TODO
     * @param {*} controller
     * @param {*} stageObject
     * @param {*} id
     * @param {*} eventData
     */
  constructor(controller, stageObject, id, eventData) {
    console.log('New Fragment:', eventData);
    /*
      List of Properties (alphabetical):

      - this.baseX
      - this.baseY
      - this.container
      - this.controller
      - this.framework
      - this.id
      - this.image
      - this.imageRecto
      - this.imageVerso
      - this.isBothSidesLoaded
      - this.isSelected
      - this.isRecto
      - this.maskRecto
      - this.maskVerso
      - this.name
      - this.ppiRecto
      - this.ppiVerso
      - this.rectoRotation
      - this.rotationDistance
      - this.stage
      - this.urlRecto
      - this.urlVerso
    */
    // control and framework elements
    this.controller = controller;
    this.framework = stageObject;
    this.stage = stageObject.stage;

    const data = eventData.item.properties;

    // basic fragment data
    this.id = id;
    this.isBothSidesLoaded = false;
    this.isSelected = false;
    this.isRecto = data.recto;
    this.urlRecto = data.rectoURL;
    this.urlVerso = data.versoURL;
    this.name = data.name;

    this.rotationDistance = 0;
    this.tempRotation = 0;

    // fragment masks (crop boxes, polygons...)
    if (data.maskRecto) {
      this.maskRecto = this._createMask(data.maskRecto);
    }
    if (data.maskVerso) {
      this.maskVerso = this._createMask(data.maskVerso);
    }

    this.originalScaleRecto = 1;
    this.originalScaleVerso = 1;
    if (data.originalScaleRecto) this.originalScaleRecto = data.originalScaleRecto;
    if (data.originalScaleVerso) this.originalScaleVerso = data.originalScaleVerso;

    // rotation distance (between recto and verso)
    if (data.rotationDistance) {
      this.rectoRotation = data.rectoRotation;
      this.versoRotation = data.versoRotation;
      this.rotationDistance = data.rotationDistance;
    }

    // ppi information
    if (data.ppiRecto) {
      this.ppiRecto = data.ppiRecto;
    }
    if (data.ppiVerso) {
      this.ppiVerso = data.ppiVerso;
    }

    // alignment offsets
    this.alignOffsetX = this.alignOffsetY = 0;
    if (data.offsetX &&
      data.offsetY) {
      this.alignOffsetX = data.offsetX;
      this.alignOffsetY = data.offsetY;
    }

    // create inner Containers for images
    this.containerRecto = new createjs.Container();
    this.containerRecto.name = 'Inner Container - Recto';
    this.containerVerso = new createjs.Container();
    this.containerVerso.name = 'Inner Container - Verso';

    // create the image for the displayed side
    this.imageRecto = new createjs.Bitmap();
    this.imageRecto.id = id;
    this.imageRecto.cursor = 'pointer';
    this.imageRecto.x = 0;
    this.imageRecto.y = 0;
    this.imageRecto.name = 'Image - Recto';
    this.framework.registerImageEvents(this.imageRecto);
    this.containerRecto.addChild(this.imageRecto);
    if (this.rectoRotation) this.imageRecto.rotation = this.rectoRotation;
    if (this.ppiRecto) this.imageRecto.scale = 96 / this.ppiRecto;

    this.imageVerso = new createjs.Bitmap();
    this.imageVerso.id = id;
    this.imageVerso.cursor = 'pointer';
    this.imageVerso.x = 0;
    this.imageVerso.y = 0;
    this.imageVerso.name = 'Image - Verso';
    this.framework.registerImageEvents(this.imageVerso);
    this.containerVerso.addChild(this.imageVerso);
    if (this.versoRotation) this.imageVerso.rotation = this.versoRotation;
    if (this.ppiVerso) this.imageVerso.scale = 96 / this.ppiVerso;

    this._createImage(eventData, this.isRecto);

    /*
    const image = this._createImage(eventData, id);
    if (this.isRecto) {
      this.imageRecto = image;
      this.containerRecto.addChild(this.imageRecto);
    } else {
      this.imageVerso = image;
      this.containerVerso.addChild(this.imageVerso);
    }*/

    // create the fragment container
    this.container = this._createContainer(data, id);
    this._setContainerRegs();
    if (this.isRecto) this.container.addChild(this.containerRecto);
    else this.container.addChild(this.containerVerso);

    if (data.baseX) {
      this.baseX = data.baseX;
    } else {
      this.baseX = this.container.x / this.container.scale;
    }

    if (data.baseY) {
      this.baseY = data.baseY;
    } else {
      this.baseY = this.container.y / this.container.scale;
    }

    if (data.baseX && data.baseY) {
      const newX = this.baseX * this.container.scale;
      const newY = this.baseY * this.container.scale;
      this.moveToPixel(newX, newY);
    }
  }

  /**
   * TODO
   */
  _setContainerRegs() {
    /*
    if (this.maskRecto && this.isRecto) {
      this.container.regX = this.maskRecto.cx;
      this.container.regY = this.maskRecto.cy;
    } else if (this.maskVerso && !this.isRecto) {
      this.container.regX = this.maskVerso.cx;
      this.container.regY = this.maskVerso.cy;
    } else {
      this.container.regX = this.getImage().image.width / 2;
      this.container.regY = this.getImage().image.height / 2;
    }
    */
    this.container.regX = 0;
    this.container.regY = 0;
  }

  /**
   * TODO
   * @param {*} eventData
   * @param {*} isRecto
   * @return {*}
   */
  _createImage(eventData, isRecto) {
    let image;
    if (isRecto) {
      image = this.imageRecto;
    } else {
      image = this.imageVerso;
    }
    const loading = new createjs.Bitmap(eventData.result);
    image.image = loading.image;
    image.regX = image.image.width / 2;
    image.regY = image.image.height / 2;

    if (this.isRecto) {
      if (this.maskRecto) {
        image.mask = this.maskRecto;
        this.maskRecto.regX = this.maskRecto.cx;
        this.maskRecto.regY = this.maskRecto.cy;
        this.maskRecto.scale = image.scale / this.originalScaleRecto;
        image.x = (image.regX - this.maskRecto.cx) * this.maskRecto.scale;
        image.y = (image.regY - this.maskRecto.cy) * this.maskRecto.scale;
      }
    } else {
      if (this.maskVerso) {
        image.mask = this.maskVerso;
        this.maskVerso.regX = this.maskVerso.cx;
        this.maskVerso.regY = this.maskVerso.cy;
        this.maskVerso.scaleX *= Math.abs(image.scale) / this.originalScaleVerso;
        this.maskVerso.scaleY = Math.abs(image.scale) / this.originalScaleVerso;

        image.regX = this.alignOffsetX;
        image.regY = this.alignOffsetY;
      }
    }

    // image.scale = this.stage.scaling / 100;
    return image;
  }

  /**
   * TODO
   * @param {*} polygon
   * @return {*}
   */
  _createMask(polygon) {
    const mask = new createjs.Shape();
    let started = false;

    let l; let r; let t; let b;

    for (const node in polygon) {
      if (Object.prototype.hasOwnProperty.call(polygon, node)) {
        const x = polygon[node][0];
        const y = polygon[node][1];

        (!l ? l = x : l = Math.min(l, x));
        (!r ? r = x : r = Math.max(r, x));
        (!t ? t = y : t = Math.min(t, y));
        (!b ? b = y : b = Math.max(b, y));

        if (!started) {
          started = true;
          mask.graphics.moveTo(x, y);
        } else {
          mask.graphics.lineTo(x, y);
        }
      }
    }
    mask.polygon = polygon;
    mask.w = r-l,
    mask.h = b-t,
    mask.cx = (l+r)/2;
    mask.cy = (b+t)/2;

    return mask;
  }

  /**
   * TODO
   * @param {*} imageProperties
   * @param {*} id
   * @return {*}
   */
  _createContainer(imageProperties, id) {
    const container = new createjs.Container();

    // container.rotation = imageProperties.rotation;
    container.scale = this.stage.scaling / 100;

    if (imageProperties.xPos && imageProperties.yPos) {
      container.x = imageProperties.xPos;
      // * (this.stage.scaling / 100) + this.stage.offset.x;
      container.y = imageProperties.yPos;
      // * (this.stage.scaling / 100) + this.stage.offset.y;
    } else {
      const canvasCenter = this.controller.getCanvasCenter();
      container.x = canvasCenter.x;
      container.y = canvasCenter.y;
    }
    container.name = 'Container';
    container.id = id;

    return container;
  }

  /**
   * TODO
   * @param {*} distX Number of pixels in current scaling by which
   * the image has to be moved in x direction.
   * @param {*} distY Number of pixels in current scaling by which
   * the image has to be moved in y direction.
   */
  moveByDistance(distX, distY) {
    this.container.x += distX;
    this.container.y += distY;

    this.baseX = this.baseX + (distX / this.container.scale);
    this.baseY = this.baseY + (distY / this.container.scale);
  }

  /**
   * TODO
   * @param {*} x
   * @param {*} y
   */
  moveToPixel(x, y) {
    this.container.x = x;
    this.container.y = y;
  }

  /**
   * TODO
   * @param {*} targetAngle
   */
  rotateToAngle(targetAngle) {
    this.containerRecto.rotation = targetAngle%360;
    this.containerVerso.rotation = targetAngle%360;
  }

  /**
   * TODO
   * @param {*} deltaAngle
   */
  rotateByAngle(deltaAngle) {
    // this.rotateToAngle(this.container.rotation + deltaAngle);
    if (this.isRecto) {
      this.containerRecto.rotation += deltaAngle;
      this.containerVerso.rotation += deltaAngle;
    } else {
      this.containerVerso.rotation += deltaAngle;
      this.containerRecto.rotation += deltaAngle;
    }
  }

  /**
   * TODO
   * @param {*} scaling
   */
  scaleToValue(scaling) {
    this.container.scale = scaling;
  }

  /**
   * TODO
   * @param {*} inverted
   */
  flip(inverted) {
    // WARNING: The "current" side is changed immediately!
    this.isRecto = !this.isRecto;
    // version A: the second side has still to be loaded
    if (!this.isBothSidesLoaded) {
      const loadqueue = new createjs.LoadQueue();
      loadqueue.addEventListener('fileload', (event) => {
        // once the file is loaded, the following should happen
        this._createImage(event, this.isRecto);
        // if (inverted) this.getImage().scaleX *= -1;
        if (this.isRecto) {
          // register image as new recto file
          // if (inverted) this.maskRecto.scaleX *= -1;
          // this.imageRecto = secondSideImage;
          // this.containerRecto.addChild(this.imageRecto);
        } else {
          // register image as new verso file
          // if (inverted) this.maskVerso.scaleX *= -1;
          // this.imageVerso = secondSideImage;
          // this.containerVerso.addChild(this.imageVerso);
        }
        this.isBothSidesLoaded = true;
        this.framework._updateBb();
        this.stage.update();
      });
      let url;
      if (this.isRecto) url = this.urlRecto;
      else url = this.urlVerso;
      loadqueue.loadFile(url);
      loadqueue.load();
    }

    if (this.isRecto) {
      this.container.removeChild(this.containerVerso);
      this.container.addChild(this.containerRecto);
    } else {
      this.container.removeChild(this.containerRecto);
      this.container.addChild(this.containerVerso);
    }
    if (!inverted) this.controller.updateFragmentList();
  }

  /**
   * TODO
   * @param {*} start
   */
  ghost(start) {
    if (!start) this.getImage().scaleX *= -1;
    if (!start && this.getMask()) this.getMask().scaleX *= -1;
    if (!start && this.isRecto) this.getImage().rotation *= -1;
    if (!start && this.getMask()) this.getImage().x *= -1;
    if (!start ) this.getImage().rotation = this.tempRotation;
    this.flip(true);
    if (start) this.getImage().scaleX *= -1;
    if (start && this.getMask()) this.getMask().scaleX *= -1;
    if (start && this.getMask()) this.getImage().x *= -1;
    if (start) this.tempRotation = this.getImage().rotation;
    // if (start && this.isRecto) this.imageRecto.x *= -1;
    // if (start && this.isRecto) this.getImage().rotation -= 2*this.rotation;
    if (start) this.getImage().rotation *= -1;
    this.stage.update();
  }

  /**
   * TODO
   */
  translateRotation(inverted) {
    if (inverted) {
      if (this.isRecto) {
        this.container.rotation += this.rotationDistance;
      } else {
        this.container.rotation -= this.rotationDistance;
      }
    } else {
      if (this.isRecto) {
        this.container.rotation -= this.rotationDistance;
      } else {
        this.container.rotation += this.rotationDistance;
      }
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getContainer() {
    return this.container;
  }

  /**
   * TODO
   * @return {*}
   */
  getImage() {
    if (this.isRecto) {
      return this.imageRecto;
    } else {
      return this.imageVerso;
    }
  }

  getHiddenImage() {
    if (this.isRecto) {
      return this.imageVerso;
    } else {
      return this.imageRecto;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getMask() {
    if (!this.isRecto && this.maskRecto) {
      return this.maskRecto;
    } else if (this.isRecto && this.maskVerso) {
      return this.maskVerso;
    } else {
      return null;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getInnerContainer() {
    if (this.isRecto) {
      return this.containerRecto;
    } else {
      return this.containerVerso;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getImageURL() {
    if (this.isRecto) {
      return this.urlRecto;
    } else {
      return this.urlVerso;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getData() {
    let rectoPolygon = null;
    let versoPolygon = null;
    if (this.maskRecto) {
      rectoPolygon = this.maskRecto.polygon;
    }
    if (this.maskVerso) {
      versoPolygon = this.maskVerso.polygon;
    }
    return {
      'name': this.name,
      'recto': this.isRecto,
      'rectoURL': this.urlRecto,
      'versoURL': this.urlVerso,
      'xPos': this.container.x,
      'baseX': this.baseX,
      'yPos': this.container.y,
      'baseY': this.baseY,
      'rotation': this.container.rotation,
      'maskRecto': rectoPolygon,
      'maskVerso': versoPolygon,
      'originalScaleRecto': this.originalScaleRecto,
      'originalScaleVerso': this.originalScaleVerso,
      'ppiRecto': this.ppiRecto,
      'ppiVerso': this.ppiVerso,
      'rectoRotation': this.rectoRotation,
      'versoRotation': this.versoRotation,
      'rotationDistance': this.rotationDistance,
      'offsetX': this.alignOffsetX,
      'offsetY': this.alignOffsetY,
    };
  }

  /**
   * TODO
   * @return {*}
   */
  getName() {
    return this.name;
  }

  /**
   * TODO
   * @return {*}
   */
  getPosition() {
    return {
      x: this.container.x,
      y: this.container.y,
      baseX: this.baseX,
      baseY: this.baseY,
    };
  }

  /**
   * @return {*}
   */
  getBaseX() {
    return this.baseX;
  }

  /**
   * TODO
   * @return {*}
   */
  getX() {
    return this.container.x;
  }

  /**
   * @return {*}
   */
  getBaseY() {
    return this.baseY;
  }

  /**
   * TODO
   * @return {*}
   */
  getY() {
    return this.container.y;
  }

  /**
   * TODO
   * @return {*}
   */
  getRotation() {
    return this.containerRecto.rotation;
  }

  /**
   * @return {*}
   */
  getMask() {
    if (this.isRecto && this.maskRecto) {
      return this.maskRecto;
    } else if (!this.isRecto && this.maskVerso) {
      return this.maskVerso;
    } else {
      return null;
    }
  }

  /**
   * @return {*}
   */
  getMaskBounds() {
    let l; let r; let t; let b;
    if (this.getMask()) {
      const polygon = this.getMask().polygon;

      for (const node in polygon) {
        if (Object.prototype.hasOwnProperty.call(polygon, node)) {
          const x = polygon[node][0];
          const y = polygon[node][1];

          (!l ? l = x : l = Math.min(l, x));
          (!r ? r = x : r = Math.max(r, x));
          (!t ? t = y : t = Math.min(t, y));
          (!b ? b = y : b = Math.max(b, y));
        }
      }

      return {
        l: l,
        r: r,
        t: t,
        b: b,
        w: r-l,
        h: b-t,
        cx: (r-l)/2,
        cy: (b-t)/2,
      };
    } else {
      return null;
    }
  }
}

module.exports.Fragment = Fragment;
