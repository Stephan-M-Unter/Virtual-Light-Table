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

function registerAllEventHandlers(deps) {
    registerEventHandlersML(deps);
    registerEventHandlersAPP(deps);
    registerEventHandlersLOAD(deps);
    registerEventHandlersMAINVIEW(deps);
    registerEventHandlersSAVE(deps);
    registerEventHandlersTPOP(deps);
    registerEventHandlersUPLOAD(deps);
    registerEventHandlersCALIBRATION(deps);
    registerEventHandlersSETTINGS(deps);
    registerEventHandlersEXPORT(deps);
}

module.exports = { registerAllEventHandlers };