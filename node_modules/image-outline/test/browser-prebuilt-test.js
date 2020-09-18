'use strict';

var test = require('tape');
var testData = require('./test-data.js');

test('Basic test', function(t) {

   // Create script tag which we'll use to load up prebuilt script
   var script = document.createElement('script');
   
   script.onerror = function() {
      t.fail('Failed to load ' + script.src);
      t.end();
   };
   
   script.onload = function() {
      t.equal(typeof(window.getImageOutline), 'function', 'getImageOutline is a function in global window object.');
   
      var image = new Image();
      image.onload = function() {
         var pts = window.getImageOutline(image);
         t.deepEqual(pts, testData.circle48.expected, 'Points are correct.');
         t.end();
      };
      
      image.src = testData.circle48.url;
   };
   
   // Set up the script tag's src document and add it to the <head>
   // This will work only if we are testing within a web server that serves up static files. We currently do this by passing the --static flag to our tape-run command.
   script.src = '/dest/image-outline-min.js';
   document.head.appendChild(script);
});