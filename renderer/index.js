/* eslint-disable no-invalid-this */
'use strict';

const {UIController} = require('./classes/UIController');
const {ipcRenderer} = require('electron');
let controller;
let sidebarCollapsed = false;
let sidebarWidth = 200;
let sidebarClick;

const konami = [38, 38, 40, 40, 37, 39, 37, 39, 65, 66];
let konamiDetection = [];
let konamiActive = false;

let xyz; // REMOVE: entfernen

/**
 * Checks if the last keystroke aligns with the famous konami code
 * (up up down down left right left right A B). If so, the sequence of
 * correctly pressed keys is prolonged. If not, the whole sequence
 * is reset to zero. If the full code has been entered, the konami
 * method is activated. There is no way to deactivate the konami mode
 * in a running session.
 * @param {*} keyCode - JavaScript code of last pressed key.
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
 * This method activates the "konami mode" for the software, a little easteregg.
 * It sends feedback that the konami code has been entered successfully
 * and provides access to a new jpg export background colour: pink.
 */
function activateKonami() {
  konamiActive = true;
  $('#color_wrapper').append('<div class="color_button pink"></div>');
  $('.color_button.pink').click(function(event) {
    $('.color_button.selected').removeClass('selected');
    $(event.target).addClass('selected');
  });
  $('.color_button.pink').on('mouseover', function(event) {
    controller.previewBackground($(event.target).css('backgroundColor'), true);
  });
  $('.color_button.pink').on('mouseout', function(event) {
    controller.previewBackground($(event.target).css('backgroundColor'), false);
  });
  controller.showVisualFeedback('Konami activated', '', '#ff00ff', 5000);
}

/**
 * Collapses or extends the sidebar.
 */
function toggleSidebar() {
  if (sidebarCollapsed) {
    $('#left_sidebar').removeClass('collapsed');
    $('#left_sidebar').css('width', sidebarWidth);
    $('#left_sidebar').css('min-width', 180);
    $('#sidebar_content').css('display', 'block');
    $('#sidebar_handle_grabber').css('transform',
        'translateX(-40%) translateY(-50%)');
  } else {
    $('#left_sidebar').addClass('collapsed');
    sidebarWidth = $('#left_sidebar').css('width');
    $('#left_sidebar').css('min-width', 1);
    $('#left_sidebar').css('width', 0);
    $('#sidebar_content').css('display', 'none');
    $('#sidebar_handle_grabber').css('transform',
        'translateX(-15%) translateY(-50%)');
  }
  sidebarCollapsed = !sidebarCollapsed;
}

