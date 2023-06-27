'use strict';

const {getAllTags} = require('exif-js');
const {Scaler} = require('../../statics/SCALER');

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

    // basic fragment data (and default assumptions)
    this.id = id;
    this.isBothSidesLoaded = false;
    this.isSelected = false;
    this.isTwoSided = false;
    this.isRecto = data.showRecto;
    this.locked = false;
    this.name = data.name;
    this.maskMode = data.maskMode;

    this.recto = {};
    this.verso = {};

    this.recto.pins = [];
    this.verso.pins = [];

    if ('urlTPOP' in data) this.urlTPOP = data.urlTPOP;
    if ('tpop' in data) this.tpop = data.tpop;

    // RECTO
    if (data.recto) {
      this.recto.url = data.recto.url;
      if (data.recto.url_view) {
        this.recto.url_view = data.recto.url_view;
      }
      this.recto.rotation = data.recto.rotation;
      this.recto.ppi = data.recto.ppi;
      
      this.recto.container = new createjs.Container();
      this.recto.container.name = 'Inner Container - Recto';
      
      this.recto.img = new createjs.Bitmap();
      this.recto.img.id = id;
      this.recto.img.name = 'Fragment, Image, Recto';
      this.recto.img.cursor = 'pointer';
      this.recto.img.x = 0;
      this.recto.img.y = 0;
      this.recto.img.rotation = this.recto.rotation;
      
      if ('ppi' in this.recto && this.recto.ppi) {
        this.recto.img.scale = 96 / this.recto.ppi;
      } else {
        this.recto.img.scale = 96 / data.verso.ppi;
      }

      this.recto.container.addChild(this.recto.img);
      
      this.recto.box = data.recto.box;
      this.recto.polygon = data.recto.polygon;
      
      this.recto.upload = data.recto.upload;
      this.recto.www = data.recto.www;
      
      this.framework.registerImageEvents(this.recto.img);
    } else {
      // in this case, there IS no real recto - instead we only have an object
      // with verso information, so we create an empty recto object that loads
      // all information from the verso needed to mirror the verso
      this.recto.ppi = data.verso.ppi;
      this.recto.container = new createjs.Container();
      this.recto.container.name = 'Inner Container - Recto';
      this.recto.img = new createjs.Bitmap();
      this.recto.img.id = id;
      this.recto.img.name = "Fragment, Image, Recto (mirrored)";
      this.recto.img.cursor = 'pointer';
      this.recto.img.x = 0;
      this.recto.img.y = 0;
      this.recto.img.scale = 96 / this.verso.ppi;
      this.recto.container.addChild(this.recto.img);
      this.framework.registerImageEvents(this.recto.img);
    }

    // VERSO
    if (data.verso) {
      this.verso.url = data.verso.url;
      if (data.verso.url_view) {
        this.verso.url_view = data.verso.url_view;
      }
      this.verso.rotation = data.verso.rotation;
      this.verso.ppi = data.verso.ppi;
      
      this.verso.container = new createjs.Container();
      this.verso.container.name = 'Inner Container - Verso';
      
      this.verso.img = new createjs.Bitmap();
      this.verso.img.id = id;
      this.verso.img.name = 'Fragment, Image, Verso';
      this.verso.img.cursor = 'pointer';
      this.verso.img.x = 0;
      this.verso.img.y = 0;
      this.verso.img.rotation = this.verso.rotation;
      
      if ('ppi' in this.verso && this.verso.ppi) {
        this.verso.img.scale = 96 / this.verso.ppi;
      } else {
        this.verso.img.scale = 96 / data.recto.ppi;
      }
      
      this.verso.container.addChild(this.verso.img);
      
      this.verso.box = data.verso.box;
      this.verso.polygon = data.verso.polygon;
      
      this.verso.upload = data.verso.upload;
      this.verso.www = data.verso.www;
      
      this.framework.registerImageEvents(this.verso.img);
    } else {
      // in this case, there IS no real verso - instead we only have an object
      // with recto information, so we create an empty verso object that loads
      // all information from the recto needed to mirror the recto
      this.verso.ppi = data.recto.ppi;
      this.verso.container = new createjs.Container();
      this.verso.container.name = 'Inner Container - Verso';
      this.verso.img = new createjs.Bitmap();
      this.verso.img.id = id;
      this.verso.img.name = "Fragment, Image, Verso (mirrored)";
      this.verso.img.cursor = 'pointer';
      this.verso.img.x = 0;
      this.verso.img.y = 0;
      this.verso.img.scale = 96 / this.recto.ppi;
      this.verso.container.addChild(this.verso.img);
      this.framework.registerImageEvents(this.verso.img);
    }
    
    this._createImage(eventData, this.isRecto);

    // create the fragment container
    this.container = this._createContainer(data, id);
    if (data.x) this.moveTo(data.x, data.y);
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
  }

  /**
   * Summary/description of the function's functionality:
   * - creates a new createjs.Bitmap object
   * - sets the image of the bitmap to the image data of the event
   *  (the image data is stored in the result property of the event)
   * - sets the registration point of the bitmap to the center of the image
   * - returns the bitmap
   * @param {*} eventData
   * @param {*} isRecto
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

    return image;
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
   * @param {*} dx Number of pixels in current scaling by which
   * the image has to be moved in x direction.
   * @param {*} dy Number of pixels in current scaling by which
   * the image has to be moved in y direction.
   */
  moveBy(dx, dy) {
    const dBaseX = dx / Scaler.scaling;
    const dBaseY = dy / Scaler.scaling;
    this.baseX += dBaseX;
    this.baseY += dBaseY;

    this.container.x += dx;
    this.container.y += dy;

    this.movePins(dx, dy);
  }

  /**
   * Moves the fragment to a particular position on the table, given by the x and y coordinate. These coordinates
   * are "in scale", and thus refer to the scaling situation on the table.
   * @param {*} x
   * @param {*} y
   */
  moveTo(x, y) {
    const dx = x - this.container.x;
    const dy = y - this.container.y;
    this.moveBy(dx, dy);
  }

  movePins(dx, dy) {
    for (const pin of this.recto.pins) {
      pin.moveBy(dx, dy);
    }
    for (const pin of this.verso.pins) {
      pin.moveBy(dx, dy);
    }
  }

  /**
   * TODOf
   * @param {*} targetAngle
   */
  rotateToAngle(targetAngle) {
    let currentAngle;
    if (this.isRecto) currentAngle = this.recto.container.rotation;
    else currentAngle = this.verso.container.rotation;

    const deltaAngle = targetAngle - currentAngle;
    this.rotateByAngle(deltaAngle);
  }

  /**
   * TODO
   * @param {*} deltaAngle
   */
  rotateByAngle(deltaAngle) {
    if (this.recto) this.recto.container.rotation += deltaAngle;
    if (this.verso) this.verso.container.rotation += deltaAngle;

    this.rotatePins(deltaAngle);
  }

  rotateByMatrix(cx, cy, deltaAngle) {
    const matrix = new createjs.Matrix2D();
    const x = this.getX();
    const y = this.getY();
    matrix.translate(cx, cy)
      .rotate(deltaAngle)
      .translate(-cx, -cy);

    const pos = matrix.transformPoint(this.getX(), this.getY());
    this.moveTo(pos.x, pos.y);
    this.rotateByAngle(deltaAngle);
  }

  rotatePins(deltaAngle) {
    const matrix = new createjs.Matrix2D();
    matrix.translate(this.getX(), this.getY())
      .rotate(deltaAngle)
      .translate(-this.getX(), -this.getY());

    for (const pin of this.recto.pins) {
      const pos = matrix.transformPoint(pin.pos.x, pin.pos.y);
      pin.moveTo(pos.x, pos.y);
    }
    for (const pin of this.verso.pins) {
      const pos = matrix.transformPoint(pin.pos.x, pin.pos.y);
      pin.moveTo(pos.x, pos.y);
    }
  }

  scale() {
    const x_new = Scaler.x(this.getBaseX());
    const y_new = Scaler.y(this.getBaseY());
    this.container.x = x_new;
    this.container.y = y_new;
    this.container.scale = Scaler.scaling;
  }

  /**
   * TODO
   * @param {*} scaling
   */
  scaleToValue(scaling) {
    this.container.scale = scaling;
  }

  updatePins() {
    for (const pin of this.recto.pins) {
      if (pin) {
        if (!this.isRecto || this.mirrored) {
          pin.hide();
        } else {
          pin.show();
        }
      }
    }

    for (const pin of this.verso.pins) {
      if (pin) {
        if (this.isRecto || this.mirrored) {
          pin.hide();
        } else {
          pin.show();
        }
      }
    }
  }

  /**
   * TODO
   * @param {*} inverted
   */
  flip(inverted) {
    if (inverted) this.mirrored = !this.mirrored;
    // WARNING: The "current" side is changed immediately!
    this.isRecto = !this.isRecto;
    // version A: the second side has still to be loaded
    if (!this.isBothSidesLoaded) {
      const loadqueue = new createjs.LoadQueue();
      loadqueue.addEventListener('fileload', (event) => {
        this._createImage(event, this.isRecto);

        let mirror_url = '';
        if (this.isRecto && 'url_view' in this.recto) mirror_url = this.recto.url_view;
        else if (!this.isRecto && 'url_view' in this.verso)mirror_url = this.verso.url_view;
        if (mirror_url.indexOf('_mirror') != -1) {
          if (this.isRecto) this.recto.img.rotation = -this.verso.img.rotation;
          else this.verso.img.rotation = -this.recto.img.rotation;
        }

        if (this.isRecto) {
          this.container.removeChild(this.verso.container);
          this.container.addChild(this.recto.container);
        } else {
          this.container.removeChild(this.recto.container);
          this.container.addChild(this.verso.container);
        }

        this.updatePins();

        this.isBothSidesLoaded = true;
        this.framework._updateBb();
        this.controller.updateSidebarFragmentList();
        this.stage.update();
      });
      let url;
      if (this.isRecto) {
        // RECTO
        if (!('url' in this.recto)) url = this.recto.url_view;
        else {
          // if this side is existent, try to load the cropped version, if there is none, load the original
          if ('url_view' in this.recto) url = this.recto.url_view;
          else url = this.recto.url;
        }
      } else {
        // VERSO
        if (!('url' in this.verso)) {
          if ('url_view' in this.verso && this.verso.url_view) url = this.verso.url_view;
          else if ('url_view' in this.recto && this.recto.url_view) {
            const dot = this.recto.url_view.lastIndexOf(".");
            url = this.recto.url_view;
            url = url.substring(0,dot) + '_mirror' + url.substring(dot,url.length);
            url = url.replace('_frag', '');
            this.verso.url_view = url;
            console.log("LOADING URL", url);
          } else {

          }
        } else {
          // if this side is existent, try to load the cropped version, if there is none, load the original
          if ('url_view' in this.verso) url = this.verso.url_view;
          else url = this.verso.url;
        }
      }

      if (this.framework.graphicFilters/* && url.indexOf('_mirror.') == -1*/) {
        const dot = url.lastIndexOf(".");
        url = url.substring(0, dot) + "_filtered" + url.substring(dot, url.length);
      }
      console.log("LOADING URL", url);

      loadqueue.loadFile(url);
      loadqueue.load();
    
    } else {
      if (this.isRecto) {
        this.container.removeChild(this.verso.container);
        this.container.addChild(this.recto.container);
      } else {
        this.container.removeChild(this.recto.container);
        this.container.addChild(this.verso.container);
      }
      if (!inverted) this.controller.updateSidebarFragmentList();
      this.updatePins();
    }
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
      if (this.recto.url_view) return this.recto.url_view;
      else return this.recto.url;
    } else {
      if (this.verso.url_view) return this.verso.url_view;
      else return this.verso.url;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getData() {
    const data = {};

    // RECTO
    if (this.recto && this.recto.url) {
      const dataRecto = {};

      dataRecto.rotation = this.recto.rotation;
      dataRecto.url = this.recto.url;
      if (this.recto.url_view) dataRecto.url_view = this.recto.url_view;

      dataRecto.ppi = this.recto.ppi;
      dataRecto.box = this.recto.box;
      dataRecto.polygon = this.recto.polygon;

      dataRecto.upload = this.recto.upload;
      dataRecto.www = this.recto.www;

      data.recto = dataRecto;
    }

    // VERSO
    if (this.verso && this.verso.url) {
      const dataVerso = {};

      dataVerso.rotation = this.verso.rotation;
      dataVerso.url = this.verso.url;
      if (this.verso.url_view) dataVerso.url_view = this.verso.url_view;
      dataVerso.ppi = this.verso.ppi;
      dataVerso.box = this.verso.box;
      dataVerso.polygon = this.verso.polygon;

      dataVerso.upload = this.verso.upload;
      dataVerso.www = this.verso.www;

      data.verso = dataVerso;
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

    if (this.urlTPOP) data.urlTPOP = this.urlTPOP;
    if (this.tpop) data.tpop = this.tpop;

    return data;
  }

  /**
   * TODO
   * @param {Object} data
   */
  setData(data) {
    this.name = data.name;
    this.container.x = data.x;
    this.container.y = data.y;
    this.baseX = data.baseX;
    this.baseY = data.baseY;
    this.recto.container.rotation = data.rotation;
    this.verso.container.rotation = data.rotation;

    if (this.isRecto != data.showRecto) {
      this.flip();
    }
    
    if ('recto' in data) {
      this.recto.url = data.recto.url;
      this.ppiRecto = data.recto.ppi;
      this.rectoRotation = data.recto.rotation;
      this.recto.www = data.recto.www;
    }

    if ('verso' in data) {
      this.verso.url = data.verso.url;
      this.ppiVersio = data.verso.ppi;
      this.versoRotation = data.verso.rotation;
      this.verso.www = data.verso.www;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  getName() {
    return this.name;
  }

  getTPOPURL() {
    if (this.urlTPOP) return this.urlTPOP;
    return null;
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

  getActiveUrls() {
    const urls = [];

    if ('url_view' in this.recto && this.recto.url_view) {
      urls.push(this.recto.url_view);
    } else if ('url' in this.recto && this.recto.url) {
      urls.push(this.recto.url);
    }

    if ('url_view' in this.verso && this.verso.url_view) {
      urls.push(this.verso.url_view);
    } else if ('url' in this.verso && this.verso.url) {
      urls.push(this.verso);
    }

    return urls;
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

  showingRecto() {
    return this.isRecto;
  }

  toggleLock() {
    this.locked = !this.locked;
    return this.locked;
  }

  isLocked() {
    return this.locked;
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
            let m = new createjs.Matrix2D();
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

  addPin(pin) {
    this.removePin(pin);
    if (this.isRecto) this.recto.pins.push(pin);
    else this.verso.pins.push(pin);
  }

  removePin(pin) {
    const indexRecto = this.recto.pins.indexOf(pin);
    if (indexRecto != -1) {
      this.recto.pins.splice(indexRecto, 1);
    }
    const indexVerso = this.verso.pins.indexOf(pin);
    if (indexVerso != -1) {
      this.verso.pins.splice(indexVerso, 1);
    }
  }
}

module.exports.Fragment = Fragment;