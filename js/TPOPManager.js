/*
    Tech-Bla-Bla
*/

'use strict';

const fs = require('fs');
const path = require('path');
const https = require('https');
const MATHS = require('../statics/MATHS');
const request = require('request');
const {CONFIG} = require('../statics/CONFIG');
const { ContentManagerInterface } = require('../renderer/interfaces/ContentManagerInterface');
const LOGGER = require('../statics/LOGGER');

/**
 * TODO
 */
class TPOPManager extends ContentManagerInterface {
  /**
     * @param {String} externalContentFolder - Path to the application data directory provided by the operating
     *                           system.
     */
  constructor() {
    super();
    
    this.updateConfig();

    this.vltjson = path.join(this.tpopFolder, 'vltdata.json');
    this.cbdata = path.join(this.tpopFolder, 'cbdata.json');
    this.checkedForUpdates = false;
    this.fullTPOPData = null;
    this.activeTPOPData = null;
    this.activeFilters = [];
    this.hideWithoutImages = false;
    this.filterTypes = null;
    this.ctime = 'unknown';
    this.mtime = 'unknown';
  };

  name() {
    return "TPOPManager";
  }

  updateConfig() {
    this.tpopFolder = path.join(CONFIG.EXTERNAL_FOLDER, 'tpop');
    if (!fs.existsSync(this.tpopFolder)) {
      fs.mkdirSync(this.tpopFolder);
    }
  }

  setTpopFolder(path) {
    this.tpopFolder = path;
    if (!fs.existsSync(this.tpopFolder)) {
      fs.mkdirSync(this.tpopFolder);
    }
  }

  /**
   *
   * @param {*} reload
   */
  initialiseData(reload, callback) {
    if (this.activeTPOPData == null || reload == true) {
      // RELOAD data if no data existent or reload requested
      LOGGER.log('TPOP MANAGER', 'TPOP data not yet loaded.');
      if (fs.existsSync(this.vltjson) && !reload) {
        // data exists and doesn't have to be reloaded
        // -> load the file and read data
        this.ctime = fs.statSync(this.vltjson)['birthtime'];
        this.mtime = fs.statSync(this.vltjson).mtime;
        this.ctimeMs = fs.statSync(this.vltjson)['ctimeMs']
        this.mtimeMs = fs.statSync(this.vltjson)['mtimeMs']
        LOGGER.log('TPOP MANAGER', 'VLTdata was created on:', this.ctime);
        LOGGER.log('TPOP MANAGER', 'VLTdata was last modified on:', this.mtime);
        // TODO: CHECK DATE LAST MODIFIED
        if (this.ctimeMs < Date.now() - CONFIG.EXTERNAL_DATA_UPDATE_TIMESPAN) {
          LOGGER.log('TPOP MANAGER', "JSON outdated, reload necessary!");
          this.initialiseData(true, callback);
          return;
        } else {
          LOGGER.log('TPOP MANAGER', "VLTdata still up-to-date.");
        }
        // IF OLDER THAN THRESHOLD - REDOWNLOAD
        try {
          let tpopFile = fs.readFileSync(this.vltjson, 'utf8');
          if (tpopFile.charCodeAt(0) === 0xFEFF) {
            tpopFile = tpopFile.substring(1);
          }
          this.activeTPOPData = JSON.parse(tpopFile);
        } catch (e) {
          LOGGER.err(e);
          this.initialiseData(true);
          return;
        }
        this.fullTPOPData = this.activeTPOPData['objects'].filter((el) => {
          if (el == null || typeof el == 'undefined') return false;
          if (el['ObjectImages'].length == 0) return false;
          const recto = el['ObjectImageRectoLo'] || el['ObjectImageRectoHi'] || el['ObjectImageRecto'];
          const verso = el['ObjectImageVersoLo'] || el['ObjectImageVersoHi'] || el['ObjectImageVerso'];
          if (!recto && !verso && this.hideWithoutImages) return false;
          return true;
        });
        this.initialiseFeatures();
        this.activeTPOPData = this.fullTPOPData.slice(0);

        this.sortByName();

        LOGGER.log('TPOP MANAGER', 'Loaded TPOP data from local JSON.');
        if (callback) {
          callback();
        } else {
          return true;
        }
      } else {
        // no data available OR reload requested
        // -> download from Museo Egizio
        LOGGER.log('TPOP MANAGER', 'Trying to load the JSON from the Museo Egizio...');
        const requestURL = 'https://vlt.museoegizio.it/api/srv/vltdata?api_key=app.4087936422844370a7758639269652b9';
        https.get(requestURL, (res) => {
          const filePath = fs.createWriteStream(this.vltjson);
          res.pipe(filePath);
          filePath.on('finish', () => {
            filePath.close();
            LOGGER.log('TPOP MANAGER', 'Finished downloading VLTdata.');
            this.activeTPOPData = null;
            this.initialiseData(false, callback);
          });
        });
      }
    } else {
      if (callback) {
        callback();
      } else {
        return true;
      }
    }
  }

