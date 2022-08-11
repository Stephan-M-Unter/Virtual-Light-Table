const {Util} = require('./Util');
const {Pin} = require('./Pin');

/**
 * TODO
 */
class AnnotationPopup {
  /**
     * TODO
     * @param {*} controller
     */
  constructor(controller) {
    this.controller = controller;
    this.annotationIDs = [];
    this.annotationCounter = 0;
    this.activeAnnotation = null;
    this.animationSpeed = 200;
    this.annotations = {};
    this.isOpen = false;

    this.saveWindowProperties();
  }

  /**
   * TODO
   * @param {*} id
   * @param {*} text
   * @param {*} editor
   * @param {*} timestamp
   * @return {*}
   */
  _createAnnotationElement(id, text, editor, timestamp) {
    // create elements
    const annotationElement = document.createElement('div');
    annotationElement.setAttribute('class', 'annotation');
    annotationElement.setAttribute('id', id);

    const annotTextElement = document.createElement('div');
    annotTextElement.setAttribute('class', 'annot_text');

    const annotEditorElement = document.createElement('div');
    annotEditorElement.setAttribute('class', 'annot_editor');

    const annotTimeElement = document.createElement('div');
    annotTimeElement.setAttribute('class', 'annot_time');

    const annotSignatureElement = document.createElement('div');
    annotSignatureElement.setAttribute('class', 'annot_sig');

    // fill in the values
    const time = document.createTextNode(timestamp);
    text = document.createTextNode($.trim(text));
    editor = document.createTextNode($.trim(editor));

    annotTextElement.appendChild(text);
    annotEditorElement.appendChild(editor);
    annotTimeElement.appendChild(time);
    annotationElement.appendChild(annotTextElement);
    annotSignatureElement.appendChild(annotEditorElement);
    annotSignatureElement.appendChild(annotTimeElement);
    annotationElement.appendChild(annotSignatureElement);

    return annotationElement;
  }

  /**
   * TODO
   * @return {*}
   */
  _createEditButton() {
    // create DOM elements
    const editElement = document.createElement('div');
    const editImg = document.createElement('img');

    // DOM attributes
    editElement.setAttribute('class', 'annot_edit');
    editImg.src = '../imgs/symbol_edit.png';

    // DOM hierarchy
    editElement.appendChild(editImg);

    return editElement;
  }

  /**
   * TODO
   * @return {*}
   */
  _createDeleteButton() {
    // create DOM elements
    const deleteElement = document.createElement('div');
    const deleteImg = document.createElement('img');

    // DOM attributes
    deleteElement.setAttribute('class', 'annot_delete');
    deleteImg.src = '../imgs/symbol_bin.png';

    // DOM hierarchy
    deleteElement.appendChild(deleteImg);

    return deleteElement;
  }

  /**
   * TODO
   */
  _createHideButton() {
    // create DOM elements
    const hideElement = document.createElement('div');
    // const hideImg = document.createElement('img');

    // DOM attributes
    hideElement.setAttribute('class', 'annot_hide');
    hideElement.setAttribute('title', 'Hide annotation');
    // hideImg.src = '../imgs/symbol_eye.png';

    // DOM hierarchy
    // hideElement.appendChild(hideImg);

    return hideElement;
  }

  /**
   * TODO
   */
  _createCollapeButton() {

  }

  getActiveAnnotation() {
    return this.activeAnnotation;
  }

  /**
   * TODO
   * @return {*}
   */
  _createAnnotationID() {
    const newId = 'a_' + this.annotationCounter;
    if (!this.annotationIDs.includes(newId)) {
      // if ID not yet existant, return this new one and increment counter
      this.annotationCounter = this.annotationCounter + 1;
      return newId;
    } else {
      // if ID is existant, increase counter and create new ID
      this.annotationCounter = this.annotationCounter + 1;
      return this._createAnnotationID();
    }
  }

  /**
   * TODO
   * @param {*} annotsObject
   */
  loadAnnotations(annotsObject) {
    // clear annotations from old entries
    this._clearAll();

    for (const annotId in annotsObject) {
      if (Object.prototype.hasOwnProperty.call(annotsObject, annotId)) {
        const annot = annotsObject[annotId];

        this.annotationIDs.push(annotId);
        this.annotations[annotId] = annotsObject[annotId];

        const annotation = this._createAnnotationElement(annotId,
            annot.text, annot.editor, Util.convertTime(annot.time));
        const hideButton = this._createHideButton();
        hideButton.addEventListener('click', (event) => {
          this.hideAnnotation(event);
        });
        annotation.appendChild(hideButton);

        if (annot.hidden) {
          annotation.setAttribute('class', 'annotation hidden_annot');
          hideButton.setAttribute('title', 'Show annotation');
        }

        if (annotsObject[annotId].pin) {
          const pin = new Pin(this.controller);
          pin.setData(annotsObject[annotId].pin);
          this.annotations[annotId].pin = pin;
          const annotPinElement = document.createElement('div');
          annotPinElement.setAttribute('class', 'annot_pin');
          annotation.insertBefore(annotPinElement, annotation.children[0]); 
        }

        document.getElementById('annot_view').insertBefore(annotation, document.getElementById('annot_view').children[0]);
      }
    }
  }

