'use strict';

/**
 *
 */
class Topbar {
  /**
     * @constructs
     * @param {*} controller
     */
  constructor(controller) {
    this.controller = controller;
    this.screenshots = {};

    $('#add_table').click((event) => {
      this.controller.newTable();
    });

    $('#topbar_handle').click((event) => {
      $('#topbar').toggleClass('collapsed');
      event.stopPropagation();
    });

    $('#topbar').click((event) => {
      if ($('#topbar').hasClass('collapsed')) {
        $('#topbar').toggleClass('collapsed');
      }
    });
  }

  /**
   *
   * @param {String} tableID - ID for a table, e.g. "table_1".
   * @param {Object} tableData - Object containing the defining information for a table. The necessary
   * information for the topbar are "screenshot", "fragments" (to determine the number of fragments)
   * and, potentially, the filename.
   */
  addTable(tableID, tableData) {
    const tableNumber = tableID.slice(6);
    const tableItem = $('<div id="'+tableID+'" class="table_item" table="'+tableID+'" draggable="true"></div>');
    const tableHeader = $('<div title="Table '+tableNumber+'" class="table_header empty" table="'+
    tableID+'">Table '+tableNumber+'</div>');
    const tableClose = $('<div title="Close table" class="table_close" table="'+tableID+'"></div>');
    const imageClose = $('<img src="../imgs/symbol_x.png" table="'+tableID+'">');
    const tableScreenshot = $('<div class="table_screenshot empty" table="'+tableID+'"></div>');
    const imageScreenshot = $('<img table="'+tableID+'">');
    const renewScreenshot = $('<div title="Refresh thumbnail" class="table_renew_screenshot" table="'+tableID+'"></div>');
    const imageRenewScreenshot = $('<img src="../imgs/symbol_rotate.png" table="'+tableID+'">');
    const unsavedDot = $('<div title="Table contains unsaved changes" class="unsaved_dot"></div>');
    $(renewScreenshot).append(imageRenewScreenshot);
    $(tableClose).append(imageClose);
    $(tableScreenshot).append(imageScreenshot, renewScreenshot);
    $(tableItem).append(tableHeader, tableScreenshot, tableClose, unsavedDot);
    $('#table_list').append(tableItem);
    this.updateTable(tableID, tableData);

    $(tableClose).click((event) => {
      event.stopPropagation();
      const tableID = $(event.target).attr('table');
      this.controller.closeTable(tableID);
    });

    $(tableItem).click((event) => {
      const tableID = $(event.target).attr('table');
      if (!$('#'+tableID).hasClass('activeTable')) {
        this.controller.openTable(tableID);
      }
    });

    $(tableItem).on('contextmenu', (event) => {
      this.controller.showContextMenu(event, 'topbar_table', tableID);
    });

    $(tableItem).on('dragstart', (event) => {
      event.dataTransfer = event.originalEvent.dataTransfer;
      let target = $(event.target);
      while (true) {
        if (target.hasClass('table_item')) {
          break;
        }
        target = target.parent();
      }

      let index = target.index();
      if ($('#table_separator').index() < index) {
        index -= 1;
      }

      event.dataTransfer.setData('text/plain', index);
    });
    $(tableItem).on('drop', (event) => {
      this.dragCancel(event);
      $('#table_separator').css('display', 'none');

      let target = $(event.target);
      while (true) {
        if (target.hasClass('table_item')) {
          break;
        }
        target = target.parent();
      }

      let newIndex = target.index();
      if ($('#table_separator').index() < newIndex) {
        newIndex -= 1;
      }
      event.dataTransfer = event.originalEvent.dataTransfer;
      let oldIndex = parseInt(event.dataTransfer.getData('text/plain'));
      if ($('#table_separator').index() < oldIndex) {
        oldIndex += 1;
      }

      const source = target.parent().children()[oldIndex];

      const centerX = target.offset().left + (target.width() / 2);

      if (event.pageX < centerX) {
        console.log("Old:", oldIndex, "->", "New:", newIndex);
        console.log(target.prop('id'), 'before', source);
        target.before(source);
      } else {
        console.log("Old:", oldIndex, "->", "New:", newIndex+1);
        console.log(target.prop('id'), 'after', source);
        target.after(source);
      }
    });
    $(tableItem).on('dragenter', this.dragCancel);
    $(tableItem).on('dragover', this.dragCancel);
    
    $(renewScreenshot).click((event) => {
      this.renewScreenshot();
    });
  };

  dragCancel(event) {
    event.preventDefault();
    event.stopPropagation();
    let target = $(event.target);
    while (true) {
      if (target.hasClass('table_item')) {
        break;
      }
      target = target.parent();
    }
    const centerX = target.offset().left + (target.width() / 2);
    $('#table_separator').css('display', 'block');
    if (event.pageX < centerX) {
      target.before($('#table_separator'));
    } else {
      target.after($('#table_separator'));
    }
    return false;
  };

