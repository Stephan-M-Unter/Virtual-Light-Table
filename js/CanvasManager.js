/*
    Name:           CanvasManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     23/07/19
    Last Change:    29/07/19
    
    Description:    This manager is supposed to store all information about the papyri added
                    to the application's canvas and to return them to the view. The manager stores
                    information both about the stage and the canvas items in order to be able
                    to save the whole setup and recreate it.

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

                    Stage:      contains all information about the stage/canvas itself; might be necessary to reproduce
                                the position of fragments with respect to each other
                    Items:      contains all information about the loaded fragments
                    ID:         unique identifier for each fragment, only for internal use; this is not necessarily
                                a name given by TPOP or any other nomenclature, could also be a continous
                                numbering
                    xPos:       x-position of the fragment on the canvas, regarding the center (?) of the image
                    yPos:       y-position of the fragment on the canvas, regarding the center (?) of the image
                    rotation:   float indicating the rotation of a fragment; values from 0 to 180 (1st and 2nd quadrant)
                                and 0 to -180 (3rd and 4th quadrant)
                    recto:      a boolean flag indicating whether the recto or the verso of a fragment is shown
                    rectoURLoriginal:   URL of the original recto image such that it could be reloaded
                    rectoURLlocal:      file path to the locally saved version of the fragment's image
                    meta:       contains all meta information about an object as loaded from the database
*/

'use strict'

class CanvasManager {
    constructor() {
        this.canvasItems = {
            "stage": {},
            "items": {}
        };

    }

    addItem(itemID, itemProps) {
        if (itemID in this.canvasItems["items"]){
            console.log("**CanvasManager** - itemID " + itemID + " already registered!");
            return false;
        } else {
            this.canvasItems["items"][itemID] = itemProps;
            return true;
        }
    }

    removeItem(itemID) {
        if (itemName in this.canvasItems["items"]) {
            delete this.canvasItems["items"][itemID];
            return true;
        } else {
            console.log("**CanvasManager** - itemID " + itemID + " has not been found!");
            return false;
        }
    }

    updateItem(itemID, itemProp, itemValue) {
        if (itemID in this.canvasItems["items"]) {
            this.canvasItems["items"][itemID][itemProp] = itemValue;
            return true;
        } else {
            console.log("**CanvasManager** - itemID " + itemID + " has not been found!");
            return false;
        }
    }

    updateItemLocation(itemID, xPos, yPos, rotation) {
        if (itemID in this.canvasItems["items"]) {
            this.canvasItems["items"][itemID]['xPos'] = xPos;
            this.canvasItems["items"][itemID]['yPos'] = yPos;
            this.canvasItems["items"][itemID]["rotation"] = rotation;
            console.log("**CanvasManager** - updated item " + itemID + ".");
            return true;
        } else {
            console.log("**CanvasManager** - itemID " + itemID + " has not been found!");
            return false;
        }
    }

    getCanvasContent(){
        return this.canvasItems;
    }

    getListOfItems() {
        return Object.keys(this.canvasItems);
    }

    getItemProps(itemID) {
        if (itemID in this.canvasItems) {
            return this.canvasItems[itemID]
        }
    }

    getItemLocation(itemID) {
        if (itemID in this.canvasItems) {
            let item = this.canvasItems["items"][itemID];

            if ("meta" in item) {
                delete item.meta;
            }

            log.console("Item requested:");
            log.console(item);
            return item
        } else {
            return false;
        }
    }

    getCanvasInformation(){
        let items = this.canvasItems["items"];

        for (var item in items) {
            if ("meta" in items[item]) {
                delete items[item].meta;
            }
        }
        return items;
    }

    getStageInformation(){
        console.log(this.canvasItems);
        return this.canvasItems.stage;
    }

    clearItems(){
        this.canvasItems = {
            "stage": {},
            "items": {}
        };
        this.canvasItems.stage.stage_offset = {x: 0, y: 0};
        console.log("**CanvasManager** - Canvas content has been cleared.");
    }

    setCanvasContent(newContent){
        this.canvasItems = newContent;
        this.printCanvasItems();
        return true;
    }

    printCanvasItems(){
        console.log("**CanvasManager** - Current Canvas Content ("+Object.keys(this.canvasItems["items"]).length+" items):")
        console.log(JSON.stringify(this.canvasItems));
    }

    updateStageInformation(stage_update){
        this.canvasItems.stage = stage_update;
        this.printCanvasItems();
    }
}

module.exports = CanvasManager