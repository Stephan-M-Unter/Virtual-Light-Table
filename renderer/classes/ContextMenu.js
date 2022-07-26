'use strict';

class ContextMenu {

    constructor(controller) {
        this.controller = controller;
        this.id = null;
        this.context = null;
        this.devMode = false;

        this.contexts = {
            'fragment': ['edit', 'flip', 'lock', 'remove', 'devInspect'],
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
            'devInspect': {
                src: '../imgs/symbol_magnifier.png',
                label: 'DevMode: Inspect',
            }
        }
    }

    clear() {
        $('#contextmenu').empty();
    }

    loadButton(buttonType) {
        const contextItem = document.createElement('div');
        contextItem.setAttribute('class', 'context-item');

        const contextImgWrapper = document.createElement('div');
        contextImgWrapper.setAttribute('class', 'context-img-wrapper');

        const contextImg = document.createElement('img');
        contextImg.setAttribute('class', 'context-img');
        contextImg.setAttribute('src', this.buttons[buttonType].src);

        const contextLabel = document.createElement('div');
        contextLabel.setAttribute('class', 'context-label');

        const contextLabelText = document.createTextNode(this.buttons[buttonType].label);

        contextImgWrapper.appendChild(contextImg);
        contextItem.appendChild(contextImgWrapper);
        contextLabel.appendChild(contextLabelText);
        contextItem.appendChild(contextLabel);
        $('#contextmenu').append(contextItem);

        contextItem.addEventListener('click', () => {
            if (buttonType == 'edit') {
                this.controller.changeFragment(this.id);
            } else if (buttonType == 'lock') {
                this.controller.toggleLock(this.id);
            } else if (buttonType == 'remove') {
                if (this.context == 'topbar_table') {
                    this.controller.closeTable(this.id);
                } else if (this.context == 'fragment') {
                    this.controller.removeFragment(this.id);
                }
            } else if (buttonType == 'flip') {
                this.controller.flipFragment(this.id);
            } else if (buttonType == 'save') {
                this.controller.save(true);
            } else if (buttonType == 'add_fragment') {
                this.controller.openUpload();
            } else if (buttonType == 'new_table') {
                this.controller.newTable();
            } else if (buttonType == 'flip_hor') {
                this.controller.flipTable(true);
            } else if (buttonType == 'flip_ver') {
                this.controller.flipTable(false);   
            } else if (buttonType == 'devInspect') {
                this.controller.inspect(this.id);
            }
        });
    }

    loadContext(context) {
        this.context = context;
        for (const buttonType of this.contexts[context]) {
            if (Object.keys(this.buttons).includes(buttonType)) {
                if (buttonType.indexOf('dev') != -1 && !this.devMode) continue;
                this.loadButton(buttonType, this.id);
            }
        }
    }

    load(x, y, context, id) {
        if (id) this.id = id;
        else this.id = null;

        this.devMode = this.controller.isDevMode();

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