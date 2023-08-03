const LOGGER = require('../statics/LOGGER');

function registerEventHandlersAPP(ipcMain, send, get, set) {
    ipcMain.on('server-quit-table', (event) => {
        LOGGER.receive('SERVER', 'server-quit-table');
        get('app').quit();
    });


    ipcMain.on('server-online-status', (event, onlineStatus) => {
      LOGGER.receive('SERVER', 'server-online-status', onlineStatus);
      set('online', onlineStatus);
    });

    
    ipcMain.on('console', function(event, data) {
      LOGGER.log('SERVER', data);
    });
}
  
module.exports = { registerEventHandlersAPP };