const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');
const path = require('path');

function registerEventHandlersSETTINGS(ipcMain, send, get, set) {
    ipcMain.on('server-open-settings', (event) => {
        LOGGER.receive('SERVER', 'server-open-settings');
      
        if (get('settingsWindow')) {
          try {
            get('settingsWindow').close();
          } catch {}
          set('settingsWindow', null);
        }
      
        const settingsWindow = new Window({
          file: './renderer/settings.html',
          type: 'settings',
          devMode: get('devMode'),
        });
        settingsWindow.webContents.setWindowOpenHandler(({url}) => {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              frame: true,
              width: 1000,
              height: 2000,
            }
          };
        });
        settingsWindow.removeMenu();
        settingsWindow.once('ready-to-show', () => {
          settingsWindow.show();
        })
        settingsWindow.on('close', function() {
          set('settingsWindow', null);
        });
        set('settingsWindow', settingsWindow);
    });

    ipcMain.on('server-close-settings', () => {
        LOGGER.receive('SERVER', 'server-close-settings');
        get('settingsWindow').close();
        set('settingsWindow', null);
    });


    ipcMain.on('server-settings-opened', (event) => {
        LOGGER.receive('SERVER', 'server-settings-opened');
        send(event.sender, 'settings-data', get('configManager').getConfig());
        get('mlManager').checkForTensorflow(function(tensorflowAvailable) {
            send(event.sender, 'tensorflow-installed', tensorflowAvailable);
        });
    });

    ipcMain.on('server-select-folder', function(event, folderType) {
        LOGGER.receive('SERVER', 'server-select-folder', folderType);
        const path = get('saveManager').selectFolder();
        if (path) {
          const response = {};
          response[folderType] = path;
          send(event.sender, 'settings-data', response);
        }
    });

    ipcMain.on('server-save-config', function(event, newConfig) {
        LOGGER.receive('SERVER', 'server-save-config', newConfig);
        get('settingsWindow').close();
      
        get('configManager').replaceWith(newConfig, function() {
            get('dialog').showMessageBox(get('mainWindow'), {
              buttons: ['OK'],
              type: 'warning',
              title: 'Access Denied',
              message: 'No writing permission to selected save folder. Please select another location or adjust reading and writing permissions. Setting save location to original state.'
            });
        });
      
        try {
          // update main view with (potentially new) zoom information
          const zoomData = {
            'minZoom': newConfig.minZoom,
            'maxZoom': newConfig.maxZoom,
            'stepZoom': newConfig.stepZoom,
          }
          send(get('mainWindow'), 'client-set-zoom', zoomData);
        } catch {
          LOGGER.err('SERVER', 'WARNING - No zoom information was specified in the config file. Zoom for main view does not change.');
        }
      
    });

    ipcMain.on('server-get-default', function(event, valueType) {
        LOGGER.receive('SERVER', 'server-get-default', valueType);
        let defaultValue;
        if (valueType == 'vltFolder') {
          defaultValue = path.join(appDataPath, 'Virtual Light Table');
        }
        if (defaultValue) {
          const response = {};
          response[valueType] = defaultValue;
          send(event.sender, 'settings-data', response);
        }
    });
}
  
module.exports = { registerEventHandlersSETTINGS };