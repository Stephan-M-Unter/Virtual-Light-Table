'use strict';

const { TouchBarSlider } = require("electron");

var xyz; // TODO: entfernen

class Stage {
    constructor(DOMelement, width, height){
        // create new stage and set to given DOMelement
        this.stage = new createjs.Stage(DOMelement);
        this.stage.canvas.width = width;
        this.stage.canvas.height = height;
        this.stage.enableMouseOver();
        createjs.Touch.enable(this.stage);

        this.fragmentList = {};
        this.selectedList = {};
        this.fragmentLabel = 0;

        this.stage.offset = {x: 0, y:0};
        this.stage.scaling = 100;

        // create (almost) invisible background element to
        // allow for mouse interaction; pixels have to be barely
        // visible
        var background = new createjs.Shape();
        background.graphics.beginFill("#333333")
            .drawRect(0, 0, width, height);
        background.alpha = 0.01;
        this.stage.addChild(background);
        background.on("mousedown", (event) => {
            this._clearSelectionList();
            this.mouseClickStart = {x: event.stageX, y: event.stageY};
        });
        background.on("pressmove", (event) => {
            this._panScene(event);
        })


        // selection box
        this.selector = new Selector();

        // LoadQueue object for the images
        this.loadqueue = new createjs.LoadQueue();
        this.loadqueue.addEventListener('fileload', event => {
            this._createFragment(event);
        });
    }

    _loadStageConfiguration(settings){
        this.stage.offset = settings.offset;
    }

    update(){ this.stage.update(); }

