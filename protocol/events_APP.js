const LOGGER = require('../statics/LOGGER');

function registerEventHandlersAPP(deps) {
    deps.ipcMain.on('server-quit-table', (event) => {
        LOGGER.receive('SERVER', 'server-quit-table');
        deps.app.quit();
    });


    deps.ipcMain.on('server-new-session', (event) => {
        LOGGER.receive('SERVER', 'server-new-session');
        deps.activeTables.view = null;
        deps.activeTables.loading = null;
        deps.activeTables.uploading = null;
      
        // if no tables are yet created, create a new one
        if (deps.tableManager.getNumberOfTables() == 0) {
          deps.tableManager.createNewTable();
        }
      
        // checking for all registered tables
        const registeredTables = deps.tableManager.getTableIds();
        const selectedTable = registeredTables.pop();
      
        registeredTables.forEach((tableID) => {
          const data = {
            tableID: tableID,
            tableData: deps.tableManager.getInactiveTable(tableID),
          };
          deps.sendMessage(event.sender, 'client-inactive-model', data);
        });
      
        deps.activeTables.view = selectedTable;
        const data = {
          tableID: selectedTable,
          tableData: deps.tableManager.getTable(selectedTable),
        };
        deps.sendMessage(event.sender, 'client-load-model', data);
      
        if (deps.saveManager.checkForAutosave()) {
          deps.sendMessage(mainWindow, 'client-confirm-autosave');
        } else {
          deps.autosaveChecked = true;
        }
    });
}
  
module.exports = { registerEventHandlersAPP };