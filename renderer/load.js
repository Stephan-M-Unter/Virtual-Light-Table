'use strict';

const { ipcRenderer } = require('electron');

var saves;
const default_folder = "./saves";

function select_default_folder(){
    $("#folder").val(default_folder);
    ipcRenderer.send('server-list-savefiles', default_folder);
}

$(document).ready(function(){
    select_default_folder();
});



/* ##########################################
#               INPUT/OUTPUT
###########################################*/

$("#default_folder").click(select_default_folder);

$("#select_folder").click(function(){
    ipcRenderer.send('server-get-saves-folder');
});

$("#save_list").on('click', '.save_list_item', function(element){
    $(".save_list_item").removeClass('selected');
    $(this).addClass('selected');
    $("#load").removeClass("disabled");
    $("#thumb_reconstruction").css("display", "inline-block");
    $("#load_details").css("display", "inline-block");

    let fragments = saves[$(this).attr('id')].fragments;
    
    let editors = '<div>Editors: ' + saves[$(this).attr('id')].editors.join() + '</div>';
    $('#load_details').empty().append(editors);

    $("#thumb_list").empty();
    
    try {
        for (const [key, value] of Object.entries(fragments)) {
            let url, rt;
            if (fragments[key].recto ? url = fragments[key].rectoURLlocal : url = fragments[key].versoURLlocal);
            if (fragments[key].recto ? rt = 'rt' : rt = 'vs');
            let newTile = "<div class='load_thumb'>";
            newTile += "<img class='load_thumb_img' src='"+url+"'>";
            newTile += "<span class='load_thumb_text'>"+fragments[key].name+" ("+rt+")</span>";
            newTile += "</div>";
            $("#thumb_list").append(newTile);
        }
    }
    catch(err) {
        console.log(err);
        $("#thumb_list").append("<div class='error_message'>Save file broken!</div>");
        $("#load").prop("disabled", true);
    }
});

$("#load").click(function(){
    if (!$('#load').hasClass('disabled')){
        ipcRenderer.send('server-load-file', (saves[$(".selected").attr('id')]));
    }
});

/* ##########################################
#           SERVER/CLIENT PROTOCOL
###########################################*/

// return-save-files
ipcRenderer.on('return-save-files', (event, savefiles) => {
    $("#save_list_body").empty();
    $("#thumb_list").empty();
    $("#load").addClass("disabled");
    $('#thumb_reconstruction').css("display", "none");
    $('#load_details').css('display', 'none');
    saves = savefiles;
    for (const [key, value] of Object.entries(savefiles)) {
        let lastEditor = '';
        let numberFragments = '';
        if ('editors' in saves[key]) {
            lastEditor = saves[key].editors.slice(-1)[0];
        }
        if ('fragments' in saves[key]) {
            numberFragments = Object.keys(saves[key].fragments).length;
        }

        let tableRow = "<tr class='save_list_item' id='"+key+"'>";
        tableRow += "<td class='td_filename'>"+key+"</td>";
        tableRow += "<td class='td_fragments'>"+numberFragments+"</td>";
        tableRow += "<td class='td_mtime'>"+saves[key].mtime+"</td>";
        tableRow += "<td class='td_editor'>"+lastEditor+"</tr>";

        $("#save_list_body").append(tableRow);
    }
});

// return-saves-folder
ipcRenderer.on('return-saves-folder', (event, path) => {
    $("#folder").val(path);
    ipcRenderer.send('server-list-savefiles', path);
});