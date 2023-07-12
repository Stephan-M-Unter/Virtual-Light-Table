const LOGGER = require('../statics/LOGGER');

function registerEventHandlersMAINVIEW(deps) {
    deps.ipcMain.on('server-close-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-close-table', tableID);
        const newTableID = deps.tableManager.removeTable(tableID);
        deps.saveManager.removeAutosave(tableID);
        if (tableID == deps.activeTables.view) {
          const data = {
            tableID: newTableID,
            tableData: deps.tableManager.getTable(newTableID),
          };
          deps.activeTables.view = newTableID;
          deps.sendMessage(event.sender, 'client-load-model', data);
        }
    });

    deps.ipcMain.on('server-open-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-open-table', tableID);
        const data = {
          tableID: tableID,
          tableData: deps.tableManager.getTable(tableID),
        };
        deps.activeTables.view = tableID;
        deps.sendMessage(event.sender, 'client-load-model', data);
    });

    deps.ipcMain.on('server-gather-ppi', (event) => {
        LOGGER.receive('SERVER', 'server-gather-ppi');
        deps.sendMessage(event.sender, 'calibration-set-ppi', deps.config.ppi);
    });
      
    deps.ipcMain.on('server-stage-loaded', (event) => {
        LOGGER.receive('SERVER', 'server-stage-loaded');
        const config = deps.configManager.getConfig();
        if ('ppi' in config && config.ppi) {
            deps.sendMessage(event.sender, 'calibration-set-ppi', config.ppi);
        }
        if ('minZoom' in config && config.minZoom
        && 'maxZoom' in config && config.maxZoom
        && 'stepZoom' in config && config.stepZoom) {
            const data = {
            'minZoom': config.minZoom,
            'maxZoom': config.maxZoom,
            'stepZoom': config.stepZoom,
            };
            deps.sendMessage(event.sender, 'client-set-zoom', data);
        }
    });

    deps.ipcMain.on('server-undo-step', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-undo-step');
        const isUndone = deps.tableManager.undoStep(tableID);
        if (isUndone) {
          // undo step was successful
          const tableData = tableManager.getTable(tableID);
          tableData['undo'] = true;
          // TODO evtl. zusammenfassen???
          deps.sendMessage(event.sender, 'client-redo-model', tableData);
          deps.sendMessage(event.sender, 'client-redo-undo-update', deps.tableManager.getRedoUndo(tableID));
        }
    });

    deps.ipcMain.on('server-redo-step', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-redo-step');
        const isRedone = deps.tableManager.redoStep(tableID);
        if (isRedone) {
          // redo step was successful
          const tableData = tableManager.getTable(tableID);
          tableData['undo'] = true;
          // TODO evtl. zusammenfassen???
          deps.sendMessage(event.sender, 'client-redo-model', tableData);
          deps.sendMessage(event.sender, 'client-redo-undo-update', tableManager.getRedoUndo(tableID));
        }
    });

    deps.ipcMain.on('server-clear-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-clear-table');
        deps.tableManager.clearTable(tableID);
        const data = {
          tableID: tableID,
          tableData: deps.tableManager.getTable(tableID),
        };
        sendMessage(event.sender, 'client-load-model', data);
    });

    deps.ipcMain.on('server-change-fragment', (event, data) => {
        LOGGER.receive('SERVER', 'server-change-fragment');
      
        const fragment = deps.tableManager.getFragment(data.tableID, data.fragmentID);
        fragment.edit = true;
        if (deps.uploadWindow) {
          try {
            deps.uploadWindow.close();
          } catch {};
        }
      
        deps.activeTables.uploading = data.tableID;
      
        deps.uploadWindow = new Window({
          file: './renderer/upload.html',
          type: 'upload',
          devMode: devMode,
        });
        deps.uploadWindow.maximize();
        deps.uploadWindow.removeMenu();
        deps.uploadWindow.once('ready-to-show', () => {
            deps.uploadWindow.show();
            deps.sendMessage(uploadWindow, 'upload-fragment', fragment);
        });
        deps.uploadWindow.on('close', function() {
            deps.sendMessage(mainWindow, 'client-stop-loading');
        });
    });

    deps.ipcMain.on('server-create-table', (event) => {
        LOGGER.receive('SERVER', 'server-create-table');
        if (deps.autosaveChecked) {
          const newTableID = deps.tableManager.createNewTable();
          const data = {
            tableID: newTableID,
            tableData: deps.tableManager.getTable(newTableID),
          }
          deps.activeTables.view = newTableID;
          deps.sendMessage(event.sender, 'client-load-model', data);
        } else {
            deps.sendMessage(event.sender, 'client-confirm-autosave');
        }
    });

    deps.ipcMain.on('server-send-model', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-send-model', tableID);
        const data = {
          tableID: tableID,
          tableData: deps.tableManager.getTable(tableID),
        };
        deps.sendMessage(event.sender, 'client-get-model', data);
    });

    deps.ipcMain.on('server-send-all', (event) => {
        LOGGER.receive('SERVER', 'server-send-all');
        if (deps.devMode) {
          deps.sendMessage(event.sender, 'client-get-all', deps.tableManager.getTables());
        }
    });

    // server-write-annotation | data -> data.tableID, data.aData
    deps.ipcMain.on('server-write-annotation', (event, data) => {
        LOGGER.receive('SERVER', 'server-write-annotation');
        deps.tableManager.writeAnnotation(data.tableID, data.annotation);
    });
    
    // server-remove-annotation | data -> data.tableID, data.aID
    deps.ipcMain.on('server-remove-annotation', (event, data) => {
        LOGGER.receive('SERVER', 'server-remove-annotation');
        deps.tableManager.removeAnnotation(data.tableID, data.aID);
    });
}
  
module.exports = { registerEventHandlersMAINVIEW };