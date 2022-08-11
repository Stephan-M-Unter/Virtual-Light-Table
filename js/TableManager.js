/*
    Name:           CanvasManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel,
                        Crossing Boundaries project)
    Start-Date:     23/07/19

    Description:    This manager is supposed to store all information
                    about the papyri added to the application's canvas
                    and to return them to the view. The manager stores
                    information both about the stage and the canvas items
                    in order to be able to save the whole setup and recreate it.

                    The structure for the CanvasManager is as follows:

                    CanvasManager: {
                        stage: {
                            width: int,
                            height: int,
                            ...
                        },
                        items: {
                            ID1: {
                                name: String,
                                xPos: int,
                                yPos: int,
                                rotation: float,
                                recto: bool,
                                rectoURLoriginal: String,
                                versoURLoriginal: String,
                                rectoURLlocal: String,
                                versoURLlocal: String,
                                meta: {
                                    metaTag1: ...,
                                    metaTag2: ...,
                                    ...
                                }
                            }
                        }

                    }

                    Property Explanation:

                    Stage:      contains all information about the stage/canvas
                                itself; might be necessary to reproduce the
                                position of fragments with respect to each other
                    Items:      contains all information about the loaded
                                fragments
                    ID:         unique identifier for each fragment, only
                                for internal use; this is not necessarily
                                a name given by TPOP or any other nomenclature,
                                could also be a continous numbering
                    xPos:       x-position of the fragment on the canvas,
                                regarding the center (?) of the image
                    yPos:       y-position of the fragment on the canvas,
                                regarding the center (?) of the image
                    rotation:   float indicating the rotation of a fragment;
                                values from 0 to 180 (1st and 2nd quadrant)
                                and 0 to -180 (3rd and 4th quadrant)
                    recto:      a boolean flag indicating whether the
                                recto or the verso of a fragment is shown
                    rectoURLoriginal:   URL of the original recto image
                                        such that it could be reloaded
                    rectoURLlocal:      file path to the locally saved
                                        version of the fragment's image
                    meta:       contains all meta information about an
                                object as loaded from the database
*/

'use strict';

const irrelevantProperties = ['undoSteps', 'redoSteps', 'emptyTable'];

/**
 * TODO
 */
class TableManager {
  /**
     * TODO
     */
  constructor() {
    this.tables = {};
    this.maxUndoSteps = 30;
    this.tableIdRunner = 0;
  }

  /**
   * Deletes all tables from the manager, creates a new and empty one and returns its ID.
   * @return {String}
   */
  clearAll() {
    this.tables = {};
    this.tableIdRunner = 0;
    return this.createNewTable();
  }

  /**
   * Deletes the information saved for the table with id tableID and replaces it with a
   * completely fresh and empty configuration.
   * @param {String} tableID ID of table to clear, e.g. "table_1".
   */
  clearTable(tableID) {
    const emptyTable = this.getEmptyTable();
    this.tables[tableID] = emptyTable;
  }

  /**
   * Creates a new table by defining a new tableID and storing a completely fresh and empty
   * table configuration. Returns the new table's tableID, e.g. "table_1".
   * @param {[String]} tableID - optional: tableID, if you already want to give it
   * @return {String}
   */
  createNewTable(tableID) {
    const emptyTable = this.getEmptyTable();
    let newTableID;

    if (tableID && !Object.keys(this.tables).includes(tableID)) {
      newTableID = tableID;
    } else {
      while (true) {
        newTableID = 'table_'+this.tableIdRunner;
        if (!Object.keys(this.tables).includes(newTableID)) {
          this.tableIdRunner += 1;
          break;
        } else {
          this.tableIdRunner += 1;
        }
      }
    }
    this.tables[newTableID] = emptyTable;
    return newTableID;
  }

