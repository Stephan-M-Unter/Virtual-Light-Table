'use strict';

class StageLayer extends createjs.Container {
    constructor() {
        super();
    }

    prepend(element) {
        this.addChildAt(element, 0);
    }
    beginWith(element) {
        this.prepend(element);
    }

    append(element) {
        this.addChild(element);
    }
    endWith(element) {
        this.append(element);
    }

    addAt(index, element) {
        this.addChildAt(element, index);
    }

    getElementAt() {}
    getOrder() {}
    getLayer() {}

    length() {}
    getLength() {}
}