'use strict';

/**
 * @module marching-squares
 */

// [dx, dy, is-down-or-right?0:1]
var UP = [0,-1,1],
    DOWN = [0,1,0],
    LEFT = [-1,0,1],
    RIGHT = [1,0,0];

// There are 16 possible 2-by-2 square configurations.
// We number them by adding the shown value when the cell in the square is in the region.
//
// ----------------
// |x-1,y-1| x,y-1|
// |   1   |  2   |
// |---------------
// | x-1,y | x,y  |
// |   4   |  8   | 
// ----------------
//
// The transitions are designed to proceed in a clockwise direction around the region.
// Squares 6 and 9 are ambiguous cases where we need to see which direction the previous
// transition was to avoid getting caught looping around a sub-region forever.

var transitions = [
   null, // 0
   // [direction-if-coming-from-down-or-right, direction-if-coming-from-up-or-left]
   [LEFT, LEFT], // 1
   [UP, UP], // 2
   [LEFT, LEFT], // 3
   [DOWN, DOWN],  // 4
   [DOWN, DOWN],  // 5
   [UP, DOWN],    // 6
   [DOWN, DOWN], // 7
   [RIGHT, RIGHT], // 8
   [RIGHT, LEFT], // 9
   [UP, UP], // 10
   [LEFT, LEFT], // 11
   [RIGHT, RIGHT], // 12
   [RIGHT, RIGHT], // 13
   [UP, UP] // 14
];

/**
 * @alias module:marching-squares.traceImageRegion
 * Trace a closed polygon around a region in a two-dimensional grid. The 
 * isInside function is called to determine if a given point is inside or 
 * outside the region. 
 * 
 * The starting point MUST be on the edge of the region. Specifically this
 * means that among these four calls
 * 1. isInside(x-1, y-1)
 * 2. isInside(x, y-1)
 * 3. isInside(x-1, y)
 * 4. isInside(x,y)
 * At least one must return falsy and at least one must return truthy. If
 * this is not the case, an Error is thrown.
 * 
 * An efficient marching-squares algorithm is used to trace the region,
 * using minimal memory and calling isInside() only as neccessary.
 * 
 * @param {int} x - starting x coordinate. 
 * @param {int} y - starting y coordinate.
 * @param {function} isInside - function with signature isInside(x,y) returning  
 *   truthy if the given point is inside the region to trace (for 
 *   example, it is an opaque pixel in a bitmap) and falsy if it is outside 
 *   (for example, it is transparent). The function should be able to handle 
 *   any x and y including negative values "outside the bitmap" (for which it
 *   should return false).
 * @returns {array[object]} array of point objects with x & y properties tracing
 *   a closed polygon around the region. The first point is NOT repeated 
 *   as the last point. The polygon consists entirely of one-unit-long 
 *   horizontal or vertical segments. Use a polygon simplification routine on 
 *   the results to simplify and/or smooth it.
 *  (Might I suggest https://www.npmjs.com/package/line-simplify-rdp ?)
 */
function traceRegion(x, y, isInside) {
   var startX = x, startY = y;
   var ret = [{x:x, y:y}];
   var dir = DOWN; // arbitrary

 var square = 
      (isInside(x-1, y-1) ? 1 : 0) + 
      (isInside(x, y-1) ? 2 : 0) + 
      (isInside(x-1, y) ? 4 : 0) + 
      (isInside(x, y) ? 8 : 0);
         
   if (square === 0 || square === 15) 
      throw new Error("Bad Starting point.");

   while (true) {
      dir = transitions[square][dir[2]];
      x += dir[0];
      y += dir[1];
      
      if (x === startX && y === startY)
         return ret;
      
      ret.push({x:x, y:y});

      if (dir === DOWN) 
         square = ((square & 12) >> 2);
      else if (dir === UP) 
         square = ((square & 3) << 2); 
      else if (dir === RIGHT) 
         square = ((square & 10) >> 1);
      else if (dir === LEFT) 
         square = ((square & 5) << 1);
         
      if (dir === DOWN || dir === LEFT)
         square += (isInside(x-1, y) ? 4 : 0);
      else   
         square += (isInside(x, y-1) ? 2 : 0);
     
      if (dir === DOWN || dir === RIGHT)
         square += (isInside(x, y) ? 8 : 0);
      else
         square +=  (isInside(x-1, y-1) ? 1 : 0);
    
        
   }
   
}


module.exports = traceRegion;