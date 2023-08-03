const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');

function registerEventHandlersCALIBRATION(ipcMain, send, get, set) {
    ipcMain.on('server-open-calibration', (event) => {
        LOGGER.receive('SERVER', 'server-open-calibration');
      
        if (get('calibrationWindow')) {
          try {
            get('calibrationWindow').close();
          } catch {}
          set('calibrationWindow', null);
        }
      
        const calibrationWindow = new Window({
          file: './renderer/calibration.html',
          type: 'calibration',
          devMode: false,
        });
        calibrationWindow.removeMenu();
        calibrationWindow.once('ready-to-show', () => {
          calibrationWindow.show();
        });
        calibrationWindow.on('close', function() {
          set('calibrationWindow', null);
        });
        set('calibrationWindow', calibrationWindow);
    });

    ipcMain.on('server-calibrate', (event, ppi) => {
        LOGGER.receive('SERVER', 'server-calibrate', ppi);
        get('calibrationWindow').close();
        set('calibrationWindow', null);
        send(get('mainWindow'), 'calibration-set-ppi', ppi);
        const response = {
          'ppi': ppi,
        };
        send(get('settingsWindow'), 'settings-data', response);
    });
}
  
module.exports = { registerEventHandlersCALIBRATION };