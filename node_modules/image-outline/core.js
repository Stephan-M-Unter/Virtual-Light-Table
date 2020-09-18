/**
 * Core function used by node, browser, and CLI interfaces
 */

'use strict';

var simplifyLine = require('line-simplify-rdp');
var traceRegion = require('marching-squares');
var extend = require('extend');
var findEdgePoint = require('./find-edge-point.js');
var pixelFns = require('./pixel-fns.js');


/**
 * Synchronously processes the bitmap specified via width, height and getPixel, returning an
 * outline
 * @param {number} width - pixels across
 * @param {number} height - pixels down
 * @param {function} getPixel - function taking params x (0 to width-1), y (0 to height-1) and channel (0=R 1=G 2=B 3=A)
 * @param {object} options - options
 */
module.exports = function(width, height, getPixel, options) {
   if (typeof width !== 'number' || typeof height !== 'number' || typeof getPixel !== 'function')
      throw new TypeError();
   
   options = extend({
      opacityThreshold: 170,
      simplifyThreshold: 1,
      pixelFn: 'opaque'
   }, options || {});
   
   if (typeof options !== 'object')
      throw new TypeError();

   var pixelFn = pixelFns[options.pixelFn];
   if (!pixelFn)
      throw new Error('Invalid pixelFn');

   var opacityThreshold = options.opacityThreshold;
   var isInRegion = function(x, y) {
      if (x < 0 || y < 0 || x >= width || y >= height)
         return false;
      return pixelFn(getPixel, x, y, opacityThreshold);   
   }

   var startPt = findEdgePoint(width, height, isInRegion);
   
   var poly = traceRegion(startPt.x, startPt.y, isInRegion);
   if (options.simplifyThreshold>= 0) {
      poly = simplifyLine(poly, options.simplifyThreshold, true);
   }
   return poly;
}
