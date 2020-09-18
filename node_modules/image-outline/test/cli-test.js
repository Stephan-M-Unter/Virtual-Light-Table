'use strict';

var test = require('tape');
var testData = require('./test-data.js');
var execSync = require('child_process').execSync; 
var EOL = require('os').EOL;

function exec(cmd) {
   return execSync(cmd, {encoding:'utf8'});
}

test('Basic test', function(t) {
   var result = exec('./cmd.js "' + testData.circle48.url + '" -o json');
   t.deepEqual(JSON.parse(result), testData.circle48.expected);
   t.end();
}); 

test('Simplify Threshhold option', function(t) {
   var result = exec('./cmd.js "' + testData.circle48.url + '" -s 10 -o json');
   var points = JSON.parse(result);
   t.ok(points.length < testData.circle48.expected.length, 'Fewer points with larger simplify threshold');
   t.ok(points.length > 1, 'Still some points with larger simplify threshold');
   t.end();
}); 


test('Ouput plain option', function(t) {
   var expected = testData.circle48.expected.map(function(pt) {
      return pt.x + ',' + pt.y + EOL;
   }).join('');

    var result = exec('./cmd.js "' + testData.circle48.url + '"');
    t.deepEqual(result, expected, 'defaults to plain');
    
    result = exec('./cmd.js "' + testData.circle48.url + '" -o plain');
    t.deepEqual(result, expected, 'can specify plain too');
    
    t.end();
});