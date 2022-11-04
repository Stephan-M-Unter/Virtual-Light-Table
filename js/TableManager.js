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

const Table = require("./Table");

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
    this.tables[tableID] = new Table(tableID);
  }

  /**
   * Creates a new table by defining a new tableID and storing a completely fresh and empty
   * table configuration. Returns the new table's tableID, e.g. "table_1".
   * @param {[String]} tableID - optional: tableID, if you already want to give it
   * @return {String}
   */
  createNewTable(tableID) {
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
    const emptyTable = new Table(newTableID);
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
    if (tableID in this.tables) {
      return this.tables[tableID].hasFragments();
    } else {
      return false;
    }
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
      return this.tables[tableID].getTable();
    }
  }

  /**
   * Special variant of the getTable() function to only read the most basic information needed to
   * display a table on the client.
   * @param {String} tableID
   * @return {Object}
   */
  getInactiveTable(tableID) {
    if (tableID in this.tables) {
      return this.tables[tableID].getTableBasics();
    } else {
      return null;
    }
  }

  /**
   * Return everything.
   * @return {Object}
   */
  getTables() {
    const tables = {};
    for (const tableID of Object.keys(this.tables)) {
      if (tableID) {
        const tableContent = this.tables[tableID].getTable();
        tables[tableID] = tableContent;
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
    if (tableID in this.tables) {
      this.tables[tableID].clearFragments();
    }
  }

  /**
   * Deletes all information about the stage stored so far and replaces it with the default setting.
   * @param {String} tableID ID of table to clear, e.g. "table_1".
   */
  clearStage(tableID) {
    if (tableID in this.tables) {
      this.tables[tableID].clearStage();
    }
  }

  /**
   * Receives a table object containing the new table configuration and overwrites the pre-existing state. While
   * doing so, a "step" is performed that is saved in the "undoSteps" and could be access via "undoStep()".
   * @param {String} tableID ID of table to act on, e.g. "table_1".
   * @param {Object} tableData Object containing all relevant information for one table.
   * @param {[Boolean]} skipStepping optional; if TRUE, skip the do step, if FALSE, make a do step.
   * Default (when not given): FALSE.
   */
  updateTable(tableID, tableData, skipStepping) {
    if (tableID in this.tables) {
      this.tables[tableID].updateTable(tableData, skipStepping);
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
    // TODO - REMOVE?
    if (tableID in this.tables) {
      this.tables[tableID].saveStep();
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
    if (tableID in this.tables) {
      return this.tables[tableID].undo();
    }
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
    if (tableID in this.tables) {
      return this.tables[tableID].redo();
    }
  }

  /**
   * Returns an Object with object.undoSteps and object.redoSteps, two integers indicating the number
   * of available undo and redo steps for this table.
   * @param {String} tableID ID of table to count available undo and redo steps for, e.g. "table_1".
   * @return {Object}
   */
  getRedoUndo(tableID) {
    if (tableID in this.tables) {
      return this.tables[tableID].getStepNumbers();
    }
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
    if (tableID in this.tables) {
      this.tables[tableID].addAnnotation(annotation);
    }
  }
  
  /**
   * Removes a specific annotation with aID from the table with tableID.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {String} aID D
   */
  removeAnnotation(tableID, aID) {
    if (tableID in this.tables) {
      this.tables[tableID].removeAnnotation(aID);
    }
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
    this.updateTable(tableID, tableData)
  }

  /**
   * Adds a new editor to the current savefile, including the current time in milliseconds since 01/01/1970.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {String} editor Name or initials of editor to add to the collection.
   */
  addEditor(tableID, editor) {
    if (tableID in this.tables) {
      this.tables[tableID].addEditor(editor);
    }
  }

  /**
   * Updates the information on the current (i.e. last) editor in the editors' list, together
   * with a new timestamp.
   * @param {String} tableID ID of table, e.g. "table_1".
   */
  updateEditor(tableID) {
    if (tableID in this.tables) {
      this.tables[tableID].updateEditor();
    }
  }

  /**
   * Save a new screenshot to the table with tableID.
   * @param {String} tableID ID of table, e.g. "table_1".
   * @param {*} screenshot
   */
  setScreenshot(tableID, screenshot) {
    if (tableID in this.tables) {
      this.tables[tableID].setScreenshot(screenshot);
    }
  }

  getTPOPIds(tableID) {
    if (tableID in this.tables) {
      return this.tables[tableID].getTPOPIDs();
    }
  }

  setGraphicFilters(tableID, graphicFilters) {
    if (tableID in this.tables) {
      this.tables[tableID].setGraphicFilters(graphicFilters);
    }
  }

  getGraphicFilters(tableID) {
    if (tableID in this.tables) {
      return this.tables[tableID].getGraphicFilters();
    }
  }

  resetGraphicFilters(tableID) {
    if (tableID in this.tables) {
      this.tables[tableID].clearGraphicFilters();
    }
  }
}

module.exports = TableManager;
