'use strict';

const {UIController} = require('./classes/UIController');
const {ipcRenderer} = require('electron');
const Dialogs = require('dialogs');
const dialogs = new Dialogs();
let uic;
let lightMode = 'dark';
let darkBackground;

let xyz; // TODO: entfernen

/**
 * TODO
 */
function saveTable() {
  dialogs.prompt('Please enter your name(s)/initials:', function(editor) {
    if (editor!='' && editor!=null) {
      const screenshot = stage.exportCanvas('png', true);
      const data = {
        'editor': editor,
        'screenshot': screenshot,
      };
      uic.sendToServer('server-save-file', data);
    }
  });
}

/**
 * TODO
 */
function loadTable() {
  uic.sendToServer('server-open-load-window');
}

/**
 * TODO
 */
function clearTable() {
  uic.sendToServer('server-clear-table');
}

/**
 * TODO
 */
function toggleLight() {
  if (lightMode == 'dark') {
    // current light_mode is "dark" => change to "bright"
    darkBackground = $('body').css('background');
    $('body').css({backgroundColor: 'white'});
    $('#light_switch').addClass('button_active');
    $('#light_box').prop('checked', true);
    lightMode = 'bright';
  } else {
    // current light_mode is "bright" => change to "dark"
    $('body').css({background: darkBackground});
    $('#light_switch').removeClass('button_active');
    $('#light_box').prop('checked', false);
    lightMode = 'dark';
  }
}

/**
 * TODO
 */
function toggleGrid() {
  // TODO
  console.log('Grid toggled.');
}

/**
 * TODO
 */
function toggleFibres() {
  // TODO
  console.log('Fibres toggled.');
}


