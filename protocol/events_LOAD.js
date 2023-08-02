const LOGGER = require('../statics/LOGGER');
const {CONFIG} = require("../statics/CONFIG");
const path = require('path');
const Window = require('../js/Window');
const {shell} = require('electron');

function registerEventHandlersLOAD(ipcMain, send, get, set) {
    /* server-open-load */  
    ipcMain.on('server-open-load', (event, tableID) => {
      LOGGER.receive('SERVER', 'server-open-load');
    
      get('activeTables').loading = tableID;
    
      if (get('loadWindow') != null) {
        get('loadWindow').show();
      } else {
        const loadWindow = new Window({
          file: './renderer/load.html',
          type: 'load',
          devMode: get('devMode'),
        });
        loadWindow.removeMenu();
        loadWindow.once('read-to-show', () => {
          loadWindow.show();
        });
        loadWindow.on('close', function() {
          set('loadWindow', null);
          get('activeTables').loading = null;
        });
        set('loadWindow', loadWindow);
      }
    });

    /* server-ask-load-folders */
    ipcMain.on('server-ask-load-folders', (event) => {
        LOGGER.receive('SERVER', 'server-ask-load-folders');
        send(event.sender, 'load-set-default-folder', CONFIG.SAVES_FOLDER);
        send(event.sender, 'load-receive-folder', get('saveManager').getCurrentFolder());
    });

    /*  server-load-file */
    ipcMain.on('server-load-file', (event, filename) => {
        LOGGER.receive('SERVER', 'server-load-file', filename);
        // determine the active table
        let tableID = get('activeTables').loading;
        get('activeTables').loading = null;

        // close load window and start loading animation
        send(get('mainWindow'), 'client-start-loading', tableID);
        get('loadWindow').close();
        
        filename = path.join(get('saveManager').getCurrentFolder(), filename);
        let file = get('saveManager').loadSaveFile(filename, tableID);
      
        if (!get('activeTables').view) {
          tableID = get('tableManager').createNewTable();
          get('activeTables').view = tableID;
        } else if (get('tableManager').hasFragments(get('activeTables').view)) {
          tableID = get('tableManager').createNewTable();
        }

        file = get('mlManager').loadAutoMasks(file);
      
        get('tableManager').loadFile(tableID, file);
        const data = {
          tableID: tableID,
          tableData: get('tableManager').getTable(tableID),
        };
        data.tableData['loading'] = true;
        data.tableData['filename'] = filename;

      
        get('preprocess_loading_fragments')(data);
    });

    /* server-list-savefiles */
    ipcMain.on('server-list-savefiles', (event, folder) => {
      LOGGER.receive('SERVER', 'server-list-savefiles');
    
      // if the requested folder uses relative pathing, indicated either by
      // "./" or "../", combine it with the absolute appPath, that is the folder the
      // application runs from
      if (folder.startsWith('.')) {
        folder = path.join(get('appPath'), folder);
      }
    
      const savefiles = get('saveManager').getSaveFiles(folder);
      send(event.sender, 'load-receive-saves', savefiles);
    });
    
    /* server-get-saves-folder */
    ipcMain.on('server-get-saves-folder', (event) => {
      LOGGER.receive('SERVER', 'server-get-saves-folder');
        send(event.sender, 'load-receive-folder', CONFIG.SAVES_FOLDER);
    });

    /* server-export-file */
    ipcMain.on('server-export-file', (event, filename) => {
      LOGGER.receive('SERVER', 'server-export-file');
      get('saveManager').exportFile(filename);
    });

    /* server-delete-file */
    ipcMain.on('server-delete-file', (event, filename) => {
      LOGGER.receive('SERVER', 'server-delete-file');
      const deleted = get('saveManager').deleteFile(filename);
      if (deleted) {
        const folder = get('saveManager').getCurrentFolder();
        const savefiles = get('saveManager').getSaveFiles(folder);
        send(event.sender, 'load-receive-saves', savefiles);
      }
    });

    /* server-import-file */
    ipcMain.on('server-import-file', (event) => {
      LOGGER.receive('SERVER', 'server-import-file');
      get('saveManager').importFile(() => {
        send(event.sender, 'load-set-default-folder', CONFIG.SAVES_FOLDER);
        send(event.sender, 'load-receive-folder', get('saveManager').getCurrentFolder());
      });
    });

    /* server-open-load-folder */
    ipcMain.on('server-open-load-folder', (event) => {
      LOGGER.receive('SERVER', 'server-open-load-folder');
      const folder = get('saveManager').getCurrentFolder();
      shell.openPath(folder);
    });
}
  
module.exports = { registerEventHandlersLOAD };