'use strict';

const {ipcRenderer} = require('electron');
const {Util} = require('./classes/Util');
const LOGGER = require('../statics/LOGGER');

let saves;
let currentSave;
let defaultFolder;

/**
 * TODO
 */
function selectDefaultFolder() {
  $('#folder').val(defaultFolder);
  LOGGER.send('server-list-savefiles', defaultFolder);
  ipcRenderer.send('server-list-savefiles', defaultFolder);
}

$(document).ready(function() {
  LOGGER.send('server-ask-load-folders');
  ipcRenderer.send('server-ask-load-folders');
});

/**
 * TODO
 */
function deleteSavefile() {
  if ($('.selected').length > 0) {
    // 1. um welches Savefile geht es?
    const filename = $('.selected').attr('id');
    // 2. Bestätigungsdialog
    const confirmation = confirm('Do you really want to delete '+
            'this savefile? This action is irreversible.');
      // 3. Nachricht an Server: Save löschen
    if (confirmation) {
      // 3.1. aktuellen Detaileintrag löschen
      currentSave = null;
      $('#right_area').css('visibility', 'hidden');
      $('#thumb_list').empty();
      LOGGER.send('server-delete-file', filename);
      ipcRenderer.send('server-delete-file', filename);
    }
    // [4. Nachricht von Server mit aktuellem Speicherzustand]
  }
}

/**
 * TODO
 */
function clearSearch() {
  $('#fragment_search').val('');
}

/**
 * TODO
 */
function exportSavefile() {
  if ($('.selected').length == 1) {
    const filename = $('.selected').attr('id');
    LOGGER.send('server-export-file', filename);
    ipcRenderer.send('server-export-file', filename);
  }
}


/**
 * TODO
 * @param {*} searchString
 */
function updateSaveList(searchString) {
  $('#save_list_body').empty();
  $('#load').addClass('disabled');
  $('#delete').addClass('disabled');
  $('#export').addClass('disabled');

  let nrHidden = 0;

  for (const [key, value] of Object.entries(saves)) {
    let valid = false;
    for (const id in saves[key].fragments) {
      if (saves[key].fragments[id].name.includes(searchString)) {
        valid = true;
      }
    }

    if (!searchString || valid) {
      let lastEditor = '';
      let numberFragments = '';
      if ('editors' in saves[key]) {
        lastEditor = saves[key].editors.slice(-1)[0];
      }
      if ('fragments' in saves[key]) {
        numberFragments = Object.keys(saves[key].fragments).length;
      }

      let tableRow = '<tr class="save_list_item';
      if (key == currentSave) {
        tableRow += ' selected';
        $('#load').removeClass('disabled');
        $('#delete').removeClass('disabled');
        $('#export').removeClass('disabled');
      }
      tableRow += '" id="'+key+'">';
      tableRow += '<td class="td_filename">'+key+'</td>';
      tableRow += '<td class="td_fragments">'+numberFragments+'</td>';
      tableRow += '<td class="td_mtime">'+
        Util.convertTime(saves[key].mtime)+'</td>';
      tableRow += '<td class="td_editor">'+lastEditor[0]+'</tr>';

      $('#save_list_body').append(tableRow);
    } else {
      nrHidden += 1;
    }
  }
  if (nrHidden > 0) {
    $('#clear_filter').css('display', 'block');
    $('#clear_filter').html('Clear Filter');//</br>('+nrHidden+' files hidden)');
  } else {
    $('#clear_filter').css('display', 'none');
  }
}


/* ##########################################
#               INPUT/OUTPUT
########################################## */

$('#default_folder').click(selectDefaultFolder);

$('#select_folder').click(function() {
  LOGGER.send('server-get-saves-folder');
  ipcRenderer.send('server-get-saves-folder');
});

$('#fragment_search').on('input', function() {
  updateSaveList($('#fragment_search').val());
});

$('#clear_filter').click(function() {
  clearSearch();
  updateSaveList();
});

