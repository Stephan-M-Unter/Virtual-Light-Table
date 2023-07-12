const LOGGER = require('../statics/LOGGER');

function registerEventHandlersEXPORT(deps) {
    deps.ipcMain.on('server-close-export', () => {
        LOGGER.receive('SERVER', 'server-close-export');
        deps.exportWindow.close();
        deps.exportWindow = null;
    });
}
  
module.exports = { registerEventHandlersEXPORT };