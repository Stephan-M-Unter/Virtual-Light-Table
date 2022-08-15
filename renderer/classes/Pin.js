'use strict';

const {Scaler} = require('./Scaler');
const {CONFIG} = require('./CONFIG');

class Pin {

    
    constructor(controller, pinData) {
        this.class = "Pin";

        this.controller = controller;
        this.stage = this.controller.stage;
        this.annotationPopup = this.controller.annotationPopup;

        this.graphicalPin = new createjs.Shape();
        this.graphicalPin.name = "Pin";
        this.graphicalPin.pin = this;
        this.drawPin();

        this.pinned = false;
        this.toPin = true;
        this.hidden = false;

        this.annotationID = 'new';
        this.target = {
            type: null,
            id: null,
            object: null,
        };
        this.mouseEvents = false;
        this.status = 'inactive';
        this.pos = {
            x: null,
            y: null,
            baseX: null,
            baseY: null,
        };

        this.customColor = null;

        this.graphicalPin.on('mouseover', () => {
            if (this.mouseEvents) {
                $('#'+this.annotationID).addClass('hover');
                this.drawPin(CONFIG.COLOR.hover);
                // this.annotationPopup.addHighlight(this.annotationID, 'hover');
                this.stage.update();
            }
        });
        
        this.graphicalPin.on('mouseout', () => {
            if (this.mouseEvents) {
                $('#'+this.annotationID).removeClass('hover');
                if (this.target.type == 'fragment') {
                    this.drawPin(CONFIG.COLOR.fragment);
                } else {
                    this.drawPin(CONFIG.COLOR.stage);
                }
                // this.annotationPopup.removeHighlight(this.annotationID, 'hover');
                this.stage.update();
            }
        });

        this.graphicalPin.on('click', (event) => {
            if (this.mouseEvents && !this.hidden) {
                this.activate();
                this.annotationPopup.open(event.nativeEvent);
                // this.annotationPopup.addHighlight(this.annotationID, 'active');
            }
        });

        if (pinData) {
            this.load(pinData);
        }
    }

    enableMouseEvents() {
        this.mouseEvents = true;
    }

    disableMouseEvents() {
        this.mouseEvents = false;
    }

    drawPin(color) {
        let colorPrime = color;
        let colorStroke = CONFIG.COLOR.defaultStroke;
        this.graphicalPin.shadow = null;

        if (!color) colorPrime = CONFIG.COLOR.stage;
        // if (this.status == 'active') colorStroke = CONFIG.COLOR.activeStroke;

        if (this.customColor && (color == CONFIG.COLOR.stage || color == CONFIG.COLOR.fragment)) {
            color = this.customColor;
        }

        if (this.hidden && color != CONFIG.COLOR.hover) {
            colorPrime = CONFIG.COLOR.hidden;
        }
        
        if (this.status == 'active') {
            let temp = colorPrime;
            colorPrime = colorStroke;
            colorStroke = temp;
            // this.graphicalPin.shadow = new createjs.Shadow('#F5852C', 0, 0, 15);
            this.graphicalPin.shadow = new createjs.Shadow('#9191ee', 0, 0, 10);
        }

        let strokeDash = 0;
        let alpha = 1;

        if (!this.pinned) {
            strokeDash = [3,3];
            alpha = 0.7;
        }

        this.graphicalPin.graphics
            .clear()
            // outer shape
            .beginFill(colorPrime)
            .beginStroke(colorStroke)
            .setStrokeDash(strokeDash)
            .bt(0, 0, 12, -15, 12, -25)
            .bt(12, -40, -12, -40, -12, -25)
            .bt(-12, -15, 0, 0, 0, 0)
            .endStroke()
            .endFill()
            // inner rectangle
            .beginFill(colorStroke)
            .drawRoundRectComplex(-9, -32, 18, 16, 3, 3, 3, 3)
            .endFill()
            // inner lines
            .beginStroke(colorPrime)
            .setStrokeStyle(2)
            .setStrokeDash(0)
            .mt(-6, -28)
            .lt(6, -28)
            .mt(-6, -24)
            .lt(6, -24)
            .mt(-6, -20)
            .lt(6, -20)
            .endStroke();

        this.graphicalPin.alpha = alpha;
    }

    attachToAnnotation(annotationID) {
        this.annotationID = annotationID;
    }

    detach() {
        this.target.type = null;
        this.target.id = null;
        if (this.target.object) {
            this.target.object.removePin(this);
        }
        this.target.object = null;
    }

    attachTo(targetID) {
        if (targetID.indexOf('f_') != -1) {
            this.target.type = 'fragment';
            this.target.id = targetID;
            this.target.object = this.stage.getFragment(targetID);
            this.target.object.addPin(this);
            this.drawPin(CONFIG.COLOR.fragment);
        } else {
            this.target.type = 'stage';
            this.target.id = null;
            this.target.object = null;
            this.drawPin(CONFIG.COLOR.stage);
        }
        this.graphicalPin.scale = Math.min(Math.max(Scaler.scaling, 0.9), 1.5);
        this.enableMouseEvents();
        this.status = 'inactive';
        this.stage.update();
    }

