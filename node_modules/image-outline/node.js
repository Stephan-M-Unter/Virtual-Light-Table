/**
 * Nodejs interface
 */ 

'use strict';

var core = require('./core.js');
var getPixels = require('get-pixels');

/**
 * @param {String|Buffer} urlOrPath url, path or buffer to pass to getPixels
 * @param2 {Object|function} Options object or done function
 * @param3 {function|unpassed} done function if @param2 was options object
 */
module.exports = function(urlOrPath, param2, param3) {
   var done, options;
   var nArgs = arguments.length;
   if (nArgs === 2) {   
      done = param2;
      options = null;
   }
   else if (nArgs === 3) {
      options = param2;
      done = param3;
   }
   else {
      throw new Error('Bad argument count: getImageOutline(urlOrPath, [options], done)');
   }
   
   if (typeof done !== 'function' || typeof options !== 'object') 
      throw new TypeError('Invalid Argument');
   
   getPixels(urlOrPath, function(err, pixels) {
      if (err) {
         done(err);
         return;
      }
      
      if (pixels.shape.length !== 3 || pixels.shape[2] !== 4)
      {
         done(new Error('Image must be a normal RGBA image.'));
         return;
      }
      
      var getPixel = pixels.get.bind(pixels);
      var points = core(pixels.shape[0], pixels.shape[1], getPixel, options);
      done(null, points);
   });
   
};