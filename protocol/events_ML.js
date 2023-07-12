const LOGGER = require('../statics/LOGGER');

function registerEventHandlersML(deps) {
    deps.ipcMain.on('server-get-ml-model-details', (event, modelID) => {
        LOGGER.receive('SERVER', 'server-get-ml-model-details', modelID);
        const model = deps.mlManager.getModelDetails(modelID);
        deps.sendMessage(event.sender, 'ml-model-details', model);
    });
}
  
module.exports = { registerEventHandlersML };