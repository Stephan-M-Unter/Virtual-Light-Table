'use strict';

const {UIController} = require('./classes/UIController');
const {ipcRenderer} = require('electron');
let uic;
let lightMode = 'dark';
let darkBackground;
let sidebarCollapsed = false;
let sidebarWidth = 200;
let sidebarClick;

const konami = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66];
let konamiDetection = [];
let konamiActive = false;

let xyz; // TODO: entfernen

/**
 * TODO
 * @param {*} keyCode
 */
function checkForKonami(keyCode) {
  const nextKey = konami[konamiDetection.length];
  if (nextKey == keyCode) {
    konamiDetection.push(keyCode);
  } else {
    konamiDetection = [];
  }
  if (konami.length == konamiDetection.length) {
    activateKonami();
  }
}

/**
 * TODO
 */
function activateKonami() {
  konamiActive = true;
  $('#color_wrapper').append('<div class="color_button pink"></div>');
  $('.color_button.pink').click(function(event) {
    $('.color_button.selected').removeClass('selected');
    $(event.target).addClass('selected');
  });
  uic.showVisualFeedback('Konami activated', '', '#ff00ff', 5000);
}

/**
 * TODO
 */
function toggleSidebar() {
  if (sidebarCollapsed) {
    $('#left_sidebar').css('width', sidebarWidth);
    $('#left_sidebar').css('min-width', 180);
    $('#sidebar_content').css('display', 'block');
    $('#sidebar_handle_grabber').css('transform',
        'translateX(-40%) translateY(-50%)');
  } else {
    sidebarWidth = $('#left_sidebar').css('width');
    $('#left_sidebar').css('min-width', 1);
    $('#left_sidebar').css('width', 0);
    $('#sidebar_content').css('display', 'none');
    $('#sidebar_handle_grabber').css('transform',
        'translateX(-15%) translateY(-50%)');
  }
  sidebarCollapsed = !sidebarCollapsed;
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
    $('#zoom_slider').css('background-color', 'grey');
    lightMode = 'bright';
  } else {
    // current light_mode is "bright" => change to "dark"
    $('body').css({background: darkBackground});
    $('#light_switch').removeClass('button_active');
    $('#light_box').prop('checked', false);
    $('#zoom_slider').css('background-color', 'white');
    lightMode = 'dark';
  }
}

