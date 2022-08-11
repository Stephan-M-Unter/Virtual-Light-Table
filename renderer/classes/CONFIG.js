'use strict';

class CONFIG {
    constructor() {};

    static ANIMATION_SPEED = {
        fast: 250,
        normal: 500,
        slow: 1000,
    };

    static COLOR = {
        cursor: 'beige',
        fragment: 'yellow',
        hover: 'orange',
        stage: 'cyan',
        hidden: 'gray',
        activeStroke: 'blue',
        defaultStroke: 'black',
    };
}

module.exports.CONFIG = CONFIG;