  /**
   *
   * @param {String} tableID ID for a table, e.g. "table_1".
   */
  removeTable(tableID) {
    $('#'+tableID).css('animation-name', 'slideDown');
    $('#'+tableID).bind('animationend', function() {
      $('#'+tableID).remove();
    });
  };

  startLoading(tableID) {
    const screenshot = $('#'+tableID).find('.table_screenshot>img').attr('src');
    if (screenshot && screenshot != '') {
      this.screenshots[tableID] = screenshot;
    }
    $('#'+tableID).find('.table_header').removeClass('empty');
    $('#'+tableID).find('.table_screenshot').removeClass('empty');
    $('#'+tableID).find('.table_screenshot>img').attr('src', '../imgs/loading-small.gif');
  }
  
  stopLoading(tableID) {
    if (this.screenshots[tableID]) {
      $('#'+tableID).find('.table_screenshot>img').attr('src', this.screenshots[tableID]);
      // delete this.screenshots[tableID];
    } else {
      $('#'+tableID).find('.table_header').addClass('empty');
      $('#'+tableID).find('.table_screenshot').addClass('empty');
      $('#'+tableID).find('.table _screenshot>img').attr('src', '');
    }
  }

  /**
   *
   * @param {String} tableID ID for a table, e.g. "table_1".
   * @param {Object} tableData Object containing the defining information for a table. The necessary
   * information for the topbar are "screenshot", "fragments" (to determine the number of fragments)
   * and, potentielly, the filename.
   */
  updateTable(tableID, tableData) {
    if (tableData.filename) {
      $('#'+tableID).find('.table_header').html(tableData.filename);
      $('#'+tableID).find('.table_header').attr('title', tableData.filename);
    }
    if (Object.keys(tableData.fragments).length >= 1 && tableData.screenshot) {
      // show screenshot for table on card
      $('#'+tableID).find('.table_header').removeClass('empty');
      $('#'+tableID).find('.table_screenshot').removeClass('empty');
      if (tableData.emptyTable) {
        $('#'+tableID).find('.table_screenshot>img').attr('src', tableData.screenshot);
      } else {
        $('#'+tableID).find('.table_screenshot>img').attr('src', '../imgs/loading-small.gif');
      }
      this.screenshots[tableID] = tableData.screenshot;
    } else {
      // don't show any screenshot
      $('#'+tableID).find('.table_header').addClass('empty');
      $('#'+tableID).find('.table_screenshot').addClass('empty');
      $('#'+tableID).find('.table_screenshot>img').attr('src', '');
    }
  };

  /**
   *
   * @param {*} tableID ID for a table, e.g. "table_1".
   */
  setActiveTable(tableID) {
    $('.activeTable').removeClass('activeTable');
    $('#'+tableID).addClass('activeTable');
  }

  /**
   *
   * @param {*} tableID ID for a table, e.g. "table_1".
   * @param {*} screenshot Screenshot data.
   */
  updateScreenshot(tableID, screenshot) {
    $('#'+tableID).find('.table_screenshot>img').attr('src', screenshot);
  }

  /**
   *
   */
  renewScreenshot() {
    if (this.controller.hasFragments()) {
      const screenshot = this.controller.exportCanvas('png', true, true);
      $('.activeTable').find('.table_screenshot>img').attr('src', screenshot);
      const data = {
        tableID: $('.activeTable').attr('table'),
        screenshot: screenshot,
      };
      this.controller.sendToServer('server-save-screenshot', data);
    } else {
      // don't show any screenshot
      const tableID = $('.activeTable').attr('table');
      $('#'+tableID).find('.table_header').addClass('empty');
      $('#'+tableID).find('.table_screenshot').addClass('empty');
      $('#'+tableID).find('.table_screenshot>img').attr('src', '');
    }
  }

  /**
   * TODO
   */
  collapse() {
    $('#topbar').delay(1500).queue(function() {
      $('#topbar').addClass('collapsed').dequeue();
    });
  }

  /**
   *
   */
  uncollapse() {
    $('#topbar').removeClass('collapsed');
  }

  /**
   *
   * @param {*} unsavedObject
   */
  updateSavestates(unsavedObject) {
    Object.keys(unsavedObject).forEach((tableID) => {
      if (unsavedObject[tableID]) {
        $('#'+tableID).addClass('unsaved');
      } else {
        $('#'+tableID).removeClass('unsaved');
      }
    });
  }

  /**
   *
   * @param {*} saveData
   */
  updateFilename(saveData) {
    $('#'+saveData.tableID).find('.table_header').html(saveData.filename);
    $('#'+saveData.tableID).find('.table_header').attr('title', saveData.filename);
  }

  /**
   * @param {String} tableID
   * @param {[*]} screenshot
   */
  finishedLoading(tableID, screenshot) {
    if (this.screenshots[tableID]) {
      $('#'+tableID).find('.table_screenshot>img').attr('src', this.screenshots[tableID]);
      // delete this.screenshots[tableID];
    } else if (screenshot) {
      $('#'+tableID).find('.table_screenshot>img').attr('src', screenshot);
    }
  }
}

module.exports.Topbar = Topbar;
