const LOGGER = require('../statics/LOGGER');

function registerEventHandlersCALIBRATION(deps) {
    deps.ipcMain.on('server-open-calibration', (event) => {
        LOGGER.receive('SERVER', 'server-open-calibration');
      
        if (deps.calibrationWindow) {
          try {
            deps.calibrationWindow.close();
          } catch {}
          deps.calibrationWindow = null;
        }
      
        deps.calibrationWindow = new deps.Window({
          file: './renderer/calibration.html',
          type: 'calibration',
          devMode: false,
        });
        deps.calibrationWindow.removeMenu();
        deps.calibrationWindow.once('ready-to-show', () => {
          deps.calibrationWindow.show();
        });
        deps.calibrationWindow.on('close', function() {
          deps.calibrationWindow = null;
        });
    });

    deps.ipcMain.on('server-calibrate', (event, ppi) => {
        LOGGER.receive('SERVER', 'server-calibrate', ppi);
        deps.calibrationWindow.close();
        deps.calibrationWindow = null;
        deps.sendMessage(deps.mainWindow, 'calibration-set-ppi', ppi);
        const response = {
          'ppi': ppi,
        };
        deps.sendMessage(deps.settingsWindow, 'settings-data', response);
    });
}
  
module.exports = { registerEventHandlersCALIBRATION };