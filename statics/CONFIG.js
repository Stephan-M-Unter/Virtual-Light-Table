'use strict';

const fs = require("fs-extra");
const path = require('path');
const LOGGER = require('./LOGGER');

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
    
    static APP_FOLDER;
    static VLT_FOLDER;
    static SAVES_FOLDER;
    static TEMP_FOLDER;
    static EXTERNAL_FOLDER;
    static PYTHON_CMD;
    static PYTHON_FOLDER;

    static set_vlt_folder(folder) {
        this.VLT_FOLDER = folder;
        this.TEMP_FOLDER = path.join(folder, 'temp');
        this.SAVES_FOLDER = path.join(folder, 'saves');
        this.EXTERNAL_FOLDER = path.join(folder, 'externalContent');
        LOGGER.log('CONFIG', `VLT folder changed to ${this.VLT_FOLDER}.`);
        LOGGER.log('CONFIG', `TEMP folder changed to ${this.TEMP_FOLDER}.`);
        LOGGER.log('CONFIG', `SAVES folder changed to ${this.SAVES_FOLDER}.`);
        LOGGER.log('CONFIG', `EXTERNAL_CONTENT folder changed to ${this.EXTERNAL_FOLDER}.`);

        // the constraints for this function have been relaxed - it is no longer necessary that the VLT
        // folder exists to set the path structure. However, if the CONFIG is set before the folders exist,
        // a warning will be passed to the log file.
        if (!fs.existsSync(this.VLT_FOLDER)) LOGGER.log('CONFIG', `WARNING - VLT folder ${this.VLT_FOLDER} does not (yet) exist!`);
        if (!fs.existsSync(this.SAVES_FOLDER)) LOGGER.log('CONFIG', `WARNING - SAVES folder ${this.SAVES_FOLDER} does not (yet) exist!`);
        if (!fs.existsSync(this.TEMP_FOLDER)) LOGGER.log('CONFIG', `WARNING - TEMP folder ${this.TEMP_FOLDER} does not (yet) exist!`);
        if (!fs.existsSync(this.EXTERNAL_FOLDER)) LOGGER.log('CONFIG', `WARNING - EXTERNAL folder ${this.EXTERNAL_FOLDER} does not (yet) exist!`);
    }

    static set_app_path(folder) {
        if (fs.existsSync(folder)) {
            this.APP_FOLDER = folder;
        }
    }
    
    static set_python_folder(folder) {
        if (fs.existsSync(folder)) {
            this.PYTHON_FOLDER = folder;
            LOGGER.log('CONFIG', `PYTHON folder changed to ${this.PYTHON_FOLDER}.`);
        } else {
            LOGGER.log('CONFIG', `ERROR - PYTHON folder (${folder}) does not exists. Current PYTHON folder (${this.PYTHON_FOLDER}) not changed.`);
        }
    }
    
    static set_python_command(cmd) {
        this.PYTHON_CMD = cmd;
        LOGGER.log('CONFIG', `PYTHON_CMD changed to ${this.PYTHON_CMD}.`);
    }
}

module.exports.CONFIG = CONFIG;