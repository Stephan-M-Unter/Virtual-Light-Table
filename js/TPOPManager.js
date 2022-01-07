/*
    Tech-Bla-Bla
*/

'use strict';

const fs = require('fs');

/**
 * TODO
 */
class TPOPManager {
  /**
     * TODO
     */
  constructor() {
    this.checkedForUpdates = false;
    this.tpopData = null;
  };

  /**
   *
   * @param {*} startIndex
   * @param {*} endIndex
   */
  loadData(startIndex, endIndex) {
    if (this.tpopData == null) {
      console.log('TPOP data not yet loaded.');
      try {
        if (fs.existsSync('./tpop.json')) {
          this.tpopData = JSON.parse(fs.readFileSync('./tpop.json'));
          console.log('Loaded TPOP data from local JSON.');
          console.log(this.tpopData);
        }
      } catch (err) {
        console.log(err);
      }
      // 2.1 falls nicht: json lokal vorhanden?
      // 2.2 connection zum ME-Server möglich?
      // falls ja: Update erforderlich?
      // falls ja: runterladen und datei ersetzn
      // falls nein: vorhandenes JSON laden
      // falls keines vorhanden: Fehlermeldung
      // neu geladenes JSON nach namen sortieren
    }
    // sobald ein JSON geladen ist (oder schon war):
    // angegebenen Bereich reduziert ausspucken

    const start = startIndex || 0;
    const end = endIndex || Object.keys(this.tpopData).length-1;

    const data = [];
    for (let i = start; i <= end; i++) {
      if (i >= Object.keys(this.tpopData).length) {
        break;
      }
      const key = Object.keys(this.tpopData)[i];
      const value = this.tpopData[key];
      const entry = {
        'name': value.name,
        'urlRecto': value.urlRecto,
        'urlVerso': value.urlVerso,
      };
      data.push(entry);
    }
    return data;
  };

  loadDetails(id) {
    for (const [key, value] of Object.entries(this.tpopData)) {
      console.log(value);
      if (value.name == id) {
        return value;
      }
    }
    return null;
  };
  
  filterData() {};
  checkForTPOPUpdate() {};
  connectToTPOP() {};
}

module.exports = TPOPManager;
