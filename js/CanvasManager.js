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

/**
 * TODO
 */
class CanvasManager {
  /**
     * TODO
     */
  constructor() {
    this.clearAll();
  }

  /**
   * TODO
   * @return {*}
   */
  createFragmentID() {
    // TODO obsolete?
    let id = 'f_' + this.IDcounter;
    this.IDcounter += 1;
    if (id in this.fragments) {
      id = this.createFragmentID();
    }
    return id;
  }

  /**
   * TODO
   */
  clearAll() {
    this.stage = {
      'offset': {'x': 0, 'y': 0},
      'scaling': 100,
    };
    this.fragments = {};
    this.editors = [];
    this.annots = {};
    this.IDcounter = 0;
    this.screenshot = null;
    this.undoSteps = [];
    this.redoSteps = [];
    this.maxSteps = 30;
  }

  /**
   * TODO
   */
  clearFragments() {
    this.fragments = {};
  }

  /**
   * TODO
   * @param {*} fragmentData
   */
  addFragment(fragmentData) {
    // TODO obsolete?
    const id = this.createFragmentID;
    this.fragments[id] = fragmentData;
  }

  /**
   * TODO
   * @param {*} id
   */
  removeFragment(id) {
    delete this.fragments[id];
  }

  /**
   * TODO
   * @param {*} id
   * @param {*} fragmentData
   */
  updateFragment(id, fragmentData) {
    this.fragments[id] = fragmentData;
  }

  /**
   * TODO
   * @param {*} data
   */
  updateAll(data) {
    this.doStep();
    if (data.stage) {
      this.stage = data.stage;
    }
    if (data.fragments) {
      this.fragments = data.fragments;
    }
    if (data.editors) {
      this.editors = data.editors;
    }
    if (data.annots) {
      this.annots = data.annots;
    }
    if (data.IDcounter) {
      this.IDcounter = data.IDcounter;
    }
    if (data.screenshot) {
      this.screenshot = data.screenshot;
    }
  }

  /**
   * TODO
   * @return {*}
   */
  doStep() {
    // starting a new action branch, all redos are deleted
    this.redoSteps = [];

    // saving current configuration as undo step
    const step = {
      stage: this.stage,
      fragments: this.fragments,
      editors: this.editors,
      annots: this.annots,
      IDcounter: this.IDcounter,
      screenshot: this.screenshot,
    };
    this.undoSteps.push(step);

    // if maximum step length is reached, remove first undos
    while (this.undoSteps.length > this.maxSteps) {
      this.undoSteps.shift();
    }

    console.log('Current UndoLog-Size: ', this.undoSteps.length);
    return true;
  }

  /**
   * TODO
   * @return {*}
   */
  undoStep() {
    // return false in case that no undo steps are available
    if (this.undoSteps.length == 0) {
      return false;
    }

    // saving current state as new entry in redoSteps
    const step = {
      stage: this.stage,
      fragments: this.fragments,
      editors: this.editors,
      annots: this.annots,
      IDcounter: this.IDcounter,
      screenshot: this.screenshot,
    };
    this.redoSteps.push(step);
    console.log('Current RedoLog-Size: ', this.redoSteps.length);

    // loading former state
    const data = this.undoSteps.pop();
    if (data.stage) {
      this.stage = data.stage;
    }
    if (data.fragments) {
      this.fragments = data.fragments;
    }
    if (data.editors) {
      this.editors = data.editors;
    }
    if (data.annots) {
      this.annots = data.annots;
    }
    if (data.IDcounter) {
      this.IDcounter = data.IDcounter;
    }
    if (data.screenshot) {
      this.screenshot = data.screenshot;
    }
    return true;
  }

  /**
   * TODO
   * @return {*}
   */
  redoStep() {
    // if there are no redo steps saved, there is nothing we can do
    if (this.redoSteps.length == 0) {
      return false;
    }

    // saving current configuration as undo step
    const step = {
      stage: this.stage,
      fragments: this.fragments,
      editors: this.editors,
      annots: this.annots,
      IDcounter: this.IDcounter,
      screenshot: this.screenshot,
    };
    this.undoSteps.push(step);

    // load first redo step available
    const data = this.redoSteps.pop();
    if (data.stage) {
      this.stage = data.stage;
    }
    if (data.fragments) {
      this.fragments = data.fragments;
    }
    if (data.editors) {
      this.editors = data.editors;
    }
    if (data.annots) {
      this.annots = data.annots;
    }
    if (data.IDcounter) {
      this.IDcounter = data.IDcounter;
    }
    if (data.screenshot) {
      this.screenshot = data.screenshot;
    }
    return true;
  }

  /**
   * TODO
   * @return {*}
   */
  getAll() {
    return {
      'stage': this.stage,
      'fragments': this.fragments,
      'editors': this.editors,
      'annots': this.annots,
      'screenshot': this.screenshot,
      'undoSteps': this.undoSteps.length,
      'redoSteps': this.redoSteps.length,
    };
  }

  /**
   * TODO
   * @return {*}
   */
  getFragments() {
    return this.fragments;
  }

  /**
   * TODO
   * @return {*}
   */
  getStage() {
    return this.stage;
  }

  /**
   * TODO
   * @param {*} id
   * @return {*}
   */
  getFragment(id) {
    return this.fragments[id];
  }

  /**
   * TODO
   * @return {*}
   */
  getEditors() {
    return this.editors;
  }

  /**
   * TODO
   * @return {*}
   */
  getAnnots() {
    return this.annots;
  }

  /**
   * TODO
   * @param {*} data
   */
  setAnnotation(data) {
    this.annots[data.id] = {
      'text': data.text,
      'editor': data.editor,
      'hidden': data.hidden,
      'time': data.time,
    };
  }

  /**
   * TODO
   * @param {*} id
   */
  removeAnnotation(id) {
    delete this.annots[id];
  }

  /**
   * TODO
   * @param {*} file
   */
  loadFile(file) {
    this.clearAll();
    this.doStep();
    this.stage = file.stage;
    this.fragments = file.fragments;
    if (file.editors) this.editors = file.editors;
    if (file.annots) this.annots = file.annots;
  }

  /**
   * TODO
   * @param {*} editor
   */
  addEditor(editor) {
    const timeMs = new Date().getTime();
    this.editors.push([editor, timeMs]);
  }

  /**
   * TODO
   */
  updateEditor() {
    const lastEditor = this.editors.pop();
    const timeMs = new Date().getTime();
    this.editors.push([lastEditor[0], timeMs]);
  }

  /**
   * TODO
   * @param {*} screenshot
   */
  setScreenshot(screenshot) {
    this.screenshot = screenshot;
  }

  /**
   * TODO
   * @return {*}
   */
  getScreenshot() {
    return this.screenshot;
  }
}

module.exports = CanvasManager;
