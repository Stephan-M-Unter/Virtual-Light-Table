'use strict';

var test = require('tape');
var getImageOutline = require('..');
var testData = require('./test-data.js');

test('Basic test', function(t) {
   var image = new Image();
   image.onload = function() {
      var pts = getImageOutline(image);
      t.deepEqual(pts, testData.circle48.expected, 'Points are correct.');
      t.end();
   };
   
   image.src = testData.circle48.url;
   
});
