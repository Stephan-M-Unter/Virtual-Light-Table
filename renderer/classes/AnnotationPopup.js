const { Util } = require('./Util');

class AnnotationPopup {
    constructor(controller) {
        this.controller = controller;
        this.annotationIDs = [];
        this.annotationCounter = 0;
    }

    _createAnnotationElement(id, text, editor, timestamp){
        // create elements
        let annotation_element = document.createElement('div');
        annotation_element.setAttribute('class', 'annotation');
        annotation_element.setAttribute('id', id);

        let annot_text_element = document.createElement('div');
        annot_text_element.setAttribute('class', 'annot_text');

        let annot_editor_element = document.createElement('div');
        annot_editor_element.setAttribute('class', 'annot_editor');

        let annot_time_element = document.createElement('div');
        annot_time_element.setAttribute('class', 'annot_time');

        let annot_signature_element = document.createElement('div');
        annot_signature_element.setAttribute('class', 'annot_sig');

        // fill in the values
        let time = document.createTextNode(timestamp);
        text = document.createTextNode($.trim(text));
        editor = document.createTextNode($.trim(editor));

        annot_text_element.appendChild(text);
        annot_editor_element.appendChild(editor);
        annot_time_element.appendChild(time);
        annotation_element.appendChild(annot_text_element);
        annot_signature_element.appendChild(annot_editor_element);
        annot_signature_element.appendChild(annot_time_element);
        annotation_element.appendChild(annot_signature_element);
        
        return annotation_element;
    }

    _createEditButton(){
        // create DOM elements
        let edit_element = document.createElement('div');
        let edit_img = document.createElement('img');

        // DOM attributes
        edit_element.setAttribute('class', 'annot_edit');
        edit_img.src = '../imgs/symbol_edit.png';

        // DOM hierarchy
        edit_element.appendChild(edit_img);

        return edit_element;
    }

    _createDeleteButton(){
        // create DOM elements
        let delete_element = document.createElement('div');
        let delete_img = document.createElement('img');

        // DOM attributes
        delete_element.setAttribute('class', 'annot_delete');
        delete_img.src = '../imgs/symbol_bin.png';

        // DOM hierarchy
        delete_element.appendChild(delete_img);

        return delete_element;
    }

    _createHideButton(){

    }

    _createCollapeButton(){

    }

    _createAnnotationID(){
        let new_id = "a_" + this.annotationCounter;
        if (!this.annotationIDs.includes(new_id)) {
            // if ID not yet existant, return this new one and increment counter
            this.annotationCounter = this.annotationCounter + 1;
            return new_id;
        } else {
            // if ID is existant, increase counter and create new ID
            this.annotationCounter = this.annotationCounter + 1;
            return this._createAnnotationID();
        }
    }

    loadAnnotations(annots_object){
        // clear annotations from old entries
        this._clearAll();

        for (let annot_id in annots_object) {
            let annot = annots_object[annot_id];
            
            this.annotationIDs.push(annot_id);

            let annotation = this._createAnnotationElement(annot_id, annot.text, annot.editor, annot.time);

            if (annot.hidden) {
                annotation.setAttribute('class', 'annotation hidden_annot');
            }

            document.getElementById('annot_view').appendChild(annotation);
        }
    }
    
    addAnnotation(){
        let new_id = this._createAnnotationID();
        this.annotationIDs.push(new_id);
        
        // retrieve data from fields
        let text = $.trim($('#annot_text').val());
        let editor = $.trim($('#annot_editor').val());
        let time = new Date().getTime();
        let timestamp = Util.convertTime(time);

        // clear input fields
        this._clearAnnotationForm();
        
        // create annotation element
        let annotation = this._createAnnotationElement(new_id, text, editor, timestamp);
        annotation.setAttribute('class', 'annotation new_annot');

        // create buttons for edit and delete
        let edit = this._createEditButton();
        edit.addEventListener('click', () => { this.editAnnotation(annotation); });
        let del = this._createDeleteButton();
        del.addEventListener('click', () => { this.deleteAnnotation(annotation); } );
        annotation.appendChild(edit);
        annotation.appendChild(del);
        
        // add element to DOM
        document.getElementById('annot_view').appendChild(annotation);

        this._writeToServer(new_id, text, editor, time, false);
    }
    
    updateAnnotation(annotationID){
        let annotation = $('#'+annotationID);

        let text = $.trim($('#annot_text').val());
        let editor = $.trim($('#annot_editor').val());
        let time = new Date().getTime();
        let timestamp = Util.convertTime(time);

        annotation.find('.annot_text').text(text);
        annotation.find('.annot_editor').text(editor);
        annotation.find('.annot_time').text(timestamp);

        this._writeToServer(annotationID, text, editor, time, false);

        $('#annot_submit').text('Submit New Annotation').attr('target', '');

        this._clearAnnotationForm();
    }

    toggleAnnotSubmitButton(){
        AnnotationPopup.toggleAnnotSubmitButton();
    }

    static toggleAnnotSubmitButton(){
        let text = $.trim($('#annot_text').val());
        let editor = $.trim($('#annot_editor').val());
        if (editor != '' && text != '') {
            // editor and text have been inserted, ready to submit
            $('#annot_submit').removeClass('disabled');    
        } else {
            // editor and/or text are not ready, empty or just spaces, button remains inactive
            $('#annot_submit').addClass('disabled');
        }
    }
    

    deleteAnnotation(annotation){
        annotation = $(annotation);
        let id = annotation.attr('id');
        annotation.remove();
        this._removeFromServer(id);
    }
    
    editAnnotation(annotation){
        annotation = $(annotation);
        let editor = annotation.find('.annot_editor').text();
        let text = annotation.find('.annot_text').text();
        let id = annotation.attr('id');
        $('#annot_editor').val(editor);
        $('#annot_text').val(text);
        $('#annot_submit').text("Edit Annotation");
        $('#annot_submit').attr('target', id);
        AnnotationPopup.toggleAnnotSubmitButton();
    }

    hideAnnotation(event) {
        let annotation = $(event.target).parent();
        if (annotation.hasClass('hidden_annot')){
            annotation.removeClass('hidden_annot');
            annotation.addClass('shown_annot');
        } else {
            annotation.removeClass('shown_annot');
            annotation.addClass('hidden_annot');
        }
    }

    _clearAll(){
        this._clearAnnotationView();
        this._clearAnnotationForm();
    }

    _clearAnnotationView() {
        this.annotationIDs = [];
        $('#annot_view').empty();
    }

    _clearAnnotationForm() {
        $('#annot_text').val('');
        $('#annot_editor').val('');
        $('#annot_submit').addClass('disabled');
    }

    _writeToServer(id, text, editor, time, hidden) {
        let annot_data = {
            "id" : id,
            "text" : text,
            "editor" : editor,
            "time" : time,
            "hidden" : hidden
        };

        this.controller.sendToServer('server-write-annotation', annot_data);
    }

    _removeFromServer(id) {
        this.controller.sendToServer('server-remove-annotation', id);
    }
}

module.exports.AnnotationPopup = AnnotationPopup;