'use strict';

const { ipcRenderer } = require('electron');

var saves;
const default_folder = "./saves/";

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
    $("#delete").removeClass("disabled");
    $("#thumb_reconstruction").css("display", "inline-block");
    $("#thumb_reconstruction").empty();

    let thumbnail = document.createElement('img');
    thumbnail.src = saves[filename].screenshot;
    document.getElementById('thumb_reconstruction').appendChild(thumbnail);

    $("#load_details").css("display", "inline-block");

    let fragments = saves[filename].fragments;
    
    // Create the load_details_section
    let editors = saves[filename].editors;
    if (editors) { editors.sort(function(a,b){return a[1] - b[1]}); }
    let annots = saves[filename].annots;
    let annot_items;
    if (annots) {
        annot_items = Object.keys(annots).map(function(key){
            return [key, annots[key]];
        });
        annot_items.sort(function(a, b){ return a.time - b.time; });
    }

    let table = document.createElement('table');

    // create filename row
    let filename_body = document.createElement('tbody');
    filename_body.setAttribute('id', 'details_filename');
    let filename_row = document.createElement('tr');
    let filename_td1 = document.createElement('td');
    filename_td1.setAttribute('class', 'label');
    let filename_td2 = document.createElement('td');
    filename_td2.setAttribute('class', 'content');
    filename_td1.appendChild(document.createTextNode("Filename:"));
    filename_td2.appendChild(document.createTextNode(filename));
    filename_row.appendChild(filename_td1);
    filename_row.appendChild(filename_td2);
    filename_body.append(filename_row);
    table.appendChild(filename_body);



    // create editor rows:
    let first_editor = true;
    let editor_body = document.createElement('tbody');
    editor_body.setAttribute('id', 'details_editors');
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
        editor_body.appendChild(editor_row);
    }
    table.appendChild(editor_body);

    // create annotation rows:
    let first_annot = true;
    let annot_body = document.createElement('tbody');
    annot_body.setAttribute('id', 'details_annots');
    for (let idx in annot_items) {
        let annot_id = annot_items[idx][0];
        let annot = annots[annot_id].text;
        let editor = annots[annot_id].editor;
        let time = convertTime(annots[annot_id].time);

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
        annot_body.appendChild(annot_row);
    }
    table.appendChild(annot_body);


    $('#load_details').empty().append(table);

    $("#thumb_list").empty();
    
    try {
        for (const [key, value] of Object.entries(fragments)) {
            let url, rt;
            if (fragments[key].recto ? url = fragments[key].rectoURL : url = fragments[key].versoURL);
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

$("#delete").click(function(){
    // 0. nur etwas machen, wenn der Button überhaupt aktiv ist
    if ($(this).hasClass("disabled")) {
        return false;
    }
    // 1. um welches Savefile geht es?
    let filename = $(".selected").attr("id");
    // 2. Bestätigungsdialog
    let confirmation = confirm("Do you really want to delete this savefile? This action is not revertable.");
    // 3. Nachricht an Server: Save löschen
    if (confirmation) {
        ipcRenderer.send("server-delete-save", filename);
    }
    // [4. Nachricht von Server mit aktuellem Speicherzustand]
});

/* ##########################################
#           SERVER/CLIENT PROTOCOL
###########################################*/

// return-save-files
ipcRenderer.on('return-save-files', (event, savefiles) => {
    $("#save_list_body").empty();
    $("#thumb_list").empty();
    $("#load").addClass("disabled");
    $("#delete").addClass("disabled");
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
        console.log(saves[key]);
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