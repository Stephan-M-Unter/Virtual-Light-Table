class Fragment {
    constructor(controller, stage_object, id, event_data){
        this.controller = controller;
        this.id = id;
        this.isRecto = event_data.item.properties.recto;
        this.urlRecto = event_data.item.properties.rectoURL;
        this.urlVerso = event_data.item.properties.versoURL;
        this.isSelected = false;
        this.bothSidesLoaded = false;
        this.name = event_data.item.properties.name;

        this.framework = stage_object;
        this.stage = stage_object.stage; // stage where the fragment will be shown

        if (this.isRecto ? this.imageRecto = this._createImage(event_data, id) : this.imageVerso = this._createImage(event_data, id));

        this.container = this._createContainer(event_data.item.properties, id);
        this.container.regX = this.getImage().image.width / 2;
        this.container.regY = this.getImage().image.height / 2;

        if (this.isRecto ? this.container.addChild(this.imageRecto) : this.container.addChild(this.imageVerso));
    }
    
    _createImage(event_data, id){
        var image = new createjs.Bitmap(event_data.result);

        if (this.isRecto){
            image.name = "Image - Recto";
        } else {
            image.name = "Image - Verso";
        }
        image.cursor = "pointer";
        image.x = 0;
        image.y = 0;
        image.id = id;
        image.scale = this.stage.scaling / 100;

        return image;
    }
    _createContainer(image_properties, id){
        var container = new createjs.Container();

        container.rotation = image_properties.rotation;

        if (image_properties.xPos && image_properties.yPos) {
            container.x = image_properties.xPos;// * (this.stage.scaling / 100) + this.stage.offset.x;
            container.y = image_properties.yPos;// * (this.stage.scaling / 100) + this.stage.offset.y;
        } else {
            let canvas_size = this.controller.getCanvasCenter();
            container.x = canvas_size.x;
            container.y = canvas_size.y;
        }
        container.name = "Container";
        container.id = id;

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
        this.container.rotation = target_angle%360;
    }
    rotateByAngle(delta_angle){
        this.rotateToAngle(this.container.rotation + delta_angle);
    }
    scaleToValue(scaling){
        this.container.scale = scaling;
    }
    flip(){
        this.isRecto = !this.isRecto;
        if (this.bothSidesLoaded){
            // both sides have already been loaded to the application
            this.container.removeChild(this.image);
            if (this.isRecto ? this.image = this.image_recto : this.image = this.image_verso);
            this.container.addChild(this.image);
        } else {
            // second side still to be loaded
            let loadqueue = new createjs.LoadQueue();
            loadqueue.addEventListener("fileload", (event) => {
                let second_image = this._createImage(event, this.id);
                if (this.isRecto ? this.imageRecto = second_image : this.imageVerso = second_image);

                if (this.isRecto) {
                    this.imageRecto = second_image;
                    this.framework.registerImageEvents(this.imageRecto);
                    this.container.removeChild(this.imageVerso);
                    this.container.addChild(this.imageRecto);
                } else {
                    this.imageVerso = second_image;
                    this.framework.registerImageEvents(this.imageVerso);
                    this.container.removeChild(this.imageRecto);
                    this.container.addChild(this.imageVerso);
                }
                this.framework._updateBb();
                this.stage.update();
            });
            let url;
            if (this.isRecto ? url=this.urlRecto : url=this.urlVerso);
            loadqueue.loadFile(url);
            loadqueue.load();
        }

        this.controller.updateFragmentList();

        // Möglichkeit 2: Bild existiert
        // dann einfach bilder austauschen
        // flag umdrehen
    }
    
    getContainer(){ return this.container; }
    getImage(){ 
        if (this.isRecto) {
            return this.imageRecto;
        } else {
            return this.imageVerso;
        }
    }
    getImageURL(){
        if (this.isRecto) {
            return this.urlRecto;
        } else {
            return this.urlVerso;
        }
    }
    getData(){
        return {
            "name":this.name,
            "recto":this.isRecto,
            "rectoURL":this.urlRecto,
            "versoURL":this.urlVerso,
            "xPos":this.container.x,
            "yPos":this.container.y,
            "rotation":this.container.rotation
        };
    }
    getName(){
        return this.name;
    }
    getPosition(){
        return {x:this.container.x, y:this.container.y};
    }
    getX(){
        return this.container.x;
    }
    getY(){
        return this.container.y;
    }
    getUnscaledX(){
        return this.container.x / this.container.scale;
    }
    getUnscaledY(){
        return this.container.y / this.container.scale;
    }
    getRotation(){
        return this.container.rotation;
    }
}

module.exports.Fragment = Fragment;