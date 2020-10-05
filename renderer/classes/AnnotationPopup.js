class AnnotationPopup {
    constructor(controller) {
        this.controller = controller;
        this.annotationIDs = [];
    }

    convertTime(milliseconds) {
        let time = new Date(milliseconds);
    
        let year = time.getFullYear();
        let month = ((time.getMonth()+1) < 10 ? '0' : '') + (time.getMonth()+1);
        let day = (time.getDate() < 10 ? '0' : '') + time.getDate();
    
        let hour = time.getHours();
        let minute = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();
        let second = (time.getSeconds() < 10 ? '0' : '') + time.getSeconds();
    
        return day+"."+month+"."+year+", "+hour+":"+minute+":"+second;
    }

    toggleAnnotSubmitButton(){
        AnnotationPopup.toggleAnnotSubmitButton();
    }

    static toggleAnnotSubmitButton(){
        let text = $('#annot_text').val();
        text = $.trim(text);
        let editor = $('#annot_editor').val();
        editor = $.trim(editor);
        if (editor != '' && text != '') {
            // editor and text have been inserted, ready to submit
            $('#annot_submit').removeClass('disabled');    
        } else {
            // editor and/or text are not ready, empty or just spaces, button remains inactive
            $('#annot_submit').addClass('disabled');
        }
    }

    static clearAnnotationForm(){
        $('#annot_text').val('');
        $('#annot_editor').val('');
        AnnotationPopup.toggleAnnotSubmitButton();
    }

    static clearAnnotations(){
        this.annotationIDs = [];
        AnnotationPopup.clearAnnotationForm();
        $('#annot_view').empty();
    }

    addNewAnnotation(annotationID, isNewEntry, loadedData) {
        // first, derive the annotation ID (if available) or create new one (if new annotation)
        let id;
        if (annotationID) {
            id = annotationID;
            if (this.annotationIDs.includes(annotationID)) {
                this.updateAnnotation(annotationID);
                $('#annot_submit').attr('target', '').text('Submit New Annotation');
                AnnotationPopup.clearAnnotationForm();
                return 0;
            }
        } else {
            // TODO create ID
            id = "dummyID";
        }
        this.annotationIDs.push(id);

        // create elements
        let annotation_element = document.createElement('div');
        if (loadedData) {
            if (loadedData.hidden) {
                annotation_element.setAttribute('class', 'annotation hidden_annot');
            } else {
                annotation_element.setAttribute('class', 'annotation');
            }
        } else {
            annotation_element.setAttribute('class', 'annotation new_annot');
        }
        annotation_element.setAttribute('id', id);
        let annot_text_element = document.createElement('div');
        annot_text_element.setAttribute('class', 'annot_text');
        let annot_editor_element = document.createElement('div');
        annot_editor_element.setAttribute('class', 'annot_editor');
        let annot_time_element = document.createElement('div');
        annot_time_element.setAttribute('class', 'annot_time');

        // fill in the values
        let time = new Date().getTime();
        let timestamp = document.createTextNode(this.convertTime(time));
        let text;
        let editor;
        if (loadedData) { 
            text = document.createTextNode(loadedData.text);
            editor = document.createTextNode(loadedData.editor);
        } else {
            text = document.createTextNode($.trim($('#annot_text').val().replace(/\\r/g, "<br/>")));
            editor = document.createTextNode($.trim($('#annot_editor').val()));
        }

        if (isNewEntry) {
            // create edit button for new annots
            let edit_element = document.createElement('div');
            edit_element.setAttribute('class', 'annot_edit');
            let edit_img = document.createElement('img');
            edit_img.src = '../imgs/symbol_edit.png';
            edit_element.appendChild(edit_img);
            
            edit_element.addEventListener('click', this.editAnnotation);
            annotation_element.appendChild(edit_element);
            
            // create delete button for new annots
            let delete_element = document.createElement('div');
            delete_element.setAttribute('class', 'annot_delete');
            let delete_img = document.createElement('img');
            delete_img.src = '../imgs/symbol_bin.png';
            delete_element.appendChild(delete_img);
            
            delete_element.addEventListener('click', this.deleteAnnotation);
            annotation_element.appendChild(delete_element);
        }

        // create hide button
        if (!isNewEntry) {
            let hide_element = document.createElement('div');
            hide_element.setAttribute('class', 'annot_hide');
    
            hide_element.addEventListener('click', this.hideAnnotation);
            annotation_element.appendChild(hide_element);
        }

        // create DOM hierarchy
        annot_text_element.appendChild(text);
        annot_time_element.appendChild(timestamp);
        annot_editor_element.appendChild(editor);
        annotation_element.appendChild(annot_text_element);
        annotation_element.appendChild(annot_editor_element);
        annotation_element.appendChild(annot_time_element);
        document.getElementById('annot_view').appendChild(annotation_element);

        AnnotationPopup.clearAnnotationForm();
    }
    
    updateAnnotation(annotationID){
        let annotation = $('#'+annotationID);
        annotation.find('.annot_text').text($.trim($('#annot_text').val()));
        annotation.find('.annot_editor').text($.trim($('#annot_editor').val()));
        AnnotationPopup.clearAnnotationForm();
    }
    

    deleteAnnotation(event){
        let annotation = $(event.target).parent().parent();
        let id = annotation.attr('id');

        annotation.remove();
    }
    
    editAnnotation(event){
        let annotation = $(event.target).parent().parent();
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

    loadAnnotations(annots) {
        AnnotationPopup.clearAnnotations();
        for (let id in annots) {
            this.addNewAnnotation(id, false, annots[id]);
        }
    }
}

module.exports.AnnotationPopup = AnnotationPopup;