    loadFragments(imageList){
        for (let id in imageList) {
            let url = imageList[id].rectoURLlocal;
            if (!imageList[id].recto) { url = imageList[id].versoURLlocal };
            this.loadqueue.loadManifest([{id:id, src:url, properties:imageList[id]}], false);
        }
        //TODO: necessary to check that image can only be added once?
        this.loadqueue.load();
    }
    _createFragment(event) {
        var new_id = this.getNewFragmentId();
        var new_fragment = new Fragment(this.stage, new_id, event);
        this.fragmentList[new_id] = new_fragment; // registering fragment in fragmentList
        
        var fragment_container = new_fragment.getContainer();
        var fragment_image = new_fragment.getImage();
        this.stage.addChild(fragment_container);
        
        fragment_image.on("mousedown", (event) => {
            var clickedId = event.target.id;
            if (event.nativeEvent.ctrlKey == false && !this._isSelected(clickedId)) {
                // if ctrl key is not pressed, old selection will be cleared
                this._clearSelectionList();
            }
            if (event.nativeEvent.ctrlKey == true && this._isSelected(clickedId)) {
                // if ctrl key is pressed AND object is already selected:
                // -> remove selection for this object
                this._removeFromSelection(clickedId);
            } else {
                // in all other cases, add object to selection
                this._addToSelection(clickedId, this.fragmentList[clickedId]);
            }
            this._moveToTop(this.fragmentList[clickedId]);
            
            this._updateBb();
            this.mouseClickStart = {x: event.stageX, y: event.stageY};
        });

        fragment_image.on("pressmove", (event) => {
            this._moveObjects(event);
        });


        this.stage.update();
    }
    _removeFragment(id){
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

    _isSelected(id){
        return this.selectedList[id];
    }
    _addToSelection(id, object){
        this.selectedList[id] = object;
        this._updateBb();
    }
    _removeFromSelection(id){
        delete this.selectedList[id];
        this._updateBb();
    }
    _clearSelectionList(){
        this.selectedList = {};
        this._updateBb();
    }

    _panScene(event){
        let currentMouseX = event.stageX;
        let currentMouseY = event.stageY;

        let delta_x = currentMouseX - this.mouseClickStart.x;
        let delta_y = currentMouseY - this.mouseClickStart.y;

        this.mouseClickStart = {x: currentMouseX, y: currentMouseY};

        for (let idx in this.fragmentList) {
            let fragment = this.fragmentList[idx];
            let container = fragment.getContainer();

            fragment.moveByDistance(delta_x, delta_y);
        }

        this.stage.offset.x += delta_x;
        this.stage.offset.y += delta_y;

        this._updateBb();

        this.stage.update();
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
        this.rotator.rotation += delta_angle;

        this.mouseClickStart = {x:event.stageX, y:event.stageY};

        this.update();
    }

    _moveObjects(event){
        let moved_object = event.target;

        if (moved_object.name = "Image") {
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
        this.stage.update();
    }

    _updateBb(){
        this.stage.removeChild(this.bb);
        this.selector.updateBb(this.selectedList);
        this.bb = this.selector.getBb();
        this.stage.addChild(this.bb);
        this._updateRotator(this.bb.center.x, this.bb.center.y, this.bb.height);
        this.stage.update();
    }

    _updateRotator(x, y, height){
        this.stage.removeChild(this.rotator);

        if (Object.keys(this.selectedList).length == 1){
            this.rotator = new createjs.Shape();
            this.rotator.graphics
                .beginFill("#f5842c").drawCircle(0, 0, 20);
            this.rotator.x = x;
            this.rotator.y = y;
            this.rotator.regX = 0;
            this.rotator.regY = height/2;

            this.stage.addChild(this.rotator);

            this.rotator.on("mousedown", (event) => {
                this.mouseClickStart = {x: event.stageX, y: event.stageY};
            });
            this.rotator.on("pressmove", (event) => {
                this._rotateObjects(event);
            });
        }
    }

    exportCanvas() {
        // TODO Vorher muss der canvas noch so skaliert werden, dass alle Inhalte angezeigt werden können
    
        //deselect_all(); // we don't want the selection frame and other stuff in the exported image
    
        // creating artificial anchor element for download
        var pseudo_link = document.createElement('a');
        pseudo_link.href = document.getElementById('lighttable').toDataURL('image/png');
        pseudo_link.download = 'reconstruction.png';
        pseudo_link.style.display = 'none';
    
        // temporarily appending the anchor, "clicking" on it, and removing it again
        document.body.appendChild(pseudo_link);
        pseudo_link.click();
        document.body.removeChild(pseudo_link);
    }

    getNewFragmentId() {
        let new_id = "f_" + this.fragmentLabel;
        this.fragmentLabel = this.fragmentLabel + 1;
        return new_id;
    }
}

class Fragment {
    constructor(stage_element, id, event_data){
        this.stage = stage_element; // stage where the fragment will be shown
        this.image = this._createImage(event_data);
        this.container = this._createContainer(event_data.item.properties);
        this.container.regX = this.image.image.width / 2;
        this.container.regY = this.image.image.height / 2;

        this.id = id;
        this.image.id = id;
        this.container.id = id;

        this.container.addChild(this.image);

        this.isRecto = event_data.item.properties.recto;
        this.urlRecto = event_data.item.properties.rectoURLlocal;
        this.urlVerso = event_data.item.properties.versoURLlocal;
        this.isSelected = false;
    };
    
    _createImage(event_data){
        var image = new createjs.Bitmap(event_data.result);
        image.name = "Image";
        image.cursor = "pointer";
        image.x = 0;
        image.y = 0;
        image.scale = this.stage.scaling / 100;

        return image;
    }
    _createContainer(image_properties){
        var container = new createjs.Container();

        container.rotation = image_properties.rotation;
        container.x = image_properties.xPos * (this.stage.scaling / 100) + this.stage.offset.x;
        container.y = image_properties.yPos * (this.stage.scaling / 100) + this.stage.offset.y;
        container.name = "Container";

        container.offset = {x:0, y:0};

        return container;
    }

    moveByDistance(dist_x, dist_y){
        this.container.x += dist_x;
        this.container.y += dist_y;
    }
    moveToPixel(x, y){
        this.container.x = x;
        this.container.y = y;
    }

    rotateToAngle(target_angle){
        this.container.rotation = target_angle;
    }
    rotateByAngle(delta_angle){
        this.rotateToAngle(this.container.rotation + delta_angle);
    }
    flip(){}
    
    getContainer(){ return this.container; }
    getImage(){ return this.image; }
    getData(){ return {}}; //TODO
}

class Scaler {
    static length(number) {
        return Math.floor(number * inv_scale(stage.scalingFactor));
    }
    static x(number) {
        return Math.floor((number - zoom.world.x) * inv_scale(stage.scalingFactor) + zoom.screen.x);
    }
    static y(number) {
        return Math.floor((number - zoom.world.y) * inv_scale(stage.scalingFactor) + zoom.screen.y);
    }
    static x_INV(number) {
        return Math.floor((number - zoom.screen.x) * (1 / inv_scale(stage.scalingFactor)) + zoom.world.x);
    }
    static y_INV(number) {
        return Math.floor((number - zoom.screen.y) * (1 / inv_scale(stage.scalingFactor)) + zoom.world.y);
    }
}

class Selector {
    constructor(){
        this.x = 0;
        this.y = 0;
        this.width = 100;
        this.height = 100;
    }

    _setPosition(x,y){
        this.x = x;
        this.y = y;
    }
    _setWidth(new_width){
        this.width = width;
    }
    _setHeight(new_height){
        this.height = height;
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

$(document).ready(function(){
    var stage = new Stage("lighttable", window.innerWidth, window.innerHeight);
    
    function send_message(code, data=null){ ipcRenderer.send(code, data); }
    
    // Clear Table Button
    $('#clear_table').click(function(){send_message('server-clear-table');});
    // Save Table Button
    $('#save_table').click(function(){send_message('server-save-table');});
    // Load Table Button
    $('#load_table').click(function(){send_message('server-load-table');});
    // Horizontal Flip Button
    $('#hor_flip_table').click(function(){send_message('server-hor-flip-table');});
    // Vertical Flip Button
    $('#vert_flip_table').click(function(){send_message('server-vert-flip-table');});
    // Export Button
    $('#export').click(function(){stage.exportCanvas();});
    // Light Switch Button
    var light_mode = "dark";
    var dark_background;
    $('#light_switch').click(function(){
        if (light_mode == "dark") {
            // current light_mode is "dark" => change to "bright"
            dark_background = $('body').css('background');
            $('body').css({background: "linear-gradient(356deg, rgba(255,255,255,1) 0%, rgba(240,240,240,1) 100%)"});
            light_mode = "bright";
        } else {
            // current light_mode is "bright" => change to "dark"
            $('body').css({background: dark_background});
            light_mode = "dark";
        }
    });

    let test_settings = {
        offset:{x:600, y:200}
    }

    // just for testing
    stage._loadStageConfiguration(test_settings);
    stage.loadFragments({"1":{"name":"CP001_002","xPos":400,"yPos":100,"rotation":60,"recto":true,"rectoURLlocal":"../imgs/CP001_002rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP001_002vs_cutout_0_96ppi.png"},"2":{"name":"CP004_005","xPos":200,"yPos":553,"rotation":30,"recto":true,"rectoURLlocal":"../imgs/CP004_005rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP004_005vs_cutout_0_96ppi.png"}});
    xyz = stage; // TODO entfernen
});