  /**
   * TODO
   */
  addAnnotation() {
    const newId = this._createAnnotationID();
    this.annotationIDs.push(newId);

    // retrieve data from fields
    const text = $.trim($('#annot_text').val());
    const editor = $.trim($('#annot_editor').val());
    const time = new Date().getTime();
    const timestamp = Util.convertTime(time);

    // clear input fields
    this._clearAnnotationForm();

    // create annotation element
    const annotation = this._createAnnotationElement(newId,
        text, editor, timestamp);
    annotation.setAttribute('class', 'annotation new_annot');

    // create buttons for edit and delete
    const edit = this._createEditButton();
    edit.addEventListener('click', () => {
      this.editAnnotation(annotation);
    });
    const del = this._createDeleteButton();
    del.addEventListener('click', () => {
      this.deleteAnnotation(annotation);
    } );
    annotation.appendChild(edit);
    annotation.appendChild(del);

    // add element to DOM
    document.getElementById('annot_view').insertBefore(annotation, document.getElementById('annot_view').children[0]);

    const pin = this.getActivePin();
    let pinData = null;
    if (pin) pinData = pin.getData();

    this.annotations[newId] = {
      id: newId,
      text: text,
      editor: editor,
      time: time,
      hidden: false,
      pin: pinData,
    }

    this._writeToServer(newId);
  }

  /**
   * TODO
   * @param {*} annotationID
   */
  updateAnnotation(annotationID) {
    const annotation = $('#'+annotationID);

    const text = $.trim($('#annot_text').val());
    const editor = $.trim($('#annot_editor').val());
    const time = new Date().getTime();
    const timestamp = Util.convertTime(time);

    annotation.find('.annot_text').text(text);
    annotation.find('.annot_editor').text(editor);
    annotation.find('.annot_time').text(timestamp);

    this._writeToServer(annotationID, text, editor, time, false);
    this.activeAnnotation = null;

    $('#annot_submit').text('Submit New Annotation').attr('target', '');

    this._clearAnnotationForm();
  }

  /**
   * TODO
   */
  toggleAnnotSubmitButton() {
    AnnotationPopup.toggleAnnotSubmitButton();
  }

  /**
   * TODO
   */
  static toggleAnnotSubmitButton() {
    const text = $.trim($('#annot_text').val());
    const editor = $.trim($('#annot_editor').val());
    if (editor != '' && text != '') {
      // editor and text ready to submit
      $('#annot_submit').removeClass('disabled');
    } else {
      // editor and/or text are not ready
      $('#annot_submit').addClass('disabled');
    }
  }

  /**
   * TODO
   * @param {*} annotation
   */
  deleteAnnotation(annotation) {
    annotation = $(annotation);
    const id = annotation.attr('id');
    annotation.remove();
    this._removeFromServer(id);
  }

  /**
   * TODO
   * @param {*} annotation
   */
  editAnnotation(annotation) {
    annotation = $(annotation);
    const id = annotation.attr('id');

    this.activeAnnotation = id;
    $('#annot_editor').val(this.annotations[id].editor);
    $('#annot_text').val(this.annotations[id].text);
    $('#annot_submit').text('Edit Annotation');
    $('#annot_submit').attr('target', id);
    AnnotationPopup.toggleAnnotSubmitButton();
  }

  /**
   * TODO
   * @param {*} event
   */
  hideAnnotation(event) {
    const annotation = $(event.target).parent();
    const id = annotation.attr('id');
    if (annotation.hasClass('hidden_annot') || annotation.hasClass('shown_annot')) {
      // unhide annotation
      annotation.removeClass('hidden_annot');
      annotation.removeClass('shown_annot');
      $(event.target).css('background-image', 'url("../imgs/symbol_no_eye.png")');
      $(event.target).attr('title', 'Hide annotation');
    } else {
      // hide annotation
      annotation.addClass('hidden_annot');
      $(event.target).css('background-image', 'url("../imgs/symbol_eye.png")');
      $(event.target).attr('title', 'Show annotation');
    }
    const aData = {
      id: id,
      hidden: $('#'+id).hasClass('hidden_annot') || $('#'+id).hasClass('shown_annot'),
    };
    this._updateToServer(aData);
  }

  showHidden() {
    $('.hidden_annot').removeClass('hidden_annot').addClass('shown_annot');
  }

  hideHidden() {
    $('.shown_annot').removeClass('shown_annot').addClass('hidden_annot');
  }

  /**
   * TODO
   */
  _clearAll() {
    this._clearAnnotationView();
    this._clearAnnotationForm();
  }

  /**
   * TODO
   */
  _clearAnnotationView() {
    this.annotationIDs = [];
    $('#annot_view').empty();
  }

  /**
   * TODO
   */
  _clearAnnotationForm() {
    $('#annot_remove_pin').addClass('hidden');
    $('#annot_text').val('');
    $('#annot_editor').val('');
    $('#annot_submit').addClass('disabled');
  }

