'use strict';

const fs = require('fs-extra');
const LOGGER = require("../statics/LOGGER");
const path = require('path');
const {spawn} = require('child_process');

class MLManager {

    constructor(vltFolder, pythonFolder) {
        this.vltFolder = vltFolder;
        this.pythonFolder = pythonFolder;
        this.pythonCmd;

        this.tensorflowChecked = false;
        this.tensorflowAvailable;

        // define ML subfolders
        const folderML = path.join(this.vltFolder, 'ML');
        const folderMLmodels = path.join(folderML, 'models');
        const folderMLresults = path.join(folderML, 'results');

        // create ML subfolders if needed
        if (!fs.existsSync(folderML)) fs.mkdir(folderML);
        if (!fs.existsSync(folderMLmodels)) fs.mkdir(folderMLmodels); 
        if (!fs.existsSync(folderMLresults)) fs.mkdir(folderMLresults);

        this.capacities = [];
        this.models = {};

        this.checkCapacities();
    };

    setPythonCommand(cmd) {
        this.pythonCmd = cmd;
    }

    checkCapacities() {
        // Hardcoded Address
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

    checkForTensorflow(callback) {
        if (this.tensorflowChecked) {
            if (callback) callback(this.tensorflowAvailable);
            else return this.tensorflowAvailable;
        } else {
            const python = spawn(this.pythonCmd, [path.join(this.pythonFolder, 'tensorflow_test.py')], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
            python.on('close', (code) => {
                LOGGER.log('ML MANAGER', `tensorflow_test.py - result: code ${code}.`);
                this.tensorflowChecked = true;
                this.tensorflowAvailable = (code == 0);
                if (callback) callback(this.tensorflowAvailable);
                else return this.tensorflowAvailable;
            });
        }
    }
    installTensorflow(callback) {
        const python = spawn(this.pythonCmd, [path.join(this.pythonFolder, 'tensorflow_install.py')], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
        python.on('close', function(code) {
            LOGGER.log('ML MANAGER', `tensorflow_install.py - result: code ${code}.`)
            callback(code == 0);
        });
    }

    downloadModel(modelID, callback) {
        // TODO: Download of model
        // if (modelID in this.models) {
            const dummyPath = path.join(this.vltFolder, 'ML', 'models', 'model_8.2');
            this.models['BiNet_8.2_multiclass'].localPath = dummyPath;
            LOGGER.log('ML MANAGER', `Model (ID: ${modelID}) downloaded to folder ${dummyPath}.`)
            callback(true);
        // }
    }
    checkForModel(modelID) {
        return true; // to remove
        if (!(modelID in this.models)) {
            return false;
        }
        if (!('localPath' in Object.keys(this.models[modelID]))) {
            return false;
        }
        if (!(fs.existsSync(this.models[modelID].localPath))) {
            return false;
        }
        return true;
    }
    getModelPath(modelID) {
        // TODO
        return path.join(this.vltFolder, 'ML', 'models', 'model_8.2')
    }
    deleteModel(modelID) {}

    segmentImages(modelID, pathImage1, pathImage2, ppi1, ppi2, callback) {
        const resultFileName = 'segmentation_result.json';
        const resultFileFolder = path.join(this.vltFolder, 'ML', 'results');
        const python = spawn(this.pythonCmd, [path.join(this.pythonFolder, 'segment.py'),
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
        const resultFileFolder = path.join(this.vltFolder, 'ML', 'results');
        const resultFileName = 'cut_results.json';

        const python = spawn(this.pythonCmd, [
            path.join(this.pythonFolder, 'cut_automatic_masks.py'),
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
              callback(cut);
              fs.remove(path.join(resultFileFolder, resultFileName));
            } catch (err) {
              LOGGER.err('SERVER', 'Cutting result could not be read.');
              LOGGER.err('SERVER', err);
              callback(null);
            }
        });
    }

    cleanResults() {}

}

module.exports = MLManager;
