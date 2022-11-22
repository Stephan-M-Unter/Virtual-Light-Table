'use strict';

const fs = require("fs-extra");
const path = require('path');
const process = require('process');
const util = require('util');

class LOGGER {
    static loggerInitialised = false;
    static logfile = null;
    static outputfile = null;

    constructor() {
    };

    static start(vltFolderPath, version) {
        console = new console.Console(process.stdout, process.stderr);

        const logStdout = process.stdout;
        const logStderr = process.stderr;

        LOGGER.logfile = fs.createWriteStream(path.join(vltFolderPath, 'log.txt'), {flags: 'w'});
        LOGGER.outputfile = fs.createWriteStream(path.join(vltFolderPath, 'out.txt'), {flags: 'w'});
        
        console.log = function() {
            LOGGER.logfile.write(util.format.apply(null, arguments)+'\n');
            logStdout.write(util.format.apply(null, arguments)+'\n');
        };
        console.error = function() {
            LOGGER.logfile.write(util.format.apply(null, arguments)+'\n');
            logStderr.write(util.format.apply(null, arguments)+'\n');
        };

                  
        console.log('#########################################################################');
        console.log(`Starting Virtual Light Table, version ${version} - ${this.timestamp()}`);
        console.log('#########################################################################\n');

        LOGGER.loggerInitialised = true;
    }

    static log(source, message) {
        console.log('[%s] - [%s] -', this.timestamp(), source, message);
    };
    static err(source, errorMessage) {
        console.error('##### ERROR ##### [%s] - [%s] -', this.timestamp(), source, errorMessage, '#####');
    }
    static receive(source, ipcMessage, optionalData) {
        if (!optionalData) {
            console.log('[%s] - [%s] - Message received: [%s].', this.timestamp(), source, ipcMessage);
        } else {
            console.log('[%s] - [%s] - Message received: [%s]. Payload:', this.timestamp(), source, ipcMessage, optionalData);
        }
    };
    static send(source, ipcMessage, optionalData) {
        if (!optionalData) {
            console.log('[%s] - [%s] - Sending message: [%s].', this.timestamp(), source, ipcMessage);
        } else {
            console.log('[%s] - [%s] - Sending message: [%s]. Payload:', this.timestamp(), source, ipcMessage, optionalData);
        }
    };

    static timestamp() {
        const time = new Date();
        return time.toLocaleDateString() + ' ' + time.toLocaleTimeString();
    }
}

module.exports = LOGGER;
