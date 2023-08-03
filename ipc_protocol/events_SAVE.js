const LOGGER = require('../statics/LOGGER');
const path = require('path');

function registerEventHandlersSAVE(ipcMain, send, get, set) {
    ipcMain.on('server-save-screenshot', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-screenshot');
        if (data.tableID && data.screenshot) {
          get('tableManager').setScreenshot(data.tableID, data.screenshot);
        }
    });

    ipcMain.on('server-save-to-model', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-to-model');
      
        get('tableManager').updateTable(data.tableID, data.tableData, data.skipDoStep);
        if (Object.keys(data.tableData.fragments).length > 0) {
          // no need to autosave when there are no fragments
          get('saveManager').autosave(get('tableManager').getTable(data.tableID), data.tableID);
        }
      
        send(event.sender, 'client-redo-undo-update', get('tableManager').getRedoUndo(data.tableID));
    });

    ipcMain.on('server-save-file', (event, data) => {
        LOGGER.receive('SERVER', 'server-save-file');
        get('tableManager').setScreenshot(data.tableID, data.screenshot);
      
        if (data.quicksave && !data.editor) {
          // non-initial quicksave, only update editor modified time
          get('tableManager').updateEditor(data.tableID);
        } else {
          // add new editor
          get('tableManager').addEditor(data.tableID, data.editor);
        }
      
        let filepath; let response;
        const tableData = get('tableManager').getTable(data.tableID);
        if (data.quicksave) {
          // overwrite old file
          filepath = get('saveManager').quicksave(tableData, data.tableID);
          response = {
            title: 'Quicksave',
            desc: 'Quicksave successful',
            color: get('color').success,
          };
        } else {
          // don't overwrite but ask for new file destination
          filepath = get('saveManager').save(tableData);
          response = {
            title: 'Save',
            desc: 'Lighttable has successfully been saved',
            color: get('color').success,
          };
        }
        if (filepath && response) {
            send(event.sender, 'client-show-feedback', response);
            const saveData = {
                tableID: data.tableID,
                filename: path.basename(filepath),
            };
            send(event.sender, 'client-file-saved', saveData);
        }
    });


    ipcMain.on('server-confirm-autosave', (event, confirmation) => {
        LOGGER.receive('SERVER', 'server-confirm-autosave', confirmation);
        set('autosaveChecked', true);
        if (confirmation) {
          let tableID;
          const autosaves = get('saveManager').loadAutosaves();
          autosaves.forEach((autosave, key, autosaves) => {
            if (Object.keys(autosave).includes('tableID')) {
              tableID = get('tableManager').createNewTable(autosave.tableID);
            } else {
              tableID = get('tableManager').createNewTable();
            }
            get('tableManager').loadFile(tableID, autosave);
            const data = {
              tableID: tableID,
              tableData: get('tableManager').getTable(tableID),
            };
            send(event.sender, 'client-inactive-model', data);
          });
          const data = {
            tableID: tableID,
            tableData: get('tableManager').getTable(tableID),
          };
          get('activeTables').view = tableID;
          data.tableData['loading'] = true;
          send(event.sender, 'client-load-model', data);
          const feedback = {
            title: 'Table Loaded',
            desc: 'Successfully loaded last autosave',
            color: get('color').success,
          };
          send(event.sender, 'client-show-feedback', feedback);
        } else {
            get('saveManager').removeAutosaveFiles();
        }
    });
}
  
module.exports = { registerEventHandlersSAVE };