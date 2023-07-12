const LOGGER = require('../statics/LOGGER');
const {CONFIG} = require("../statics/CONFIG");

function registerEventHandlersLOAD(deps) {
    deps.ipcMain.on('server-ask-load-folders', (event) => {
        LOGGER.receive('SERVER', 'server-ask-load-folders');
        deps.sendMessage(event.sender, 'load-set-default-folder', CONFIG.SAVES_FOLDER);
        deps.sendMessage(event.sender, 'load-receive-folder', deps.saveManager.getCurrentFolder());
    });

    deps.ipcMain.on('server-load-file', (event, filename) => {
        LOGGER.receive('SERVER', 'server-load-file', filename);
        let tableID = deps.activeTables.loading;
        deps.sendMessage(mainWindow, 'client-start-loading', tableID);
        deps.activeTables.loading = null;
        deps.loadWindow.close();
        filename = deps.path.join(deps.saveManager.getCurrentFolder(), filename);
        const file = deps.saveManager.loadSaveFile(filename, tableID);
      
        if (!activeTables.view) {
          tableID = deps.tableManager.createNewTable();
          deps.activeTables.view = tableID;
        } else if (deps.tableManager.hasFragments(activeTables.view)) {
          tableID = deps.tableManager.createNewTable();
        }
      
        deps.tableManager.loadFile(tableID, file);
        const data = {
          tableID: tableID,
          tableData: deps.tableManager.getTable(tableID),
        };
        data.tableData['loading'] = true;
        data.tableData['filename'] = filename;
      
        deps.preprocess_loading_fragments(data);
    });
}
  
module.exports = { registerEventHandlersLOAD };