'use strict'

const { ipcRenderer } = require('electron');

var saves;
const default_folder = "./saves";

function select_default_folder(){
    $("#folder").val(default_folder);
    ipcRenderer.send('request-save-files', default_folder);
}

$(document).ready(function(){
    select_default_folder();
});

$("#select_folder").click(function(){
    ipcRenderer.send('request-saves-folder');
});

$("#default_folder").click(select_default_folder);

ipcRenderer.on('return-saves-folder', (event, path) => {
    $("#folder").val(path);
    ipcRenderer.send('request-save-files', path);
})

$("#save_list").on('click', '.save_list_item', function(element){
    $(".save_list_item").removeClass('selected');
    $(this).addClass('selected');
    $("#load").prop("disabled", false);

    let items = saves[$(this).attr('id')]['items'];

    $("#thumb_list").empty();
    
    try {
        for (const [key, value] of Object.entries(items)) {
            $("#thumb_list").append("<div class='load_thumb'>"+items[key]['name']+"</div>");
        }
    }
    catch(err) {
        $("#thumb_list").append("<div class='error_message'>Save file broken!</div>");
        $("#load").prop("disabled", true);
    }
})

$("#load").click(function(){
    ipcRenderer.send('load-file', (saves[$(".selected").attr('id')]));
});

ipcRenderer.on('return-save-files', (event, save_files) => {
    $("#save_list_body").empty();
    $("#thumb_list").empty();
    $("#load").prop("disabled", true);
    saves = save_files;
    console.log(saves);
    for (const [key, value] of Object.entries(save_files)) {
        let last_editor = '';
        let number_fragments = '';
        if ('editors' in saves[key]) {
            last_editor = saves[key]['editors'].slice(-1)[0];
        }
        if ('items' in saves[key]) {
            number_fragments = Object.keys(saves[key]['items']).length;
        }

        let table_row = "<tr class='save_list_item' id='"+key+"'>";
        table_row += "<td class='td_filename'>"+key+"</td>";
        table_row += "<td class='td_fragments'>"+number_fragments+"</td>";
        table_row += "<td class='td_mtime'>"+saves[key]['mtime']+"</td>";
        table_row += "<td class='td_editor'>"+last_editor+"</tr>";

        $("#save_list_body").append(table_row);
    }
});