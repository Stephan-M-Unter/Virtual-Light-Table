const { Fragment } = require("./Fragment");
const { Scaler } = require("./Scaler");

class Stage {
    constructor(controller, DOMelement, width, height){
        // create new stage and set to given DOMelement
        this.controller = controller;
        this.stage = new createjs.Stage(DOMelement);
        this.stage.canvas.width = this.width = width;
        this.stage.canvas.height = this.height = height;
        this.stage.enableMouseOver();
        createjs.Touch.enable(this.stage);

        this.fragmentList = {};
        this.selectedList = {};
        this.fragmentLabel = 0;

        this.stage.offset = {x: 0, y:0};
        this.stage.scaling = 100;

        this.lines = {
            "horizontal": null,
            "vertical": null
        };

        this.background = this._createBackground(width, height);
        this.stage.addChild(this.background);

        // selection box
        this.selector = new Selector(this.controller);

        // LoadQueue object for the images
        this.loadqueue = new createjs.LoadQueue();
        this.loadqueue.addEventListener('fileload', event => {
            this._createFragment(event);
        });
    }

    _createBackground(width, height){
        // create (almost) invisible background element to
        // allow for mouse interaction; pixels have to be barely
        // visible
        var background = new createjs.Shape();
        background.graphics.beginFill("#333333")
            .drawRect(0, 0, width, height);
        background.alpha = 0.01;
        background.name = "background";
        background.on("mousedown", (event) => {
            this.controller.clearSelection();
            this.mouseClickStart = {x: event.stageX, y: event.stageY};
        });
        background.on("pressmove", (event) => {
            this._panScene(event);
        });
        background.on("pressup", (event) => {
            this._saveToModel();
        });

        return background;

    }

    _clearTable(){
        for (let idx in this.fragmentList) {
            this.stage.removeChild(this.fragmentList[idx].getContainer());
        }

        this.clearSelection();
        this._clearFragmentList();
        this.update();
    }
    loadScene(data){
        this._clearTable();

        if (data && data.stage) {
            this._loadStageConfiguration(data.stage);
        } else {
            this._loadStageConfiguration();
        }

        if (data && data.fragments) { this._loadFragments(data.fragments);}

        this.update();
    }
    _loadStageConfiguration(settings){
        if (settings && settings.offset ? this.stage.offset = settings.offset : this.stage.offset = {x:0, y:0});
        //if (this.stage.scaling ? this.stage.scaling = settings.scaling : this.stage.scaling = 100);
    }
    getData(){
        return {
            "offset":this.stage.offset,
            "scaling":this.stage.scaling
        };
    }
    getConfiguration(){
        let stage_data = this.getData();
        let items_data = {};
        for (let idx in this.fragmentList){
            items_data[idx] = this.fragmentList[idx].getData();
        }

        return {
            "stage":stage_data,
            "fragments":items_data
        };
    }
    getFragmentList(){
        return this.fragmentList;
    }
    getSelectedList(){
        return this.selectedList;
    }

    getCenter(){
        let cx = this.width / 2;
        let cy = this.height / 2;
        return {"x":cx, "y":cy};
    }

    _saveToModel(){
        let data_object = this.getConfiguration();
        ipcRenderer.send("server-save-to-model", data_object);
    }


    setScaling(scaling){
        // scaling should only impact the scene if between values 10 and 300
        // i.e. scaling by 0.1 min or 3.0 max
        if (scaling >= 10 && scaling <= 300){
            this.stage.old_scaling = this.stage.scaling;
            let delta_scaling = scaling-this.stage.scaling;
            this.stage.scaling = scaling;
            Scaler.scaling = scaling/100;

            this.stage.offset.x = this.stage.offset.x * scaling / this.stage.old_scaling;
            this.stage.offset.y = this.stage.offset.y * scaling / this.stage.old_scaling;

            // scaling via zoom slider
            Scaler.zoom.screen.x = Math.floor(this.stage.canvas.width / 2);
            Scaler.zoom.screen.y = Math.floor(this.stage.canvas.height / 2);
            Scaler.zoom.world.x = Scaler.x_INV(Scaler.zoom.screen.x);
            Scaler.zoom.world.y = Scaler.y_INV(Scaler.zoom.screen.y);

            this._scaleObjects();
            this.update();
        }
    }
    resizeCanvas(width, height){
        this.stage.canvas.width = this.width = width;
        this.stage.canvas.height = this.height = height;

        this.stage.removeChild(this.background);
        this.background = this._createBackground(width, height);
        this.stage.addChildAt(this.background, 0);

        this.update();
    }

