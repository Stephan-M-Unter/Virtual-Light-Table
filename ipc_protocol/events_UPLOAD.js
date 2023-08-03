const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');

function registerEventHandlersUPLOAD(ipcMain, send, get, set) {
    ipcMain.on('server-open-upload', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-open-upload');
        get('activeTables').uploading = tableID;
        
        if (get('uploadWindow')) {
          try {
            get('uploadWindow').close();
          } catch {};
          set('uploadWindow', null);
        }
      
        if (!get('uploadWindow')) {
            const uploadWindow = new Window({
              file: './renderer/upload.html',
              type: 'upload',
              devMode: get('devMode'),
            });
              uploadWindow.maximize();
              uploadWindow.removeMenu();
              uploadWindow.once('ready-to-show', () => {
                uploadWindow.show();
            });
            uploadWindow.on('close', function() {
                set('uploadWindow', null);
                send(get('mainWindow'), 'client-stop-loading');
            });
            set('uploadWindow', uploadWindow);
        }
    });

    ipcMain.on('server-upload-ready', (event, data) => {
        LOGGER.receive('SERVER', 'server-upload-ready');
      
        let tableID, tableData;
      
        if (!get('activeTables').uploading) {
          // if no table is currently associated with the upload, create a new table
          tableID = get('tableManager').createNewTable();
          tableData = get('tableManager').getTable(tableID);
          get('activeTables').uploading = tableID;
          const newTableData = {
            tableID: tableID,
            tableData: tableData,
          };
          // tell client to open the newly created table
          send(get('mainWindow'), 'client-load-model', newTableData);
        }
        
        if (get('uploadWindow')) {
          try {
            get('uploadWindow').close();
          } catch {}
        }
      
        send(get('mainWindow'), 'client-start-loading', get('activeTables').uploading);
        
        get('preprocess_fragment')(data);
    });

    ipcMain.on('server-upload-image', (event) => {
        LOGGER.receive('SERVER', 'server-upload-image');
        const filepath = get('imageManager').selectImageFromFilesystem();
      
        if (filepath) {
            get('uploadLocalImage')(filepath);
        } else {
            send(event.sender, 'upload-receive-image');
        }
    });

    
    ipcMain.on('server-upload-image-given-filepath', (event, filepath) => {
      LOGGER.receive('SERVER', 'server-upload-image-given-filepath', filepath);
      get('uploadLocalImage')(filepath);
    });
}
  
module.exports = { registerEventHandlersUPLOAD };