'use strict';

class UploadStage {
    constructor(name, canvasID) {
        this.name = name;
        this.canvas = $(`#${canvasID}`);
        this.stage = new createjs.Stage(canvasID);

        // former "content"
        this.filepath = null;
        this.image = null;
        this.background = null;
        this.shadow = null;
        this.rotation = null;
        this.x = null;
        this.y = null;
        this.ppi = null;
        this.www = false;

        // former "mask"
        this.maskLayer = new createjs.Container();
        this.box = [];
        this.polygon = [];
        this.MLMaskPaths = {};
        this.MLMask = null;
        this.MLCutPaths = {};
        this.MLCut = null;

        // display layers

        this.maskMode;
    }

    getContent() {
        const report = {
            'rotation': this.image.rotation,
            'url': this.filepath,
            'ppi': this.ppi,
            'cx': this.image.x,
            'cy': this.image.y,
            'box': ,
            'box_upload': ,
            'polygon': ,
            'polygon_upload': ,
            'www': ,
            'upload': {
                'box': ,
                'polygon': ,
                'x': ,
                'y': ,
                'scale': ,
            }
        }
    }


}

module.exports.UploadStage = UploadStage;
