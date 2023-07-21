'use strict';

const path = require('path');
const fs = require('fs-extra');
const {CONFIG} = require('./CONFIG');
const LOGGER = require('./LOGGER');

class CRIME_SCENE_CLEANER {
    constructor() {};

    static removeLegacies() {
        this.removeOldTPOPFolder();
    }

    static removeOldTPOPFolder() {
        const oldTPOPFolder = path.join(CONFIG.VLT_FOLDER, 'tpop');
        if (fs.existsSync(oldTPOPFolder)) {
            fs.removeSync(oldTPOPFolder);
            LOGGER.log('CRIME SCENE CLEANER', '[LEGACY] Old TPOP folder has been removed.');
        }
    }
}

module.exports = CRIME_SCENE_CLEANER;
