'use strict';

class LOGGER {
    constructor() {};

    static log(message) {
        console.log('[%s]', this.timestamp(), message);
    };
    static err(errorMessage) {
        console.error('[%s] ', this.timestamp(), errorMessage)
    }
    static receive(ipcMessage, optionalData) {
        if (!optionalData) {
            console.log('[%s] Message received: [%s].', this.timestamp(), ipcMessage);
        } else {
            console.log('[%s] Message received: [%s]. Payload:', this.timestamp(), ipcMessage, optionalData);
        }
    };
    static send(ipcMessage, optionalData) {
        if (!optionalData) {
            console.log('[%s] Sending message: [%s].', this.timestamp(), ipcMessage);
        } else {
            console.log('[%s] Sending message: [%s]. Payload:', this.timestamp(), ipcMessage, optionalData);
        }
    };

    static timestamp() {
        const time = new Date();
        return time.toLocaleDateString() + ' ' + time.toLocaleTimeString();
    }
}

module.exports = LOGGER;
