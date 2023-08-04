'use strict';

const fs = require('fs-extra');
const LOGGER = require("../statics/LOGGER");
const {CONFIG} = require("../statics/CONFIG");
const path = require('path');
const https = require('follow-redirects').https;

class ConfigManager {

    constructor(vltConfigFilePath, version) {
        this.vltConfigFilePath = vltConfigFilePath;
        this.config = null;
        this.version = version;
        this.registeredManagers = [];
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
        const configJSON = JSON.stringify(this.config, null, 4);
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
                this.createFolders();
            } else {
                this.config.vltFolder = CONFIG.VLT_FOLDER;
            }

            if (!(CONFIG.ACCESS_TOKEN) && this.config.access_token) {
                CONFIG.set_access_token(this.config.access_token);
            }
            else if (CONFIG.ACCESS_TOKEN) {
                this.config.access_token = CONFIG.ACCESS_TOKEN;
                this.save();
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
        this.createFolders();
    }

    set(key, value) {
        this.config[key] = value;
        this.save();
    }

    name() {
        return "ConfigManager";
    }

    replaceWith(newConfiguration, errorCallback) {
        // First, we check if the new VLT folder location has writing permissions
        // if not, we output an error message and keep the old path
        try {
            fs.accessSync(newConfiguration.vltFolder, fs.constants.R_OK | fs.constants.W_OK);
        } catch (error) {
            LOGGER.err('CONFIG', "No writing permission to folder: " + newConfiguration.vltFolder);
            LOGGER.err(error);
            newConfiguration.vltFolder = this.config.vltFolder;
            errorCallback();
        }

        this.config = newConfiguration;
        this.save();
        CONFIG.set_vlt_folder(this.config.vltFolder);
        this.createFolders();
    }

    notifyManagers() {
        for (const manager of this.registeredManagers) {
            try {
                manager.updateConfig();
            } catch {
                LOGGER.err('CONFIG', `Addressed manager ${manager.name()} has no updateConfig() method!`);
            }
        }
    }

    createFolders() {
        // check if "Virtual Light Table" subfolder exists
        if (!fs.existsSync(CONFIG.VLT_FOLDER)) {
            // creating VLT subfolder in appdata
            fs.mkdirSync(CONFIG.VLT_FOLDER);
            LOGGER.log('SERVER', 'Created new VLT folder at ' + CONFIG.VLT_FOLDER);
        }
        // check if SAVES subfolder exists
        if (!fs.existsSync(CONFIG.SAVES_FOLDER)) {
            // creating VLT subfolder in appdata
            fs.mkdirSync(CONFIG.SAVES_FOLDER);
            fs.mkdirSync(path.join(CONFIG.SAVES_FOLDER, 'imgs'));
            LOGGER.log('SERVER', 'Created new SAVES folder at ' + CONFIG.SAVES_FOLDER);
        }
        // check if TEMP subfolder exists
        if (!fs.existsSync(CONFIG.TEMP_FOLDER)) {
            // creating VLT subfolder in appdata
            fs.mkdirSync(CONFIG.TEMP_FOLDER);
            fs.mkdirSync(path.join(CONFIG.TEMP_FOLDER, 'imgs'));
            LOGGER.log('SERVER', 'Created new TEMP folder at ' + CONFIG.TEMP_FOLDER);
        }
        // check if the "External Content" subfolder exists
        if (!fs.existsSync(CONFIG.EXTERNAL_FOLDER)) {
            fs.mkdirSync(CONFIG.EXTERNAL_FOLDER);
            LOGGER.log('SERVER', 'Created new folder for external content at ' + CONFIG.EXTERNAL_FOLDER);
        }
    }

    getConfig() {
        return this.config;
    }

    registerManager(manager) {
        if (!(this.registeredManagers.includes(manager))) {
            this.registeredManagers.push(manager);
        }
    }

    deregisterManager(manager) {
        if (this.registeredManagers.includes(manager)) {
            const index = this.registeredManagers.indexOf(manager);
            this.registeredManagers = this.registeredManagers.splice(index, 1);
        }
    }

    checkForUpdates() {
        return new Promise((resolve, reject) => {
            if (this.config.ignoreUpdates) {
                resolve(false);
            }
            const updatePath = "https://stephan-m-unter.github.io/Virtual-Light-Table/resources/VLT.json";
            const request = https.get(updatePath, (response) => {
                let data = '';
                response.on('data', (chunk) => {
                    data += chunk;
                });

                response.on('end', () => {
                    try {
                        const versionData = JSON.parse(data);
                        
                        const version = versionData.version;
                        const mainVersion = version.split(".")[0];
                        const subVersion = version.split(".")[1];

                        const currentMainVersion = this.version.split(".")[0];
                        const currentSubVersion = this.version.split(".")[1];
                        
                        const updateAvailable = (mainVersion > currentMainVersion) || (mainVersion == currentMainVersion && subVersion > currentSubVersion);
                        versionData.updateAvailable = updateAvailable;
                        versionData.currentVersion = this.version;
                        resolve(versionData);
                    } catch (error) {
                        reject(error);
                    }
                });

                response.on('error', (error) => {
                    reject(error);
                });
            });

            request.on('error', (error) => {
                reject(error);
            });
        });
    }

    ignoreUpdates() {
        this.config.ignoreUpdates = true;
        this.save();
    }
}

module.exports = ConfigManager;
