var test = require("tape");
var trace = require(".");

function Grid() {
   this.rows = [];
   for (var i=0; i < arguments.length; i++) {
      this.rows.push(arguments[i]);
   }
}

Grid.prototype.get = function(x,y) {
   var row = this.rows[y];
   if (!row)
      return false;
   return row.charAt(x) === 'X';      
};

function minimizePts(pts) {
   var ret = [];
   pts.forEach(function(pt) {
      ret.push(pt.x, pt.y);      
   });
   return ret;
}

test("one pixel", function(t) {
   t.plan(1);
   var grid = new Grid(
      '...',
      '.X.',
      '...'
   );
   
   var results = trace(1,1,grid.get.bind(grid));
   t.deepEquals(minimizePts(results), [1,1, 2,1, 2,2, 1,2]);
});

test("x", function(t) {
   t.plan(1);
   var grid = new Grid(
      'X....X',
      '.X..X',
      '..XX',
      '..XX',
      '.X..X',
      'X....X'
   );
   
   var results = trace(0,0,grid.get.bind(grid));
   t.deepEquals(minimizePts(results), [0,0, 1,0, 1,1, 2,1, 2,2, 3,2, 4,2, 4,1, 5,1, 5,0, 6,0, 6,1, 5,1, 5,2, 4,2, 4,3, 4,4, 5,4, 5,5, 6,5, 6,6, 5,6, 5,5, 4,5, 4,4, 3,4, 2,4, 2,5,
   1,5, 1,6, 0,6, 0,5, 1,5, 1,4, 2,4, 2,3, 2,2, 1,2, 1,1, 0,1]);
      
   
});

test("C", function(t) {
   t.plan(1);
   var grid = new Grid(
      '.XXXX.',
      'XXX.XX',
      'XX..XX',
      'XX....',
      'XXXXXX',
      '.XXXX.'
   );
   
   var results = trace(1,1,grid.get.bind(grid));
   t.deepEquals(minimizePts(results), [1,1, 1,0, 2,0, 3,0, 4,0, 5,0, 5,1, 6,1, 6,2, 6,3, 5,3, 4,3, 4,2, 4,1, 3,1, 3,2, 2,2, 2,3, 2,4, 3,4, 4,4, 5,4, 6,4, 6,5, 5,5, 5,6, 4,6, 3,6, 2,6, 1,6, 1,5,
   0,5, 0,4, 0,3, 0,2, 0,1]);
      
   
});