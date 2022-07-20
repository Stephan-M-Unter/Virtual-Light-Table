'use strict';

class Rulers {
    constructor(controller) {
        this.controller = controller;
        this.left = new createjs.Stage('ruler-left');
        this.bottom = new createjs.Stage('ruler-bottom');

        this.ppi = null;
        this.scale = 1;
        this.offset = {x: 0, y: 0};
        this.bounds = {
            minX: 0,
            maxX: 0,
            minY: 0,
            maxY: 0,
        };

        this.leftMouse = new createjs.Shape();
        this.bottomMouse = new createjs.Shape();
        this.leftScale = new createjs.Container();
        this.bottomScale= new createjs.Container();
        this.leftBounds = new createjs.Shape();
        this.bottomBounds = new createjs.Shape();

        this.left.addChild(this.leftBounds, this.leftScale, this.leftMouse);
        this.bottom.addChild(this.bottomBounds, this.bottomScale, this.bottomMouse);
    }

    updateRulers(ppi, scale, offset, bounds, mouse) {
        this.resizeCanvases();
        let updateScaleNeeded = false;
        if (ppi != this.ppi) {
            this.ppi = ppi;
            updateScaleNeeded = true;
        }
        if (scale != this.scale) {
            this.scale = scale;
            updateScaleNeeded = true;
        }
        if (this.offset.x != offset.x) {
            this.offset.x = offset.x;
            updateScaleNeeded = true;
        }
        if (this.offset.y != offset.y) {
            this.offset.y = offset.y;
            updateScaleNeeded = true;
        }

        if (updateScaleNeeded) {
            this.updateScale();
        }

        this.updateBounds(bounds);

        if (mouse) {
            this.updateMouse(mouse);
        }
        this.updateStages();
    }

    updateBounds(bounds) {
        const sidebar = parseFloat($('#left_sidebar').css('width'));
        this.bounds = {
            minX: bounds.left-sidebar,
            maxX: (bounds.right-sidebar),
            minY: bounds.top,
            maxY: bounds.bottom,
        };

        this.leftBounds.graphics.clear()
            .beginFill('#F5852C')
            .drawRect(0, this.bounds.minY, this.left.canvas.width, this.bounds.maxY-this.bounds.minY)
            .endFill();
        
        this.bottomBounds.graphics.clear()
            .beginFill('#F5852C')
            .drawRect(this.bounds.minX, 0, this.bounds.maxX-this.bounds.minX, this.bottom.canvas.height)
            .endFill();
    }

    updateScale() {
        this.leftScale.removeAllChildren();
        this.bottomScale.removeAllChildren();
        const cm = (this.ppi / 2.54)*this.scale;
        const mm = cm / 10;
        const sidebar = parseFloat($('#left_sidebar').css('width'));

        /* left bar */
        const lw = this.left.canvas.width;
        const lh = this.left.canvas.height;

        for (let i = this.offset.y%cm; i < lh; i += cm) {
            const cm_line = new createjs.Shape();
            cm_line.graphics.setStrokeStyle(1)
                .beginStroke('black')
                .moveTo(lw*0.70, i)
                .lineTo(lw, i)
                .endStroke();
            this.leftScale.addChild(cm_line);

            const cm_val = Math.round((i-this.offset.y) / cm);
            if (cm < 20 && cm_val%10 != 0) continue;
            let cm_text;
            if (cm < 30) {
                cm_text = new createjs.Text(cm_val, '2px', 'black');
                cm_text.x = (lw*0.7) - 2 - cm_text.getBounds().width;
                cm_text.y = i - (cm_text.getBounds().height / 2);
            } else {
                cm_text = new createjs.Text(cm_val, '1px', 'black');
                cm_text.x = (lw*0.70) - cm_text.getBounds().width;
                cm_text.y = i + cm_text.getBounds().height - 5;
            }
            this.leftScale.addChild(cm_text);
        }
        if (cm >= 30) {
            for (let i = this.offset.y%mm; i < lh; i += mm) {
                if (i % cm == 0) continue;
                const mm_line = new createjs.Shape();
                mm_line.graphics.setStrokeStyle(1)
                    .beginStroke('black')
                    .moveTo((lw*0.85), i)
                    .lineTo(lw, i)
                    .endStroke();
                this.leftScale.addChild(mm_line);
            }
        }

        /* bottom bar */
        const bw = this.bottom.canvas.width;
        const bh = this.bottom.canvas.height;

        for (let i = this.offset.x%cm; i < bw; i += cm) {
            const cm_line = new createjs.Shape();
            cm_line.graphics.setStrokeStyle(1)
                .beginStroke('black')
                .moveTo(i, 0)
                .lineTo(i, bh/2)
                .endStroke();
            this.bottomScale.addChild(cm_line);

            const cm_val = Math.round((i+sidebar-this.offset.x) / cm);
            if (cm < 20 && cm_val%10 != 0) continue;
            let cm_text;
            if (cm < 30) {
                cm_text = new createjs.Text(cm_val, '1px', 'black');
                cm_text.x = i-(cm_text.getBounds().width/2);
                cm_text.y = (bh*0.60);
            } else {
                cm_text = new createjs.Text(cm_val, '2px', 'black');
                cm_text.x = i+2;
                cm_text.y = (bh*0.60);  
            }
            this.bottomScale.addChild(cm_text);
        }
        if (cm >= 30) {
            for (let i = this.offset.x%mm; i < bw; i += mm) {
                if (i % cm == 0) continue;
                const mm_line = new createjs.Shape();
                mm_line.graphics.setStrokeStyle(1)
                    .beginStroke('black')
                    .moveTo(i, 0)
                    .lineTo(i, (bh*0.15))
                    .endStroke();
                this.bottomScale.addChild(mm_line);
            }
        }

    };

    updateMouse(event) {
        const mouseLeft = this.left.globalToLocal(event.screenX, event.screenY);
        const mouseBottom = this.bottom.globalToLocal(event.screenX, event.screenY);
        const sidebarWidth = parseFloat($('#left_sidebar').css('width'), 10);
        mouseBottom.x = mouseBottom.x - sidebarWidth;
        this.leftMouse.graphics.clear()
            .setStrokeStyle(1)
            .beginStroke('gray')
            .moveTo(0, mouseLeft.y)
            .lineTo(this.left.canvas.width, mouseLeft.y)
            .endStroke();

        this.bottomMouse.graphics.clear()
            .setStrokeStyle(1)
            .beginStroke('gray')
            .moveTo(mouseBottom.x, 0)
            .lineTo(mouseBottom.x, this.bottom.canvas.height)
            .endStroke();
    };

    updateStages() {
        this.left.update();
        this.bottom.update();
    };

    resizeCanvases() {
        this.left.canvas.height = $(window).height();
        this.left.canvas.width = parseFloat($('#ruler-left').css('width'), 10);
        const sidebarWidth = parseFloat($('#left_sidebar').css('width'), 10);
        this.bottom.canvas.width = $(window).width() - sidebarWidth;
        this.bottom.canvas.height = parseFloat($('#ruler-bottom').css('height'), 10);
    }
}

module.exports.Rulers = Rulers;