  /**
   * TODO
   * @param {*} id
   * @param {*} text
   * @param {*} editor
   * @param {*} time
   * @param {*} hidden
   */
  _writeToServer(id) {
    const aData = this.annotations[id];

    
    const data = {
      tableID: this.controller.getActiveTable(),
      aData: aData,
    };
    
    this.controller.sendToServer('server-write-annotation', data);
    if (this.getActivePin()) this.getActivePin().deactivate();
    this.activeAnnotation = null;
  }

  _updateToServer(aData) {
    const data = {
      tableID: this.controller.getActiveTable(),
      aData: aData,
    }
    this.controller.sendToServer('server-update-annotation', data);
  }

  /**
   * TODO
   * @param {String} aID Annotation-ID, e.g. "a_0".
   */
  _removeFromServer(aID) {
    const data = {
      tableID: this.controller.getActiveTable(),
      aID: aID,
    };
    this.controller.sendToServer('server-remove-annotation', data);
  }

  saveWindowProperties() {
    this.x = this.readValue($('#annot_window').css('left'));
    this.y = this.readValue($('#annot_window').css('top'));
    this.width = this.readValue($('#annot_window').css('width'));
    this.height = this.readValue($('#annot_window').css('height'));
    if (!this.minWidth) this.minWidth = this.readValue($('#annot_window').css('min-width'));
    if (!this.minHeight) this.minHeight = this.readValue($('#annot_window').css('min-height'));
  }

  readValue(value) {
    if (value.indexOf('px') != -1) {
      return parseFloat(value);
    } else {
      return value;
    }
  }

  close(event) {
    if (this.isOpen) {
      this.isOpen = false;
      this.saveWindowProperties();
  
      let x = this.x + (this.width/2);
      let y = this.y + (this.height/2);
      
      if (event) {
        x = event.screenX;
        y = event.screenY;
      }
      
      $('#annot_window').css({
        'min-width': 0,
        'min-height': 0,
      });
      
      $('#annot_window').animate({
        'left': x,
        'top': y,
        'width': 0,
        'height': 0,
        'opacity': 0,
      }, this.animationSpeed, () => {
        $('#annot_window').css('display', 'none');
      });

      if (this.getActivePin()) {
        this.getActivePin().deactivate();
      }
    }
  };
  
  open(event) {
    if (!this.isOpen) {
      this.isOpen = true;
      
      let x = 0;
      let y = 0;
      
      if (event) {
        x = event.screenX;
        y = event.screenY;
      }
      $('#annot_window').css({
        'height': 0,
        'width': 0,
        'min-width': 0,
        'min-height': 0,
        'left': x,
        'top': y,
        'opacity': 0,
        'display': 'flex',
      });
      
      $('#annot_window').animate({
        'height': this.height,
        'width': this.width,
        'min-width': this.minWidth,
        'min-hight': this.minHeight,
        'left': this.x,
        'top': this.y,
        'opacity': 1,
      }, this.animationSpeed);
    }
  };

  toggle(event) {
    if (this.isOpen) {
      this.close(event);
    } else {
      this.open(event);
    }
  };

  activatePin() {
    console.log("activatePin");
    console.log("activeAnnotation:", this.activeAnnotation);
    if (this.activeAnnotation == null) {
      this.activeAnnotation = 'a_'+this.annotationCounter;
    }

    console.log("activePin:", this.annotations[this.activeAnnotation].pin);
    if (!this.annotations[this.activeAnnotation].pin) {
      console.log("creating new pin...")
      this.annotations[this.activeAnnotation].pin = new Pin(this.controller);
    }
    console.log("activePin:", this.annotations[this.activeAnnotation].pin);
    this.getActivePin().cursor();
    this.getActivePin().showPin();
  }
  
  getActivePin() {
    console.log(this.activeAnnotation);
    if (this.activeAnnotation == null) return null;
    else return this.annotations[this.activeAnnotation].pin;
  };

  attachPin(target) {
    $('#annot_remove_pin').removeClass('hidden');
    const pin = this.pins[this.activeAnnotation];
    pin.attachTo(target);
    return pin;
  }
  
  removePin() {
    $('#annot_remove_pin').addClass('hidden');
    const pin = this.getActivePin();
    if (pin) {
      pin.remove();
    }
  }

  addHighlight(annotationID, type) {
    if (type != 'active') type = 'hover';
    if (annotationID == null || 'a_'+this.annotationCounter == annotationID) {
      $('#annot_text').addClass(type);
      $('#annot_editor').addClass(type);
    } else {
      $('#'+annotationID).addClass(type);
    }
  }

  removeHighlight(annotationID, type) {
    if (type != 'active') type = 'hover';
    if (annotationID == null || 'a_'+this.annotationCounter == annotationID) {
      $('#annot_text').removeClass(type);
      $('#annot_editor').removeClass(type);
    } else {
      $('#'+annotationID).removeClass(type);
    }
  }

}

module.exports.AnnotationPopup = AnnotationPopup;
