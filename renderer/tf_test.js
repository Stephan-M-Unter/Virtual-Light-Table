const {loadGraphModel} = require("@tensorflow/tfjs-converter");

async function load_model(){
    const MODEL_URL = "../tf_models/binet-04/model.json";
    const model = await loadGraphModel(MODEL_URL);
    return model;
}

async function load_image(img_data){
    var img = tf.browser.fromPixels(img_data);
    img = img.div(255);
    img = img.expandDims(axis=0);
    return img;
}

async function pipeline(img_data, canvas){
    var model = await load_model();
    var img = await load_image(img_data);
    var prediction = await model.predict(img);
    prediction = await prediction.squeeze();
    prediction = await prediction.clipByValue(0, 1);

    const threshold = 0.7;
    const thresholds = tf.fill([256,256], threshold);
    var thresholdedPrediction = prediction.greater(thresholds);
    var temp = tf.fill([256,256],0);
    var result = tf.fill([256,256],1);

    result = result.where(thresholdedPrediction, temp);

    prediction = await tf.browser.toPixels(result, canvas);
    console.log(prediction);
}

$(document).ready(function(){
})