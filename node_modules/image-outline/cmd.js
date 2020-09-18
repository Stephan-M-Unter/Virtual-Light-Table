#!/usr/bin/env node

/**
 * CLI interface
 */ 

'use strict';
var nomnom = require('nomnom'); // Options parser
var getImageOutline = require('./node.js'); // Node interface
var pixelFnNames = Object.keys(require('./pixel-fns.js')); // Available pixelFns
var EOL = require('os').EOL; // \n or \r\n on Windows


function validateNumber(name, num) {
   if (!isFinite(num)) {
      return name + " must be a number";
   }
}

/*
 * Output functions, each takes a stream and an array of {x,y} objects
 */

var outputters = {
   
   json: function(stream, poly) {
      stream.write(JSON.stringify(poly));
      stream.write('\n');   
   },
   
   plain: function(stream, poly) {
      poly.forEach(function(pt) {
         stream.write(pt.x + ',' + pt.y + EOL);
      });   
   }
};

var outputterNames = Object.keys(outputters);

nomnom.script('imageoutline').nocolors();

nomnom.options({
   path: {
      position: 0,
      help: 'Filename or URL',
      required: true
   },
   
   imageThreshold: {
      abbr: 'i',
      full: 'image-threshold',
      default: 170,
      help: 'Image Threshold (number)',
      callback: validateNumber.bind(null, "--image-threshold")
   },
   
   simplifyThreshold: {
      abbr: 's',
      full: 'simplify-threshold',
      default: '1',
      help: 'Line Simplification Threshold (number)',
      callback: validateNumber.bind(null, "--simplify-threshold")
   },
   
   pixelFn: {
     abbr: 'p',
     full: 'pixel-fn',
     default: 'opaque',
     help: 'How to determine if pixel is inside region - ' + pixelFnNames.join(', '),
     choices: pixelFnNames
   },
   
   output: {
      abbr: 'o',
      default: 'plain',
      choices: outputterNames,
      help: 'Output format - ' + outputterNames.join(', ')
   }
   
});


var options = nomnom.nom();

// Asychrounously get the image outline
getImageOutline(options.path, options, function(err, poly) {
   if(err) {
      // Fail out if there was an error
      process.stderr.write(err.toString() + '\n');
      process.exit(1);
   }
   
   // Output the results to stdout if it succeeded
   outputters[options.output](process.stdout, poly);
});


