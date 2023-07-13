const LOGGER = require('../statics/LOGGER');

const { registerEventHandlersML } = require('./events_ML');
const { registerEventHandlersAPP } = require('./events_APP');
const { registerEventHandlersLOAD } = require('./events_LOAD');
const { registerEventHandlersMAINVIEW } = require('./events_MAINVIEW');
const { registerEventHandlersSAVE } = require('./events_SAVE');
const { registerEventHandlersTPOP } = require('./events_TPOP');
const { registerEventHandlersUPLOAD } = require('./events_UPLOAD');
const { registerEventHandlersCALIBRATION } = require('./events_CALIBRATION');
const { registerEventHandlersSETTINGS } = require('./events_SETTINGS');
const { registerEventHandlersEXPORT } = require('./events_EXPORT');

function registerAllEventHandlers(ipcMain, get, set) {
    registerEventHandlersML(ipcMain, sendMessage, get, set);
    registerEventHandlersAPP(ipcMain, sendMessage, get, set);
    registerEventHandlersLOAD(ipcMain, sendMessage, get, set);
    registerEventHandlersMAINVIEW(ipcMain, sendMessage, get, set);
    registerEventHandlersSAVE(ipcMain, sendMessage, get, set);
    registerEventHandlersTPOP(ipcMain, sendMessage, get, set);
    registerEventHandlersUPLOAD(ipcMain, sendMessage, get, set);
    registerEventHandlersCALIBRATION(ipcMain, sendMessage, get, set);
    registerEventHandlersSETTINGS(ipcMain, sendMessage, get, set);
    registerEventHandlersEXPORT(ipcMain, sendMessage, get, set);
}

function sendMessage(recipient, message, data=null) {
    LOGGER.send('SERVER', message);
    recipient.send(message, data);
}

module.exports = { registerAllEventHandlers, sendMessage };