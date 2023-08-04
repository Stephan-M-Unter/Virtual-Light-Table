'use strict';

const fs = require('fs-extra');
const path = require('path');
const {spawn} = require('child_process');
const LOGGER = require("../statics/LOGGER");
const {CONFIG} = require('../statics/CONFIG');
const https = require('follow-redirects').https;

class MLManager {

    constructor() {
        this.tensorflowAvailable = null;
        this.checkForTensorflow();

        // define ML subfolders
        this.folderML = path.join(CONFIG.VLT_FOLDER, 'ML');
        this.MLCapacitiesPath = path.join(this.folderML, 'MLcapacities.json');
        this.folderMLmodels = path.join(this.folderML, 'models');
        this.folderMLresults = path.join(this.folderML, 'results');

        // create ML subfolders if needed
        if (!fs.existsSync(this.folderML)) fs.mkdirSync(this.folderML);
        if (!fs.existsSync(this.folderMLmodels)) fs.mkdirSync(this.folderMLmodels); 
        if (!fs.existsSync(this.folderMLresults)) fs.mkdirSync(this.folderMLresults);

        this.capacities = [];
        this.models = {};

        this.reloadCounter = 3;

        this.checkForCapacities();
    };

    checkForCapacities(reload=false, callback=null) {
        // first, check if the MLCapacities file exists
        fs.exists(this.MLCapacitiesPath, (exists) => {
            if (exists) {
                // if it exists, check if it is up to date
                fs.stat(this.MLCapacitiesPath, (err, stats) => {
                    if (!err) {
                        const lastModified = stats.mtimeMs;
                        const now = Date.now();
                        const timeDiff = now - lastModified;
                        const timeDiffDays = timeDiff / (1000 * 60 * 60 * 24);
                        if (timeDiffDays > 30 || reload) {
                            // if it is older than 30 days, download the capacities
                            this.downloadCapacities(callback);
                        } else {
                            // if it is not older than 30 days, load the capacities
                            this.loadCapacities(callback);
                        }
                    } else {
                        LOGGER.err('ML MANAGER', err);
                    }
                });
            } else {
                // if it does not exist, download the capacities
                this.downloadCapacities(callback);
            }
        });
    }
    
    downloadCapacities(callback) {
        const MLCapacitiesPath = "https://stephan-m-unter.github.io/VLT-electron/resources/MLcapacities.json";
        const filestream = fs.createWriteStream(this.MLCapacitiesPath);
        LOGGER.log('ML MANAGER', `Sending request for MLcapacities.json`);
        const request = https.get(MLCapacitiesPath, (response) => {
            response.pipe(filestream);
            filestream.on('finish', () => {
                filestream.close();
                this.loadCapacities(callback);
            });
        });
    }

    loadCapacities(callback) {
        fs.exists(this.MLCapacitiesPath, (exists) => {
            if (exists) {
                fs.readFile(this.MLCapacitiesPath, (err, data) => {
                    if (!err) {

                        let MLCapacities = null;
                        try {
                            MLCapacities = JSON.parse(data);
                        } catch (err) {
                            this.reloadCounter--;
                            if (this.reloadCounter > 0) {
                                LOGGER.err('ML MANAGER', `Error parsing MLcapacities.json, reloading (${this.reloadCounter} tries left).`);
                                this.downloadCapacities(callback);
                            } else {
                                LOGGER.err('ML MANAGER', err);
                                return;
                            }
                        }
                        
                        try {
                            this.capacities = Object.keys(MLCapacities);
                        } catch (err) {
                            LOGGER.err('ML MANAGER', err);
                            fs.unlink(this.MLCapacitiesPath);
                            return;
                        }
                        
                        for (const capacity of Object.keys(MLCapacities)) {
                            for (const modelID of Object.keys(MLCapacities[capacity])) {
                                this.models[modelID] = MLCapacities[capacity][modelID];
                                const modelPath = this.checkForModel(modelID); // can be null if model is not available
                                this.models[modelID].localPath = modelPath;
                                this.models[modelID].unreachable = false;
                            }
                        }
                        
                        if (callback) callback();
                        
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
        const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'tensorflow_install.py')], {windowsHide: false, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
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
        if (modelID in this.models) {
            const requestPaths = this.models[modelID].requestPaths;
            let downloaded = 0;

            // create folder for model
            const modelPath = path.join(this.folderMLmodels, modelID);
            fs.mkdirSync(modelPath);

            for (const requestPath of requestPaths) {
                const filename = path.basename(requestPath);
                const filestream = fs.createWriteStream(path.join(modelPath, filename));
                LOGGER.log('ML MANAGER', `Requesting model with ID ${modelID} with access token: ${CONFIG.ACCESS_TOKEN}.`);
                const request = https.get(requestPath, {headers: {'Authorization': `Bearer ${CONFIG.ACCESS_TOKEN}`}}, (response) => {
                    response.pipe(filestream);
                    filestream.on('finish', () => {
                        filestream.close();
                        downloaded++;
                        LOGGER.log('ML MANAGER', `File ${filename} downloaded to ${modelPath}.`);
                        if (downloaded == requestPaths.length) {
                            this.models[modelID].localPath = modelPath;
                            callback(true);
                        }
                    });
                });
            }
        }
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

    deleteModel(modelID, callback) {
        // check if the model with modelID exists
        if (this.checkForModel(modelID)) {
            // delete the folder
            fs.rmSync(this.getModelPath(modelID), {recursive: true});
            // delete the model from the list
            this.models[modelID].localPath = null;
            LOGGER.log('ML MANAGER', `Model (ID: ${modelID}) deleted.`);
            if (callback) callback(false);
        }
    }

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

    facsimilateImages(inputData, callback_after_item, callback_after_all) {
        /*
            the input data is a list of objects with the following structure:
            {
                modelID: 'SEG_01',
                image_path: 'path/to/image',
                image_ppi: 300,
            }
            this is a recursive function; once there are no more objects in
            inputData, the callback is called with the result
        */

        // check if inputData is empty
        if (inputData.length == 0) {
            callback_after_all(true);
        } else {
            const resultFileName = 'fascimilation_result.json';
            const resultFileFolder = this.folderMLresults;
            const ppi = inputData[0].image_ppi;
            const image_path = inputData[0].image_path;
            const modelID = inputData[0].modelID;
            const model_path = this.getModelPath(modelID);
            const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'facsimilate.py'),
                resultFileFolder,
                resultFileName,
                model_path,
                modelID,
                image_path,
                ppi],
                {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]}
            );

            python.on('close', (code) => {
                LOGGER.log('ML MANAGER', `Facsimilation Result: code ${code}.`)
                // remove the first element from inputData
                inputData.shift();
                // call the function again
                callback_after_item();
                this.facsimilateImages(inputData, callback_after_item, callback_after_all);
            });
        }
    }

    thresholdImages(inputData, thresholds, colors, callback_after_item, callback_after_all) {
        /*
            the input data is a list of segmentation_paths
            thresholds is a dictionary of class indices and threshold values
            colors is a dictionary of class indices and color values
            this is a recursive function; once there are no more objects in
            inputData, the callback is called with the result
        */

        // check if inputData is empty
        if (inputData.length == 0) {
            callback_after_all(true);
        } else {
            const image_path = inputData[0]['image_path'];
            const segmentation_file = inputData[0]['segmentation_file'];
            const path_segmentation = path.join(this.folderMLresults, segmentation_file);

            const controlJSON = JSON.stringify({
                'path_image_file': image_path,
                'path_segmentation': path_segmentation,
                'thresholds': thresholds,
                'colors': colors,
            });
            const controlJSONname = 'threshold.json';
            const controlJSONpath = path.join(this.folderML, controlJSONname);

            // write controlJSON to file
            fs.writeFileSync(controlJSONpath, controlJSON);

            const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'threshold.py'),
                controlJSONpath],
                {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]}
            );

