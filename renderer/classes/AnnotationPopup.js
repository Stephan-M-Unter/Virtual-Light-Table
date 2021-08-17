const {Util} = require('./Util');

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

  }

  /**
   * TODO
   */
  _createCollapeButton() {

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

        const annotation = this._createAnnotationElement(annotId,
            annot.text, annot.editor, Util.convertTime(annot.time));

        if (annot.hidden) {
          annotation.setAttribute('class', 'annotation hidden_annot');
        }

        document.getElementById('annot_view').appendChild(annotation);
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
    document.getElementById('annot_view').appendChild(annotation);

    this._writeToServer(newId, text, editor, time, false);
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
    const editor = annotation.find('.annot_editor').text();
    const text = annotation.find('.annot_text').text();
    const id = annotation.attr('id');
    $('#annot_editor').val(editor);
    $('#annot_text').val(text);
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
    if (annotation.hasClass('hidden_annot')) {
      annotation.removeClass('hidden_annot');
      annotation.addClass('shown_annot');
    } else {
      annotation.removeClass('shown_annot');
      annotation.addClass('hidden_annot');
    }
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
  _writeToServer(id, text, editor, time, hidden) {
    const aData = {
      'id': id,
      'text': text,
      'editor': editor,
      'time': time,
      'hidden': hidden,
    };
    const data = {
      tableID: this.controller.getActiveTable(),
      aData: aData,
    };

    this.controller.sendToServer('server-write-annotation', data);
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
}

module.exports.AnnotationPopup = AnnotationPopup;
