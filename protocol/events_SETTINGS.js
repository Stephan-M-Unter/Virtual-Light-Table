const LOGGER = require('../statics/LOGGER');

function registerEventHandlersSETTINGS(deps) {
    deps.ipcMain.on('server-open-settings', (event) => {
        LOGGER.receive('SERVER', 'server-open-settings');
      
        if (deps.settingsWindow) {
          try {
            deps.settingsWindow.close();
          } catch {}
          deps.settingsWindow = null;
        }
      
        deps.settingsWindow = new deps.Window({
          file: './renderer/settings.html',
          type: 'settings',
          devMode: deps.devMode,
        });
        deps.settingsWindow.webContents.setWindowOpenHandler(({url}) => {
          return {
            action: 'allow',
            overrideBrowserWindowOptions: {
              frame: true,
              width: 1000,
              height: 2000,
            }
          };
        });
        deps.settingsWindow.removeMenu();
        deps.settingsWindow.once('ready-to-show', () => {
            deps.settingsWindow.show();
        })
    });

    deps.ipcMain.on('server-close-settings', () => {
        LOGGER.receive('SERVER', 'server-close-settings');
        deps.settingsWindow.close();
        deps.settingsWindow = null;
    });


    deps.ipcMain.on('server-settings-opened', (event) => {
        LOGGER.receive('SERVER', 'server-settings-opened');
        deps.sendMessage(event.sender, 'settings-data', deps.configManager.getConfig());
        deps.mlManager.checkForTensorflow(function(tensorflowAvailable) {
            deps.sendMessage(event.sender, 'tensorflow-installed', tensorflowAvailable);
        });
    });

    deps.ipcMain.on('server-select-folder', function(event, folderType) {
        LOGGER.receive('SERVER', 'server-select-folder', folderType);
        const path = deps.saveManager.selectFolder();
        if (path) {
          const response = {};
          response[folderType] = path;
          deps.sendMessage(event.sender, 'settings-data', response);
        }
    });

    deps.ipcMain.on('server-save-config', function(event, newConfig) {
        LOGGER.receive('SERVER', 'server-save-config', newConfig);
        deps.settingsWindow.close();
        deps.settingsWindow = null;
      
        deps.configManager.replaceWith(newConfig, function() {
            deps.dialog.showMessageBox(deps.mainWindow, {
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
          deps.sendMessage(deps.mainWindow, 'client-set-zoom', zoomData);
        } catch {
          LOGGER.err('SERVER', 'WARNING - No zoom information was specified in the config file. Zoom for main view does not change.');
        }
      
    });

    deps.ipcMain.on('server-get-default', function(event, valueType) {
        LOGGER.receive('SERVER', 'server-get-default', valueType);
        let defaultValue;
        if (valueType == 'vltFolder') {
          defaultValue = deps.path.join(appDataPath, 'Virtual Light Table');
        }
        if (defaultValue) {
          const response = {};
          response[valueType] = defaultValue;
          deps.sendMessage(event.sender, 'settings-data', response);
        }
    });
}
  
module.exports = { registerEventHandlersSETTINGS };