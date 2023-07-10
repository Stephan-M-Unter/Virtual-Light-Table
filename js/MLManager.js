'use strict';

const fs = require('fs-extra');
const path = require('path');
const {spawn} = require('child_process');
const LOGGER = require("../statics/LOGGER");
const {CONFIG} = require('../statics/CONFIG');

class MLManager {

    constructor() {
        this.tensorflowAvailable = null;
        this.checkForTensorflow();

        // define ML subfolders
        this.folderML = path.join(CONFIG.VLT_FOLDER, 'ML');
        this.folderMLmodels = path.join(this.folderML, 'models');
        this.folderMLresults = path.join(this.folderML, 'results');

        // create ML subfolders if needed
        if (!fs.existsSync(this.folderML)) fs.mkdir(this.folderML);
        if (!fs.existsSync(this.folderMLmodels)) fs.mkdir(this.folderMLmodels); 
        if (!fs.existsSync(this.folderMLresults)) fs.mkdir(this.folderMLresults);

        this.capacities = [];
        this.models = {};

        this.checkCapacities();
    };

    checkCapacities() {
        // TODO Hardcoded Address
        // should instead be some URL where the most current version could be downloaded
        const MLCapacitiesPath = "./MLcapacities.json"

        fs.exists(MLCapacitiesPath, (exists) => {
            if (exists) {
                fs.readFile(MLCapacitiesPath, (err, data) => {
                    if (!err) {
                        const MLCapacities = JSON.parse(data);
                        
                        this.capacities = Object.keys(MLCapacities);
                        
                        for (const capacity of Object.keys(MLCapacities)) {
                            for (const modelID of Object.keys(MLCapacities[capacity])) {
                                this.models[modelID] = MLCapacities[capacity][modelID];
                                const modelPath = this.checkForModel(modelID); // can be null if model is not available
                                this.models[modelID].localPath = modelPath;
                                this.models[modelID].unreachable = false;
                            }
                        }
                        
                        LOGGER.log('ML MANAGER', 'ML Capacities loaded:');
                        LOGGER.log('ML MANAGER', this.capacities);
                        LOGGER.log('ML MANAGER', 'ML model list loaded:');
                        LOGGER.log('ML MANAGER', this.models);
                        
                    } else {
                        LOGGER.err('ML MANAGER', err);
                    }
                });
            } else {
                LOGGER.err('ML MANAGER', `MLCapacitiesPath (${MLCapacitiesPath}) does not exist!`);
            }
        });
    }
    
    name() {
        return "MLManager";
    }

    checkForTensorflow(callback) {
        if (this.tensorflowAvailable === null) {
            // check if tensorflow is available
            const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'tensorflow_test.py')], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
            python.on('close', (code) => {
                LOGGER.log('ML MANAGER', `tensorflow_test.py - result: code ${code}.`);
                this.tensorflowChecked = true;
                this.tensorflowAvailable = (code == 0);
                LOGGER.log('ML MANAGER', `tensorflowAvailable: ${this.tensorflowAvailable}`);
                if (callback) callback(this.tensorflowAvailable);
                else return this.tensorflowAvailable;
            });
        } else {
            // tensorflow already checked
            // return result
            if (callback) callback(this.tensorflowAvailable);
            else return this.tensorflowAvailable;
        }
    }

    installTensorflow(callback) {
        const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'tensorflow_install.py')], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
        python.on('close', (code) => {
            LOGGER.log('ML MANAGER', `tensorflow_install.py - result: code ${code}.`)
            this.tensorflowChecked = true;
            this.tensorflowAvailable = (code == 0);
            LOGGER.log('ML MANAGER', `tensorflowAvailable: ${this.tensorflowAvailable}`);
            if (callback) {
                callback(code == 0);
            }
        });
    }

    downloadModel(modelID, callback) {
        // TODO: Download of model
        // if (modelID in this.models) {
            const dummyPath = path.join(CONFIG.VLT_FOLDER, 'ML', 'models', 'model_8.2');
            this.models['BiNet_8.2_multiclass'].localPath = dummyPath;
            LOGGER.log('ML MANAGER', `Model (ID: ${modelID}) downloaded to folder ${dummyPath}.`)
            callback(true);
        // }
    }
    checkForModel(modelID) {
        // check if there is a subfolder named modelID in the ML/models folder
        const modelPath = path.join(this.folderMLmodels, modelID);
        if (fs.existsSync(modelPath)) {
            return modelPath;
        }
        return null;
    }
    getModelPath(modelID) {
        return this.models[modelID].localPath;
    }

    deleteModel(modelID) {}

    segmentImages(modelID, pathImage1, pathImage2, ppi1, ppi2, callback) {
        const resultFileName = 'segmentation_result.json';
        const resultFileFolder = path.join(CONFIG.VLT_FOLDER, 'ML', 'results');
        const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'segment.py'),
            resultFileFolder,
            resultFileName,
            this.getModelPath(modelID), // TODO
            modelID, 
            pathImage1,
            pathImage2,
            ppi1,
            ppi2],
            {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]}
        );

        python.on('close', function(code) {
            LOGGER.log('ML MANAGER', `Segmentation Result: code ${code}.`)
            try {
              const segmentationJSON = fs.readFileSync(path.join(resultFileFolder, resultFileName));
              const segmentation = JSON.parse(segmentationJSON)
              segmentation.modelID = modelID;
              callback(segmentation);
              fs.remove(path.join(resultFileFolder, resultFileName));
            } catch (err) {
              LOGGER.err('ML MANAGER', 'Segmentation result could not be read.');
              LOGGER.err('ML MANAGER', err);
              callback(null);
        }});
    }
    
    registerImages(modelID, image1, mask1, image2, mask2, callback) {
        const resultFileFolder = path.join(this.folderML, 'results');
        const resultFileName = 'cut_results.json';

        const python = spawn(CONFIG.PYTHON_CMD, [
            path.join(CONFIG.PYTHON_FOLDER, 'cut_automatic_masks.py'),
            resultFileFolder,
            resultFileName,
            modelID,
            image1,
            mask1,
            image2,
            mask2,
        ],
        {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});

        python.on('close', function(code) {
            LOGGER.log('ML MANAGER', `Automatic Cutting Result: code ${code}.`);
            try {
              const cutJSON = fs.readFileSync(path.join(resultFileFolder, resultFileName));
              const cut = JSON.parse(cutJSON)
              fs.remove(path.join(resultFileFolder, resultFileName));
              callback(cut);
            } catch (err) {
              LOGGER.err('SERVER', 'Cutting result could not be read.');
              LOGGER.err('SERVER', err);
              callback(null);
            }
        });
    }

    /**
     * Return all models where the code is contained in the modelID. Return per model
     * an object including the modelID, the model name, and the model size.
     * @param {*} code 
     */
    getModelsByCode(code) {
        const result = [];
        for (const modelID in this.models) {
            if (modelID.includes(code)) {
                // create copy of model object
                const model = Object.assign({}, this.models[modelID]);
                model.modelID = modelID;
                result.push(model);
            }
        }
        return result;
    }

    getModelDetails(modelID) {
        if (modelID in this.models) {
            return this.models[modelID];
        }
        return null;
    }

    cleanResults() {}

}

module.exports = MLManager;
