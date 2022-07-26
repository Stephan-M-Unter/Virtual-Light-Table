'use strict';

class ContextMenu {

    constructor(controller) {
        this.controller = controller;
        this.id = null;
        this.context = null;

        this.contexts = {
            'fragment': ['edit', 'flip', 'lock', 'remove'],
            'stage': ['new_table', 'save', 'add_fragment', 'flip_hor', 'flip_ver'],
            'topbar_table': ['new_table', 'remove'],
        };

        this.buttons = {
            'edit': {
                src: '../imgs/symbol_edit.png',
                label: 'Edit',
            },
            'lock': {
                src: '../imgs/symbol_unlocked.png',
                label: 'Lock Fragment',
            },
            'remove': {
                src: '../imgs/symbol_x.png',
                label: 'Remove',
            },
            'flip': {
                src: '../imgs/symbol_flip.png',
                label: 'Flip Fragment',
            },
            'save': {
                src: '../imgs/symbol_save.png',
                label: 'Quicksave',
            },
            'add_fragment': {
                src: '../imgs/symbol_upload_local.png',
                label: 'Add Fragment',
            },
            'new_table': {
                src: '../imgs/symbol_new_table.png',
                label: 'New Table',
            },
            'flip_hor': {
                src: '../imgs/symbol_horizontal_flip.svg',
                label: 'Flip Horizontally',
            },
            'flip_ver': {
                src: '../imgs/symbol_vertical_flip.svg',
                label: 'Flip Vertically',
            },

        }
    }

    clear() {
        $('#contextmenu').empty();
    }

    loadButton(button) {
        const contextItem = document.createElement('div');
        contextItem.setAttribute('class', 'context-item');

        const contextImgWrapper = document.createElement('div');
        contextImgWrapper.setAttribute('class', 'context-img-wrapper');

        const contextImg = document.createElement('img');
        contextImg.setAttribute('class', 'context-img');
        contextImg.setAttribute('src', this.buttons[button].src);

        const contextLabel = document.createElement('div');
        contextLabel.setAttribute('class', 'context-label');

        const contextLabelText = document.createTextNode(this.buttons[button].label);

        contextImgWrapper.appendChild(contextImg);
        contextItem.appendChild(contextImgWrapper);
        contextLabel.appendChild(contextLabelText);
        contextItem.appendChild(contextLabel);
        $('#contextmenu').append(contextItem);

        contextItem.addEventListener('click', () => {
            if (button == 'edit') {
                this.controller.changeFragment(this.id);
            } else if (button == 'lock') {
                this.controller.toggleLock(this.id);
            } else if (button == 'remove') {
                if (this.context == 'topbar_table') {
                    this.controller.closeTable(this.id);
                } else if (this.context == 'fragment') {
                    this.controller.removeFragment(this.id);
                }
            } else if (button == 'flip') {
                this.controller.flipFragment(this.id);
            } else if (button == 'save') {
                this.controller.save(true);
            } else if (button == 'add_fragment') {
                this.controller.openUpload();
            } else if (button == 'new_table') {
                this.controller.newTable();
            } else if (button == 'flip_hor') {
                this.controller.flipTable(true);
            } else if (button == 'flip_ver') {
                this.controller.flipTable(false);   
            }
        });
    }

    loadContext(context) {
        this.context = context;
        for (const button of this.contexts[context]) {
            if (Object.keys(this.buttons).includes(button)) {
                this.loadButton(button, this.id);
            }
        }
    }

    load(x, y, context, id) {
        if (id) this.id = id;
        else this.id = null;

        if (x > $(window).width() - 200) {
            $('#contextmenu').addClass('toLeft');
        } else {
            $('#contextmenu').removeClass('toLeft');
        }

        if (Object.keys(this.contexts).includes(context)) {
            this.clear();
            this.loadContext(context);
            $('#contextmenu').css('left', x);
            $('#contextmenu').css('top', y);
            $('#contextmenu').css('opacity', 1);
        } else {
            this.context = null;
        }
    }

    hide() {
        $('#contextmenu').css('left', -3000);
        $('#contextmenu').css('top', -3000);
        $('#contextmenu').css('opacity', 0);
    }

}

module.exports.ContextMenu = ContextMenu;