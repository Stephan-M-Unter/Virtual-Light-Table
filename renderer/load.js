'use strict'

const { ipcRenderer } = require('electron');

var saves;


$(document).ready(function(){
  let default_folder = "./saves";
  $("#folder").val(default_folder);
  ipcRenderer.send('get-save-files', default_folder);
});

$("#select_folder").click(function(){
    $("#folder").val("./saves");
    ipcRenderer.send('get-save-files', $("#folder").val());
});
$("#save_list").on('click', '.save_list_item', function(element){
    $(".save_list_item").removeClass('selected');
    $(this).addClass('selected');
    $("#load").prop("disabled", false);
})

$("#load").click(function(){
    ipcRenderer.send('load-file', (saves[$(".selected").text()]));
});

ipcRenderer.on('save-files', (event, save_files) => {
    $("#save_list").empty();
    $("#load").prop("disabled", true);
    saves = save_files;
    for (const [key, value] of Object.entries(save_files)) {
        $("#save_list").append("<div class='save_list_item' id='"+key+"'>"+key+"</div>");
    }
});