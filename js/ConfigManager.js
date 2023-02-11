'use strict';

const fs = require('fs-extra');
const LOGGER = require("../statics/LOGGER");
const {CONFIG} = require("../statics/CONFIG");

class ConfigManager {

    constructor(vltConfigFilePath) {
        this.vltConfigFilePath = vltConfigFilePath;
        this.config = null;
        this.initialise();
    }

    initialise() {
        if (fs.existsSync(this.vltConfigFilePath)) {
            this.read();
        } else {
            this.loadDefault();
            this.save();
        }
    }
    save() {
        const configJSON = JSON.stringify(this.config);
        fs.writeFileSync(this.vltConfigFilePath, configJSON, function(err) {
            if (err) {
                LOGGER.err('CONFIG', 'Error while writing config file.');
                LOGGER.err('CONFIG', err);
            } else {
                LOGGER.log('CONFIG', 'Config File successfully saved.');
            }
        });
    }
    read() {
        const configJSON = fs.readFileSync(this.vltConfigFilePath);
        try {
            this.config = JSON.parse(configJSON)
            if (this.config.vltFolder) {
                CONFIG.set_vlt_folder(this.config.vltFolder);
            } else {
                this.config.vltFolder = CONFIG.VLT_FOLDER;
            }
        } catch (err) {
            LOGGER.err('CONFIG', 'An error occurred while reading the config file.');
            LOGGER.err('CONFIG', err);
            LOGGER.log('CONFIG', 'Loading default configuration.');
            this.loadDefault();
        }

    }
    loadDefault() {
        this.config = {};
        this.config.ppi = 96;
        this.config.minZoom = 0.1;
        this.config.maxZoom = 3.0;
        this.config.stepZoom = 0.1;
        this.config.vltFolder = CONFIG.VLT_FOLDER;
        this.config.saveFolder = CONFIG.SAVES_FOLDER;
        this.config.tempFolder = CONFIG.TEMP_FOLDER;
    }
    set(key, value) {
        this.config[key] = value;
        this.save();
    }
    replaceWith(newConfiguration) {
        this.config = newConfiguration;
        this.save();
    }
    getConfig() {
        return this.config;
    }

}

module.exports = ConfigManager;