    update(){
        this.stage.update();
    }
    _updateUIElements(){
        this._updateBb();
        this._updateRotator();
        this._updateFlipper();
    }

    _loadFragments(imageList){
        for (let id in imageList) {
            let url = imageList[id].rectoURLlocal;
            if (!imageList[id].recto) { url = imageList[id].versoURLlocal; }
            this.loadqueue.loadManifest([{id:id, src:url, properties:imageList[id]}], false);
        }
        //TODO: necessary to check that image can only be added once?
        this.loadqueue.load();
    }
    _createFragment(event) {
        var new_id;
        if (event.item.id) {
            new_id = event.item.id;
        } else {
            new_id = this.getNewFragmentId();
        }
        var new_fragment = new Fragment(this.controller, this, new_id, event);
        this.fragmentList[new_id] = new_fragment; // registering fragment in fragmentList
        
        var fragment_container = new_fragment.getContainer();
        var fragment_image = new_fragment.getImage();
        this.stage.addChild(fragment_container);
        
        this.registerImageEvents(fragment_image);

        this.controller.updateFragmentList();
        this.stage.update();
    }
    removeFragment(id){
        // iterate over fragmentList and match items with requested id
        for (let idx in this.fragmentList) {
            let fragment = this.fragmentList[idx];
            if (fragment.id == id) {
                // remove correct fragment both from stage and fragmentList
                let fragment_container = fragment.getContainer();
                this.stage.removeChild(fragment_container);
                delete this.fragmentList[fragment.id];
                this.stage.update();
            }
        }
    }

    deleteSelectedFragments(){
        for (let id in this.selectedList){
            this.removeFragment(id);
        }
        this.controller.clearSelection();
    }

    registerImageEvents(image){
        image.on("mousedown", (event) => {
            var clickedId = event.target.id;
            if (event.nativeEvent.ctrlKey == false && !this._isSelected(clickedId)) {
                // if ctrl key is not pressed, old selection will be cleared
                this.controller.clearSelection();
            }
            if (event.nativeEvent.ctrlKey == true && this._isSelected(clickedId)) {
                // if ctrl key is pressed AND object is already selected:
                // -> remove selection for this object
                this.controller.deselectFragment(clickedId);
            } else {
                // in all other cases, add object to selection
                this.controller.selectFragment(clickedId);
            }
            this._moveToTop(this.fragmentList[clickedId]);
            
            this._updateBb();
            this.mouseClickStart = {x: event.stageX, y: event.stageY};
        });

        image.on("pressmove", (event) => {
            this._moveObjects(event);
        });

        image.on("pressup", (event) => {
            this._saveToModel();
        });

        image.on("mouseover", (event) => {
            var id = event.target.id;
            this.controller.highlightFragment(id);
        });

        image.on("mouseout", (event) => {
            var id = event.target.id;
            this.controller.unhighlightFragment(id);
        });

    }

