/*
    Tech-Bla-Bla
*/

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');

/**
 * TODO
 */
class TPOPManager {
  /**
     * @param {String} vltFolder - Path to the application data directory provided by the operating
     *                           system. If no "Virtual Light Table" subfolder is present, a new one
     *                           will be created.
     */
  constructor(vltFolder) {
    this.tpopFolder = path.join(vltFolder, 'tpop');
    this.vltjson = path.join(this.tpopFolder, 'vltdata.json');
    if (!fs.existsSync(this.tpopFolder)) {
      fs.mkdirSync(this.tpopFolder);
    }
    this.checkedForUpdates = false;
    this.allTPOPData = null;
    this.tpopData = null;
    this.filterTypes = null;

    this.initialiseVLTdata();
  };

  /**
   *
   * @param {*} reload
   */
  initialiseVLTdata(reload=false) {
    if (this.tpopData == null || reload == true) {
      console.log('TPOP data not yet loaded.');
      if (fs.existsSync(this.vltjson)) {
        const creationDate = fs.statSync(this.vltjson)['birthtime'];
        console.log('VLTdata was created on:', creationDate);
        // TODO: CHECK DATE LAST MODIFIED
        // IF OLDER THAN THRESHOLD - REDOWNLOAD
        try {
          let tpopFile = fs.readFileSync(this.vltjson, 'utf8');
          if (tpopFile.charCodeAt(0) === 0xFEFF) {
            tpopFile = tpopFile.substring(1);
          }
          this.tpopData = JSON.parse(tpopFile);
        } catch (e) {
          console.log(e);
        }
        this.allTPOPData = this.tpopData['objects'].filter((el) => {
          return el !== null && typeof el !== 'undefined';
        });
        this.initialiseFeatures();
        this.tpopData = this.allTPOPData.slice(0);

        this.sortByName();

        console.log('Loaded TPOP data from local JSON.');
      } else {
        console.log('Trying to load the JSON from the Museo Egizio...');
        const requestURL = 'https://vlt.museoegizio.it/api/srv/vltdata?api_key=app.4087936422844370a7758639269652b9';
        const request = https.get(requestURL, (res) => {
          const filePath = fs.createWriteStream(this.vltjson);
          res.pipe(filePath);
          filePath.on('finish', () => {
            filePath.close();
            console.log('Finished downloading VLTdata.');
          });
        });
          // JSON nicht lokal vorhanden
          // HTTP-REQUEST an das ME
          // Datei herunterladen und an this.vltjson speichern
          // Daten wie oben angegeben laden
      }
    }
  }

  /**
   *
   */
  initialiseFeatures() {
    for (let i = 0; i < this.allTPOPData.length; i++) {
      const features = {
        'rgb': [],
        'snn': [],
      };
      for (let j = 0; j < 10; j++) {
        const v = Array.from({length: 20}, () => Math.random());
        const v_rgb = Array.from({length: 18}, () => Math.random());
        features['rgb'].push(v_rgb);
        features['snn'].push(v);
      }
      this.allTPOPData[i]['features'] = features;
    }
  }

