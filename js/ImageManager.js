/*
    Name:           ImageManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel, Crossing Boundaries project)
    Start-Date:     23/07/19
    Last Change:    24/07/19
    
    Description:    This manager is supposed to handle all image operations, i.e. requesting
                    the images from the internet by a given address, manipulating them (e.g.
                    squeezing them through some neural network) etc.
*/

'use strict'

const https = require('https');
const fs = require('fs');
const { dialog } = require('electron');

class ImageManager {
    constructor(){

    }

    selectImageFromFilesystem() {
        let filepath = dialog.showOpenDialog({
            title: "Select Image",
            filters: [{
                name: "Image Files",
                extensions: ['jpg', 'png']
            }],
            properties: []
        });

        return filepath[0];
    }

    requestImage(url){
        https.get('https://images-na.ssl-images-amazon.com/images/I/71vntClRfjL._SX425_.jpg', (resp) => {
            resp.setEncoding('base64');
            let body = "data:" + resp.headers["content-type"] + ";base64,";
            resp.on('data', (data) => { body += data});
            resp.on('end', () => {
                return body;
                //return res.json({result: body, status: 'success'});
            });
        }).on('error', (e) => {
            console.log(`Got error: ${e.message}`);
        });
    }
}

module.exports = ImageManager;