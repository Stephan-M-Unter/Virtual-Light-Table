'use strict';

const { getAllTags } = require("exif-js");

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

    // control and framework elements
    this.controller = controller;
    this.framework = this.controller.getStage();
    this.stage = this.framework.stage;

    const data = eventData.item.properties;

    // basic fragment data
    this.id = id;
    this.isBothSidesLoaded = false;
    this.isSelected = false;
    this.isTwoSided = false;
    this.isRecto = data.showRecto;
    this.name = data.name;
    this.maskMode = data.maskMode;

    this.recto = {};
    this.verso = {};
    this.relation = {};


    // RECTO
    if (data.recto) {
      this.recto.url = data.recto.url;
      this.recto.rotation = data.recto.rotation;
      this.recto.ppi = data.recto.ppi;

      this.recto.container = new createjs.Container();
      this.recto.container.name = 'Inner Container - Recto';

      this.recto.img = new createjs.Bitmap();
      this.recto.img.id = id;
      this.recto.img.name = 'Image - Recto';
      this.recto.img.cursor = 'pointer';
      this.recto.img.x = 0;
      this.recto.img.y = 0;
      this.recto.img.rotation = this.recto.rotation;
      this.recto.img.scale = 96 / this.recto.ppi;
      this.recto.container.addChild(this.recto.img);

      this.recto.box = data.recto.box;
      this.recto.polygon = data.recto.polygon;

      this.recto.upload = data.recto.upload;

      if (this.maskMode == 'boundingbox') {
        this.recto.mask = this._createMask(this.recto.box);
      } else if (this.maskMode == 'polygon') {
        this.recto.mask = this._createMask(this.recto.polygon);
      }

      this.framework.registerImageEvents(this.recto.img);
    }

    // recto cx
    // recto cy
    // this.recto.img.originalScale = this.originalScaleRecto;

    // VERSO
    if (data.verso) {
      this.verso.url = data.verso.url;
      this.verso.rotation = data.verso.rotation;
      this.verso.ppi = data.verso.ppi;

      this.verso.container = new createjs.Container();
      this.verso.container.name = 'Inner Container - Verso';

      this.verso.img = new createjs.Bitmap();
      this.verso.img.id = id;
      this.verso.img.name = 'Image - Verso';
      this.verso.img.cursor = 'pointer';
      this.verso.img.x = 0;
      this.verso.img.y = 0;
      this.verso.img.rotation = this.verso.rotation;
      this.verso.img.scale = 96 / this.verso.ppi;
      this.verso.container.addChild(this.verso.img);

      this.verso.box = data.verso.box;
      this.verso.polygon = data.verso.polygon;

      this.verso.upload = data.verso.upload;

      if (this.maskMode == 'boundingbox') {
        this.verso.mask = this._createMask(this.verso.box);
      } else if (this.maskMode == 'polygon') {
        this.verso.mask = this._createMask(this.verso.polygon);
      }

      this.framework.registerImageEvents(this.verso.img);
    }
    // verso cx
    // verso cy
    // this.verso.img.originalScale = this.originalScaleVerso;

    // RELATION (IF TWO SIDES PRESENT)
    if (data.recto && data.verso) {
      this.relation.d_rotation = data.relation.d_rotation;
      this.relation.d_cx = data.relation.d_cx;
      this.relation.d_cy = data.relation.d_cy;
      this.isTwoSided = true;
    }

    this.tempRotation = 0;

    // this.originalScaleRecto = 1;
    // this.originalScaleVerso = 1;
    // if (data.originalScaleRecto) this.originalScaleRecto = data.originalScaleRecto;
    // if (data.originalScaleVerso) this.originalScaleVerso = data.originalScaleVerso;

    // create inner Containers for images
    // if (this.containerRotation) this.recto.container.rotation = this.containerRotation;
    // if (this.containerRotation) this.verso.container.rotation = this.containerRotation;

    // if (data.imageWidthRecto) this.recto.container.imageWidth = data.imageWidthRecto;
    // if (data.imageHeightRecto) this.recto.container.imageHeight = data.imageHeightRecto;
    // if (data.imageWidthVerso) this.verso.container.imageWidth = data.imageWidthVerso;
    // if (data.imageHeightVerso) this.verso.container.imageHeight = data.imageHeightVerso;

    // create the image for the displayed side

    this._createImage(eventData, this.isRecto);

    // create the fragment container
    this.container = this._createContainer(data, id);
    if (data.x) this.moveToPixel(data.x, data.y);
    if (data.rotation) this.rotateToAngle(data.rotation);

    if (this.isRecto) this.container.addChild(this.recto.container);
    else this.container.addChild(this.verso.container);

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
   * @param {*} eventData
   * @param {*} isRecto
   * @return {*}
   */
  _createImage(eventData, isRecto) {
    let image;
    if (isRecto) {
      image = this.recto.img;
    } else {
      image = this.verso.img;
    }
    const loading = new createjs.Bitmap(eventData.result);
    image.image = loading.image;
    image.regX = image.image.width / 2;
    image.regY = image.image.height / 2;

    if (this.maskMode != 'no_mask') {
      if (this.isRecto) {
        image.mask = this.recto.mask;
        image.mask.regX = image.regX;
        image.mask.regY = image.regY;
        //image.mask.x = -image.regX;
        //image.mask.y = -image.regY;


        // this.recto.mask.regX = this.recto.mask.cx;
        // this.recto.mask.regY = this.recto.mask.cy;
        // this.recto.mask.scale = image.scale / this.originalScaleRecto;
        // image.x = (image.regX - this.recto.mask.cx) * this.recto.mask.scale;
        // image.y = (image.regY - this.recto.mask.cy) * this.recto.mask.scale;
      } else {
        image.mask = this.verso.mask;
        image.mask.regX = image.regX;
        image.mask.regY = image.regY;
        //image.mask.x = -image.regX;
        //image.mask.y = -image.regY;
        // this.verso.mask.regX = this.verso.mask.cx;
        // this.verso.mask.regY = this.verso.mask.cy;
        // this.verso.mask.scaleX *= Math.abs(image.scale) / this.originalScaleVerso;
        // this.verso.mask.scaleY = Math.abs(image.scale) / this.originalScaleVerso;
        /* if (this.isTwoSided) {
          image.regX = this.relation.d_cx;
          image.regY = this.relation.d_cy;
        }*/
      }
    }

    return image;
  }

  /**
   * TODO
   * @param {*} pointArray
   * @return {*}
   */
  _createMask(pointArray) {
    const mask = new createjs.Shape();
    mask.graphics.beginFill('black');

    const p0 = pointArray[0];
    mask.graphics.moveTo(p0.x, p0.y);
    pointArray.forEach((p) => {
      mask.graphics.lineTo(p.x, p.y);
    });
    mask.graphics.lineTo(p0.x, p0.y);
    mask.polygon = pointArray;

    return mask;
  }

  /**
   * TODO
   * @param {*} data
   * @param {*} id
   * @return {*}
   */
  _createContainer(data, id) {
    const container = new createjs.Container();
    container.scale = this.stage.scaling / 100;

    if (data.xPos && data.yPos) {
      container.x = data.xPos;
      container.y = data.yPos;
    } else {
      const canvasCenter = this.controller.getCanvasCenter();
      container.x = canvasCenter.x;
      container.y = canvasCenter.y;
    }
    container.name = 'Container (fragment '+id+')';
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
    this.recto.container.rotation = targetAngle%360;
    this.verso.container.rotation = targetAngle%360;
  }

  /**
   * TODO
   * @param {*} deltaAngle
   */
  rotateByAngle(deltaAngle) {
    this.recto.container.rotation += deltaAngle;
    this.verso.container.rotation += deltaAngle;
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
        this.getImage().x = this.relation.d_cx;
        this.getImage().y = this.relation.d_cy;
        this.getInnerContainer.regX += this.relation.d_cx;
        this.getInnerContainer.regY += this.relation.d_cy;
        this.isBothSidesLoaded = true;
        this.framework._updateBb();
        this.stage.update();
      });
      let url;
      if (this.isRecto) url = this.recto.url;
      else url = this.verso.url;
      loadqueue.loadFile(url);
      loadqueue.load();
    }

    if (this.isRecto) {
      this.container.removeChild(this.verso.container);
      this.container.addChild(this.recto.container);
    } else {
      this.container.removeChild(this.recto.container);
      this.container.addChild(this.verso.container);
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
        this.container.rotation += this.relation.d_rotation;
      } else {
        this.container.rotation -= this.relation.d_rotation;
      }
    } else {
      if (this.isRecto) {
        this.container.rotation -= this.relation.d_rotation;
      } else {
        this.container.rotation += this.relation.d_rotation;
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
      return this.recto.img;
    } else {
      return this.verso.img;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getHiddenImage() {
    if (this.isRecto) {
      return this.verso.img;
    } else {
      return this.recto.img;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getMask() {
    if (!this.isRecto && this.recto.mask) {
      return this.recto.mask;
    } else if (this.isRecto && this.verso.mask) {
      return this.verso.mask;
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
      return this.recto.container;
    } else {
      return this.verso.container;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getImageURL() {
    if (this.isRecto) {
      return this.recto.url;
    } else {
      return this.verso.url;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getData() {
    const data = {};

    // RECTO
    if (this.recto.url) {
      const dataRecto = {};

      dataRecto.rotation = this.recto.rotation;
      dataRecto.url = this.recto.url;
      dataRecto.ppi = this.recto.ppi;
      dataRecto.box = this.recto.box;
      dataRecto.polygon = this.recto.polygon;

      dataRecto.upload = this.recto.upload;

      data.recto = dataRecto;
    }

    // VERSO
    if (this.verso.url) {
      const dataVerso = {};

      dataVerso.rotation = this.verso.rotation;
      dataVerso.url = this.verso.url;
      dataVerso.ppi = this.verso.ppi;
      dataVerso.box = this.verso.box;
      dataVerso.polygon = this.verso.polygon;

      dataVerso.upload = this.verso.upload;

      data.verso = dataVerso;
    }

    // RELATION
    if (this.recto.url && this.verso.url) {
      const dataRelation = {};

      dataRelation.d_rotation = this.relation.d_rotation;
      dataRelation.d_cx = this.relation.d_cx;
      dataRelation.d_cy = this.relation.d_cy;

      data.relation = dataRelation;
    }

    // GENERAL
    data.id = this.id;
    data.showRecto = this.isRecto;
    data.name = this.name;
    data.maskMode = this.maskMode;

    data.x = this.getX();
    data.baseX = this.getBaseX();
    data.y = this.getY();
    data.baseY = this.getBaseY();
    data.rotation = this.getRotation();

    return data;
    /*
    let rectoPolygon = null;
    let versoPolygon = null;
    if (this.recto.mask) {
      rectoPolygon = this.recto.mask.polygon;
    }
    if (this.verso.mask) {
      versoPolygon = this.verso.mask.polygon;
    }
    return {
      'name': this.name,
      'recto': this.isRecto,
      'rectoURL': this.recto.url,
      'versoURL': this.verso.url,
      'xPos': this.container.x,
      'baseX': this.baseX,
      'yPos': this.container.y,
      'baseY': this.baseY,
      'rotation': this.container.rotation,
      'containerRotation': this.recto.container.rotation,
      'recto.mask': rectoPolygon,
      'verso.mask': versoPolygon,
      'originalScaleRecto': this.originalScaleRecto,
      'originalScaleVerso': this.originalScaleVerso,
      'ppiRecto': this.ppiRecto,
      'ppiVerso': this.ppiVerso,
      'rectoRotation': this.rectoRotation,
      'versoRotation': this.versoRotation,
      'relation.d_rotation': this.relation.d_rotation,
      'offsetX': this.alignOffsetX,
      'offsetY': this.alignOffsetY,
      'imageWidthRecto': this.recto.container.imageWidth,
      'imageHeightRecto': this.recto.container.imageHeight,
      'imageWidthVerso': this.verso.container.imageWidth,
      'imageHeightVerso': this.verso.container.imageHeight,
      'scale': this.container.scale,
    };*/
  }

  /**
   * TODO
   * @param {Object} data
   */
  setData(data) {
    this.name = data['name'];
    this.isRecto = data['recto'];
    this.recto.url = data['rectoURL'];
    this.verso.url = data['versoURL'];
    this.container.x = data['xPos'];
    this.baseX = data['baseX'];
    this.container.y = data['yPos'];
    this.baseY = data['baseY'];
    this.container.rotation = data['rotation'];
    this.recto.container.rotation = data['containerRotation'];
    this.originalScaleRecto = data['originalScaleRecto'];
    this.originaScaleVerso = data['originalScaleVerso'];
    this.ppiRecto = data['ppiRecto'];
    this.ppiVersio = data['ppiVerso'];
    this.rectoRotation = data['rectoRotation'];
    this.versoRotation = data['versoRotation'];
    this.relation.d_rotation = data['relation.d_rotation'];
    this.alignOffsetX = data['offsetX'];
    this.alignOffsetY = data['offsetY'];
    this.recto.container.imageWidth = data['imageWidthRecto'];
    this.recto.container.imageHeight = data['imageHeightRecto'];
    this.verso.container.imageWidth = data['imageWidthVerso'];
    this.verso.container.imageHeight = data['imageHeightVerso'];
    this.container.scale = data['scale'];

    this.recto.mask = this._createMask(data['recto.mask']);
    this.verso.mask = this._createMask(data['verso.mask']);
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
    return this.getInnerContainer().rotation;
  }

  /**
   * @return {*}
   */
  getMask() {
    if (this.isRecto && this.recto.mask) {
      return this.recto.mask;
    } else if (!this.isRecto && this.verso.mask) {
      return this.verso.mask;
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
          let node = {x: polygon[idx].x, y: polygon[idx].y};
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
