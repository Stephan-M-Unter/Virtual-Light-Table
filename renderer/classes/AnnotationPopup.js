'use strict';

const {Util} = require('./Util');
const {Pin} = require('./Pin');
const {CONFIG} = require('../../statics/CONFIG');

class AnnotationPopup {
    
    constructor(controller) {
        this.controller = controller;
        this.annotations = {};
        this.clearAll();
        this.isOpen = false;
        this.window = {};
        this.oldPin = null;
        this.saveWindow();
    }

    clearAll() {
        this.clearForm();
        $('#annot_list').empty();
        $('#annot_show').removeClass('pressed');
        for (const aID of Object.keys(this.annotations)) {
            if (this.annotations[aID] && this.annotations[aID].pin) {
                this.removePin(aID);
            }
        }
        this.annotations = {
            'new': {},
        };
        this.annotationInEdit = null;
        this.annotationCounter = 0;
    }
    clearForm() {
        $('#annot_text').val('');
        $('#annot_editor').val('');
        $('#annot_remove_pin').addClass('hidden');
        $('.annotation.edit').removeClass('edit');
        $('#annot_write').removeClass('edit');
        this.check();
    }
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
                'height': this.window.height,
                'width': this.window.width,
                'min-width': this.window.minWidth,
                'min-height': this.window.minHeight,
                'left': this.window.x,
                'top': this.window.y,
                'opacity': 1,
            }, CONFIG.ANIMATION_SPEED.fast);
        }
    }
    close(event) {
        if (this.isOpen) {
            this.isOpen = false;
            this.saveWindow();
        
            let x = this.window.x + (this.window.width/2);
            let y = this.window.y + (this.window.height/2);
            
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
            }, CONFIG.ANIMATION_SPEED.fast, () => {
              $('#annot_window').css('display', 'none');
            });
      
            this.deactivatePins();
        }
    }
    toggle(event) {
        if (this.isOpen) {
            this.close(event);
          } else {
            this.open(event);
        } 
    }
    openForm() {
        if (!this.hasFormOpen()) {
            $('#annot_write').css('display', 'block');
            $('#annot_new').addClass('hidden');
            $('#annot_write').removeClass('hidden');
            $('#annot_write').css({
                'height': 0,
            });
            $('#annot_write').animate({
                'height': '300px',
            }, CONFIG.ANIMATION_SPEED.fast, () => {});
        }
    }
    closeForm() {
        if (this.hasFormOpen()) {
            $('#annot_write').animate({
                'height': 0,
            }, CONFIG.ANIMATION_SPEED.fast, () => {
                $('#annot_new').removeClass('hidden');
                $('#annot_write').addClass('hidden');
            });
        }
    }
    hasFormOpen() {
        return !$('#annot_write').hasClass('hidden');
    }
    saveWindow() {
        this.window.x = this.parseValue($('#annot_window').css('left'));
        this.window.y = this.parseValue($('#annot_window').css('top'));
        this.window.width = this.parseValue($('#annot_window').css('width'));
        this.window.height = this.parseValue($('#annot_window').css('height'));
        if (!this.window.minWidth) this.window.minWidth = this.parseValue($('#annot_window').css('min-width'));
        if (!this.window.minHeight) this.window.minHeight = this.parseValue($('#annot_window').css('min-height'));
    }
    parseValue(value) {
        if (value.indexOf('px') != -1) {
            return parseFloat(value);
        } else {
            return value;
        }
    }

    check() {
        const editorValid = $('#annot_editor').val() != null && $('#annot_editor').val() != '';
        const textValid = $('#annot_text').val() != null && $('#annot_text').val() != '';

        if (editorValid && textValid) {
            $('#annot_submit').removeClass('disabled');
        } else {
            $('#annot_submit').addClass('disabled');
        }
    }
    load(data) {
        this.clearAll();
        for (const aID of Object.keys(data)) {
            const annotation = data[aID];
            annotation.aID = aID;
            this.write(annotation);
        }
    }
    save(aID) {
        const annotation = Object.assign({}, this.annotations[aID]);
        annotation.aID = aID;
        if (annotation.pin) annotation.pin = annotation.pin.getData();
        const dataPackage = {
            tableID: this.controller.getActiveTable(),
            annotation: annotation,
        }
        this.controller.sendToServer('server-write-annotation', dataPackage);
    }
    getData() {
        const data = {};
        for (const aID of Object.keys(this.annotations)) {
            if (aID == 'new') continue;
            const annotation = Object.assign({}, this.annotations[aID]);
            if (annotation) {
                if (annotation.pin) annotation.pin = annotation.pin.getData();
                data[aID] = annotation;
            }
        }
        return data;
    }
    cancel() {
        const aID = this.annotationInEdit || 'new';
        if (this.oldPin) {
            this.removePin(aID);
            this.annotations[aID].pin = this.oldPin;
            this.annotations[aID].pin.show();   
            this.oldPin = null;
        } else if (this.annotations[aID].pin) {
            this.annotations[aID].pin.pin();
        }
        this.clearForm();
        this.deactivatePins();
        this.resetNew();
        this.closeForm();
        if (this.annotationInEdit) this.cancelEdit();
    }
    write(annotation) {
        let aID, text, editor, time, timestamp, hidden, pin, editable;
        
        if (this.annotationInEdit) {
            // redirect to the update method, as this is not an annotation new to write
            this.update();
            return;
        }
        
        if (annotation) {
            // this annotation already HAS an ID, which means it is loaded from
            // the server and only needs to be displayed
            text = document.createTextNode(annotation.text);
            editor = document.createTextNode(annotation.editor);
            timestamp = annotation.time;
            time = document.createTextNode(Util.convertTime(timestamp));
            hidden = annotation.hidden;
            pin = annotation.pin;
            aID = annotation.aID;
            editable = annotation.editable;
        } else {
            // this annotation has no ID, so it is new; the content is being
            // transfered from the input fields, stored into the annotations-set
            // and eventually sent to the server to save the data there
            this.annotations.new.text = $.trim($('#annot_text').val());
            text = document.createTextNode(this.annotations.new.text);
            this.annotations.new.editor = $.trim($('#annot_editor').val());
            editor = document.createTextNode(this.annotations.new.editor);
            pin = this.annotations.new.pin;
            timestamp = new Date().getTime();
            time = document.createTextNode(Util.convertTime(timestamp));
            hidden = false;
            aID = this.createID();
            if (pin) pin.attachToAnnotation(aID);
            editable = true;
        }

        if (pin) {
            if (pin.class != "Pin") {
                pin = new Pin(this.controller, pin);
            }
            pin.deactivate();
            pin.pin();
        }

        
        // in both cases, new or loaded, save annotation context to this.annotations
        this.annotations[aID] = {
            text: $(text).text(),
            editor: $(editor).text(),
            time: timestamp,
            hidden: hidden,
            pin: pin,
            editable: editable,
        }

        if (!annotation) {
            // if the annotation was new, write it to the server and prepare
            // space for new annotation
            this.annotations.new = {};
            this.save(aID);
            this.clearForm();
            this.closeForm();
        }
        
        // creating elements
        const elAnnotation = document.createElement('div');
        elAnnotation.setAttribute('class', 'annotation no-select');
        elAnnotation.setAttribute('id', aID);
        const elContentWrapper = document.createElement('div');
        elContentWrapper.setAttribute('class', 'annotation_content_wrapper');
        const elText = document.createElement('div');
        elText.setAttribute('class', 'annot_text');
        const elSignature = document.createElement('div');
        elSignature.setAttribute('class', 'annot_sig');
        const elEditor = document.createElement('div');
        elEditor.setAttribute('class', 'annot_editor');
        const elTime = document.createElement('div');
        elTime.setAttribute('class', 'annot_time');
        const elPin = document.createElement('div');
        elPin.setAttribute('class', 'annot_pin');
        const elButtonWrapper = document.createElement('div');
        elButtonWrapper.setAttribute('class', 'annotation_button_wrapper');
        const elEditButton = document.createElement('div');
        elEditButton.setAttribute('class', 'annot_button annot_button_small annot_edit');
        const elRemoveButton = document.createElement('div');
        elRemoveButton.setAttribute('class', 'annot_button annot_button_small annot_delete');
        const elShowButton = document.createElement('div');
        elShowButton.setAttribute('class', 'annot_button annot_button_small annot_hide');
        const elEditableTag = document.createElement('div');
        elEditableTag.setAttribute('class', 'annot_editable_tag');
        const elEditableText = document.createTextNode('editable');
        
        // creating DOM hierarchy
        elText.appendChild(text);
        elTime.appendChild(time);
        elEditor.appendChild(editor);
        elContentWrapper.appendChild(elPin);
        elContentWrapper.appendChild(elText);
        elSignature.appendChild(elEditor);
        elSignature.appendChild(elTime);
        elButtonWrapper.appendChild(elRemoveButton);
        elButtonWrapper.appendChild(elEditButton);
        elButtonWrapper.appendChild(elShowButton);
        elEditableTag.appendChild(elEditableText);
        elAnnotation.appendChild(elContentWrapper);
        elAnnotation.appendChild(elSignature);
        elAnnotation.appendChild(elButtonWrapper)
        elAnnotation.appendChild(elEditableTag);
        
        // displaying updates based on content
        if (!pin) $(elPin).addClass('hidden');
        if (!editable) {
            elButtonWrapper.removeChild(elEditButton);
            elButtonWrapper.removeChild(elRemoveButton);
            elAnnotation.removeChild(elEditableTag);
        } else {
            elButtonWrapper.removeChild(elShowButton);
            $(elAnnotation).addClass('editable');
        }
        if (hidden) {
            $(elAnnotation).addClass('annot_hidden');
            if (pin) pin.hide();
        }
        
        // mouse interactions
        elAnnotation.addEventListener('mouseover', (event) => {
            // usually this wouldn't be necessary, CSS has a perfect hover feature;
            // however, the hover effect should also be added to the corresponding
            // table pin, if available
            $(elAnnotation).addClass('hover');
            if (pin) {
                pin.hover();
            }
        });
        elAnnotation.addEventListener('mouseout', (event) => {
            $(elAnnotation).removeClass('hover');
            if (pin) {
                pin.unhover();
            }
        });
        elAnnotation.addEventListener('click', (event) => {
            this.deactivatePins();
            $('.annotation.active').removeClass('active');
            $('#'+aID).addClass('active');
            this.activatePin(aID);
        });
        elRemoveButton.addEventListener('click', (event) => {
            this.remove(aID);
        });
        elEditButton.addEventListener('click', (event) => {
            if (this.annotationInEdit != aID) {
                this.cancelEdit();
                this.edit(aID);
            } else {
                this.cancelEdit();
            }
        });
        elShowButton.addEventListener('click', (event) => {
            this.toggleHide(aID);
        });
        
        // inserting into DOM structure
        const view = document.getElementById('annot_list');
        view.insertBefore(elAnnotation, view.children[0]);

        this.oldPin = null;
    }
    createID() {
        let aID;
        while (true) {
            aID = 'a_' + this.annotationCounter;
            this.annotationCounter += 1;
            if (!Object.keys(this.annotations).includes(aID)) break;
        }
        return aID;
    }
    edit(aID) {
        if (aID != 'new') {
            this.resetNew();
            this.clearForm();
        }
        if (this.annotations[aID].editable) {
            this.deactivatePins();
            this.annotationInEdit = aID;
            $('#annot_text').val(this.annotations[aID].text);
            $('#annot_editor').val(this.annotations[aID].editor);
            $('#annot_write').addClass('edit');
            $('#'+aID).addClass('edit');
            $('#annot_submit').html('Update Annotation');
            if (this.annotations[aID].pin) {
                this.annotations[aID].pin.activate();
                $('#annot_remove_pin').removeClass('hidden');
            }
            this.check();
            this.openForm();
        } else {
            this.closeForm();
        }
    }
    cancelEdit() {
        if (this.annotationInEdit) {
            const aID = this.annotationInEdit;
            const pin = this.annotations[aID].pin;
            if (pin && !pin.pinned) {
                if (pin.isToPin()) {
                    this.removePin(aID);
                } else {
                    this.pin(aID);
                }
            }
            this.annotationInEdit = null;
            this.clearForm();
            this.closeForm();
            $('#annot_window .edit').removeClass('edit');
            $('#annot_submit').html('Write Annotation');
        }
    }
    update() {
        const aID = this.annotationInEdit;
        this.annotationInEdit = null;

        this.annotations[aID].text = $.trim($('#annot_text').val());
        this.annotations[aID].editor = $.trim($('#annot_editor').val());
        this.annotations[aID].time = new Date().getTime();

        $('#'+aID+' .annot_text').text(this.annotations[aID].text);
        $('#'+aID+' .annot_editor').text(this.annotations[aID].editor);
        $('#'+aID+' .annot_time').text(Util.convertTime(this.annotations[aID].time));

        if (this.annotations[aID].pin && !this.annotations[aID].pin.pinned) {
            if (this.annotations[aID].pin.isToPin()) {
                this.annotations[aID].pin.pin();
            } else {
                this.removePin(aID);
            }
        }

        if (this.annotations[aID].pin) {
            $('#'+aID+' .annot_pin').removeClass('hidden');
        } else {
            $('#'+aID+' .annot_pin').addClass('hidden');
        }

        $('#annot_submit').html('Write Annotation');

        if (this.oldPin) {
            this.oldPin.remove();
            this.oldPin = null;
        }
        this.save(aID);
        this.clearForm();
        this.closeForm();
        this.deactivatePins();
    }
    toggleHide(aID) {
        this.annotations[aID].hidden = !this.annotations[aID].hidden;
        if (this.annotations[aID].hidden) {
            // new status: hidden
            if ($('#annot_show').hasClass('pressed')) $('#'+aID).addClass('annot_hidden_shown');
            else $('#'+aID).addClass('annot_hidden');
            if (this.annotations[aID].pin) {
                this.annotations[aID].pin.hide();
                this.annotations[aID].pin.hidden = true;
            }
        } else {
            // new status: shown
            $('#'+aID).removeClass('annot_hidden');
            $('#'+aID).removeClass('annot_hidden_shown');
            if (this.annotations[aID].pin) {
                this.annotations[aID].pin.show();
                this.annotations[aID].pin.hidden = false;
            }
        }
        this.save(aID);
    }
    toggleHidden() {
        $('#annot_show').toggleClass('pressed');
        if ($('#annot_show').hasClass('pressed')) {
            // make all hidden annotations visible
            $('.annot_hidden').addClass('annot_hidden_shown');
            $('.annot_hidden').removeClass('annot_hidden');
            for (const aID of Object.keys(this.annotations)) {
                if (this.annotations[aID].pin && this.annotations[aID].pin.hidden) {
                    this.annotations[aID].pin.show();
                } 
            }
        } else {
            // hide all hidden annotations again
            $('.annot_hidden_shown').addClass('annot_hidden');
            $('.annot_hidden_shown').removeClass('annot_hidden_shown');
            for (const aID of Object.keys(this.annotations)) {
                if (this.annotations[aID].pin && this.annotations[aID].pin.hidden) {
                    this.annotations[aID].pin.hide();
                } 
            }
        }
    }
    remove(aID) {
        if (this.annotationInEdit == aID) {
            this.clearForm();
            this.closeForm();
            this.annotationInEdit = null;
        }
        $('#'+aID).remove();
        this.removePin(aID);
        delete this.annotations[aID];
        const dataPackage = {
            tableID: this.controller.getActiveTable(),
            aID: aID,
        };
        this.controller.sendToServer('server-remove-annotation', dataPackage);
    }
    resetNew() {
        this.removePin('new');
        this.annotations['new'] = {};
    }

    newPin() {
        const aID = this.annotationInEdit || 'new';
        if (this.oldPin == null) this.oldPin = this.annotations[aID].pin;
        else if (this.annotations[aID].pin) this.removePin(aID);
        if (this.oldPin) this.oldPin.hide(); 
        
        this.annotations[aID].pin = new Pin(this.controller);
        this.annotations[aID].pin.attachToAnnotation(aID);
        this.annotations[aID].pin.cursor();
    }
    setPin(target) {
        const pin = this.getPin();
        pin.setTarget(target);
        pin.activate();
        pin.enableMouseEvents();
        $('#annot_remove_pin').removeClass('hidden');
    }
    getPin(aID) {
        if (aID) return this.annotations[aID].pin;
        else if (this.annotationInEdit) return this.annotations[this.annotationInEdit].pin;
        else return this.annotations['new'].pin;
    }
    removePin(aID) {
        let pin;
        
        if (aID) pin = this.annotations[aID].pin;
        else if (this.annotationInEdit) {
            pin = this.annotations[this.annotationInEdit].pin;
            aID = this.annotationInEdit;
        }
        else {
            pin = this.annotations['new'].pin;
            aID = 'new';
        }
        if (pin) {
            pin.remove();
            this.annotations[aID].pin = null;
            $('#annot_remove_pin').addClass('hidden');
        }
    }
    unpin(aID) {
        let pin;
        
        if (aID) pin = this.annotations[aID].pin;
        else if (this.annotationInEdit) {
            pin = this.annotations[this.annotationInEdit].pin;
            aID = this.annotationInEdit;
        }
        else {
            pin = this.annotations['new'].pin;
            aID = 'new';
        }
            
        if (pin) {
            if (pin.pinned) {
                pin.unpin();
            } else {
                this.removePin(aID);
            }
        }
        $('#annot_remove_pin').addClass('hidden');
    }
    pin(aID) {
        this.oldPin = null;
        const pin = this.annotations[aID].pin;
        if (pin) this.annotations[aID].pin.pin();
    }
    activatePin(aID) {
        const pin = this.annotations[aID].pin;
        if (pin) {
            pin.activate();
        }
    }
    deactivatePins() {
        $('.annotation.active').removeClass('active');
        if (this.annotations) {
            for (const aID of Object.keys(this.annotations)) {
                const annotation = this.annotations[aID];
                if (annotation.pin) {
                    annotation.pin.deactivate();
                }
            }
        }
    }
}

module.exports.AnnotationPopup = AnnotationPopup;