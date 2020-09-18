# image-outline

Let's say you have a .png of a cow, with a transparent background. How many
times have you asked yourself how you can get a polygon outline of the cow
from that? Well, maybe it will come up someday if you are working on:

1. Some sort of cow-outlining graphics demo
2. Some kind of 2-D physics simulation of static-body cows (hey, that's how
   I came to this).
3. I'm sure there are many other applications.

Well, now you are in luck. This module -- usable as a node module, in the 
browser, or on the command line -- can quickly and easily generate a polygon
from any image of a cow.

It also works on images of things other than cows.

## In node.js

When running in the node environment, image-outline uses 
[get-pixels](https://www.npmjs.com/package/get-pixels) to asynchronously
load the image, from a file or an URL. 

Run

```
npm install --save image-outline
```

Then in your javascript

```javascript
var getImageOutline = require('image-outline');

// Point getImageOutline at a relative file path or an URL to an image
// preferably one showing a PNG, with a transparent background, maybe of a cow. 

getImageOutline('http://www.cow.pics/cow.png', function(err, polygon) {
   if (err) {
      // err is an Error; handle it
      return;
   }
   
   // polygon is now an array of {x,y} objects. Have fun!
};
```

## From the Browser

The browser version of the getImageOutline function takes a DOM Image Element
(an HTMLImageElement), which must already be done loading its content, and
synchronously returns a polygon.

Behind-the-scenes, an HTML5 canvas is used to extract pixel data from the image,
so this isn't going to work in Internet Explorer 8 or earlier.

### With browserify

Run

```
npm install --save image-outline
```

Then in your javascript

```javascript
var getImageOutline = require('image-outline');

// Get your hands on a loaded HTMLImageElement, preferably one showing a PNG,
// with a transparent background, maybe of a cow. 
var imageElement = new Image();
image.href = 'http://www.cow.pics/cow.png';
image.onload = function() {
   var polygon = getImageOutline(image);
   // polygon is now an array of {x,y} objects. Have fun!
};
```

Then browserify your whole shebang and... well, you don't need me to tell you
how browserify works.

### Without browserify

Not using [browserify](http://browserify.org/) yet? It's fun: it lets you have
all the luxuries of [npm](https://www.npmjs.com/) in for-the-browser code. No?
OK, no problem, the stand-alone prebuilt UMD version of image-outline will work
in an AMD (requireJS) or vanilla JavaScript environment.

I will show only the vanilla JavaScript example here and trust that folks 
using requireJS know how to require a module.

Grab a copy of image-outline-min.js and put it somewhere your stuff can access.

In your html:

```html
<script src="path/to/image-outline-min.js"></script>
```

(Manually maintaining script links in html is one reason you're always feeling 
so much pressure to use RequireJS or Browserify or something.)

This has added the getImageOutline function to the global window object. (Which
is a little gross, another reason you're always feeling so much pressure to
use RequireJS or Browserify or something.)

So now your JavaScript can work like this:

```javascript
// Get your hands on a loaded HTMLImageElement, preferably one showing a PNG,
// with a transparent background, maybe of a cow. 
var imageElement = new Image();
image.href = 'http://www.cow.pics/cow.png';
image.onload = function() {
   var polygon = getImageOutline(image);
   // polygon is now an array of {x,y} objects. Have fun!
};
```

## CLI

A command-line utility is available when you're working in the npm environment.

Run
```
npm install -g image-outline
```

To make imageoutline available as a globally-installed CLI module. (Pro tip:
don't. Install it locally with --save-dev instead, and reference it from your
package.json's "scripts" field instead.)

Then you can run
```
imageoutline http://www.cow.pics/cow.png
```

And get back a series of newline-separated x,y pairs on stdout.