$('#left_area').on('click', function(event) {
  if (event.target == this) {
    $('#thumb_list').empty();
    $('#thumb_reconstruction').empty();
    $('#right_area').css('visibility', 'hidden');
    $('.selected').removeClass('selected');
    $('#load').addClass('disabled');
    $('#delete').addClass('disabled');
    $('#export').addClass('disabled');
    currentSave = null;
  }
});

$('#save_list').on('dblclick', '.save_list_item', function(event) {
  currentSave = $(event.target).parent().attr('id');
  $(event.target).parent().addClass('selected');
  const filename = $('.selected').attr('id');
  LOGGER.send('server-load-file', filename);
  ipcRenderer.send('server-load-file', filename);
});

$('#save_list').on('click', '.save_list_item', function(event) {
  currentSave = $(event.target).parent().attr('id');
  $('.save_list_item').removeClass('selected');
  $(event.target).parent().addClass('selected');
  $('#load').removeClass('disabled');
  $('#delete').removeClass('disabled');
  $('#export').removeClass('disabled');
  $('#right_area').css('visibility', 'visible');
  $('#thumb_reconstruction').empty();

  const thumbnail = document.createElement('img');
  thumbnail.src = saves[currentSave].screenshot;
  document.getElementById('thumb_reconstruction').appendChild(thumbnail);

  const fragments = saves[currentSave].fragments;

  $('#thumb_list').empty();

  try {
    for (const [key, value] of Object.entries(fragments)) {
      let url; let rt;
      if (fragments[key].recto ? url = fragments[key].recto.url :
        url = fragments[key].verso.url);
      if (fragments[key].recto ? rt = 'rt' : rt = 'vs');
      let newTile = '<div class="load_thumb" data-name="'+
        fragments[key].name+'">';
      newTile += '<div class="img_wrapper">';
      newTile += '<img class="load_thumb_img" src="'+url+'"></div>';
      newTile += '<div title="' + fragments[key].name +
        '" class="load_thumb_text">'+
        fragments[key].name+' ('+rt+')</div>';
      newTile += '</div>';
      $('#thumb_list').append(newTile);
      $('.load_thumb').click(function(event) {
        const name = $(this).data('name');
        $('#fragment_search').val(name);
        updateSaveList(name);
      });
    }
  } catch (err) {
    console.error(err);
    $('#right_area').css('visibility', 'hidden');
    $('#thumb_list').append('<div class="error_message">'+
        'Save file broken!</div>');
    $('#load').prop('disabled', true);
  }
});

$('#load').click(function() {
  if (!$('#load').hasClass('disabled')) {
    const filename = $('.selected').attr('id');
    LOGGER.send('server-load-file', filename);
    ipcRenderer.send('server-load-file', filename);
  }
});

$('#delete').click(function(event) {
  if (!$(event.target).hasClass('disabled')) {
    deleteSavefile();
  }
});
$('#export').click(function(event) {
  if (!$(event.target).hasClass('disabled')) {
    exportSavefile();
  }
});
$('#import').click(function(event) {
  LOGGER.send('server-import-file');
  ipcRenderer.send('server-import-file');
  $('#import').find('img').attr('src', '../imgs/loading.gif');
});
// [Hotkey] DEL
$('html').keyup(function(event) {
  if (event.keyCode == 46) {
    deleteSavefile();
  }
});

$('#folder-wrapper').click(function(event) {
  LOGGER.send('server-open-load-folder');
  ipcRenderer.send('server-open-load-folder');
});

/* ##########################################
#           SERVER/CLIENT PROTOCOL
###########################################*/

// load-receive-saves
ipcRenderer.on('load-receive-saves', (event, savefiles) => {
  LOGGER.receive('load-receive-saves', savefiles);
  saves = savefiles;
  clearSearch();
  updateSaveList();
});

// load-receive-folder
ipcRenderer.on('load-receive-folder', (event, path) => {
  LOGGER.receive('load-receive-folder', path);
  $('#import').find('img').attr('src', '../imgs/symbol_unpack.png');
  $('#folder').val(path);
  ipcRenderer.send('server-list-savefiles', path);
});

ipcRenderer.on('load-set-default-folder', (event, path) => {
  LOGGER.receive('load-set-default-folder', path);
  defaultFolder = path;
});