$(document).ready(function() {
  uic = new UIController('lighttable');
  const stage = uic.getStage();
  uic.clearTable();

  /* ##########################################
        #               INPUT/OUTPUT
        ###########################################*/

  // Clear Table Button
  $('#clear_table').click(function() {
    uic.clearTable();
  });

  // Save Table Button
  $('#save_table').click(function() {
    uic.saveTable();
  });

  // Load Table Button
  $('#load_table').click(function() {
    uic.loadTable();
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

  $('.color_button').click(function(event) {
    $('.color_button.selected').removeClass('selected');
    $(event.target).addClass('selected');
  });

  $('#png_snap').click(function() {
    stage.exportCanvas('png', false);
  });
  $('#png_full').click(function() {
    stage.exportCanvas('png', true);
  });

  $('#tiff_snap').click(function() {
    stage.exportCanvas('tiff', false);
  });
  $('#tiff_full').click(function() {
    stage.exportCanvas('tiff', true);
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

  $('#new_measure').on('click', function(event) {
    event.stopPropagation();
    uic.addMeasurement();
  });
  $('#clear-measures').on('click', function() {
    uic.clearMeasurements();
  });

  $('#grid_box').on('change', function() {
    uic.toggleGridMode();
  });
  $('#scale_box').on('change', function() {
    uic.toggleScaleMode();
  });
  $('#fibre_box').on('change', function() {
    uic.toggleFibreMode();
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
      $('#reset_zoom').removeClass('hidden');
      $('#hide_hud').removeClass('hide_active');
    } else {
      $('#left_sidebar').addClass('hidden');
      $('#zoom_wrapper').addClass('hidden');
      $('#table_button_wrapper').addClass('hidden');
      $('#annot_button').addClass('hidden');
      $('#fit_to_screen').addClass('hidden');
      $('#reset_zoom').addClass('hidden');
      $('#hide_hud').addClass('hide_active');
    }
  });

  $('#reset_zoom').click(function() {
    uic.resetZoom();
  });

  // Annotation Button
  $('#annot_button').click(function() {
    if ($('#annot_window').css('display') == 'flex') {
      $('#annot_window').css('display', 'none');
      uic.setHotkeysOn(true);
    } else {
      $('#annot_window').css('display', 'flex');
      uic.setHotkeysOn(false);
    }
  });
  $('#annot_close').click(function() {
    $('#annot_window').css('display', 'none');
    uic.setHotkeysOn(true);
  });
  $('#annot_text').keyup(function(event) {
    uic.toggleAnnotSubmitButton();
  });
  $('#annot_editor').keyup(function(event) {
    uic.toggleAnnotSubmitButton();
  });
  $('#annot_submit').click(function(event) {
    if (!$(event.target).hasClass('disabled')) {
      uic.sendAnnotation($(event.target).attr('target'));
    }
  });

  // Zoom Slider
  $('#zoom_slider').on('change', () => {
    const newScaling = $('#zoom_slider').val();
    uic.setScaling(newScaling);
  });

  /* Sidebar Width Adjustment */
  $('#sidebar_handle').on('mousedown', startResizingSidebar);

  $('#sidebar_handle_grabber').on('mouseup', (event) => {
    if (event.pageX == sidebarClick) {
      toggleSidebar();
    }
    sidebarClick = null;
  });

  $('#sidebar_handle_grabber').on('mousedown', (event) => {
    sidebarClick = event.pageX;
  });

  // Upload Local Image Button
  $('#upload_local').click(function() {
    uic.sendToServer('server-open-upload');
  });

  /**
     * Triggered in the case of sidebar resizing. Adds additional
     * event listeners for mouse movement (resizing the sidebar)
     * and mouseup (stopping resizing).
     */
  function startResizingSidebar() {
    if (!sidebarCollapsed) {
      window.addEventListener('mousemove', resizeSidebar, false);
      window.addEventListener('mouseup', stopResizingSidebar, false);
    }
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
     * Triggered during sidebar resizing event. Removes additional event
     * listeners for mouse movement or mouseup. Only mousedown for
     * restarting resizing remains in place.
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
    } else {
      $('.arrow.down').removeClass('down');
      $('.expanded').removeClass('expanded');
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
        uic.saveTable();
      } else if (event.keyCode == 76) {
        // Ctrl + L -> Load
        uic.loadTable();
      } else if (event.keyCode == 78) {
        // Ctrl + N -> Table Clear
        uic.clearTable();
      } else if (event.keyCode == 90) {
        // Ctrl + Z -> Undo Step
        uic.sendToServer('server-undo-step');
      } else if (event.keyCode == 89) {
        // Ctrl + Y -> Redo Step
        uic.sendToServer('server-redo-step');
      }
    } else {
      const hotkeysOn = uic.getHotkeysOn();
      if (event.keyCode == 46) {
        // DEL -> Delete Fragment(s)
        uic.removeFragments();
      } else if (event.keyCode == 76) {
        // L -> Toggle Light
        if (hotkeysOn) {
          toggleLight();
        }
      } else if (event.keyCode == 71) {
        // G -> Toggle Grid
        if (hotkeysOn) {
          uic.toggleGridMode();
        }
      } else if (event.keyCode == 70) {
        // F -> Toggle Fibres
        if (hotkeysOn) {
          uic.toggleFibreMode();
        }
      } else if (event.keyCode == 83) {
        // S -> Toggle Scale
        if (hotkeysOn) {
          uic.toggleScaleMode();
        }
      } else if (event.keyCode == 27) {
        // ESC -> deselect All
        uic.clearSelection();
        // TODO uic.endMeasure();
      } else if (event.keyCode == 77) {
        // M -> Start Measure
        if (hotkeysOn) {
          uic.startMeasure();
        }
      } else if (event.keyCode == 78) {
        // N -> Add Custom Fragment
        if (hotkeysOn) {
          uic.sendToServer('server-open-upload');
        }
      } else if (event.keyCode == 116) {
        // F5 -> update Stage
        uic.update();
      }
      if (!konamiActive) {
        checkForKonami(event.keyCode);
      }
    }
  });

  /* ##########################################
        #           SERVER/CLIENT COMMUNICATION
        ###########################################*/

  // client-load-model
  // Receiving stage and fragment configuration from server.
  ipcRenderer.on('client-load-model', (event, data) => {
    console.log('Received client-load-model');
    if ('loading' in data) {
      $('.arrow.down').removeClass('down');
      $('.expanded').removeClass('expanded');
      $('#fragment_list').find('.arrow').addClass('down');
      $('#fragment_list').addClass('expanded');
    }
    uic.loadScene(data);
  });

  ipcRenderer.on('client-add-upload', (event, data) => {
    console.log('Received client-add-upload');
    console.log('Local Upload:', data);
    uic.addFragment(data);
  });

  ipcRenderer.on('client-show-feedback', (event, data) => {
    console.log('Received client-show-feedback');
    const title = data.title || '';
    const desc = data.desc || '';
    const duration = data.duration || '';
    const color = data.color || '';
    uic.showVisualFeedback(title, desc, color, duration);
  });

  xyz = stage;
});
