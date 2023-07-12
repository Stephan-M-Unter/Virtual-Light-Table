const LOGGER = require('../statics/LOGGER');

function registerEventHandlersTPOP(deps) {
    deps.ipcMain.on('server-select-other-tpops', (event, data) => {
        LOGGER.receive('SERVER', 'server-select-other-tpops');
        const imageArray = deps.tpopManager.getImageLinks(data.tpop);
        deps.resolveUrls(imageArray, uploadTpopImages);
    });

    deps.ipcMain.on('server-check-tpop-data', (event) => {
        LOGGER.receive('SERVER', 'server-check-tpop-data');
        deps.tpopManager.initialiseData(false, function() {
            deps.sendMessage(event.sender, 'tpop-calculation-done')
        });
        const activeFilters = deps.tpopManager.getActiveFilters();
        deps.sendMessage(event.sender, 'tpop-active-filters', activeFilters);
    });

    deps.ipcMain.on('server-open-tpop', (event, tableID) => {
      LOGGER.receive('SERVER', 'server-open-tpop', tableID);
    
      if (!deps.tpopEnabled) {
        const feedback = {
          title: 'TPOP not available',
          desc: 'The TPOP feature has not been enabled for your VLT version. Due to legal issues, the internal TPOP information will be available as soon as the database entries are published.',
          color: deps.color.error,
        }
        deps.sendMessage(deps.getMainWindow(), 'client-show-feedback', feedback);
      } else {
        deps.activeTables.tpop = tableID;
    
        if (!deps.getTpopWindow()) {
            const tpopWindow = new deps.Window({
                file: './renderer/tpop.html',
                type: 'tpop',
                devMode: deps.devMode,
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
                deps.tpopWindow = null;
            });
            deps.setTpopWindow(tpopWindow);
        }
        }
    });

    deps.ipcMain.on('server-load-tpop-json', (event, data) => {
        LOGGER.receive('SERVER', 'server-load-tpop-json');
        let tpopData;
      
        if (data) {
          tpopData = deps.tpopManager.getData(data.startIndex, data.endIndex);
        } else {
          tpopData = deps.tpopManager.getData();
        }
        /*
          1. Check: ist bereits ein TPOP-Json vorhanden?
          2. Check: Kann eine Verbindung zum ME-Server hergestellt werden?
          3. Falls ja: muss das JSON neu heruntergeladen werden?
          4. Übermittlung der Daten an das TPOP-Window
          5. Falls kein JSON vorhanden: Übermittlung dass keine Daten vorhanden
        */
      
        const activeTPOPs = deps.tableManager.getTPOPIds(deps.activeTables.tpop);
        tpopData.activeTPOPs = activeTPOPs;
      
        if (tpopData == null) {
            deps.sendMessage(event.sender, 'tpop-json-failed');
        } else {
            deps.sendMessage(event.sender, 'tpop-json-data', tpopData);
        }
    });
}
  
module.exports = { registerEventHandlersTPOP };