    _isSelected(id){
        return this.selectedList[id];
    }
    selectFragment(id){
        this.selectedList[id] = this.fragmentList[id];
        this.fragmentList[id].getImage().shadow = new createjs.Shadow("#f15b40", 0, 0, 10);
        this._updateBb();
    }
    deselectFragment(id){
        delete this.selectedList[id];
        this.fragmentList[id].getImage().shadow = null;
        this._updateBb();
    }
    clearSelection(){
        for (let id in this.selectedList) {
            this.selectedList[id].getImage().shadow = null;
        }
        this.selectedList = {};
        this._updateBb();
    }
    highlightFragment(id){
        this.fragmentList[id].getImage().shadow = new createjs.Shadow("#A4042A", 0, 0, 10);
        this.update();
    }
    unhighlightFragment(id){
        if (id in this.selectedList) {
            this.fragmentList[id].getImage().shadow = new createjs.Shadow("#f15b40", 0, 0, 10);
        } else {
            this.fragmentList[id].getImage().shadow = null;
        }
        this.update();
    }


    _clearFragmentList(){
        this.fragmentList = {};
    }

    _panScene(event){
        let currentMouseX = event.stageX;
        let currentMouseY = event.stageY;

        let delta_x = currentMouseX - this.mouseClickStart.x;
        let delta_y = currentMouseY - this.mouseClickStart.y;

        this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

        this.moveStage(delta_x, delta_y);
    }

    _moveToTop(fragment){
        let container = fragment.getContainer();
        this.stage.removeChild(container);
        this.stage.addChild(container);
    }

    _rotateObjects(event){
        var rads_old = Math.atan2(this.mouseClickStart.y - this.rotator.y, this.mouseClickStart.x - this.rotator.x);
        var rads_new = Math.atan2(event.stageY - this.rotator.y, event.stageX - this.rotator.x);
        var rads = rads_new - rads_old;
        var delta_angle = rads * (180 / Math.PI);

        for (let idx in this.selectedList) {
            let fragment = this.selectedList[idx];
            let container = fragment.getContainer();
            fragment.rotateByAngle(delta_angle);
        }
        
        this.bb.rotation += delta_angle;
        this.flipper.rotation += delta_angle;
        this.rotator.rotation += delta_angle;

        this.mouseClickStart = {x:event.stageX, y:event.stageY};

        this.update();
    }
    _moveObjects(event){
        let moved_object = event.target;

        if (moved_object.name == "Image") {
            moved_object = moved_object.parent;
        }

        let currentMouseX = event.stageX;
        let currentMouseY = event.stageY;

        let delta_x = currentMouseX - this.mouseClickStart.x;
        let delta_y = currentMouseY - this.mouseClickStart.y;

        this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

        for (let idx in this.selectedList) {
            let fragment = this.selectedList[idx];
            let container = fragment.getContainer();
            fragment.moveByDistance(delta_x, delta_y);
        }

        this._updateBb();
        this.update();
    }
    moveStage(delta_x, delta_y) {
        for (let idx in this.fragmentList) {
            let fragment = this.fragmentList[idx];
            fragment.moveByDistance(delta_x, delta_y);
        }

        this.stage.offset.x += delta_x;
        this.stage.offset.y += delta_y;
        this._updateBb();

        this.stage.update();
    }
    _scaleObjects(){
        for (let idx in this.fragmentList) {
            let fragment = this.fragmentList[idx];

            let x_new = Scaler.x(fragment.getX());
            let y_new = Scaler.y(fragment.getY());

            console.log(fragment.getX(), x_new);
            fragment.moveToPixel(x_new, y_new);
            fragment.scaleToValue(this.stage.scaling/100);
        }

        this._updateBb();
        this._updateRotator();
        this.update();
    }
    flipTable(horizontal_flip=true){
        this.controller.clearSelection();

        let y_axis = this.stage.canvas.width/2;
        let x_axis = this.stage.canvas.height/2;

        for (let idx in this.fragmentList){
            let fragment = this.fragmentList[idx];
            fragment.flip();

            let x = fragment.getX();
            let y = fragment.getY();

            let x_new, y_new;
            fragment.rotateToAngle(-fragment.getRotation());
            if (horizontal_flip){
                x_new = 2*y_axis - x;
                y_new = y;
            } else {
                x_new = x;
                y_new = 2*x_axis - y;
                fragment.rotateToAngle(180+fragment.getRotation());
            }
            fragment.moveToPixel(x_new, y_new);
        }
        this._saveToModel();
        this.controller.updateFragmentList();
    }

