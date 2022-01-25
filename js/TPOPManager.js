/*
    Tech-Bla-Bla
*/

'use strict';

const fs = require('fs');
const {remove} = require('jszip');

/**
 * TODO
 */
class TPOPManager {
  /**
     * TODO
     */
  constructor() {
    this.checkedForUpdates = false;
    this.allTPOPData = null;
    this.tpopData = null;
    this.filterTypes = null;
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
          // this.tpopData = JSON.parse(fs.readFileSync('./tpop.json'));
          this.tpopData = JSON.parse(fs.readFileSync('./basilea_vlt.json'));
          this.allTPOPData = this.tpopData['objects'];
          this.tpopData = this.tpopData['objects'];
          this.tpopData.sort((a, b) => {
            let nameA = a['InventoryNumber'];
            let nameB = b['InventoryNumber'];

            if (nameA.indexOf('CP') == 0) {
              const folderA = nameA.slice(0, nameA.indexOf('/')).slice(2);
              const missingDigitsA = 4 - String(folderA).length;
              nameA = 'CP' + '0'.repeat(missingDigitsA) + nameA.slice(2);
            }
            if (nameB.indexOf('CP') == 0) {
              const folderB = nameB.slice(0, nameB.indexOf('/')).slice(2);
              const missingDigitsB = 4 - String(folderB).length;
              nameB = 'CP' + '0'.repeat(missingDigitsB) + nameB.slice(2);
            }

            if (nameA > nameB) {
              return 1;
            } else {
              return -1;
            }
          });
          console.log('Loaded TPOP data from local JSON.');
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
    } else {
      console.log('We already have the data available! :)');
      console.log('All TPOP entries:', this.allTPOPData.length);
      console.log('Active Selection entries:', this.tpopData.length);
    }
    // sobald ein JSON geladen ist (oder schon war):
    // angegebenen Bereich reduziert ausspucken

    const start = startIndex || 0;
    const end = endIndex || Object.keys(this.tpopData).length-1;

    const objects = [];
    for (let i = start; i <= end; i++) {
      if (i >= this.tpopData.length) {
        break;
      }
      const obj = this.tpopData[i];
      const entry = {
        'id': obj['TPOPid'],
        'name': obj['InventoryNumber'],
        'urlRecto': '../imgs/examples/dummy.jpg',
        'urlVerso': '../imgs/examples/dummy.jpg',
      };
      objects.push(entry);
    }

    const data = {
      maxObjects: this.tpopData.length,
      objects: objects,
      filters: this.getFilterAttributes(),
    };