            python.on('close', (code) => {
                LOGGER.log('ML MANAGER', `Threshold Result: code ${code}.`)
                // remove controlJSON
                fs.removeSync(controlJSONpath);
                // remove the first element from inputData
                inputData.shift();
                callback_after_item();
                // call the function again
                this.thresholdImages(inputData, thresholds, colors, callback_after_item, callback_after_all);
            });
        }
    }
    
    registerImages(modelID, image1, mask1, ppi1, image2, mask2, ppi2, callback) {
        const resultFileFolder = path.join(this.folderML, 'results');
        const resultFileName = 'cut_results.json';

        const python = spawn(CONFIG.PYTHON_CMD, [
            path.join(CONFIG.PYTHON_FOLDER, 'cut_automatic_masks.py'),
            resultFileFolder,
            resultFileName,
            modelID,
            image1,
            mask1,
            ppi1,
            image2,
            mask2,
            ppi2,
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

    checkForSegmentations(urls) {
        for (const url of urls) {
            const filename = path.basename(url, path.extname(url));
            const segmentationName = `${filename}_segmentation.npy`;
            const segmentationPath = path.join(this.folderMLresults, segmentationName);
            if (!fs.existsSync(segmentationPath)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Return all models where the code is contained in the modelID. Return per model
     * an object including the modelID, the model name, and the model size.
     * @param {*} code 
     */
    getModelsByCode(code, requiredCapacities=[]) {
        const result = [];
        for (const modelID in this.models) {
            if (modelID.includes(code)) {
                // create copy of model object
                const model = Object.assign({}, this.models[modelID]);
                model.modelID = modelID;


                // check if model has all required capacities
                const modelCapacities = model.outputLabels;
                let hasAllCapacities = true;

                for (const capacity of requiredCapacities) {
                    if (!modelCapacities.includes(capacity)) {
                        hasAllCapacities = false;
                        break;
                    }
                }

                if (!hasAllCapacities) {
                    continue;
                }
                
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

    clearFiles() {
        fs.rmSync(this.folderMLresults, {recursive: true});
        fs.mkdirSync(this.folderMLresults);
    }

    loadAutoMasks(data) {
        console.log('##############################');
        console.log(data);
        if (!(data.hasOwnProperty('autoMasks'))) {
            return data;
        }
        data.autoMasks.forEach((entry) => {
            const filename = entry['filename'];
            const targetPath = path.join(this.folderMLresults, filename);
            const dataURL = entry['data'];
            const base64Data = dataURL.replace(/^data:image\/\w+;base64,/, '');
            const binaryData = Buffer.from(base64Data, 'base64');
    
            fs.writeFileSync(targetPath, binaryData);
        });

        for (const id in data.fragments) {
            if ('recto' in data.fragments[id] && data.fragments[id].recto.auto.mask !== null) {
                data.fragments[id].recto.auto.mask = path.join(this.folderMLresults, data.fragments[id].recto.auto.mask);
            }
            if ('verso' in data.fragments[id] && data.fragments[id].verso.auto.mask !== null) {
                data.fragments[id].verso.auto.mask = path.join(this.folderMLresults, data.fragments[id].verso.auto.mask);
            }
        }
        return data;
    }

    getResultFolder() {
        return this.folderMLresults;
    }
}

module.exports = MLManager;
