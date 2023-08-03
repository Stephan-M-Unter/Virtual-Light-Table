const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');
const path = require('path');
const {shell} = require('electron');

function registerEventHandlersMAINVIEW(ipcMain, send, get, set) {
    ipcMain.on('server-close-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-close-table', tableID);
        const newTableID = get('tableManager').removeTable(tableID);
        get('saveManager').removeAutosave(tableID);
        if (tableID == get('activeTables').view) {
          const data = {
            tableID: newTableID,
            tableData: get('tableManager').getTable(newTableID),
          };
          get('activeTables').view = newTableID;
          send(event.sender, 'client-load-model', data);
        }
    });

    ipcMain.on('server-open-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-open-table', tableID);
        const data = {
          tableID: tableID,
          tableData: get('tableManager').getTable(tableID),
        };
        get('activeTables').view = tableID;
        send(event.sender, 'client-load-model', data);
    });

    ipcMain.on('server-gather-ppi', (event) => {
        LOGGER.receive('SERVER', 'server-gather-ppi');
        send(event.sender, 'calibration-set-ppi', get('config').ppi);
    });
      
    ipcMain.on('server-stage-loaded', (event) => {
        LOGGER.receive('SERVER', 'server-stage-loaded');
        const config = get('configManager').getConfig();
        if ('ppi' in config && config.ppi) {
            send(event.sender, 'calibration-set-ppi', config.ppi);
        }
        if ('minZoom' in config && config.minZoom
        && 'maxZoom' in config && config.maxZoom
        && 'stepZoom' in config && config.stepZoom) {
            const data = {
            'minZoom': config.minZoom,
            'maxZoom': config.maxZoom,
            'stepZoom': config.stepZoom,
            };
            send(event.sender, 'client-set-zoom', data);
        }
    });

    ipcMain.on('server-undo-step', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-undo-step');
        const isUndone = get('tableManager').undoStep(tableID);
        if (isUndone) {
          // undo step was successful
          const tableData = get('tableManager').getTable(tableID);
          tableData['undo'] = true;
          // TODO evtl. zusammenfassen???
          send(event.sender, 'client-redo-model', tableData);
          send(event.sender, 'client-redo-undo-update', get('tableManager').getRedoUndo(tableID));
        }
    });

    ipcMain.on('server-redo-step', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-redo-step');
        const isRedone = get('tableManager').redoStep(tableID);
        if (isRedone) {
          // redo step was successful
          const tableData = get('tableManager').getTable(tableID);
          tableData['undo'] = true;
          // TODO evtl. zusammenfassen???
          send(event.sender, 'client-redo-model', tableData);
          send(event.sender, 'client-redo-undo-update', get('tableManager').getRedoUndo(tableID));
        }
    });

    ipcMain.on('server-clear-table', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-clear-table');
        get('tableManager').clearTable(tableID);
        const data = {
          tableID: tableID,
          tableData: get('tableManager').getTable(tableID),
        };
        send(event.sender, 'client-load-model', data);
    });

    ipcMain.on('server-change-fragment', (event, data) => {
        LOGGER.receive('SERVER', 'server-change-fragment');
      
        const fragment = get('tableManager').getFragment(data.tableID, data.fragmentID);
        fragment.edit = true;
        if (get('uploadWindow')) {
          try {
            get('uploadWindow').close();
          } catch {};
        }
      
        get('activeTables').uploading = data.tableID;
      
        const uploadWindow = new Window({
          file: './renderer/upload.html',
          type: 'upload',
          devMode: get('devMode'),
        });
        uploadWindow.maximize();
        uploadWindow.removeMenu();
        uploadWindow.once('ready-to-show', () => {
            uploadWindow.show();
            send(uploadWindow, 'upload-fragment', fragment);
        });
        uploadWindow.on('close', function() {
            set('uploadWindow', null);
            send(get('mainWindow'), 'client-stop-loading');
        });
        set('uploadWindow', uploadWindow);
    });

    ipcMain.on('server-create-table', (event) => {
        LOGGER.receive('SERVER', 'server-create-table');
        if (get('autosaveChecked')) {
          const newTableID = get('tableManager').createNewTable();
          const data = {
            tableID: newTableID,
            tableData: get('tableManager').getTable(newTableID),
          }
          get('activeTables').view = newTableID;
          send(event.sender, 'client-load-model', data);
        } else {
            send(event.sender, 'client-confirm-autosave');
        }
    });

    ipcMain.on('server-send-model', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-send-model', tableID);
        const data = {
          tableID: tableID,
          tableData: get('tableManager').getTable(tableID),
        };
        send(event.sender, 'client-get-model', data);
    });

    ipcMain.on('server-send-all', (event) => {
        LOGGER.receive('SERVER', 'server-send-all');
        if (get('devMode')) {
          send(event.sender, 'client-get-all', get('tableManager').getTables());
        }
    });

    // server-write-annotation | data -> data.tableID, data.aData
    ipcMain.on('server-write-annotation', (event, data) => {
        LOGGER.receive('SERVER', 'server-write-annotation');
        get('tableManager').writeAnnotation(data.tableID, data.annotation);
    });
    
    // server-remove-annotation | data -> data.tableID, data.aID
    ipcMain.on('server-remove-annotation', (event, data) => {
        LOGGER.receive('SERVER', 'server-remove-annotation');
        get('tableManager').removeAnnotation(data.tableID, data.aID);
    });


    ipcMain.on('server-local-drop', (event, dataArray) => {
      LOGGER.receive('SERVER', 'server-drop-local', dataArray);
    
      const loadingQueue = [];
    
      const tableID = get('activeTables').view;
    
      for (const url of dataArray) {
        // url is a path to a file; read the filename (without extension) into the variable name
        const name = path.basename(url, path.extname(url));
        const entry = {
          'table': tableID,
          'fragment': {
            'x': 0,
            'y': 0,
            'name': name,
            'recto': {
              'url': url,
              'www': false,
            },
          },
        };
        loadingQueue.push(entry);
      }
    
      get('sequentialUpload')(loadingQueue);
    });

    

    ipcMain.on('server-new-session', (event) => {
      LOGGER.receive('SERVER', 'server-new-session');
      get('activeTables').view = null;
      get('activeTables').loading = null;
      get('activeTables').uploading = null;
    
      // if no tables are yet created, create a new one
      if (get('tableManager').getNumberOfTables() == 0) {
        get('tableManager').createNewTable();
      }
    
      // checking for all registered tables
      const registeredTables = get('tableManager').getTableIds();
      const selectedTable = registeredTables.pop();
    
      registeredTables.forEach((tableID) => {
        const data = {
          tableID: tableID,
          tableData: get('tableManager').getInactiveTable(tableID),
        };
        send(event.sender, 'client-inactive-model', data);
      });
    
      get('activeTables').view = selectedTable;
      const data = {
        tableID: selectedTable,
        tableData: get('tableManager').getTable(selectedTable),
      };
      send(event.sender, 'client-load-model', data);
    
      if (get('saveManager').checkForAutosave()) {
        send(event.sender, 'client-confirm-autosave');
      } else {
        set('autosaveChecked', true);
      }
  });

  ipcMain.on('server-graphics-filter-from-client', function(event, data) {
    LOGGER.receive('SERVER', 'server-graphics-filter-from-client');
    get('tableManager').setGraphicFilters(data['tableID'], data.filters);

    const urls = data.urls;
    const filters = get('tableManager').getGraphicFilters(data.tableID);
    const callback = () => {
      const response = {
        tableID: data.tableID,
        tableData: get('tableManager').getTable(data.tableID),
      };
      send(event.sender, 'client-load-model', response);
      get('activeTables').view = data.tableID;
    };

    get('imageManager').applyGraphicalFilters(filters, urls, callback);
  });

  ipcMain.on('server-reset-graphics-filter', function(event, tableID) {
    LOGGER.receive('SERVER', 'server-reset-graphics-filter', tableID);
    // remove all filter images
    // resend model to trigger reload
    get('tableManager').resetGraphicFilters(tableID);
    const response = {
      tableID: tableID,
      tableData: get('tableManager').getTable(tableID),
    }
    send(event.sender, 'client-load-model', response);
  });

  ipcMain.on('server-close-update', () => {
    LOGGER.receive('SERVER', 'server-close-update');
    get('updateWindow').close();
  });

  ipcMain.on('server-open-update-page', () => {
    LOGGER.receive('SERVER', 'server-open-update-page');
    // open a new browser window leading to https://stephan-m-unter.github.io/VLT-electron/index.html
  
    shell.openExternal('https://stephan-m-unter.github.io/VLT-electron/index.html');
  });

  ipcMain.on('server-ignore-updates', () => {
    LOGGER.receive('SERVER', 'server-ignore-updates');
    get('configManager').ignoreUpdates();
  });
}
  
module.exports = { registerEventHandlersMAINVIEW };