  /**
   * Removes stored data for given table. The function returns the ID for the next table to be active, which is
   * either the next one in the list, or the last one (if the removed one was the table most right in the list), or an empty table
   * (if the removed one was the last available table).
   * @param {String} tableID ID of table to remove, e.g. "table_1".
   * @return {String}
   */
  removeTable(tableID) {
    if (tableID in this.tables) {
      let nextTable;
      const tables = Object.keys(this.tables);
      const arrayIndex = tables.indexOf(tableID);
      if (arrayIndex+1 < tables.length) {
        // another table to the right is available
        nextTable = tables[arrayIndex+1];
      } else if (arrayIndex-1 >= 0) {
        // tableID was last table on the right - choose table to the left
        nextTable = tables[arrayIndex-1];
      } else {
        // no other table available, create new table
        nextTable = this.createNewTable();
      }
      delete this.tables[tableID];
      return nextTable;
    }
  }

  /**
   * Returns if the table with ID tableID has any fragments in the model.
   * @param {*} tableID ID of table to check for fragments, e.g. "table_1".
   * @return {Boolean}
   */
  hasFragments(tableID) {
    if (tableID in this.tables && Object.keys(this.tables[tableID].fragments).length > 0) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * Creates the very basic and empty object for defining a table in the VLT.
   * @return {Object}
   */
  getEmptyTable() {
    const stage = {
      'scaling': 100,
    };
    const table = {
      stage: stage,
      fragments: {},
      editors: [],
      annots: {},
      screenshot: null,
      undoSteps: [],
      redoSteps: [],
      emptyTable: true,
    };
    return table;
  }

  /**
   * Returns a fresh and empty fragments object without any previously saved fragments.
   * @return {Object}
   */
  getEmptyFragments() {
    return this.getEmptyTable().fragments;
  }

  /**
   * Returns a fresh and empty stage object with default settings.
   * @return {Object}
   */
  getEmptyStage() {
    return this.getEmptyTable().stage;
  }

  /**
   * Returns a tableObject with all data defining the table with ID tableID. This tableObject has
   * two properties, tableObject.tableID (to identify the table later on as well), and tableObject.tableData,
   * which is another object containing all the necessary information. Specific information that is irrelevant
   * outside the running VLT process, like "undoSteps", are removed from the returned object. The selection
   * of "irrelevant properties" can be adjusted by manipulating the irrelevantProperties array inside
   * this function.
   * @param {String} tableID ID of table to get data from, e.g. "table_1".
   * @return {Object}
   */
  getTable(tableID) {
    if (tableID in this.tables) {
      const properties = Object.keys(this.tables[tableID]);
      const tableData = {};
      properties.forEach((property) => {
        if (!irrelevantProperties.includes(property)) {
          tableData[property] = this.tables[tableID][property];
        }
      });
      return tableData;
    }
  }

  /**
   * Special variant of the getTable() function to only read the most basic information needed to
   * display a table on the client.
   * @param {String} tableID
   * @return {Object}
   */
  getInactiveTable(tableID) {
    const table = this.getEmptyTable();
    table.screenshot = this.tables[tableID].screenshot;
    table.fragments = this.tables[tableID].fragments;
    return table;
  }

  /**
   * Return everything.
   * @return {Object}
   */
  getTables() {
    const tables = {};
    for (const tableID of Object.keys(this.tables)) {
      if (tableID) {
        const table = this.getTable(tableID);
        tables[tableID] = table;
      }
    }

    return tables;
  }

  /**
   * Returns the number of tables currently registered.
   * @return {Integer}
   */
  getNumberOfTables() {
    return Object.keys(this.tables).length;
  }

  /**
   * Returns a list of IDs for all registered tables.
   * @return {String[]}
   */
  getTableIds() {
    return Object.keys(this.tables);
  }

  /**
   * Deletes all information about previously loaded fragments from table with id tableID.
   * @param {String} tableID ID of table to clear, e.g. "table_1".
   */
  clearFragments(tableID) {
    this.tables[tableID].fragments = this.getEmptyFragments();
  }

  /**
   * Deletes all information about the stage stored so far and replaces it with the default setting.
   * @param {String} tableID ID of table to clear, e.g. "table_1".
   */
  clearStage(tableID) {
    this.tables[tableID].stage = this.getEmptyStage();
  }

  /**
   * Receives a table object containing the new table configuration and overwrites the pre-existing state. While
   * doing so, a "step" is performed that is saved in the "undoSteps" and could be access via "undoStep()".
   * @param {String} tableID ID of table to act on, e.g. "table_1".
   * @param {Object} tableData Object containing all relevant information for one table.
   * @param {[Boolean]} skipDoStep optional; if TRUE, skip the do step, if FALSE, make a do step.
   * Default (when not given): FALSE.
   */
  updateTable(tableID, tableData, skipDoStep) {
    if (tableID in this.tables) {
      const numberFragments = Object.keys(this.tables[tableID].fragments).length;
      if (!skipDoStep && numberFragments > 0) this.doStep(tableID);
      Object.keys(tableData).forEach((property) => {
        if (!irrelevantProperties.includes(property)) {
          this.tables[tableID][property] = tableData[property];
        }
      });
    }
  }

  /**
   * This function saves the current status of a table to is "undoSteps", allowing users to access previous
   * states of the table with the "undoStep()" function. The number of saved states is limited with the
   * maxSteps attribute. Once the number of maximum steps is reached, the oldest version is removed
   * from the array. Also, when a new step is done, the "redoSteps" which would allow to undo an undo are
   * reset because a new branch of actions is started.
   * @param {String} tableID ID of table to act on, e.g. "table_1".
   */
  doStep(tableID) {
    // starting a new action branch, all redos are deleted
    this.tables[tableID].redoSteps = [];

    // saving current configuration as undo step
    if (this.emptyTable) {
      this.tables[tableID].emptyTable = false;
    } else {
      const table = this.getTable(tableID);
      const step = {};
      for (const key of Object.keys(table)) {
        if (!irrelevantProperties.includes(key)) {
          step[key] = table[key];
        }
      }
      this.tables[tableID].undoSteps.push(step);
    }

    // if maximum step length is reached, remove first undos
    while (this.tables[tableID].undoSteps.length > this.maxUndoSteps) {
      this.tables[tableID].undoSteps.shift();
    }
  }

  /**
   * Recreates the state of table with ID tableID before the last save to model. For this, the last
   * configuration is read from the undoSteps property of the table and filled back into the tableObject.
   * The boolean return value indicates if a previous state has successfully been restorend (TRUE) or
   * if this could not be achieved, e.g. because there are no previous states logged (FALSE). The current state
   * of the table is pushed to the redoSteps, to be able to undo the undo step.
   * @param {tableID} tableID ID of table to undo action on, e.g. "table_1".
   * @return {Boolean}
   */
  undoStep(tableID) {
    // return false in case that no undo steps are available
    if (this.tables[tableID].undoSteps.length == 0) {
      return false;
    }

    // saving current state as new entry in redoSteps
    const step = this.getTable(tableID);
    this.tables[tableID].redoSteps.push(step);

    // loading former state
    const tableData = this.tables[tableID].undoSteps.pop();
    Object.keys(tableData).forEach((item) => {
      this.tables[tableID][item] = tableData[item];
    });
    return true;
  }

  /**
   * Recreates the state of table with ID tableID before the last undo action. For this, the last
   * configuration is read from the redoSteps property of the table and filled back into the tableObject.
   * The boolean return value indicates if a previous state has successfully been restorend (TRUE) or
   * if this could not be achieved, e.g. because there are no previous states logged (FALSE).
   * @param {tableID} tableID ID of table to redo action on, e.g. "table_1".
   * @return {Boolean}
   */
  redoStep(tableID) {
    // if there are no redo steps saved, there is nothing we can do
    if (this.tables[tableID].redoSteps.length == 0) {
      return false;
    }

    // saving current configuration as undo step
    const step = this.getTable(tableID);
    this.tables[tableID].undoSteps.push(step);

    // load first redo step available
    const tableData = this.tables[tableID].redoSteps.pop();
    Object.keys(tableData).forEach((item) => {
      this.tables[tableID][item] = tableData[item];
    });
    return true;
  }

  /**
   * Returns an Object with object.undoSteps and object.redoSteps, two integers indicating the number
   * of available undo and redo steps for this table.
   * @param {String} tableID ID of table to count available undo and redo steps for, e.g. "table_1".
   * @return {Object}
   */
  getRedoUndo(tableID) {
    return {
      'undoSteps': this.tables[tableID].undoSteps.length,
      'redoSteps': this.tables[tableID].redoSteps.length,
    };
  }

  /**
   * Returns the details for a specific fragment with fragmentID on a specific table with tableID.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {String} fragmentID ID of fragment, e.g. "f_0".
   * @return {*}
   */
  getFragment(tableID, fragmentID) {
    return this.tables[tableID].fragments[fragmentID];
  }

  /**
   * TODO
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {Object} aData Object describing the new annotation.
   * @param {String} aData.id ID of annotation, e.g. "a_0".
   * @param {String} aData.text Text of the new annotation.
   * @param {String} aData.editor Name or abbreviation of the editor writing the annotation.
   * @param {Boolean} aData.hidden Variable indicating if the annotation is visible or not.
   * @param {int} aData.time Time of last change of annotation, given in milliseconds since 01/01/1970.
   */
  writeAnnotation(tableID, annotation) {
    const aID = annotation.aID;
    this.tables[tableID].annots[aID] = annotation;
  }
  
  /**
   * Removes a specific annotation with aID from the table with tableID.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {String} aID D
   */
  removeAnnotation(tableID, aID) {
    delete this.tables[tableID].annots[aID];
  }

  /**
   * This function needs to receive the tableID for the table the user wants to load a configuration onto,
   * and the tableData which is read from the respective .vlt file. First, the table is cleared, just to make
   * sure that the table originally was empty and not filled with other information - I hope to avoid any incompatibilities
   * this way if maybe additional properties are added to the tableData objects. Then, the table is overwritten with
   * the loaded properties.
   * Note: A tableID must already be existant, as you can only LOAD a table configuration from an at least
   * empty, already existing table. You cannot load directly into a new table (at least not with
   * this function).
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {Object} tableData
   */
  loadFile(tableID, tableData) {
    this.clearTable(tableID);
    this.updateTable(tableID, tableData);
  }

  /**
   * Adds a new editor to the current savefile, including the current time in milliseconds since 01/01/1970.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {String} editor Name or initials of editor to add to the collection.
   */
  addEditor(tableID, editor) {
    const timeMs = new Date().getTime();
    this.tables[tableID].editors.push([editor, timeMs]);
  }

  /**
   * Updates the information on the current (i.e. last) editor in the editors' list, together
   * with a new timestamp.
   * @param {String} tableID ID of table, e.g. "table_1".
   */
  updateEditor(tableID) {
    const lastEditor = this.tables[tableID].editors.pop();
    const timeMs = new Date().getTime();
    this.tables[tableID].editors.push([lastEditor[0], timeMs]);
  }

  /**
   * Save a new screenshot to the table with tableID.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {*} screenshot
   */
  setScreenshot(tableID, screenshot) {
    this.tables[tableID].screenshot = screenshot;
  }

  getTPOPIds(tableID) {
    const tpops = [];
    for (const k of Object.keys(this.tables[tableID].fragments)) {
      const fragment = this.tables[tableID].fragments[k];
      if ('tpop' in fragment) {
        tpops.push(fragment.tpop);
      }
    }
    return tpops;
  }

  setGraphicFilters(tableID, graphicFilters) {
    this.tables[tableID].graphicFilters = graphicFilters;
  }

  getGraphicFilters(tableID) {
    const table = this.tables[tableID]
    if ('graphicFilters' in table) return table.graphicFilters;
    else return null;
  }

  resetGraphicFilters(tableID) {
    this.tables[tableID].graphicFilters = null;
  }
}

module.exports = TableManager;
