'use strict';

var test = require('tape');
var getImageOutline = require('..');
var testData = require('./test-data.js');

test('Basic test', function(t) {
   getImageOutline(testData.circle48.url, function(err, pts) {
      if (err) {
         t.fail('error ' + err.toString());
      }   
      else {
         t.deepEqual(pts, testData.circle48.expected, 'Points are correct.');
      }
      t.end();
   });
});

test('Pass empty options', function(t) {
   getImageOutline(testData.circle48.url, {}, function(err, pts) {
      if (err) {
         t.fail('error ' + err.toString());
      }   
      else {
         t.deepEqual(pts, testData.circle48.expected, 'Points are correct.');
      }
      t.end();
   });
});

test('Bad params', function(t) {
   t.throws(function() {
      getImageOutline();
   }, /Bad argument count/, 'No arguments is bad');
   
   t.throws(function() {
      getImageOutline(testData.circle48.url);
   }, /Bad argument count/, 'One argument is bad');
   
   t.throws(function() {
      getImageOutline(testData.circle48.url, {}, function() {}, 12);
   }, /Bad argument count/, 'More than three argument is bad');
   
   t.throws(function() {
      getImageOutline(testData.circle48.url, false);
   }, TypeError);
   
   t.throws(function() {
      getImageOutline(testData.circle48.url, false, function() {});
   }, TypeError);
   
   t.end();
});