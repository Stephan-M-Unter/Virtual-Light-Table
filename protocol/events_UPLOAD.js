const LOGGER = require('../statics/LOGGER');

function registerEventHandlersUPLOAD(deps) {
    deps.ipcMain.on('server-open-upload', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-open-upload');
        deps.activeTables.uploading = tableID;
        
        if (deps.uploadWindow) {
          try {
            deps.uploadWindow.close();
          } catch {};
          deps.uploadWindow = null;
        }
      
        if (!deps.uploadWindow) {
            deps.uploadWindow = new Window({
            file: './renderer/upload.html',
            type: 'upload',
            devMode: deps.devMode,
          });
          deps.uploadWindow.maximize();
          deps.uploadWindow.removeMenu();
          deps.uploadWindow.once('ready-to-show', () => {
            deps.uploadWindow.show();
          });
          deps.uploadWindow.on('close', function() {
            deps.sendMessage(deps.mainWindow, 'client-stop-loading');
          });
        }
    });

    deps.ipcMain.on('server-upload-ready', (event, data) => {
        LOGGER.receive('SERVER', 'server-upload-ready');
      
        let tableID, tableData;
      
        if (!deps.activeTables.uploading) {
          // if no table is currently associated with the upload, create a new table
          tableID = deps.tableManager.createNewTable();
          tableData = deps.tableManager.getTable(tableID);
          deps.activeTables.uploading = tableID;
          const newTableData = {
            tableID: tableID,
            tableData: tableData,
          };
          // tell client to open the newly created table
          deps.sendMessage(deps.mainWindow, 'client-load-model', newTableData);
        } else {
          tableID = deps.activeTables.uploading;
          tableData = deps.tableManager.getTable(tableID);
        }
        
        if (deps.uploadWindow) {
          try {
            deps.uploadWindow.close();
          } catch {}
        }
      
        deps.sendMessage(mainWindow, 'client-start-loading', activeTables.uploading);
        
        deps.preprocess_fragment(data);
    });

    deps.ipcMain.on('server-upload-image', (event) => {
        LOGGER.receive('SERVER', 'server-upload-image');
        const filepath = deps.imageManager.selectImageFromFilesystem();
      
        if (filepath) {
            deps.uploadLocalImage(filepath);
        } else {
            deps.sendMessage(event.sender, 'upload-receive-image');
        }
    });

    deps.ipcMain.on('server-upload-image', (event) => {
        LOGGER.receive('SERVER', 'server-upload-image');
        const filepath = deps.imageManager.selectImageFromFilesystem();
      
        if (filepath) {
            deps.uploadLocalImage(filepath);
        } else {
            deps.sendMessage(event.sender, 'upload-receive-image');
        }
    });
}
  
module.exports = { registerEventHandlersUPLOAD };