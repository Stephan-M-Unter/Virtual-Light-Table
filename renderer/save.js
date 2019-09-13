'use strict'

const { ipcRenderer } = require('electron');

var filename_pattern = new RegExp(/[\w]+/g);

$(document).ready(function(){
    let now = new Date();
    let date = now.getFullYear()+"-"+now.getMonth()+"-"+now.getDate();
    let visible_date = n(now.getDate()) + "." + n(now.getMonth()) + "." + n(now.getFullYear());
    let time = now.getHours()+"h"+now.getMinutes()+"m"+now.getSeconds()+"s";
    let visible_time = n(now.getHours()) + ":" + n(now.getMinutes()) + ":" + n(now.getSeconds());

    $("#date").html(visible_date);
    $("#time").html(visible_time);
});

$("#filedialog").click(function(){
    send_message('get-folder');
});

$('#clearpath').click(function(){
    $('#path').val("<Saved In Remote Location (Liège)>");
});

$('#filename').keyup(function(){
    let checkvalue = filename_pattern.test($('#filename').val());
    console.log(checkvalue);
    if (checkvalue) {
        $('#filename').css("background-color", "green");
    } else if ($("#filename").val() == "") {
        $('#filename').css("background-color", "rgb(216,224,228)");
    } else {
        $('#filename').css("background-color", "red");
    }
});

function n(n){
    return n > 9 ? "" + n: "0" + n;
}

function send_message(code){
    let acceptedMessages = [
        'clear-table',
        'save-table',
        'load-table',
        'hor-flip',
        'vert-flip',
        'duplicate',
        'update-canvas',
        'get-folder'
    ]
    console.log("Sending message with code \'" + code + "\' to main process.");
    if (acceptedMessages.indexOf(code) >= 0) {
        ipcRenderer.send(code);
    } else {
        console.log("Error: the code \'" + code + "\' has not been recognised.");
    }
};

function send_message_with_data(code, data){
    console.log("Sending message with code \'" + code + "\' including additional data to main process.")
    ipcRenderer.send(code, data);
}

ipcRenderer.on('send-folder', (event, filepath) => {
    $("#path").val(filepath);
});