const LOGGER = require('../statics/LOGGER');

function registerEventHandlersSAVE(deps) {
    deps.ipcMain.on('server-save-screenshot', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-screenshot');
        if (data.tableID && data.screenshot) {
          deps.tableManager.setScreenshot(data.tableID, data.screenshot);
        }
    });

    deps.ipcMain.on('server-save-to-model', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-to-model');
      
        deps.tableManager.updateTable(data.tableID, data.tableData, data.skipDoStep);
        if (Object.keys(data.tableData.fragments).length > 0) {
          // no need to autosave when there are no fragments
          saveManager.autosave(tableManager.getTable(data.tableID), data.tableID);
        }
      
        deps.sendMessage(event.sender, 'client-redo-undo-update', deps.tableManager.getRedoUndo(data.tableID));
    });

    deps.ipcMain.on('server-save-file', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-file');
        deps.tableManager.setScreenshot(data.tableID, data.screenshot);
      
        if (data.quicksave && !data.editor) {
          // non-initial quicksave, only update editor modified time
          deps.tableManager.updateEditor(data.tableID);
        } else {
          // add new editor
          deps.tableManager.addEditor(data.tableID, data.editor);
        }
      
        let filepath; let response;
        const tableData = deps.tableManager.getTable(data.tableID);
        if (data.quicksave) {
          // overwrite old file
          filepath = deps.saveManager.quicksave(tableData, data.tableID);
          response = {
            title: 'Quicksave',
            desc: 'Quicksave successful',
            color: deps.color.success,
          };
        } else {
          // don't overwrite but ask for new file destination
          filepath = deps.saveManager.save(tableData);
          response = {
            title: 'Save',
            desc: 'Lighttable has successfully been saved',
            color: deps.color.success,
          };
        }
        if (filepath && response) {
            deps.sendMessage(mainWindow, 'client-show-feedback', response);
            const saveData = {
                tableID: data.tableID,
                filename: deps.path.basename(filepath),
            };
            deps.sendMessage(event.sender, 'client-file-saved', saveData);
        }
    });


    deps.ipcMain.on('server-confirm-autosave', (event, confirmation) => {
        LOGGER.receive('SERVER', 'server-confirm-autosave', confirmation);
        deps.autosaveChecked = true;
        if (confirmation) {
          let tableID;
          const autosaves = deps.saveManager.loadAutosaves();
          autosaves.forEach((autosave, key, autosaves) => {
            if (Object.keys(autosave).includes('tableID')) {
              tableID = deps.tableManager.createNewTable(autosave.tableID);
            } else {
              tableID = deps.tableManager.createNewTable();
            }
            deps.tableManager.loadFile(tableID, autosave);
            const data = {
              tableID: tableID,
              tableData: deps.tableManager.getTable(tableID),
            };
            deps.sendMessage(mainWindow, 'client-inactive-model', data);
          });
          const data = {
            tableID: tableID,
            tableData: deps.tableManager.getTable(tableID),
          };
          deps.activeTables.view = tableID;
          data.tableData['loading'] = true;
          deps.sendMessage(event.sender, 'client-load-model', data);
          const feedback = {
            title: 'Table Loaded',
            desc: 'Successfully loaded last autosave',
            color: deps.color.success,
          };
          deps.sendMessage(event.sender, 'client-show-feedback', feedback);
        } else {
            deps.saveManager.removeAutosaveFiles();
        }
    });
}
  
module.exports = { registerEventHandlersSAVE };