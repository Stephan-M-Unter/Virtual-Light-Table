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

    // basic fragment data
    this.id = id;
    this.isBothSidesLoaded = false;
    this.isSelected = false;
    this.isRecto = eventData.item.properties.recto;
    this.urlRecto = eventData.item.properties.rectoURL;
    this.urlVerso = eventData.item.properties.versoURL;
    this.name = eventData.item.properties.name;

    this.rotationDistance = 0;

    // fragment masks (crop boxes, polygons...)
    if (eventData.item.properties.maskRecto) {
      this.maskRecto = this._createMask(eventData.item.properties.maskRecto);
    }
    if (eventData.item.properties.maskVerso) {
      this.maskVerso = this._createMask(eventData.item.properties.maskVerso);
    }

    // rotation distance (between recto and verso)
    if (eventData.item.properties.rotationDistance) {
      this.rotationDistance = eventData.item.properties.rotationDistance;
    }

    // ppi information
    if (eventData.item.properties.ppiRecto) {
      this.ppiRecto = eventData.item.properties.ppiRecto;
    }
    if (eventData.item.properties.ppiVerso) {
      this.ppiVerso = eventData.item.properties.ppiVerso;
    }

    // alignment offsets
    this.alignOffsetX = this.alignOffsetY = 0;
    if (eventData.item.properties.offsetX &&
      eventData.item.properties.offsetY) {
      this.alignOffsetX = eventData.item.properties.offsetX;
      this.alignOffsetY = eventData.item.properties.offsetY;
    }

    // create the image for the displayed side
    if (this.isRecto ? this.imageRecto = this._createImage(eventData, id) :
        this.imageVerso = this._createImage(eventData, id));

    // create the fragment container
    this.container = this._createContainer(eventData.item.properties, id);
    this._setContainerRegs();

    if (this.isRecto ? this.container.addChild(this.imageRecto) :
        this.container.addChild(this.imageVerso));

    if (eventData.item.properties.baseX) {
      this.baseX = eventData.item.properties.baseX;
    } else {
      this.baseX = this.container.x / this.container.scale;
    }

    if (eventData.item.properties.baseY) {
      this.baseY = eventData.item.properties.baseY;
    } else {
      this.baseY = this.container.y / this.container.scale;
    }

    if (eventData.item.properties.baseX && eventData.item.properties.baseY) {
      const newX = this.baseX * this.container.scale;
      const newY = this.baseY * this.container.scale;
      this.moveToPixel(newX, newY);
    }
  }

  /**
   * TODO
   */
  _setContainerRegs() {
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
  }

  /**
   * TODO
   * @param {*} eventData
   * @param {*} id
   * @return {*}
   */
  _createImage(eventData, id) {
    const image = new createjs.Bitmap(eventData.result);

    if (this.isRecto) {
      image.name = 'Image - Recto';
      if (this.maskRecto) {
        image.mask = this.maskRecto;
      }
      if (this.rectoRotation) {
        image.rotation = this.rectoRotation;
      }
      if (this.ppiRecto) {
        image.scale = 96 / this.ppiRecto;
      }
    } else {
      image.name = 'Image - Verso';
      if (this.maskVerso) {
        image.mask = this.maskVerso;
      }
      if (this.versoRotation) {
        image.rotation = this.versoRotation;
      }
      if (this.ppiVerso) {
        image.scale = 96 / this.ppiVerso;
      }
    }
    image.cursor = 'pointer';
    image.x = 0;
    image.y = 0;
    image.id = id;
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

    container.rotation = imageProperties.rotation;
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
    this.container.rotation = targetAngle%360;
  }

  /**
   * TODO
   * @param {*} deltaAngle
   */
  rotateByAngle(deltaAngle) {
    this.rotateToAngle(this.container.rotation + deltaAngle);
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
    this.isRecto = !this.isRecto;
    if (this.isBothSidesLoaded) {
      this.image.x = 0;
      if (this.image.scale < 0) {
        this.image.scale *= -1;
      }
      // both sides have already been loaded to the application
      this.container.removeChild(this.image);
      if (this.isRecto ? this.image = this.imageRecto :
            this.image = this.imageVerso);
      if (inverted) {
        if (this.getMaskBounds()) {
          const bounds = this.getMaskBounds();
          this.image.x = bounds.r+bounds.l;
        }
        //this.image.x = this.image.image.width;
        this.image.scaleX *= -1;
      }
      this.container.addChild(this.image);
      this._setContainerRegs();
      this.stage.update();
    } else {
      // second side still to be loaded
      const loadqueue = new createjs.LoadQueue();
      loadqueue.addEventListener('fileload', (event) => {
        const secondImage = this._createImage(event, this.id);

        if (this.isRecto) {
          this.imageRecto = secondImage;
          this.framework.registerImageEvents(this.imageRecto);
          this.container.removeChild(this.imageVerso);
          this.image = this.imageRecto;
          this.container.addChild(this.image);
        } else {
          this.imageVerso = secondImage;
          this.framework.registerImageEvents(this.imageVerso);
          this.container.removeChild(this.imageRecto);
          this.image = this.imageVerso;
          this.container.addChild(this.image);
        }
        this._setContainerRegs();
        if (inverted) {
          if (this.getMaskBounds()) {
            const bounds = this.getMaskBounds();
            this.image.x = bounds.r+bounds.l;
          }
          this.image.scaleX *= -1;
        }
        this.isBothSidesLoaded = true;
        this.framework._updateBb();
        this.stage.update();
      });
      let url;
      if (this.isRecto ? url=this.urlRecto : url=this.urlVerso);
      loadqueue.loadFile(url);
      loadqueue.load();
    }

    if (this.isRecto) {
      if (inverted) {
        this.inverted = true;
        this.rotationDistance = -this.rotationDistance;
        this.container.rotation += this.rotationDistance;
      } else if (this.inverted) {
        this.inverted = false;
        this.container.rotation -= this.rotationDistance;
        this.rotationDistance = -this.rotationDistance;
      } else {
        this.container.rotation -= this.rotationDistance;
      }
    } else {
      if (inverted) {
        this.inverted = true;
        this.container.rotation -= this.rotationDistance;
        this.rotationDistance = -this.rotationDistance;
      } else if (this.inverted) {
        this.inverted = false;
        this.container.rotation -= this.rotationDistance;
        this.rotationDistance = -this.rotationDistance;
      } else {
        this.container.rotation += this.rotationDistance;
      }
    }

    if (!inverted) {
      this.controller.updateFragmentList();
    }

    this.framework.update();

    // Möglichkeit 2: Bild existiert
    // dann einfach bilder austauschen
    // flag umdrehen
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
    if (this.maskRecto) {rectoPolygon = this.maskRecto.polygon;}
    if (this.maskVerso) {versoPolygon = this.maskVerso.polygon;}
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
      'ppiRecto': this.ppiRecto,
      'ppiVerso': this.ppiVerso,
      'rectoRotation': this.rectoRotation,
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
    return this.container.rotation;
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
