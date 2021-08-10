'use strict';

/**
 * TODO
 */
class Fragment {
  /**
     * TODO
     * @param {*} controller
     * @param {*} id
     * @param {*} eventData
     */
  constructor(controller, id, eventData) {
    if (controller.isDevMode()) console.log('New Fragment:', eventData);
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
    this.framework = this.controller.getStage();
    this.stage = this.framework.stage;

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
    this.rectoRotation = data.rectoRotation;
    this.versoRotation = data.versoRotation;
    this.rotationDistance = data.rotationDistance;
    if (data.containerRotation) this.containerRotation = data.containerRotation;

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
    if (this.containerRotation) this.containerRecto.rotation = this.containerRotation;
    this.containerVerso = new createjs.Container();
    this.containerVerso.name = 'Inner Container - Verso';
    if (this.containerRotation) this.containerVerso.rotation = this.containerRotation;

    if (data.imageWidthRecto) this.containerRecto.imageWidth = data.imageWidthRecto;
    if (data.imageHeightRecto) this.containerRecto.imageHeight = data.imageHeightRecto;
    if (data.imageWidthVerso) this.containerVerso.imageWidth = data.imageWidthVerso;
    if (data.imageHeightVerso) this.containerVerso.imageHeight = data.imageHeightVerso;

    // create the image for the displayed side
    this.imageRecto = new createjs.Bitmap();
    this.imageRecto.id = id;
    this.imageRecto.cursor = 'pointer';
    this.imageRecto.x = 0;
    this.imageRecto.y = 0;
    this.imageRecto.name = 'Image - Recto';
    this.imageRecto.originalScale = this.originalScaleRecto;
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
    this.imageVerso.originalScale = this.originalScaleVerso;
    this.framework.registerImageEvents(this.imageVerso);
    this.containerVerso.addChild(this.imageVerso);
    if (this.versoRotation) this.imageVerso.rotation = this.versoRotation;
    if (this.ppiVerso) this.imageVerso.scale = 96 / this.ppiVerso;

    this._createImage(eventData, this.isRecto);

    // create the fragment container
    this.container = this._createContainer(data, id);
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
      const newX = (this.baseX+this.framework.offset.baseX) * this.container.scale;
      const newY = (this.baseY+this.framework.offset.baseY) * this.container.scale;
      this.moveToPixel(newX, newY);
    }
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

