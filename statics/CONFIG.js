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

    static EXTERNAL_DATA_UPDATE_TIMESPAN = 800000000;
    static UNDO_STEPS_MAX = 30;
}

module.exports.CONFIG = CONFIG;