    pin() {
        this.pinned = true;
        this.toPin = true;
        if (this.target.type == 'fragment') {
            this.drawPin(CONFIG.COLOR.fragment);
        } else {
            this.drawPin(CONFIG.COLOR.stage);
        }
        this.stage.update();
    }
    
    unpin() {
        this.pinned = false;
        this.toPin = false;
        if (this.target.type == 'fragment') {
            this.drawPin(CONFIG.COLOR.fragment);
        } else {
            this.drawPin(CONFIG.COLOR.stage);
        }
        this.stage.update();
    }

    isToPin() {
        return this.toPin;
    }
    
    hover() {
        this.drawPin(CONFIG.COLOR.hover);
        this.stage.update();
    }
    
    unhover() {
        if (this.target.type == 'fragment') {
            this.drawPin(CONFIG.COLOR.fragment);
        } else {
            this.drawPin(CONFIG.COLOR.stage);
        }
        this.stage.update();
    }

    activate() {
        if (!(this.status == 'active')) {
            this.annotationPopup.deactivatePins();
            this.status = 'active';
            $('#'+this.annotationID).addClass('active');
            if (this.target.type == 'fragment') this.drawPin(CONFIG.COLOR.fragment);
            else this.drawPin(CONFIG.COLOR.stage);
            this.toPin = true;
            this.scale();
            // this.annotationPopup.addHighlight(this.annotationID, 'active');
            this.stage.update();
            this.annotationPopup.edit(this.annotationID);
        }
    }
    
    deactivate() {
        if (this.status == 'active') {
            this.status = 'inactive';
            if (this.target.type == 'fragment') this.drawPin(CONFIG.COLOR.fragment);
            else this.drawPin(CONFIG.COLOR.stage);
            this.scale();
            // this.annotationPopup.removeHighlight(this.annotationID, 'active');
            this.stage.update();
        }
    }

    moveTo(x,y) {
        if (this.pos.baseX && this.pos.baseY) {
            const dx = x - this.pos.x;
            const dy = y - this.pos.y;
            this.moveBy(dx, dy);
        } else {
            this.pos.x = x;
            this.pos.y = y;
            this.graphicalPin.x = x;
            this.graphicalPin.y = y;
            this.pos.baseX = Scaler.x_INV(x);
            this.pos.baseY = Scaler.y_INV(y);
            this.stage.update();
        }
    }
    
    moveBy(dx, dy) {
        const dBaseX = dx / Scaler.scaling;
        const dBaseY = dy / Scaler.scaling;
        
        this.pos.baseX += dBaseX;
        this.pos.baseY += dBaseY;

        this.pos.x += dx;
        this.pos.y += dy;
        this.graphicalPin.x = this.pos.x;
        this.graphicalPin.y = this.pos.y;

        this.stage.update();
    }

    scale() {
        const x_new = Scaler.x(this.pos.baseX);
        const y_new = Scaler.y(this.pos.baseY);
        this.pos.x = x_new;
        this.pos.y = y_new;
        this.graphicalPin.x = x_new;
        this.graphicalPin.y = y_new;
        this.graphicalPin.scale = Math.min(Math.max(Scaler.scaling, 0.9), 1.5);
        if (this.status == 'active') {
            this.graphicalPin.scale *= 1.5;
        }
    }

    show() {
        this.stage.addPin(this);
    }
    
    hide() {
        this.stage.removePin(this);
    }
    
    remove() {
        if (this.target.type == 'fragment' && !this.target.object) {
            this.setTarget(this.target);
        }
        this.unpin();
        this.detach();
        this.stage.removePin(this);
    }

    getNode() {
        return this.graphicalPin;
    }

    cursor() {
        this.unpin();
        this.status = 'cursor';
        this.disableMouseEvents();
        this.drawPin(CONFIG.COLOR.cursor);
        this.graphicalPin.scale = 1;
        this.show();
    }

    getData() {
        const responseData =  {
            'pos': this.pos,
            'annotationID': this.annotationID,
            'target': this.target,
        };
        delete responseData.target.object;
        return responseData;
    }

    load(pinData) {
        if (pinData.annotationID) this.annotationID = pinData.annotationID;

        if (pinData.target) {
            this.setTarget(pinData.target);
        }

        if (pinData.pos) {
            this.pos.baseX = pinData.pos.baseX;
            this.pos.baseY = pinData.pos.baseY;
            this.pos.x = Scaler.x(this.pos.baseX);
            this.pos.y = Scaler.y(this.pos.baseY);
            this.graphicalPin.x = this.pos.x;
            this.graphicalPin.y = this.pos.y;
        }
        this.enableMouseEvents();
        this.show();
    }

    setTarget(target) {
        this.target = target;
        if (this.target.type == 'fragment') {
            this.target.object = this.controller.getStage().getFragment(this.target.id);
            try {
                this.target.object.addPin(this);
            } catch(e) {};
        }
        this.drawPin();
    }

    setColor(color) {
        this.customColor = color;
    }

}

module.exports.Pin = Pin;