    _updateBb(){
        this.stage.removeChild(this.bb);
        this.selector.updateBb(this.selectedList);
        this.bb = this.selector.getBb();
        this.stage.addChild(this.bb);
        this._updateFlipper(this.bb.center.x, this.bb.center.y, this.bb.width, this.bb.height);
        this._updateRotator(this.bb.center.x, this.bb.center.y, this.bb.height);
        this.update();
    }

    _updateFlipper(x,y,width,height){
        this.stage.removeChild(this.flipper);

        if (Object.keys(this.selectedList).length == 1){
            this.flipper = new createjs.Container();

            let circle = new createjs.Shape();
            circle.graphics
                .beginFill("white").drawCircle(0,0,20);
            this.flipper.addChild(circle);

            let bmp = new createjs.Bitmap("../imgs/symbol_flip.png");
            bmp.scale = 1;
            bmp.x = bmp.y = -15;
            bmp.onload = function(){
                this.update();
            };
            this.flipper.addChild(bmp);

            this.flipper.x = x;
            this.flipper.y = y;
            this.flipper.regX = -width/2-30;
            this.flipper.regY = -height/2+30;
            this.flipper.name = "Flip Button";

            if (this.flipper.x - this.flipper.regX > this.stage.canvas.width) {
                this.flipper.regX *= -1;
            }

            this.flipper.on("click", (event) => {
                // the flip button is only accessible if only
                // one element is selected
                // TODO: oder doch für mehrere auch?
                let id = Object.keys(this.selectedList)[0];
                let fragment = this.selectedList[id];
                fragment.flip();
                this.update();
                this._saveToModel();
            });

            this.stage.addChild(this.flipper);
        }
    }
    _updateRotator(x, y, height){
        this.stage.removeChild(this.rotator);

        if (Object.keys(this.selectedList).length == 1){
            this.rotator = new createjs.Container();
            
            let circle = new createjs.Shape();
            circle.graphics
                .beginFill("#f5842c").drawCircle(0, 0, 20);
            this.rotator.addChild(circle);

            let bmp = new createjs.Bitmap("../imgs/symbol_rotate.png");
            bmp.scale = 1;
            bmp.x = bmp.y = -15;
            this.rotator.addChild(bmp);
            
            this.rotator.x = x;
            this.rotator.y = y;
            this.rotator.regX = 0;
            this.rotator.regY = height/2;
            if (this.rotator.y - this.rotator.regY < 0) {
                this.rotator.regY *= -1;
            }
            this.rotator.name = "Rotation Anchor";

            this.stage.addChild(this.rotator);

            this.rotator.on("mousedown", (event) => {
                this.mouseClickStart = {x: event.stageX, y: event.stageY};
            });
            this.rotator.on("pressmove", (event) => {
                this._rotateObjects(event);
            });
            this.rotator.on("pressup", (event) => {
                this._saveToModel();
            });
        }

    }

