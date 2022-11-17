'use strict';

class ContentManagerInterface {
    constructor() {
        if (!this.loadData) throw new Error('ERROR - loadData() not implemented (requirement for ContentManagerInterface).');
        if (!this.sortByName) throw new Error('ERROR - sortByName() not implemented (requirement for ContentManagerInterface).');
    }
}

module.exports.ContentManagerInterface = ContentManagerInterface;
