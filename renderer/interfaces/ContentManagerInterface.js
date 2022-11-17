'use strict';

class ContentManagerInterface {
    constructor() {
        if (!this.initialiseData) throw new Error('ERROR - initialiseData() not implemented (requirement for ContentManagerInterface).');
        if (!this.sortByName) throw new Error('ERROR - sortByName() not implemented (requirement for ContentManagerInterface).');
        if (!this.getData) throw new Error('ERROR - getData() not implemented (requirement for ContentManagerInterface).');
        if (!this.filterData) throw new Error('ERROR - filterData() not implemented (requirement for ContentManagerInterface).');
    }
}

module.exports.ContentManagerInterface = ContentManagerInterface;