  /**
   *
   */
  initialiseFeatures() {
    if (fs.existsSync(this.cbdata)) {
      try {
        let cbdata = fs.readFileSync(this.cbdata, 'utf8');
        if (cbdata.charCodeAt(0) === 0xFEFF) {
          cbdata = cbdata.substring(1);
        }
        cbdata = JSON.parse(cbdata);
        cbdata = cbdata['large-papyri'].concat(cbdata['cp-fragments']);
        let found = 0;
        for (const o of cbdata) {
          let name = o['id'];
          if (name.indexOf('F') != -1 || name.indexOf("SN") != -1 || name.indexOf("Layer") != -1) continue;
          if (name.indexOf("tif") != -1) continue;
          if (name.indexOf("frame") != -1) continue;
          const f = this.fullTPOPData.find((obj) => {
            let valid = false;
            name = name.replace('CP00', 'CP');
            name = name.replace('CP0', 'CP');
            name = name.replace("Provv", "Provv.");
            if (name.slice(-1) == '_') name = name.slice(0, -1);
            name = name.replace('_', '/');

            if (obj['InventoryNumber'] === name) valid = true;
            return valid;
          });
          if (f) {
            found += 1;
            const idx_f = this.fullTPOPData.indexOf(f);
            if (!('features' in o)) continue;
            const f_features = {};
            for (const feature of Object.keys(o['features'])) {
              f_features[feature] = o['features'][feature]['recto'].concat(o['features'][feature]['verso']);
            }
            this.fullTPOPData[idx_f]['features'] = f_features;
          }
        }
      } catch (e) {
        LOGGER.err(e);
      }
    }
  }