    // @fileFormat - "png", "jpg", "jpeg"
    exportCanvas(fileFormat="png") {
        // TODO Vorher muss der canvas noch so skaliert werden, dass alle Inhalte angezeigt werden können
    
        // remove UI elements
        this.clearSelection();
        this._updateUIElements();

        var pseudo_link = document.createElement('a');
        let extension, type;

        if (fileFormat == "jpg" || fileFormat == "jpeg") {
            extension = "jpg";
            type = "image/jpeg";
            let background_color = "#FF00FF";
            
            // creating a pseudo canvas, filling it with background color
            // then, drawing VLT canvas on top
            let pseudo_canvas = document.createElement("canvas");
            pseudo_canvas.width = this.stage.canvas.width;
            pseudo_canvas.height = this.stage.canvas.height;
            let pseudo_context = pseudo_canvas.getContext("2d");
            pseudo_context.fillStyle = background_color;
            pseudo_context.fillRect(0,0,this.stage.canvas.width,this.stage.canvas.height);
            pseudo_context.drawImage(this.stage.canvas,0,0);
            pseudo_link.href = pseudo_canvas.toDataURL();

        } else if (fileFormat == "png") {
            extension = "png";
            type = "image/png";
            pseudo_link.href = document.getElementById('lighttable').toDataURL(type);
        }
    
        // creating artificial anchor element for download
        pseudo_link.download = 'reconstruction.' + extension;
        pseudo_link.style.display = 'none';
    
        // temporarily appending the anchor, "clicking" on it, and removing it again
        document.body.appendChild(pseudo_link);
        pseudo_link.click();
        document.body.removeChild(pseudo_link);
    }

    getNewFragmentId() {
        let new_id = "f_" + this.fragmentLabel;
        this.fragmentLabel = this.fragmentLabel + 1;
        if (new_id in this.fragmentList) {
            new_id = this.getNewFragmentId();
        }
        return new_id;
    }

    showFlipLine(horizontal) {
        if (horizontal) {
            let line = new createjs.Shape();
            line.graphics.setStrokeStyle(4)
                .beginStroke("rgba(0,0,0,0.2)")
                .setStrokeDash([10,8])
                .moveTo(this.width/2, 0)
                .lineTo(this.width/2, this.height)
                .endStroke();
            this.lines.horizontal = line;
            this.stage.addChild(this.lines.horizontal);
            this.update();
        } else {
            let line = new createjs.Shape();
            line.graphics.setStrokeStyle(4)
                .beginStroke("rgba(0,0,0,0.2)")
                .setStrokeDash([10,8])
                .moveTo(0, this.height/2)
                .lineTo(this.width, this.height/2)
                .endStroke();
            this.lines.vertical = line;
            this.stage.addChild(this.lines.vertical);
            this.update();
        }
    }

    hideFlipLines() {
        if (this.lines.horizontal != null) {
            this.stage.removeChild(this.lines.horizontal);
            this.lines.horizontal = null;
        }
        if (this.lines.vertical != null) {
            this.stage.removeChild(this.lines.vertical);
            this.lines.vertical = null;
        }
        this.update();
    }
}

class Selector {
    constructor(controller){
        this.controller = controller;
        this.x = 0;
        this.y = 0;
        this.width = 100;
        this.height = 100;
    }

    updateBb(selectionList){
        var left, top, right, bottom;
        for (let idx in selectionList) {
            let fragment = selectionList[idx];
            let container = fragment.getContainer();
            let image = fragment.getImage().image;

            let bounds = container.getTransformedBounds();
            let x_left = bounds.x;
            let y_top = bounds.y;
            let x_right = bounds.x + bounds.width;
            let y_bottom = bounds.y + bounds.height;
            
            (!left ? left = x_left : left = Math.min(left, x_left));
            (!top ? top = y_top : top = Math.min(top, y_top));
            (!right ? right = x_right : right = Math.max(right, x_right));
            (!bottom ? bottom = y_bottom : bottom = Math.max(bottom, y_bottom));
        }

        this.x = left;
        this.y = top;
        this.width = right-left;
        this.height = bottom-top;
    }

    getBb(){
        let bb = new createjs.Shape();
        bb.name = "Bounding Box";
        bb.graphics
            .beginStroke('#f5842c')
            //.setStrokeDash([15.5])
            //.setStrokeStyle(2)
            .drawRect(0, 0, this.width, this.height);
        bb.center = {x:this.x + this.width/2, y:this.y + this.height/2};
        bb.x = bb.center.x;
        bb.y = bb.center.y;
        bb.regX = this.width/2;
        bb.regY = this.height/2;
        bb.height = this.height;
        bb.width = this.width;
        return bb;
    }

}

module.exports.Stage = Stage;