const LOGGER = require('../statics/LOGGER');
const Window = require('../js/Window');

function registerEventHandlersEXPORT(ipcMain, send, get, set) {
    ipcMain.on('server-open-export', (event, tableID) => {
        LOGGER.receive('SERVER', 'server-open-export', tableID);
        if (!get('exportWindow')) {
          const exportWindow = new Window({
            file: './renderer/export.html',
            type: 'export',
            devMode: get('devMode'),
          });
          exportWindow.removeMenu();
          exportWindow.maximize();
          exportWindow.on('close', function() {
            set('exportWindow', null);
          });
          set('exportWindow', exportWindow);
        }
      });

    ipcMain.on('server-close-export', () => {
        LOGGER.receive('SERVER', 'server-close-export');
        get('exportWindow').close();
    });

    ipcMain.on('server-get-active-table', (event) => {
        LOGGER.receive('SERVER', 'server-get-active-table');
        const tableID = get('activeTables').view;
        const table = get('tableManager').getTable(tableID);
        send(event.sender, 'active-table', table);
    });

    ipcMain.on('server-graphics-filter-from-export', function(event, data) {
      LOGGER.receive('SERVER', 'server-graphics-filter-from-export');

      const tableID = get('activeTables').view;
      get('tableManager').setGraphicFilters(tableID, data.filters);

      const urls = data.urls;
      const filters = get('tableManager').getGraphicFilters(tableID);
      const callback = () => {
        send(event.sender, 'export-graphics-filtered');
      };

      get('imageManager').applyGraphicalFilters(filters, urls, callback);
    });
}
  
module.exports = { registerEventHandlersEXPORT };