$(document).ready(function() {
  uic = new UIController('lighttable');
  const stage = uic.getStage();
  clearTable();

  /* ##########################################
    #               INPUT/OUTPUT
    ###########################################*/

  // Clear Table Button
  $('#clear_table').click(function() {
    clearTable();
  });

  // Save Table Button
  $('#save_table').click(function() {
    saveTable();
  });

  // Load Table Button
  $('#load_table').click(function() {
    loadTable();
  });

  // Flip Buttons
  $('#flip_table').click(function() {
    if ($('#hor_flip_table').css('display') == 'none') {
      // open flipping buttons
      $('#flip_table').addClass('button_active');
      $('#hor_flip_table').css('display', 'inline-block');
      $('#vert_flip_table').css('display', 'inline-block');
      $('#flip_table>img').attr('src', '../imgs/symbol_x.png');
    } else {
      // close flipping buttons
      $('#flip_table').removeClass('button_active');
      $('#vert_flip_table').css('display', 'none');
      $('#hor_flip_table').css('display', 'none');
      $('#flip_table>img').attr('src', '../imgs/symbol_flip.png');
    }
  });

  // Horizontal Flip Button
  $('#hor_flip_table').click(function() {
    stage.flipTable(true);
  });
  $('#hor_flip_table').mouseenter(function() {
    stage.showFlipLine(true);
  });
  $('#hor_flip_table').mouseleave(function() {
    stage.hideFlipLines();
  });

  // Vertical Flip Button
  $('#vert_flip_table').click(function() {
    stage.flipTable(false);
  });
  $('#vert_flip_table').mouseenter(function() {
    stage.showFlipLine(false);
  });
  $('#vert_flip_table').mouseleave(function() {
    stage.hideFlipLines();
  });

  // Export Buttons
  $('#export_table').click(function() {
    if ($('#export_detail_wrapper').hasClass('expanded')) {
      $('#export_table').removeClass('button_active');
      $('#export_detail_wrapper').removeClass('expanded');
    } else {
      $('#export_table').addClass('button_active');
      $('#export_detail_wrapper').addClass('expanded');
    }
  });
  $('#jpg_snap').click(function() {
    stage.exportCanvas('jpg', false);
  });
  $('#jpg_full').click(function() {
    stage.exportCanvas('jpg', true);
  });
  $('#png_snap').click(function() {
    stage.exportCanvas('png', false);
  });
  $('#png_full').click(function() {
    stage.exportCanvas('png', true);
  });

  $('#undo').click(function() {
    uic.sendToServer('server-undo-step');
  });
  $('#redo').click(function() {
    uic.sendToServer('server-redo-step');
  });

  // Light Switch Button
  $('#light_switch').click(function() {
    toggleLight();
  });
  $('#light_box').on('change', function() {
    toggleLight();
  });


  $('#grid_box').on('change', function() {
    toggleGrid();
  });
  $('#fibre_box').on('change', function() {
    toggleFibres();
  });

  // Fit to Screen
  $('#fit_to_screen').click(function(event) {
    stage.fitToScreen();
  });

  // Hide HUD button
  $('#hide_hud').click(function(event) {
    if ($('#hide_hud').hasClass('hide_active')) {
      // if the HUD is currently hidden, show it again
      $('#left_sidebar').removeClass('hidden');
      $('#zoom_wrapper').removeClass('hidden');
      $('#table_button_wrapper').removeClass('hidden');
      $('#annot_button').removeClass('hidden');
      $('#fit_to_screen').removeClass('hidden');
      $('#hide_hud').removeClass('hide_active');
    } else {
      $('#left_sidebar').addClass('hidden');
      $('#zoom_wrapper').addClass('hidden');
      $('#table_button_wrapper').addClass('hidden');
      $('#annot_button').addClass('hidden');
      $('#fit_to_screen').addClass('hidden');
      $('#hide_hud').addClass('hide_active');
    }
  });

  // Annotation Button
  $('#annot_button').click(function() {
    if ($('#annot_window').css('display') == 'flex') {
      $('#annot_window').css('display', 'none');
    } else {
      $('#annot_window').css('display', 'flex');
    }
  });
  $('#annot_close').click(function() {
    $('#annot_window').css('display', 'none');
  });
  $('#annot_text').keyup(function(event) {
    uic.toggleAnnotSubmitButton();
  });
  $('#annot_editor').keyup(function(event) {
    uic.toggleAnnotSubmitButton();
  });
  $('#annot_submit').click(function(event) {
    if (!$(even.target).hasClass('disabled')) {
      uic.sendAnnotation($(event.target).attr('target'));
    }
  });

  // Zoom Slider
  $('#zoom_slider').on('change', () => {
    const newScaling = $('#zoom_slider').val();
    $('#zoom_factor').html('Zoom<br/>x'+newScaling/100);
    uic.setScaling(newScaling);
  });

  /* Sidebar Width Adjustment */
  $('#sidebar_handle').on('mousedown', startResizingSidebar);

  // Upload Local Image Button
  $('#upload_local').click(function() {
    uic.sendToServer('server-start-upload');
  });

  /**
   * Triggered in the case of sidebar resizing. Adds additional event listeners
   * for mouse movement (resizing the sidebar) and mouseup (stopping resizing).
   */
  function startResizingSidebar() {
    window.addEventListener('mousemove', resizeSidebar, false);
    window.addEventListener('mouseup', stopResizingSidebar, false);
  }

  /**
   * Changes width of the sidebar according to the event/cursor position.
   * If a specific treshold (const thresh) is undershot, the sidebar is
   * extended with the "small" CSS class.
   * @param {*} event Contains the current event.pageX position of the cursor.
   */
  function resizeSidebar(event) {
    $('#left_sidebar').css('width', event.pageX);

    const thresh = 330;
    if (event.pageX < thresh) {
      $('#left_sidebar').addClass('small');
    } else {
      $('#left_sidebar').removeClass('small');
    }
  }

  /**
   * Triggered during sidebar resizing event. Removes additional event listeners
   * for mouse movement or mouseup. Only mousedown for restarting resizing
   * remains in place.
   */
  function stopResizingSidebar() {
    window.removeEventListener('mousemove', resizeSidebar);
    window.removeEventListener('mouseup', stopResizingSidebar);
  }

  $('.sidebar_header').click(function(event) {
    // only react if the clicked element is not yet expanded
    if (!$(this).parent().hasClass('expanded') &&
      !$(this).parent().hasClass('disabled')) {
      // first, retotate down-arrow back and remove expanded label
      $('.arrow.down').removeClass('down');
      $('.expanded').removeClass('expanded');
      // second, rotate arrow down and expand clicked segment
      $(this).find('.arrow').addClass('down');
      $(this).parent().addClass('expanded');
    }
  });

  // Window Resizement
  window.addEventListener('resize', () => {
    stage.resizeCanvas(window.innerWidth, window.innerHeight);
  });

  document.getElementById('lighttable')
      .addEventListener('wheel', function(event) {
        const deltaZoom = event.deltaY / 10;
        const newScaling = stage.getScaling() - deltaZoom;
        const x = event.pageX;
        const y = event.pageY;
        uic.setScaling(newScaling, x, y);
        $('#zoom_slider').val(newScaling);
      });

  // Keystrokes
  $('html').keydown(function(event) {
    if (event.ctrlKey) {
      if (event.keyCode == 83) {
        // Ctrl + S -> Save
        saveTable();
      } else if (event.keyCode == 76) {
        // Ctrl + L -> Load
        loadTable();
      } else if (event.keyCode == 78) {
        // Ctrl + N -> Table Clear
        clearTable();
      } else if (event.keyCode == 90) {
        // Ctrl + Z -> Undo Step
        uic.sendToServer('server-undo-step');
      } else if (event.keyCode == 89) {
        // Ctrl + Y -> Redo Step
        uic.sendToServer('server-redo-step');
      }
    } else {
      if (event.keyCode == 46) {
        // DEL -> Delete Fragment(s)
        uic.removeFragments();
      } else if (event.keyCode == 76) {
        // L -> Toggle Light
        toggleLight();
      } else if (event.keyCode == 71) {
        // G -> Toggle Grid
        toggleGrid();
      } else if (event.keyCode == 70) {
        // F -> Toggle Fibres
        toggleFibres();
      }
    }
  });

  /* ##########################################
    #           SERVER/CLIENT COMMUNICATION
    ###########################################*/

  // Client-Load-From-Model
  // Receiving stage and fragment configuration from server.
  ipcRenderer.on('client-load-from-model', (event, data) => {
    console.log('Received client-load-from-model');
    uic.loadScene(data);
  });

  ipcRenderer.on('client-local-upload', (event, data) => {
    console.log('Received client-local-upload');
    uic.addFragment(data);
  });

  ipcRenderer.on('client-display-feedback', (event, data) => {
    console.log('Received client-display-feedback');
    const title = data.title || '';
    const desc = data.desc || '';
    const duration = data.duration || '';
    const color = data.color || '';
    uic.showVisualFeedback(title, desc, color, duration);
  });

  xyz = stage;
});