    return data;
  };

  /**
   *
   * @return {*}
   */
  getFilterAttributes() {
    if (this.filterTypes != null) {
      return this.filterTypes;
    }
    const filterAttributes = [];
    let filtersTypeUnknown = [];
    const filtersTypeObject = [];

    Object.keys(this.tpopData[0]).forEach((attribute) => {
      filtersTypeUnknown.push(attribute);
    });

    let i = 0;

    while (i < this.tpopData.length && filtersTypeUnknown.length > 0) {
      const obj = this.tpopData[i];
      for (const idx in filtersTypeUnknown) {
        const attribute = filtersTypeUnknown[idx];
        const value = obj[attribute];
        const type = this.getFilterType(value);
        const filterData = {};

        if (type == null) {
          // no entry
          continue;
        } else if (type == 'object') {
          // entry is an object, not a list
          filtersTypeObject.push(attribute);
          filtersTypeUnknown[idx] = null;
        } else {
          // lists, strings, booleans, numbers
          filterData.attribute = attribute;
          filterData.type = type;
          filterData.parent = null;
          filterAttributes.push(filterData);
          filtersTypeUnknown[idx] = null;
        }
      }
      filtersTypeUnknown = filtersTypeUnknown.filter((x) => {
        return x !== null;
      });
      i++;
    }

    // DETERMINE SUB_OBJECTS
    for (const top_attribute of filtersTypeObject) {
      if (top_attribute == 'Writings') {
        let obj = null;
        let writingsObject = null;
        i = 0;
        while (writingsObject == null) {
          obj = this.tpopData[i];
          writingsObject = obj['Writings']['recto'][0];
          i++;
        }
        let writingsAttributes = Object.keys(writingsObject);
        i = 0;
        while (writingsAttributes.length > 0 && i < this.tpopData.length) {
          for (const writingsAttribute of writingsAttributes) {
            const writingsValue = writingsObject[writingsAttribute];
            const writingsType = this.getFilterType(writingsValue);
            if (writingsType != null) {
              filterAttributes.push({
                attribute: writingsAttribute,
                type: writingsType,
                parent: 'Writings',
              });
              writingsAttributes[writingsAttributes.indexOf(writingsAttribute)] = null;
            }
          }
          writingsAttributes = writingsAttributes.filter((x) => {
            return x !== null;
          });
          i++;
        }
      }
    }
    this.filterTypes = filterAttributes;
    return filterAttributes;
  }

  getFilterType(value) {
    if (value == null) {
      return null;
    } else if (typeof value == 'object' && !Array.isArray(value)) {
      return 'object';
    } else if (typeof value == 'object') {
      return 'list';
    } else {
      return typeof value;
    }
  }

  /**
   *
   * @param {*} id
   * @returns
   */
  loadDetails(id) {
    const result = this.allTPOPData.find((obj) => {
      return obj['TPOPid'] === id;
    });
    return result;
  };

  /**
   *
   * @param {*} filters
   */
  filterData(filters) {
    // TODO: one could also check if a filter is added or removed; additional filters
    // will never expand the list of potential candidates, so the number of
    // calculations could be reduced; depends on the performance if this is needed or not
    if (this.allTPOPData == null) return false;
    
    this.tpopData = this.allTPOPData.slice(0);

    for (const idx in this.tpopData) {
      const object = this.tpopData[idx];
      for (const filter of filters) {
        let queryObjects;
        let queryResult = 0;

        // Define Query Object
        // IF parent == null (top level), only whole object
        // IF parent == "Writings", all writings objects
        if (filter.parent == null) {
          queryObjects = [object];
        } else if (filter.parent == 'Writings') {
          queryObjects = this.getAllWritings(object);
        }

        // check every query object for validity against the filter
        for (const queryObject of queryObjects) {
          const objectValue = queryObject[filter.attribute];
          const query = this.checkValueAgainstFilter(objectValue, filter);
          queryResult += query;
        }

        // if all queries were negative, the result will be 0
        // which means the object can be removed from the selection
        if (queryResult == 0) {
          this.tpopData[idx] = null;
        }
      }
    }

    this.tpopData = this.tpopData.filter((x) => {
      return x !== null;
    });
  };

  getAllWritings(object) {
    const rectoWritings = object['Writings']['recto'];
    const versoWritings = object['Writings']['verso'];
    const writings = rectoWritings.concat(versoWritings);
    return writings;
  }

  /**
   *
   * @param {*} objectValue
   * @param {*} filter
   * @returns
   */
  checkValueAgainstFilter(objectValue, filter, caseSensitive=false) {
    let filterValue = filter.value;
    const op = filter.operator;
    const type = filter.type;

    // check for emptiness
    if (op == 'empty' && objectValue != null && objectValue != '') return 0;
    else if (op == 'not empty' && (objectValue == null || objectValue == '')) return 0;
    else if (objectValue == null) return 0;

    if (type == 'string' && op == 'contains') {
      // Is 'xyz' contained in 'abcxyz'?
      if (!caseSensitive) {
        objectValue = objectValue.toLowerCase();
        filterValue = filterValue.toLowerCase();
      }
      if (!objectValue.includes(filterValue)) return 0;
    } else if (type == 'string' && op == 'contains not') {
      // Is 'xyz' NOT contained in 'abcxyz'?
      if (!caseSensitive) {
        objectValue = objectValue.toLowerCase();
        filterValue = filterValue.toLowerCase();
      }
      if (objectValue.includes(filterValue)) return 0;
    } else if (type == 'list' && op == 'contains') {
      // Is 'xyz' contained in ['abc', 'deg', 'bxyz']?
      let contained = false;
      for (let text of objectValue) {
        if (!caseSensitive) {
          text = text.toLowerCase();
          filterValue = filterValue.toLowerCase();
        }
        if (text.includes(filterValue)) contained = true;
      }
      if (!contained) return 0;
    } else if (type == 'list' && op == 'contains not') {
      // Is 'xyz' NOT contained in ['abc', 'deg', 'bxyz']?
      let contained = false;
      for (let text of objectValue) {
        if (!caseSensitive) {
          text = text.toLowerCase();
          filterValue = filterValue.toLowerCase();
        }
        if (text.includes(filterValue)) contained = true;
      }
      if (contained) return 0;
    } else if (op == '<') {
      if (!(objectValue < filterValue)) return 0;
    } else if (op == '<=') {
      if (!(objectValue <= filterValue)) return 0;
    } else if (op == '=') {
      if (objectValue != filterValue) return 0;
    } else if (op == '>=') {
      if (!(objectValue >= filterValue)) return 0;
    } else if (op == '>') {
      if (!(objectValue > filterValue)) return 0;
    } else if (op == 'true') {
      if (!objectValue) return 0;
    } else if (op == 'false') {
      if (objectValue) return 0;
    }

    return 1;
  };

  /**
   * 
   * @param {*} id 
   */
  getPosition(id) {
    return this.tpopData.map((e) => e.TPOPid).indexOf(id);
  }

  checkForTPOPUpdate() {};
  connectToTPOP() {};
}

module.exports = TPOPManager;