    return image;
  }

  /**
   * TODO
   * @param {*} polygon
   * @return {*}
   */
  _createMask(polygon) {
    if (!polygon) return null;
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
    container.scale = this.stage.scaling / 100;

    if (imageProperties.xPos && imageProperties.yPos) {
      container.x = imageProperties.xPos;
      container.y = imageProperties.yPos;
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

    this.baseX = (this.container.x - this.framework.offset.x) / this.container.scale;
    this.baseY = (this.container.y - this.framework.offset.y) / this.container.scale;

    // this.baseX = this.baseX + (distX / this.container.scale);
    // this.baseY = this.baseY + (distY / this.container.scale);
  }

  /**
   * Moves the fragment to a particular position on the table, given by the x and y coordinate. These coordinates
   * are "in scale", and thus refer to the scaling situation on the table. 
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
    this.containerRecto.rotation += deltaAngle;
    this.containerVerso.rotation += deltaAngle;
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
        this._createImage(event, this.isRecto);
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
    if (!inverted) this.controller.updateSidebarFragmentList();
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
    if (start) this.getImage().rotation *= -1;
    this.stage.update();
  }

  /**
   * TODO
   * @param {Boolean} inverted
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
      'containerRotation': this.containerRecto.rotation,
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
      'imageWidthRecto': this.containerRecto.imageWidth,
      'imageHeightRecto': this.containerRecto.imageHeight,
      'imageWidthVerso': this.containerVerso.imageWidth,
      'imageHeightVerso': this.containerVerso.imageHeight,
      'scale': this.container.scale,
    };
  }

  /**
   * TODO
   * @param {Object} data
   */
  setData(data) {
    this.name = data['name'];
    this.isRecto = data['recto'];
    this.urlRecto = data['rectoURL'];
    this.urlVerso = data['versoURL'];
    this.container.x = data['xPos'];
    this.baseX = data['baseX'];
    this.container.y = data['yPos'];
    this.baseY = data['baseY'];
    this.container.rotation = data['rotation'];
    this.containerRecto.rotation = data['containerRotation'];
    this.originalScaleRecto = data['originalScaleRecto'];
    this.originaScaleVerso = data['originalScaleVerso'];
    this.ppiRecto = data['ppiRecto'];
    this.ppiVersio = data['ppiVerso'];
    this.rectoRotation = data['rectoRotation'];
    this.versoRotation = data['versoRotation'];
    this.rotationDistance = data['rotationDistance'];
    this.alignOffsetX = data['offsetX'];
    this.alignOffsetY = data['offsetY'];
    this.containerRecto.imageWidth = data['imageWidthRecto'];
    this.containerRecto.imageHeight = data['imageHeightRecto'];
    this.containerVerso.imageWidth = data['imageWidthVerso'];
    this.containerVerso.imageHeight = data['imageHeightVerso'];
    this.container.scale = data['scale'];

    this.maskRecto = this._createMask(data['maskRecto']);
    this.maskVerso = this._createMask(data['maskVerso']);
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

  /**
   *
   * @return {*}
   */
  getBounds() {
    const fragmentBounds = {
      id: this.id,
      reference: null,
      type: null,
      left: null,
      right: null,
      top: null,
      bottom: null,
      width: null,
      height: null,
      cx: null,
      cy: null,
    };

    // case 1: fragment has NO vector mask
    if (!this.getMask()) {
      fragmentBounds['type'] = 'no_mask';
      const bounds = this.getInnerContainer().getTransformedBounds();
      if (!bounds) return null;
      fragmentBounds['reference'] = this.getContainer();
      fragmentBounds['left'] = bounds.x;
      fragmentBounds['right'] = bounds.x + bounds.width;
      fragmentBounds['top'] = bounds.y;
      fragmentBounds['bottom'] = bounds.y + bounds.height;
      fragmentBounds['width'] = bounds.width;
      fragmentBounds['height'] = bounds.height;
      fragmentBounds['cx'] = (fragmentBounds['left']+fragmentBounds['right'])/2;
      fragmentBounds['cy'] = (fragmentBounds['top']+fragmentBounds['bottom'])/2;
    } else {
    // case 2: fragment does have vector mask (box or polygon)
      fragmentBounds['type'] = 'vector_mask';
      const mask = this.getMask();
      const polygon = mask.polygon;
      const xs = [];
      const ys = [];

      for (const idx in polygon) {
        if (Object.prototype.hasOwnProperty.call(polygon, idx)) {
          let node = {x: polygon[idx][0], y: polygon[idx][1]};
          if (this.getImage().rotation != 0) {
            let maskCenter = {x: this.getMask().cx, y: this.getMask().cy};

            if (this.getImage().originalScale/* < 1*/) {
              const scale = 1/this.getImage().originalScale;
              let imageCx; let imageCy;
              if (this.getImage().image) {
                imageCx = this.getImage().image.width / 2;
                imageCy = this.getImage().image.height / 2;
              } else {
                imageCx = this.getInnerContainer().imageWidth / 2;
                imageCy = this.getInnerContainer().imageHeight / 2;
              }

              const maskNewX = imageCx - (scale * (imageCx - maskCenter.x));
              const maskNewY = imageCy - (scale * (imageCy - maskCenter.y));
              maskCenter = {x: maskNewX*this.getImage().scale, y: maskNewY*this.getImage().scale};
            }


            const inversionMatrix = this.getImage().getMatrix().invert();
            const p = inversionMatrix.transformPoint(-maskCenter.x, -maskCenter.y);
            let m = new createjs.Matrix2D(); // this.getMask().getMatrix();
            m = m.translate(p.x, p.y);
            m = m.rotate(-this.getImage().rotation);
            node = m.transformPoint(node.x, node.y);
          }

          const nodeGlobal = this.getImage().localToGlobal(node.x, node.y);
          xs.push(nodeGlobal.x);
          ys.push(nodeGlobal.y);
        }
      }

      let xMin = Math.min(...xs);
      let xMax = Math.max(...xs);
      let yMin = Math.min(...ys);
      let yMax = Math.max(...ys);

      if (this.getImage().originalScale < 1) {
        const scale = 1/this.getImage().originalScale;
        let imageCx; let imageCy;
        if (this.getImage().image) {
          imageCx = this.getImage().image.width / 2;
          imageCy = this.getImage().image.height / 2;
        } else {
          imageCx = this.getInnerContainer().imageWidth / 2;
          imageCy = this.getInnerContainer().imageHeight / 2;
        }

        const imageC = this.getImage().localToGlobal(imageCx, imageCy);
        imageCx = imageC.x;
        imageCy = imageC.y;

        xMin = imageCx - (scale * (imageCx - xMin));
        xMax = imageCx - (scale * (imageCx - xMax));
        yMin = imageCy - (scale * (imageCy - yMin));
        yMax = imageCy - (scale * (imageCy - yMax));
      }

      const tl = this.getImage().globalToLocal(xMin, yMin);
      const br = this.getImage().globalToLocal(xMax, yMax);

      fragmentBounds['left'] = tl.x;
      fragmentBounds['right'] = br.x;
      fragmentBounds['top'] = tl.y;
      fragmentBounds['bottom'] = br.y;
      fragmentBounds['reference'] = this.getImage();
      fragmentBounds['width'] = Math.abs(fragmentBounds['right'] - fragmentBounds['left']);
      fragmentBounds['height'] = Math.abs(fragmentBounds['bottom'] - fragmentBounds['top']);
      fragmentBounds['cx'] = (fragmentBounds['left']+fragmentBounds['right'])/2;
      fragmentBounds['cy'] = (fragmentBounds['top']+fragmentBounds['bottom'])/2;
    }

    return fragmentBounds;
  }

  /**
   *
   * @return {*}
   */
  getGlobalBounds() {
    const fragmentBounds = this.getBounds();
    if (!fragmentBounds) return null;

    const reference = fragmentBounds['reference'];
    const tl = reference.localToGlobal(fragmentBounds.left, fragmentBounds.top);
    const br = reference.localToGlobal(fragmentBounds.right, fragmentBounds.bottom);

    const left = tl.x;
    const right = br.x;
    const top = tl.y;
    const bottom = br.y;

    fragmentBounds['left'] = Math.min(left, right);
    fragmentBounds['right'] = Math.max(left, right);
    fragmentBounds['top'] = Math.min(top, bottom);
    fragmentBounds['bottom'] = Math.max(top, bottom);
    fragmentBounds['cx'] = fragmentBounds['width'] / 2;
    fragmentBounds['cy'] = fragmentBounds['height'] / 2;
    fragmentBounds['reference'] = 'global';

    return fragmentBounds;
  }
}

module.exports.Fragment = Fragment;
