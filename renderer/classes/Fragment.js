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
    this.controller = controller;
    this.id = id;
    this.isRecto = eventData.item.properties.recto;
    this.urlRecto = eventData.item.properties.rectoURL;
    this.urlVerso = eventData.item.properties.versoURL;
    this.isSelected = false;
    this.bothSidesLoaded = false;
    this.name = eventData.item.properties.name;

    this.framework = stageObject;
    this.stage = stageObject.stage; // stage where the fragment will be shown

    if (this.isRecto ? this.imageRecto = this._createImage(eventData, id) :
        this.imageVerso = this._createImage(eventData, id));

    this.container = this._createContainer(eventData.item.properties, id);
    this.container.regX = this.getImage().image.width / 2;
    this.container.regY = this.getImage().image.height / 2;

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
   * @param {*} eventData
   * @param {*} id
   * @return {*}
   */
  _createImage(eventData, id) {
    const image = new createjs.Bitmap(eventData.result);

    if (this.isRecto) {
      image.name = 'Image - Recto';
    } else {
      image.name = 'Image - Verso';
    }
    image.cursor = 'pointer';
    image.x = 0;
    image.y = 0;
    image.id = id;
    image.scale = this.stage.scaling / 100;

    return image;
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
   */
  flip() {
    this.isRecto = !this.isRecto;
    if (this.bothSidesLoaded) {
      // both sides have already been loaded to the application
      this.container.removeChild(this.image);
      if (this.isRecto ? this.image = this.image_recto :
            this.image = this.image_verso);
      this.container.addChild(this.image);
    } else {
      // second side still to be loaded
      const loadqueue = new createjs.LoadQueue();
      loadqueue.addEventListener('fileload', (event) => {
        const secondImage = this._createImage(event, this.id);

        if (this.isRecto) {
          this.imageRecto = secondImage;
          this.framework.registerImageEvents(this.imageRecto);
          this.container.removeChild(this.imageVerso);
          this.container.addChild(this.imageRecto);
        } else {
          this.imageVerso = secondImage;
          this.framework.registerImageEvents(this.imageVerso);
          this.container.removeChild(this.imageRecto);
          this.container.addChild(this.imageVerso);
        }
        this.container.regX = secondImage.image.width / 2;
        this.container.regY = secondImage.image.height / 2;
        this.framework._updateBb();
        this.stage.update();
      });
      let url;
      if (this.isRecto ? url=this.urlRecto : url=this.urlVerso);
      loadqueue.loadFile(url);
      loadqueue.load();
    }

    this.controller.updateFragmentList();

    // Möglichkeit 2: Bild existiert
    // dann einfach bilder austauschen
    // flag umdrehen
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
}

module.exports.Fragment = Fragment;