  /**
   *
   */
  sortByName() {
    this.allTPOPData.sort((a, b) => {
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


      if (nameA.toLowerCase() > nameB.toLowerCase()) {
        // e.g. nameA is "z" and nameB is "a"
        return 1;
      } else {
        return -1;
      }
    });

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


      if (nameA.toLowerCase() > nameB.toLowerCase()) {
        // e.g. nameA is "z" and nameB is "a"
        return 1;
      } else {
        return -1;
      }
    });
  }

  /**
   *
   * @param {*} data
   */
  sortByDistance(data) {
    const weights = data.weights;
    const ids = data.ids;

    const avg_distances = [];
    const min_distances = [];

    const vecs = {
      'rgb': [],
      'snn': [],
    };

    for (const id of ids) {
      const features = this.loadDetails(id);
      vecs['rgb'] = vecs['rgb'].concat(features['rgb']);
      vecs['snn'] = vecs['snn'].concat(features['snn']);
    };

    vecs['rgb_avg'] = this.avgvector(vecs['rgb']);
    vecs['snn_avg'] = this.avgvector(vecs['snn']);

    for (let obj of this.tpopData) {
      const rgb = obj['features']['rgb'];
      const rgb_avg = this.avgvector(rgb);
      const snn = obj['features']['rgb'];
      const snn_avg = this.avgvector(snn);

      let d_rgb = this.eucDistance(vecs['rgb_avg'], rgb_avg);
      let d_snn = this.eucDistance(vecs['snn_avg'], snn_avg);
      let d = d_rgb * weights['rgb'] + d_snn * weights['snn'];
      avg_distances.push(d);
    }

    this.tpopData.sort((a, b) => {
      let idxA = this.tpopData.indexOf(a);
      let idxB = this.tpopData.indexOf(b);
      let dA = avg_distances[idxA];
      let dB = avg_distances[idxB];

      if (dA > dB) {
        return 1;
      } else if (dA < dB) {
        return -1;
      } else {
        return 0;
      }
    });
  }

  /**
   *
   * @param {*} a
   * @param {*} b
   * @return {*}
   */
  addvector(a, b) {
    return a.map((e, i) => e + b[i]);
  }

  /**
   *
   * @param {*} v
   * @return {*}
   */
  addvectors(v) {
    let v0 = v[0];
    for (let i = 1; i < v.length; i++) {
      v0 = this.addvector(v0, v[i]);
    }
    return v0;
  }

  /**
   *
   * @param {*} v
   * @return {*}
   */
  avgvector(v) {
    const l = v.length;
    if (l == 0) return null;
    if (l == 1) return v;
    let r = this.addvectors(v);
    r = r.map((x) => x / l);
    return r;
  }

  /**
   *
   * @param {*} a
   * @param {*} b
   * @return {*}
   */
  eucDistance(a, b) {
    return a
        .map((x, i) => Math.abs( x - b[i] ) ** 2) // square the difference
        .reduce((sum, now) => sum + now) ** // sum
        (1/2);
  }

  /**
   *
   * @param {*} startIndex
   * @param {*} endIndex
   * @return {*}
   */
  loadData(startIndex, endIndex) {
    if (!this.tpopData) {
      console.log('Reloading Data...');
      this.initialiseVLTdata(reload=true);
      return null;
    }

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
        'urlRecto': obj['ObjectImageRectoLo'],
        'urlVerso': obj['ObjectImageVersoLo'],
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
        if (Object.prototype.hasOwnProperty.call(filtersTypeUnknown, idx)) {
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
      }
      filtersTypeUnknown = filtersTypeUnknown.filter((x) => {
        return x !== null;
      });
      i++;
    }

    // DETERMINE SUB_OBJECTS
    for (const topAttribute of filtersTypeObject) {
      if (topAttribute == 'Writings') {
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

  /**
   *
   * @param {*} value
   * @return {*}
   */
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
   * @return {*}
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
   * @return {*}
   */
  filterData(filters) {
    // TODO: one could also check if a filter is added or removed; additional filters
    // will never expand the list of potential candidates, so the number of
    // calculations could be reduced; depends on the performance if this is needed or not
    if (this.allTPOPData == null) return false;

    this.tpopData = this.allTPOPData.slice(0);

    for (const idx in this.tpopData) {
      if (Object.prototype.hasOwnProperty.call(this.tpopData, idx)) {
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
    }

    this.tpopData = this.tpopData.filter((x) => {
      return x !== null;
    });
  };

  /**
   *
   * @param {*} object
   * @return {*}
   */
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
   * @param {*} caseSensitive
   * @return {*}
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
   * @return {*}
   */
  getPosition(id) {
    return this.tpopData.map((e) => e.TPOPid).indexOf(id);
  }

  /**
   *
   * @param {*} idList
   * @return {*}
   */
  getBasicInfo(idList) {
    const result = [];
    for (const tpopID of idList) {
      const obj = this.loadDetails(tpopID);
      if (obj) {
        const entry = {
          'id': obj['TPOPid'],
          'name': obj['InventoryNumber'],
          'urlRecto': obj['ObjectImageRectoLo'],
          'urlVerso': obj['ObjectImageVersoLo'],
          'features': {
            'recto': {
              'triplet': this.createRandomVector(20),
            },
            'verso': {
              'triplet': this.createRandomVector(20),
            },
          },
        };
        result.push(entry);
      }
    }
    return result;
  }

  checkForTPOPUpdate() {};
  connectToTPOP() {};

  /**
   *
   * @param {*} length
   * @return {*}
   */
  createRandomVector(length) {
    return Array.from({length: length}, () => Math.random());
  }
}

module.exports = TPOPManager;