  /**
   *
   */
  sortByName() {
    this.fullTPOPData.sort((a, b) => {
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

    this.activeTPOPData.sort((a, b) => {
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

    for (const obj of this.activeTPOPData) {
      delete obj['distance'];
    }

    for (const obj of this.fullTPOPData) {
      delete obj['distance'];
    }
  }

  /**
   *
   * @param {*} data
   */
  sortByDistance(data) {
    const weights = data.weights;
    const ids = data.ids;
    const mode = data.mode;
    const queried_features = [];

    // determine which features need to be considered
    for (const weight of Object.keys(weights)) {
      if (weights[weights] != 0) {
        queried_features.push(weight);
      }
    }

    // initialise collection of query vectors
    const vecs = {};
    for (const f of queried_features) {
      vecs[f] = [];
    }

    // read features from queried objects
    for (const id of ids) {
      const features = this.loadDetails(id)['features'];
      for (const f of queried_features) {
        if (!features || !(f in features) || features[f].length == 0) {
          // if one query object has no required features, stop it all
          this.sortByName();
          return null;
        }
        vecs[f] = vecs[f].concat(features[f]);
      }
    };

    // calculate average vectors for each feature space
    for (const f of queried_features) {
      vecs[f+'_avg'] = MATHS.averageVectors(vecs[f]);
    }

    // iterate over all objects to determine distances
    for (const obj of this.activeTPOPData) {
      const components = [];
      let invalid = false;

      if (!('features' in obj)) {
        obj['distance'] = 'INVALID';
        continue;
      }

      for (const f of queried_features) {
        // check if feature f is available
        if (!(f in obj['features']) || obj['features'][f].length == 0) {
          obj['distance'] = 'INVALID';
          invalid = true;
          break;
        }
        const w = weights[f];
        const v = obj['features'][f];
        if (mode == 'avg') {
          const v_avg = MATHS.averageVectors(v);
          const d_avg = MATHS.euclideanDistance(vecs[f+'_avg'], v_avg) * w;
          components.push(d_avg);
        } else {
          // mode == 'min'
          const d_min = MATHS.minDistance(vecs[f], v) * w;
          components.push(d_min);
        }
      }

      if (invalid) continue;

      const distance = components.reduce((a, b) => a + b);
      obj['distance'] = distance;
    }

    this.fullTPOPData.sort((a, b) => {
      const dA = a.distance;
      const dB = b.distance;

      if (dA == 'INVALID') return 1;
      if (dB == 'INVALID') return -1;

      if (dA > dB) {
        return 1;
      } else if (dA < dB) {
        return -1;
      } else {
        return 0;
      }
    });
    this.activeTPOPData.sort((a, b) => {
      const dA = a.distance;
      const dB = b.distance;

      if (dA == 'INVALID') return 1;
      if (dB == 'INVALID') return -1;

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
   * @param {*} startIndex
   * @param {*} endIndex
   * @return {*}
   */
  getData(startIndex, endIndex) {
    if (!this.activeTPOPData) {
      LOGGER.log('TPOP MANAGER', 'Reloading Data...');
      this.initialiseData(true);
      return null;
    }

    const start = startIndex || 0;
    const end = endIndex || Object.keys(this.activeTPOPData).length-1;

    const objects = [];
    for (let i = start; i <= end; i++) {
      if (i >= this.activeTPOPData.length) {
        break;
      }
      const obj = this.activeTPOPData[i];
      let urlRecto = obj['ObjectImageRecto'] || null;
      let urlVerso = obj['ObjectImageVerso'] || null;
      if (urlRecto == null) {
        urlRecto = '../imgs/symbol_no_pic.png';
      }
      if (urlVerso == null) {
        urlVerso = '../imgs/symbol_no_pic.png';
      }
      const entry = {
        'id': obj['TPOPid'],
        'name': obj['InventoryNumber'],
        'urlRecto': urlRecto,
        'urlVerso': urlVerso,
      };
      if (obj['distance']) {
        entry['distance'] = obj['distance'];
      }
      if ('features' in obj) {
        entry['features'] = Object.keys(obj['features']);
      }
      objects.push(entry);
    }

    const data = {
      maxObjects: this.activeTPOPData.length,
      ctime: this.ctime,
      mtime: this.mtime,
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

    Object.keys(this.activeTPOPData[0]).forEach((attribute) => {
      filtersTypeUnknown.push(attribute);
    });

    let i = 0;

    while (i < this.activeTPOPData.length && filtersTypeUnknown.length > 0) {
      const obj = this.activeTPOPData[i];
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
          obj = this.activeTPOPData[i];
          writingsObject = obj['Writings']['recto'][0];
          i++;
        }
        let writingsAttributes = Object.keys(writingsObject);
        i = 0;
        while (writingsAttributes.length > 0 && i < this.activeTPOPData.length) {
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
    const result = this.fullTPOPData.find((obj) => {
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
    if (this.fullTPOPData == null) return false;

    this.activeFilters = filters;

    this.activeTPOPData = this.fullTPOPData.slice(0);

    for (const idx in this.activeTPOPData) {
      if (Object.prototype.hasOwnProperty.call(this.activeTPOPData, idx)) {
        const object = this.activeTPOPData[idx];
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
            this.activeTPOPData[idx] = null;
          }
        }
      }
    }

    this.activeTPOPData = this.activeTPOPData.filter((x) => {
      return x !== null;
    });
  };

  getActiveFilters() {
    return this.activeFilters;
  }

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
    else if ((op == 'not empty' && (objectValue == null || objectValue == '')) || objectValue == null) return 0;

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
          filterValue = filterValue.toLowerCase();
        }
        if (text.toLowerCase().includes(filterValue)) contained = true;
      }
      if (!contained) return 0;
    } else if (type == 'list' && op == 'contains not') {
      // Is 'xyz' NOT contained in ['abc', 'deg', 'bxyz']?
      let contained = false;
      for (let text of objectValue) {
        if (!caseSensitive) {
          filterValue = filterValue.toLowerCase();
        }
        if (text.toLowerCase().includes(filterValue)) contained = true;
      }
      if (contained) return 0;
    } else if (op == '<') {
      if (objectValue >= filterValue) return 0;
    } else if (op == '<=') {
      if (objectValue > filterValue) return 0;
    } else if (op == '=') {
      if (objectValue != filterValue) return 0;
    } else if (op == '>=') {
      if (objectValue < filterValue) return 0;
    } else if (op == '>') {
      if (objectValue <= filterValue) return 0;
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
    return this.activeTPOPData.map((e) => e.TPOPid).indexOf(id);
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
          'urlRecto': obj['ObjectImageRecto'],
          'urlVerso': obj['ObjectImageVerso'],
          'urlTPOP': obj['permalink'],
        };
        if ('features' in obj) {
          entry['features'] = Object.keys(obj['features']);
        }
        result.push(entry);
      }
    }
    return result;
  }

  resolveTPOPurls(basicFragmentInfos, tableID, callback) {
    let urlKey, fragmentKey, url, fragment;
    let allResolved = true;

    for (const k in basicFragmentInfos) {
      fragment = basicFragmentInfos[k];
      if ('urlRecto' in fragment && fragment.urlRecto && !this.isURLresolved(fragment.urlRecto)) {
        allResolved = false;
        urlKey = 'urlRecto';
        fragmentKey = k;
        url = fragment.urlRecto;
        break;
      }
      if ('urlVerso' in fragment && fragment.urlVerso && !this.isURLresolved(fragment.urlVerso)) {
        allResolved = false;
        urlKey = 'urlVerso';
        fragmentKey = k;
        url = fragment.urlVerso;
        break;
      }
    }
    if (allResolved) {
        this.prepareLoadingQueueForUpload(basicFragmentInfos, tableID, callback);
    } else {
      const r = request(url, () => {
        fragment[urlKey] = r.uri.href;
        basicFragmentInfos[fragmentKey] = fragment;
        this.resolveTPOPurls(basicFragmentInfos, tableID, callback);
      });
    }
  }

  prepareIDsForUpload(tpopIDList, tableID, callback) {
    // read all necessary basic infos per TPOP ID
    const basicFragmentInfos = this.getBasicInfo(tpopIDList);
    // recursively iterate over all TPOP urls and replace them with real URL
    this.resolveTPOPurls(basicFragmentInfos, tableID, callback);
  }
  
  prepareLoadingQueueForUpload(resolvedFragmentInfos, tableID, callback) {
    const loadingQueue = [];
    // push all fragments into the manager's loading queue
    for (const f of resolvedFragmentInfos) {
      const entry = {
        'table': tableID,
        'fragment': {
          'x': 0,
          'y': 0,
          'name': f.name,
          'tpop': f.id,
          'urlTPOP': f.urlTPOP,
          'recto': {
            'url': f.urlRecto,
            'www': true,
          },
          'verso': {
            'url': f.urlVerso,
            'www': true,
          }
        },
      };
      loadingQueue.push(entry);
    }
    callback(loadingQueue);
  }

  isURLresolved(url) {
    const formats = ['jpg', 'jpeg', 'png', 'tif', 'tiff'];
    for (const format of formats) {
      if (url.indexOf('.'+format) != -1) return true;
    }
    return false;
  }

  getFolders() {
    const folders = [];
    
    const counter = {};

    for (const entry of this.fullTPOPData) {
      let folderName = entry['InventoryNumber'];
      if (folderName.indexOf('Provv') != -1) {
        folderName = 'Provv';
      } else if (folderName.indexOf('Cat') != -1) {
        folderName = 'Cat';
      } else if (folderName.indexOf('CGT') != -1) {
        folderName = 'CGT';
      } else if (folderName.indexOf('CP') != -1) {
        folderName = folderName.substring(0, folderName.indexOf("/")+1);
      } else if (folderName == '') {
        continue;
      }

      if (folderName in counter) {
        counter[folderName] += 1;
      } else {
        counter[folderName] = 1;
      }
    }

    for (const k of Object.keys(counter)) {
      folders.push({'name': k, 'amount': counter[k]});
    }
    return folders;
  }

  getImageLinks(tpopID) {
    const result = this.fullTPOPData.find((obj) => {
      return obj['TPOPid'] === tpopID;
    });
    return result['ObjectImages'];
  }
}

module.exports = TPOPManager;
