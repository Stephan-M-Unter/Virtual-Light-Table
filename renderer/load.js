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


function convertTime(milliseconds){
    let time = new Date(milliseconds);

    let year = time.getFullYear();
    let month = ((time.getMonth()+1) < 10 ? '0' : '') + (time.getMonth()+1);
    let day = (time.getDate() < 10 ? '0' : '') + time.getDate();

    let hour = time.getHours();
    let minute = (time.getMinutes() < 10 ? '0' : '') + time.getMinutes();
    let second = (time.getSeconds() < 10 ? '0' : '') + time.getSeconds();

    return day+"."+month+"."+year+", "+hour+":"+minute+":"+second;
}


/* ##########################################
#               INPUT/OUTPUT
###########################################*/

$("#default_folder").click(select_default_folder);

$("#select_folder").click(function(){
    ipcRenderer.send('server-get-saves-folder');
});

$("#save_list").on('click', '.save_list_item', function(){
    let filename = $(this).attr('id');
    $(".save_list_item").removeClass('selected');
    $(this).addClass('selected');
    $("#load").removeClass("disabled");
    $("#thumb_reconstruction").css("display", "inline-block");
    $("#load_details").css("display", "inline-block");

    let fragments = saves[filename].fragments;
    
    // Create the load_details_section
    let editors = saves[filename].editors;
    console.log(Array.from(editors));
    editors.sort(function(a,b){return a[1] - b[1]});
    console.log(editors);
    let annots = saves[filename].annots;
    annots = annots.sort(function(a,b){return a[1] - b[1]});

    let table = document.createElement('table');

    // create filename row
    let filename_row = document.createElement('tr');
    let filename_td1 = document.createElement('td');
    filename_td1.setAttribute('class', 'label');
    let filename_td2 = document.createElement('td');
    filename_td2.setAttribute('class', 'content');
    filename_td1.appendChild(document.createTextNode("Filename:"));
    filename_td2.appendChild(document.createTextNode(filename));
    filename_row.appendChild(filename_td1);
    filename_row.appendChild(filename_td2);
    table.appendChild(filename_row);



    // create editor rows:
    let first_editor = true;
    for (let idx in editors) {
        let editor = editors[idx][0];
        let time = convertTime(editors[idx][1]);

        let editor_row = document.createElement('tr');
        let editor_td1 = document.createElement('td');
        editor_td1.setAttribute('class', 'label');
        let editor_td2 = document.createElement('td');
        editor_td2.setAttribute('class', 'content');
        if (first_editor) {
            first_editor = false;
            editor_row.setAttribute('class', 'first_row');
            editor_td1.appendChild(document.createTextNode("Last Editors:"));
        }
        editor_td2.appendChild(document.createTextNode("\u2022 " + editor + " (" + time + ")"));
        editor_row.appendChild(editor_td1);
        editor_row.appendChild(editor_td2);
        table.appendChild(editor_row);
    }

    // create annotation rows:
    let first_annot = true;
    for (let idx in annots) {
        let annot = annots[idx][2];
        let editor = annots[idx][0];
        let time = convertTime(annots[idx][1]);

        let annot_row = document.createElement('tr');
        let annot_td1 = document.createElement('td');
        annot_td1.setAttribute('class', 'label');
        let annot_td2 = document.createElement('td');
        annot_td2.setAttribute('class', 'content');
        if (first_annot) {
            first_annot = false;
            annot_row.setAttribute('class', 'first_row');
            annot_td1.appendChild(document.createTextNode("Annotations:"));
        }
        annot_td2.appendChild(document.createTextNode("\u2022 " + annot + " (" + editor + ", " + time + ")"));
        annot_row.appendChild(annot_td1);
        annot_row.appendChild(annot_td2);
        table.appendChild(annot_row);
    }


    $('#load_details').empty().append(table);

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
        $('#thumb_reconstruction').css("display", "none");
        $('#load_details').css('display', 'none');
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
        tableRow += "<td class='td_mtime'>"+convertTime(saves[key].mtime)+"</td>";
        tableRow += "<td class='td_editor'>"+lastEditor[0]+"</tr>";

        $("#save_list_body").append(tableRow);
    }
});

// return-saves-folder
ipcRenderer.on('return-saves-folder', (event, path) => {
    $("#folder").val(path);
    ipcRenderer.send('server-list-savefiles', path);
});