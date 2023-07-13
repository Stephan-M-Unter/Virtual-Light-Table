const LOGGER = require('../statics/LOGGER');
const path = require('path');
const fs = require('fs-extra');
const {spawn} = require('child_process');
const {CONFIG} = require("../statics/CONFIG");

function registerEventHandlersML(ipcMain, send, get, set) {
    ipcMain.on('server-get-ml-model-details', (event, modelID) => {
        LOGGER.receive('SERVER', 'server-get-ml-model-details', modelID);
        const model = get('mlManager').getModelDetails(modelID);
        send(event.sender, 'ml-model-details', model);
    });

    ipcMain.on('server-threshold-images', (event, data) => {
        LOGGER.receive('SERVER', 'server-threshold-images', data);
        const inputData = data.inputData;
        const thresholds = data.thresholds;
        const colors = data.colors;
      
        const callback = function() {
          send(event.sender, 'thresholded-images');
        };
      
        get('mlManager').thresholdImages(inputData, thresholds, colors, callback);
    });

    ipcMain.on('server-facsimilate-images', (event, data) => {
        LOGGER.receive('SERVER', 'server-facsimilate-images', data);
        const inputData_facsimile = data.inputData;
        // deep copy inputData_facsimile into inputData
        const inputData = JSON.parse(JSON.stringify(inputData_facsimile));
        const thresholds = data.thresholds;
        const colors = data.colors;
      
        const callback_facsimile = () => {
          const inputData_threshold = [];
      
          for (const entry of inputData) {
            const image_path = entry['image_path'];
            const basename = path.basename(image_path, path.extname(image_path));
            const segmentation_filename = `${basename}_segmentation.npy`;
            inputData_threshold.push(segmentation_filename);
          }
          const callback_threshold = function() {
            send(event.sender, 'thresholded-images');
          };
      
          get('mlManager').thresholdImages(inputData_threshold, thresholds, colors, callback_threshold);
        }
      
        get('mlManager').facsimilateImages(inputData_facsimile, callback_facsimile);
    });

    ipcMain.on('server-get-ml-models', (event, code) => {
        LOGGER.receive('SERVER', 'server-get-ml-models', code);
        const models = get('mlManager').getModelsByCode(code);
        send(event.sender, 'ml-models', models);
    });

    
    ipcMain.on('server-check-tensorflow', (event) => {
        LOGGER.receive('SERVER', 'server-check-tensorflow');
        get('mlManager').checkForTensorflow((tensorflowAvailable) => {
        send(event.sender, 'tensorflow-checked', tensorflowAvailable);
        });
    });

    
    ipcMain.on('server-cut-automatic-masks', (event, data) => {
        LOGGER.receive('SERVER', 'server-cut-automatic-masks', data);
        get('mlManager').registerImages(data.modelID, data.image1, data.mask1, data.image2, data.mask2, function(responseData) {
        send(event.sender, 'upload-images-cut', responseData);
        });
    });

    
    ipcMain.on('server-install-tensorflow', (event) => {
        LOGGER.receive('SERVER', 'server-install-tensorflow');
        get('mlManager').installTensorflow(function(tensorflowInstalled) {
            send(event.sender, 'tensorflow-installed', tensorflowInstalled);
        });
    });

    ipcMain.on('server-edit-auto-mask', (event, data) => {
        LOGGER.receive('SERVER', 'server-edit-auto-mask', data);
      
        const base64Data = data.change.replace(/^data:image\/png;base64,/, "");
        const changeURL = "manual_mask_change.png";
        let changeMode = "remove";
        if (data.add) changeMode = "add";
      
        fs.writeFile(changeURL, base64Data, 'base64', function(err) {
      
          const python = spawn(CONFIG.PYTHON_CMD, [path.join(CONFIG.PYTHON_FOLDER, 'edit_mask.py'), data.maskURL, changeURL, changeMode], {windowsHide: true, stdio: ['ignore', LOGGER.outputfile, LOGGER.outputfile]});
          python.on('close', (code) => {
            LOGGER.log('SERVER', `Edit Mask Result: code ${code}.`);
            send(event.sender, 'upload-mask-edited');
            fs.removeSync(changeURL);
          });
        });
    });

    ipcMain.on('server-compute-automatic-masks', (event, data) => {
        LOGGER.receive('SERVER', 'server-compute-automatic-masks', data);
        get('mlManager').segmentImages(data.modelID, data.pathImage1, data.pathImage2, data.ppi1, data.ppi2, function(responseData) {
            send(event.sender, 'upload-masks-computed', responseData);
        });
    });

    ipcMain.on('server-download-model', (event, modelID) => {
        LOGGER.receive('SERVER', 'server-download-model', modelID);
        
        get('mlManager').downloadModel(modelID, function(modelDownloaded) {
          const responseData = {
            modelID: modelID,
            modelAvailability: modelDownloaded,
          };
          send(event.sender, 'upload-model-availability', responseData);
        });
    });

    ipcMain.on('server-check-model-availability', (event, modelID) => {
        LOGGER.receive('SERVER', 'server-check-model-availability', modelID);
        let modelAvailable = get('mlManager').checkForModel(modelID);
        const responseData = {
          modelID: modelID,
          modelAvailability: modelAvailable,
        };
        send(event.sender, 'upload-model-availability', responseData);
    });
}
  
module.exports = { registerEventHandlersML };