$(document).ready(function() {
  controller = new UIController('lighttable');

  /* ##########################################
        #               INPUT/OUTPUT
  ###########################################*/

  // Clear Table Button
  $('#clear_table').click(function() {
    controller.clearTable();
  });

  // Save Table Buttons
  $('#save_quick').click(function() {
    controller.save(true);
  });
  $('#save_as').click(function() {
    controller.save(false);
  });

  // Load Table Button
  $('#load_table').click(function() {
    controller.loadTable();
  });

  // Quit Table Button
  $('#quit').click(function() {
    controller.sendToServer('server-quit-table');
  });

  // Flip Buttons - toggles the display of horizontal and vertical flip buttons
  $('#flip_table').click(function() {
    if ($('#hor_flip_table').css('display') == 'none') {
      // open flip buttons
      $('#flip_table').addClass('button_active');
      $('#hor_flip_table').css('display', 'inline-block');
      $('#vert_flip_table').css('display', 'inline-block');
      $('#flip_table>img').attr('src', '../imgs/symbol_x.png');
    } else {
      // close flip buttons
      $('#flip_table').removeClass('button_active');
      $('#vert_flip_table').css('display', 'none');
      $('#hor_flip_table').css('display', 'none');
      $('#flip_table>img').attr('src', '../imgs/symbol_flip.png');
    }
  });

  // Horizontal Flip Button
  $('#hor_flip_table').click(function() {
    controller.flipTable(true);
  });
  $('#hor_flip_table').mouseenter(function() {
    controller.showFlipLine(true);
  });
  $('#hor_flip_table').mouseleave(function() {
    controller.hideFlipLines();
  });

  // Vertical Flip Button
  $('#vert_flip_table').click(function() {
    controller.flipTable(false);
  });
  $('#vert_flip_table').mouseenter(function() {
    controller.showFlipLine(false);
  });
  $('#vert_flip_table').mouseleave(function() {
    controller.hideFlipLines();
  });

  // Export Buttons - toggle display of additional export buttons
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
    controller.exportCanvas('jpg', false, false);
  });
  $('#jpg_full').click(function() {
    controller.exportCanvas('jpg', true, false);
  });

  $('.color_button').click(function(event) {
    $('.color_button.selected').removeClass('selected');
    $(event.target).addClass('selected');
  });
  $('.color_button').on('mouseover', function(event) {
    controller.previewBackground($(event.target).css('backgroundColor'), true);
  });
  $('.color_button').on('mouseout', function(event) {
    controller.previewBackground($(event.target).css('backgroundColor'), false);
  });

  $('#png_snap').click(function() {
    controller.exportCanvas('png', false, false);
  });
  $('#png_full').click(function() {
    controller.exportCanvas('png', true, false);
  });

  $('#tiff_snap').click(function() {
    controller.exportCanvas('tiff', false, false);
  });
  $('#tiff_full').click(function() {
    controller.exportCanvas('tiff', true, false);
  });

  $('#undo').click(function() {
    controller.sendToServer('server-undo-step', controller.getActiveTable());
  });
  $('#redo').click(function() {
    controller.sendToServer('server-redo-step', controller.getActiveTable());
  });

  // Light Switch Button
  $('#light_switch').click(function() {
    controller.toggleLight();
  });
  $('#light_box').on('change', function() {
    controller.toggleLight();
  });

  $('#calibration').on('click', function(event) {
    controller.sendToServer('server-open-calibration');
  });

  $('#new_measure').on('click', function(event) {
    event.stopPropagation();
    controller.addMeasurement();
  });
  $('#clear-measures').on('click', function() {
    controller.clearMeasurements();
  });

  $('#grid_box').on('change', function() {
    controller.toggleGridMode();
  });
  $('#scale_box').on('change', function() {
    controller.toggleScaleMode();
  });
  $('#fibre_box').on('change', function() {
    controller.toggleFibreMode();
  });

  // Fit to Screen
  $('#fit_to_screen').click(function(event) {
    controller.fitToScreen();
  });

  // Hide HUD button - toggle visibility of GUI elements
  $('#hide_hud').click(function(event) {
    if ($('#hide_hud').hasClass('hide_active')) {
      // if the HUD is currently hidden, show it again
      $('#left_sidebar').removeClass('hidden');
      $('#zoom_wrapper').removeClass('hidden');
      $('#table_button_wrapper').removeClass('hidden');
      $('#annot_button').removeClass('hidden');
      $('#fit_to_screen').removeClass('hidden');
      $('#reset_zoom').removeClass('hidden');
      $('#topbar').removeClass('hidden');
      $('#hide_hud').removeClass('hide_active');
    } else {
      $('#left_sidebar').addClass('hidden');
      $('#zoom_wrapper').addClass('hidden');
      $('#table_button_wrapper').addClass('hidden');
      $('#annot_button').addClass('hidden');
      $('#fit_to_screen').addClass('hidden');
      $('#reset_zoom').addClass('hidden');
      $('#topbar').addClass('hidden');
      $('#hide_hud').addClass('hide_active');
    }
  });

  $('#reset_zoom').click(function() {
    controller.resetZoom();
  });

  // Annotation Button
  $('#annot_button').click(function() {
    if ($('#annot_window').css('display') == 'flex') {
      $('#annot_window').css('animation-name', 'fadeOut');
      $('#annot_window').bind('animationend', function() {
        $('#annot_window').css('display', 'none');
        $('#annot_window').unbind('animationend');
        $('#annot_window').css('animation-name', 'fadeIn');
      });
      controller.setPermission('hotkeys', true);
    } else {
      $('#annot_window').css('display', 'flex');
      controller.setPermission('hotkeys', false);
    }
  });
  $('#annot_close').click(function() {
    $('#annot_window').css('animation-name', 'fadeOut');
    $('#annot_window').bind('animationend', function() {
      $('#annot_window').css('display', 'none');
      $('#annot_window').unbind('animationend');
      $('#annot_window').css('animation-name', 'fadeIn');
    });
    controller.setPermission('hotkeys', true);
  });
  $('#annot_text').keyup(function(event) {
    controller.toggleAnnotSubmitButton();
  });
  $('#annot_editor').keyup(function(event) {
    controller.toggleAnnotSubmitButton();
  });
  $('#annot_submit').click(function(event) {
    if (!$(event.target).hasClass('disabled')) {
      controller.sendAnnotation($(event.target).attr('target'));
    }
  });
  $('#annot_show').click(function() {
    if ($('#annot_show').hasClass('pressed')) {
      $('#annot_show').removeClass('pressed');
      controller.hideHiddenAnnotations();
    } else {
      $('#annot_show').addClass('pressed');
      controller.showHiddenAnnotations();
    }
  });

  const annotStart = {};
  const mouseStart = {};

  $('#annot_window').on('mousedown', function(event) {
    annotStart.left = parseFloat($('#annot_window').css('left'));
    annotStart.top = parseFloat($('#annot_window').css('top'));
    mouseStart.x = event.pageX;
    mouseStart.y = event.pageY;
    $(window).on('mousemove', moveAnnotationWindow);
  });
  $(window).on('mouseup', function(event) {
    $(window).off('mousemove', moveAnnotationWindow);
    $(window).off('mousemove', resizeAnnotationWindow);
  });

  $('#annot_resize').on('mousedown', function(event) {
    event.stopPropagation();
    annotStart.left = parseFloat($('#annot_window').css('left'));
    annotStart.top = parseFloat($('#annot_window').css('top'));
    mouseStart.x = event.pageX;
    mouseStart.y = event.pageY;
    $(window).on('mousemove', resizeAnnotationWindow);
  });

  /**
   * TODO
   * @param {*} event
   */
  function moveAnnotationWindow(event) {
    const distance = {};
    distance.x = mouseStart.x - event.pageX;
    distance.y = mouseStart.y - event.pageY;
    const newLeft = annotStart.left - distance.x;
    const newTop = annotStart.top - distance.y;
    $('#annot_window').css('left', newLeft);
    $('#annot_window').css('top', newTop);
  }

  function resizeAnnotationWindow(event) {
    $('#annot_window').css('width', event.pageX - annotStart.left);
    $('#annot_window').css('height', event.pageY - annotStart.top);
  }

  // Zoom Slider
  $('#zoom_slider').on('change', () => {
    const newScaling = $('#zoom_slider').val();
    controller.setScaling(newScaling);
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
    controller.sendToServer('server-open-upload', controller.getActiveTable());
  });
  $('#upload_tpop').click(function() {
    controller.sendToServer('server-open-tpop', controller.getActiveTable());
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
    controller.resizeCanvas(window.innerWidth, window.innerHeight);
  });

  document.getElementById('lighttable')
      .addEventListener('wheel', function(event) {
        const deltaZoom = event.deltaY / 10;
        const newScaling = controller.getScaling() - deltaZoom;
        const x = event.pageX;
        const y = event.pageY;
        controller.setScaling(newScaling, x, y);
        $('#zoom_slider').val(newScaling);
      });

  // Keystrokes
  $('html').keydown(function(event) {
    const hotkeysOn = controller.getPermission('hotkeys');
    if (event.ctrlKey) {
      if (event.keyCode == 83) {
        if (event.shiftKey) {
          // Ctrl + Shift + S -> Save As
          controller.save(false);
        } else {
          // Ctrl + S -> Quicksave
          controller.save(true);
        }
      } else if (event.keyCode == 76) {
        // Ctrl + L -> Load
        controller.loadTable();
      } else if (event.keyCode == 78) {
        // Ctrl + N -> New Table
        controller.newTable();
      } else if (event.keyCode == 90) {
        // Ctrl + Z -> Undo Step
        controller.sendToServer('server-undo-step', controller.getActiveTable());
      } else if (event.keyCode == 89) {
        // Ctrl + Y -> Redo Step
        controller.sendToServer('server-redo-step', controller.getActiveTable());
      } else if (event.altKey && event.keyCode == 68) {
        // Ctrl + Alt + D -> Toggle DevMode
        controller.toggleDevMode();
      } else if (event.keyCode == 65) {
        // Ctrl + A -> DevMode, ask for model
        controller.sendToServer('server-send-model', controller.getActiveTable());
      } else if (event.keyCode == 81) {
        // Ctrl + Q -> DevMode, ask for everything
        controller.sendToServer('server-send-all');
      } else if (event.keyCode == 84) {
        // Ctrl + T -> Open TPOP Interface
        controller.sendToServer('server-open-tpop', controller.getActiveTable());
      } else if (event.keyCode == 67) {
        // Ctrl + C -> Clear Table
        controller.clearTable();
      }
    } else {
      if (event.keyCode == 46) {
        // DEL -> Delete Fragment(s)
        controller.removeFragments();
      } else if (event.keyCode == 76) {
        // L -> Toggle Light
        if (hotkeysOn) {
          controller.toggleLight();
        }
      } else if (event.keyCode == 71) {
        // G -> Toggle Grid
        if (hotkeysOn) {
          controller.toggleGridMode();
        }
      } else if (event.keyCode == 70) {
        // F -> Toggle Fibres
        if (hotkeysOn) {
          controller.toggleFibreMode();
        }
      } else if (event.keyCode == 83) {
        // S -> Toggle Scale
        if (hotkeysOn) {
          controller.toggleScaleMode();
        }
      } else if (event.keyCode == 27) {
        // ESC -> deselect All
        controller.clearSelection();
        controller.endMeasurement();
      } else if (event.keyCode == 77) {
        // M -> Start Measure
        if (hotkeysOn) {
          controller.addMeasurement();
        }
      } else if (event.keyCode == 78) {
        // N -> Add Custom Fragment
        if (hotkeysOn) {
          controller.sendToServer('server-open-upload', controller.getActiveTable());
        }
      } else if (event.keyCode == 79) {
        // O -> change fragment
        controller.changeFragment();
      } else if (event.keyCode == 116) {
        // F5 -> update Stage
        controller.update();
      } else if (event.keyCode == 67) {
        // C -> Calibration Tool
        controller.sendToServer('server-open-calibration');
      }
      if (!konamiActive) {
        checkForKonami(event.keyCode);
      }
    }
  });

  /* ##########################################
        #    SERVER/CLIENT COMMUNICATION
  ###########################################*/

  // client-load-model
  // Receiving stage and fragment configuration from server.
  ipcRenderer.on('client-load-model', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-load-model', data);
    if ('loading' in data.tableData) {
      $('.arrow.down').removeClass('down');
      $('.expanded').removeClass('expanded');
      $('#fragment_list').find('.arrow').addClass('down');
      $('#fragment_list').addClass('expanded');
    }
    controller.loadScene(data);
  });

  ipcRenderer.on('client-redo-model', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-redo-model', data);
    controller.redoScene(data);
  });

  ipcRenderer.on('client-add-upload', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-add-upload', data);
    controller.addFragment(data);
  });

  ipcRenderer.on('client-show-feedback', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-show-feedback');
    const title = data.title || '';
    const desc = data.desc || '';
    const duration = data.duration || '';
    const color = data.color || '';
    controller.showVisualFeedback(title, desc, color, duration);
  });

  ipcRenderer.on('client-redo-undo-update', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-redo-undo-update', data);
    controller.updateRedoUndo(data);
  });

  ipcRenderer.on('client-confirm-autosave', (event) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-confirm-autosave');
    controller.confirmAutosave();
  });

  ipcRenderer.on('client-get-model', (event, data) => {
    console.log(data);
  });

  ipcRenderer.on('client-get-all', (event, data) => {
    console.log(data);
  });

  ipcRenderer.on('client-file-saved', (event, saveData) => {
    controller.updateFilename(saveData);
  });

  ipcRenderer.on('client-inactive-model', (event, data) => {
    if (controller.isDevMode()) console.log('DevMode: Received client-inactive-model', data);
    controller.loadInactive(data);
  });

  ipcRenderer.on('calibration-set-ppi', (event, ppi) => {
    if (controller.isDevMode()) console.log('DevMode: Received calibration-set-ppi', ppi);
    controller.setPPI(ppi);
  });

  xyz = controller.getStage(); // REMOVE
});
