/**
 * TODO
 */
class Scaler {
    /**
     * TODO
     */
    constructor() {
    }

    static zoom = {
        world:{
            x:0,
            y:0
        },
        screen:{
            x:0,
            y:0
        }
    }

    static scaling = 100;

    /*static setZoomWorldX(value){
        this.zoom.world.x = value;
    }
    static setZoomWorldY(value){
        this.zoom.world.y = value;
    }
    static setZoomScreenX(value){
        this.zoom.screen.x = value;
    }
    static setZoomScreenY(value){
        this.zoom.screen.y = value;
    }*/

    static length(number) {
        return Math.round(number * this.scaling/100);
    }
    static x(number) {
        return Math.round((number - this.zoom.world.x) * this.scaling + this.zoom.screen.x);
    }
    static y(number) {
        return Math.round((number - this.zoom.world.y) * this.scaling + this.zoom.screen.y);
    }
    static x_INV(number) {
        return Math.round((number - this.zoom.screen.x) / this.scaling + this.zoom.world.x);
    }
    static y_INV(number) {
        return Math.round((number - this.zoom.screen.y) / this.scaling + this.zoom.world.y);
    }
}

module.exports.Scaler = Scaler;
