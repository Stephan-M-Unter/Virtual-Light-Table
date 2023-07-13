const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');

function registerEventHandlersTPOP(ipcMain, send, get, set) {
    ipcMain.on('server-select-other-tpops', (event, data) => {
        LOGGER.receive('SERVER', 'server-select-other-tpops');
        const imageArray = get('tpopManager').getImageLinks(data.tpop);
        get('resolveUrls')(imageArray, uploadTpopImages);
    });

    ipcMain.on('server-check-tpop-data', (event) => {
        LOGGER.receive('SERVER', 'server-check-tpop-data');
        get('tpopManager').initialiseData(false, function() {
            send(event.sender, 'tpop-calculation-done')
        });
        const activeFilters = get('tpopManager').getActiveFilters();
        send(event.sender, 'tpop-active-filters', activeFilters);
    });

    ipcMain.on('server-open-tpop', (event, tableID) => {
      LOGGER.receive('SERVER', 'server-open-tpop', tableID);
    
      if (!get('tpopEnabled')) {
        const feedback = {
          title: 'TPOP not available',
          desc: 'The TPOP feature has not been enabled for your VLT version. Due to legal issues, the internal TPOP information will be available as soon as the database entries are published.',
          color: get('color').error,
        }
        send(get('mainWindow'), 'client-show-feedback', feedback);
      } else {
        get('activeTables').tpop = tableID;
    
        if (!get('tpopWindow')) {
            const tpopWindow = new Window({
                file: './renderer/tpop.html',
                type: 'tpop',
                devMode: get('devMode'),
            });
            tpopWindow.webContents.setWindowOpenHandler(({url}) => {
                return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    frame: true,
                    width: 1500,
                    height: 2000,
                }
                };
            });
            tpopWindow.removeMenu();
            tpopWindow.maximize();
            tpopWindow.on('close', function() {
                set('tpopWindow', null);
            });
            set('tpopWindow', tpopWindow);
        }
        }
    });

    ipcMain.on('server-load-tpop-json', (event, data) => {
        LOGGER.receive('SERVER', 'server-load-tpop-json');
        let tpopData;
      
        if (data) {
          tpopData = get('tpopManager').getData(data.startIndex, data.endIndex);
        } else {
          tpopData = get('tpopManager').getData();
        }
        /*
          1. Check: ist bereits ein TPOP-Json vorhanden?
          2. Check: Kann eine Verbindung zum ME-Server hergestellt werden?
          3. Falls ja: muss das JSON neu heruntergeladen werden?
          4. Übermittlung der Daten an das TPOP-Window
          5. Falls kein JSON vorhanden: Übermittlung dass keine Daten vorhanden
        */
      
        const activeTPOPs = get('tableManager').getTPOPIds(get('activeTables').tpop);
        tpopData.activeTPOPs = activeTPOPs;
      
        if (tpopData == null) {
            send(event.sender, 'tpop-json-failed');
        } else {
            send(event.sender, 'tpop-json-data', tpopData);
        }
    });

    ipcMain.on('server-display-folders', function(event) {
        LOGGER.receive('SERVER', 'server-display-folders');
        const data = get('tpopManager').getFolders();
        send(event.sender, 'tpop-display-folders', data);
    });


    ipcMain.on('server-load-tpop-fragments', (event, listOfTpopIds) => {
        LOGGER.receive('SERVER', 'server-load-tpop-fragments');
        get('tpopWindow').close();
        const tableID = get('activeTables').tpop;
        get('activeTables').tpop = null;
        get('activeTables').uploading = tableID;
        send(get('mainWindow'), 'client-start-loading', tableID);
      
        get('tpopManager').prepareIDsForUpload(listOfTpopIds, tableID, get('sequentialUpload'));
    });

    ipcMain.on('server-reset-sorting', (event) => {
        LOGGER.receive('SERVER', 'server-reset-sorting');
        get('tpopManager').sortByName();
        send(event.sender, 'tpop-calculation-done');
    });

    ipcMain.on('server-reload-json', (event) => {
        LOGGER.receive('SERVER', 'server-reload-json');
        get('tpopManager').initialiseData(true, () => {
          send(event.sender, 'tpop-calculation-done');
        });
    });

    ipcMain.on('server-close-tpop', () => {
        LOGGER.receive('SERVER', 'server-close-tpop');
        get('tpopWindow').close();
    });
        
    ipcMain.on('server-tpop-position', (event, tpopID) => {
        LOGGER.receive('SERVER', 'server-tpop-position', tpopID);
        const pos = get('tpopManager').getPosition(tpopID);
        const data = {
            tpopID: tpopID,
            pos: pos,
        };
        send(event.sender, 'tpop-position', data);
    });
        
    ipcMain.on('server-tpop-basic-info', (event, data) => {
        LOGGER.receive('SERVER', 'server-tpop-basic-info');
        const result = get('tpopManager').getBasicInfo(data);
        send(event.sender, 'tpop-basic-info', result);
    });
        
    ipcMain.on('server-calculate-distances', (event, data) => {
        LOGGER.receive('SERVER', 'server-calculate-distances');
        get('tpopManager').sortByDistance(data);
        send(event.sender, 'tpop-calculation-done');
    });

    ipcMain.on('server-tpop-details', (event, id) => {
        LOGGER.receive('SERVER', 'server-tpop-details', id);
        const details = get('tpopManager').loadDetails(id);
      
        send(event.sender, 'tpop-details', details);
    });
      
    ipcMain.on('server-tpop-filter', (event, filters) => {
        LOGGER.receive('SERVER', 'server-tpop-filter');
        get('tpopManager').filterData(filters);
        send(event.sender, 'tpop-filtered');
    });
      
}
  
module.exports = { registerEventHandlersTPOP };