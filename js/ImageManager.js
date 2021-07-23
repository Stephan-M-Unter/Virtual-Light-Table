/*
    Name:           ImageManager.js
    Version:        0.1
    Author:         Stephan M. Unter (University of Basel,
                        Crossing Boundaries project)
    Start-Date:     23/07/19

    Description:    This manager is supposed to handle all image operations,
                    i.e. requesting the images from the internet by a given
                    address, manipulating them (e.g. squeezing them through
                    some neural network) etc.
*/

'use strict';

const {dialog} = require('electron');

/**
 * TODO
 */
class ImageManager {
  /**
   * TODO
   */
  constructor() {}

  /**
   * TODO
   * @return {String}
   */
  selectImageFromFilesystem() {
    const filepath = dialog.showOpenDialogSync({
      title: 'Select Image',
      filters: [{
        name: 'Image Files',
        extensions: ['jpg', 'jpeg', 'png', 'tif', 'tiff'],
      }],
      properties: ['openFile', 'treatPackageAsDirectory'],
    });
    // TODO: man könnte hier auch mit dialog.showOpenDialog
    // arbeiten; die Parameter sind die gleichen, aber der
    // main process würde nicht durch den open dialog blockiert
    // werden. Als Ergebnis gibt es ein promise-Object, das dann
    // vermutlich durch eine callback-Funktion abgefangen werden
    // müssen. Quelle: https://www.electronjs.org/docs/api/dialog.

    if (filepath) {
      /*

      TODO

      Image Conversion

      WENN es sich bei dem Bild um ein TIF(F) handelt, muss es in ein brauchbares Format
      verwandelt werden, d.h. JPG oder PNG. An dieser Stelle liegt der korrekte Dateipfad
      vor und das Bild kann somit geladen, konvertiert und später an anderer Stelle (z.B. im
      dafür vorzusehenden IMG-Folder) abgelegt werden. Der Filepfad filepath muss entsprechend
      auf das neue, von Webtechnologien darstellbare Bild abgeändert werden.

      TODO

      Image Reduction

      An dieser Stelle kann auch eine Veränderung des ausgewählten Bildes vorgenommen werden. Wenn
      die Dateigröße des Bildes einen gewissen Schwellenwert überschreitet (wäre noch zu definieren),
      dann wird das Bild an dieser Stelle geladen, reduziert und in kleinerer Fassung an anderer
      Stelle (!) abgespeichert. WICHTIG: Es muss sichergestellt sein, dass das Original durch diesen
      Prozess NICHT überschrieben wird! Einzige Ausnahme: Es handelt sich bei dem zu reduzierenden Bild
      um das Ergebnis des Konversionsvorgangs weiter oben. Dann wäre das Original nicht tangiert und
      eine doppelte Speicherung würde bedeuten, das Bild unnötig zu duplizieren.

      */
      return filepath[0];
    } else {
      return null;
    }
  }

  /* CURRENTLY NOT USED

  requestImage(url){
    https.get('', (resp) => {
      resp.setEncoding('base64');
      let body = 'data:' + resp.headers['content-type'] + ';base64,';
      resp.on('data', (data) => { body += data});
      resp.on('end', () => {
        return body;
        //return res.json({result: body, status: 'success'});
      });
    }).on('error', (e) => {
      console.log(`Got error: ${e.message}`);
    });
  }
  */
}

module.exports = ImageManager;
