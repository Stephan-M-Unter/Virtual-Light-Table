'use strict';

class Stage {
    constructor(DOMelement, width, height){
        // create new stage and set to given DOMelement
        this.stage = new createjs.Stage(DOMelement);
        this.stage.canvas.width = width;
        this.stage.canvas.height = height;
        this.stage.enableMouseOver();
        createjs.Touch.enable(this.stage);

        this.stage.offset = {x: 0, y:0};
        this.stage.scaling = 100;

        // create (almost) invisible background element to
        // allow for mouse interaction; pixels have to be barely
        // visible
        var background = new createjs.Shape();
        background.graphics.beginFill("#333333")
            .drawRect(0, 0, width, height);
        this.stage.addChild(background);

        // LoadQueue object for the images
        this.loadqueue = new createjs.LoadQueue();
        this.loadqueue.addEventListener('fileload', event => {
            this._createFragment(event, this.stage);
        });
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
    _createFragment(event, stage_element) {
        var new_fragment = new Fragment(stage_element, event.item);
        
        stage_element.addChild(new_fragment.getContainer());
        stage_element.update();
    }
    removeFragment(){}
}

class Fragment {
    constructor(stage_element, image_element){
        this.stage = stage_element; // stage where the fragment will be shown
        this.image = this._createImage(image_element);
        this.container = this._createContainer(image_element.properties);

        this.container.addChild(this.image);

        this.isRecto = image_element.properties.recto;
        this.urlRecto = image_element.properties.rectoURLlocal;
        this.urlVerso = image_element.properties.versoURLlocal;
        this.isSelected = false;
    };
    
    _createImage(image_data){
        var image = new createjs.Bitmap(image_data);
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
    
        return container;
    }

    select(){}
    deselect(){}
    setPosition(){}
    rotate(){}
    flip(){}
    
    getContainer(){ return this.container; }
    getImage(){ return this.image; }
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

$(document).ready(function(){
    var stage = new Stage("lighttable", window.innerWidth, window.innerHeight);
    
    // just for testing
    stage.loadFragments({"1":{"name":"CP001_002","xPos":1517,"yPos":902,"rotation":29.936585406377205,"recto":true,"rectoURLlocal":"../imgs/CP001_002rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP001_002vs_cutout_0_96ppi.png"},"2":{"name":"CP004_005","xPos":1097,"yPos":553,"rotation":-37.05961807666934,"recto":true,"rectoURLlocal":"../imgs/CP004_005rt_cutout_0_96ppi.png","versoURLlocal":"../imgs/CP004_005vs_cutout_0_96ppi.png"}});
});