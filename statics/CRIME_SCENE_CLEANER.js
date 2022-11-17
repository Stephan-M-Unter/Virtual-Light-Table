'use strict';

const path = require('path');
const fs = require('fs-extra');

class CRIME_SCENE_CLEANER {
    constructor() {};

    static removeLegacies(vltFolder) {
        this.removeOldTPOPFolder(vltFolder);
    }

    static removeOldTPOPFolder(vltFolder) {
        const oldTPOPFolder = path.join(vltFolder, 'tpop');
        if (fs.existsSync(oldTPOPFolder)) {
            fs.removeSync(oldTPOPFolder);
            console.log('[LEGACY] Old TPOP folder has been removed.');
        }
    }
}

module.exports = CRIME_SCENE_CLEANER;
