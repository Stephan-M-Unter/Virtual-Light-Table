'use strict';

/**
 * TODO
 */
class Sidebar {
  /**
     * TODO
     * @param {*} controller
     */
  constructor(controller) {
    this.controller = controller;
  }

  /**
   * TODO
   * @param {*} id
   * @param {*} name
   * @param {*} imgUrl
   */
  _addFragment(id, fragment) {
    const sidebar = this;
    const controller = this.controller;

    const name = fragment.getName();
    const imgUrl = fragment.getImageURL();
    const tpopUrl = fragment.getTPOPURL();
    const isRecto = fragment.showingRecto();
    const isLocked = fragment.isLocked();

    // creating elements
    const fragmentListItem = document.createElement('div');
    const fragmentItemThumbWrapper = document.createElement('div');
    const fragmentItemThumbnail = document.createElement('img');
    const fragmentItemName = document.createElement('div');
    const fragmentItemButtonWrapper = document.createElement('div');
    const fragmentItemButtonRemove = document.createElement('div');
    const fragmentItemButtonGoto = document.createElement('div');
    const fragmentItemButtonEdit = document.createElement('div');
    const fragmentItemButtonLock = document.createElement('div');
    const fragmentItemNameText = document.createTextNode(name);
    const fragmentItemVisibleSide = document.createElement('div');
    
    // setting attributes
    fragmentListItem.setAttribute('class', 'fragment_list_item');
    fragmentListItem.setAttribute('title', name);
    fragmentListItem.setAttribute('id', id);
    fragmentItemThumbWrapper.setAttribute('class', 'fragment_list_item_thumb_wrapper');
    fragmentItemThumbnail.setAttribute('class', 'fragment_list_item_thumbnail');
    fragmentItemThumbnail.src = imgUrl;
    fragmentItemName.setAttribute('class', 'fragment_list_item_name');
    fragmentItemButtonWrapper.setAttribute('class', 'fragment_list_item_button_wrapper');
    fragmentItemButtonRemove.setAttribute('class', 'fragment_list_item_button_remove fragment_list_item_button');
    fragmentItemButtonRemove.setAttribute('title', 'Remove fragment');
    fragmentItemButtonGoto.setAttribute('class', 'fragment_list_item_button_goto fragment_list_item_button');
    fragmentItemButtonGoto.setAttribute('title', 'Go to fragment');
    fragmentItemButtonEdit.setAttribute('class', 'fragment_list_item_button_edit fragment_list_item_button');
    fragmentItemButtonEdit.setAttribute('title', 'Edit fragment');
    if (isLocked) fragmentItemButtonLock.setAttribute('class', 'fragment_list_item_button fragment_list_item_button_lock locked');
    else fragmentItemButtonLock.setAttribute('class', 'fragment_list_item_button fragment_list_item_button_lock');
    fragmentItemButtonLock.setAttribute('title', 'Un/Lock fragment');
    if (isRecto) fragmentItemVisibleSide.setAttribute('class', 'fragment_list_item_side recto');
    else fragmentItemVisibleSide.setAttribute('class', 'fragment_list_item_side');

    // chain DOM structure

    /*
        List Item
        -- Thumbwrapper
        ------ Thumbnail
        ------ Name
        ---------- Textnode
        -- Buttonwrapper
        ------ Remove Button
        ------ Goto Button
        ------ Edit Button
        ------ [TPOP Button]
        -- VisibleSide
    */

    fragmentListItem.appendChild(fragmentItemThumbWrapper);
    fragmentListItem.appendChild(fragmentItemButtonWrapper);
    fragmentListItem.appendChild(fragmentItemVisibleSide);

    fragmentItemThumbWrapper.appendChild(fragmentItemThumbnail);
    fragmentItemThumbWrapper.appendChild(fragmentItemName);
    fragmentItemName.appendChild(fragmentItemNameText);

    fragmentItemButtonWrapper.appendChild(fragmentItemButtonRemove);
    fragmentItemButtonWrapper.appendChild(fragmentItemButtonGoto);
    fragmentItemButtonWrapper.appendChild(fragmentItemButtonEdit);

    let fragmentItemButtonTpop;
    if (tpopUrl) {
      fragmentItemButtonTpop = document.createElement('a');
      fragmentItemButtonTpop.setAttribute('target', '_blank');
      fragmentItemButtonTpop.setAttribute('href', tpopUrl);
      fragmentItemButtonTpop.setAttribute('class', 'fragment_list_item_button_tpop fragment_list_item_button');
      fragmentItemButtonTpop.setAttribute('title', 'Open in TPOP (external window)');
      fragmentItemButtonWrapper.appendChild(fragmentItemButtonTpop);
    }

    fragmentItemButtonWrapper.appendChild(fragmentItemButtonLock);

    $('#fragment_list_content').append(fragmentListItem);


    // Interactions
    fragmentListItem.addEventListener('click', function(event) {
      const isActive = $(event.target).hasClass('fragment_list_item_active');
      const isCtrl = event.ctrlKey;

      if (isCtrl) {
        if (isActive) {
          // ctrl key pressed and item has already been selected -> deselect
          controller.deselectFragment(id);
        } else {
          // ctrl key is pressed and item was not selected -> select
          controller.selectFragment(id);
        }
      } else {
        // in all cases, clear the selection list first
        controller.clearSelection();
        // if element had NOT been selected before, select it now
        if (!isActive) {
          controller.selectFragment(id);
        }
      }
    });
    fragmentListItem.addEventListener('mouseenter', function(event) {
      controller.highlightFragment(id);
      sidebar.addFragmentListButtons(id);
    });
    fragmentListItem.addEventListener('mouseleave', function(event) {
      controller.unhighlightFragment(id);
      if (!$(event.target).hasClass('fragment_list_item_active')) {
        sidebar.removeFragmentListButtons(id);
      }
    });

    fragmentItemButtonRemove.addEventListener('click', function(event) {
      controller.removeFragment(id);
    }, false);
    fragmentItemButtonGoto.addEventListener('click', function(event) {
      controller.centerToFragment(id);
    }, false);
    fragmentItemButtonEdit.addEventListener('click', function(event) {
      const id = $(event.target).parent().attr('id');
      controller.changeFragment(id);
    }, false);
    fragmentItemButtonLock.addEventListener('click', function(event) {
      const id = $(event.target).closest('.fragment_list_item').attr('id');
      controller.toggleLock(id);
    }, false);
  }

  /**
   * TODO
   * @param {*} fragmentList
   * @param {*} selectedList
   */
  updateFragmentList(fragmentList, selectedList) {
    $('#fragment_list_content').empty();

    if (!$.isEmptyObject(fragmentList)) {
      for (const id in fragmentList) {
        if (Object.prototype.hasOwnProperty.call(fragmentList, id)) {
          const fragment = fragmentList[id];
          this._addFragment(id, fragment);
        }
      }

      if (!$.isEmptyObject(selectedList)) {
        for (const sId in selectedList) {
          if (Object.prototype.hasOwnProperty.call(selectedList, sId)) {
            this.selectFragment(sId);
          }
        }
      }
    } else {
      const noFragmentsText = document.createElement('div');
      noFragmentsText.setAttribute('id', 'fragment_list_nocontent');
      const text = document.createTextNode('No fragments selected');
      noFragmentsText.appendChild(text);
      $('#fragment_list_content').append(noFragmentsText);
    }
  }

  /**
   * TODO
   * @param {*} fragmentId
   */
  selectFragment(fragmentId) {
    const wrapper = $('div[id="'+fragmentId+'"]');
    wrapper.addClass('fragment_list_item_active');
    this.addFragmentListButtons(fragmentId);
  }

  /**
   * TODO
   * @param {*} fragmentId
   */
  deselectFragment(fragmentId) {
    const wrapper = $('div[id="'+fragmentId+'"]');
    wrapper.removeClass('fragment_list_item_active');
  }

  /**
   * TODO
   */
  clearSelection() {
    $('.fragment_list_item_active').removeClass('fragment_list_item_active');
    $('.fragment_list_button').addClass('hidden');
    $('#fragment_list_content .goto_button').addClass('hidden');
    $('#fragment_list_content .delete_button').addClass('hidden');
    $('#fragment_list_content .edit_button').addClass('hidden');
    $('#fragment_list_content .tpop_button').addClass('hidden');
  }

  /**
   * TODO
   * @param {*} id
   */
  highlightFragment(id) {
    const wrapper = $('div[id="'+id+'"]');
    wrapper.addClass('fragment_list_item_highlighted');
  }

  /**
   * TODO
   * @param {*} id
   */
  unhighlightFragment(id) {
    const wrapper = $('div[id="'+id+'"]');
    wrapper.removeClass('fragment_list_item_highlighted');
  }

  /**
   * TODO
   * @param {*} id
   */
  addFragmentListButtons(id) {
    const wrapper = $('div[id="'+id+'"]');
    $(wrapper).find('.delete_button').removeClass('hidden');
    $(wrapper).find('.goto_button').removeClass('hidden');
    $(wrapper).find('.edit_button').removeClass('hidden');
    $(wrapper).find('.tpop_button').removeClass('hidden');
  }

  /**
   * TODO
   * @param {*} id
   */
  removeFragmentListButtons(id) {
    const wrapper = $('div[id="'+id+'"]');
    $(wrapper).find('.delete_button').addClass('hidden');
    $(wrapper).find('.edit_button').addClass('hidden');
    $(wrapper).find('.goto_button').addClass('hidden');
    $(wrapper).find('.tpop_button').addClass('hidden');
  }

  /**
   * TODO
   * @param {Object} data
   */
  updateRedoUndo(data) {
    console.log("REDO-UNDO", data);
    if (data.undoSteps > 0) {
      $('#undo').removeClass('disabled');
      $('#undo').find('.button_number').html(data.undoSteps);
    } else {
      $('#undo').addClass('disabled');
      $('#undo').find('.button_number').html('');
    }
    if (data.redoSteps > 0) {
      $('#redo').removeClass('disabled');
      $('#redo').find('.button_number').html(data.redoSteps);
    } else {
      $('#redo').addClass('disabled');
      $('#redo').find('.button_number').html('');
    }
  }

  toggleColorInversion(color) {
    const button = $('.flip-button.'+color);
    if ($(button).hasClass('inverted')) {
      $(button).removeClass('inverted');
    } else {
      $(button).addClass('inverted');
    }
  }

  setLock(fragmentID, lockStatus) {
    if (lockStatus == true) {
      $('#'+fragmentID).find('.fragment_list_item_button_lock').addClass('locked');
    } else {
      $('#'+fragmentID).find('.fragment_list_item_button_lock').removeClass('locked');
    }
  }

  updateGraphicFilters(graphicFilters) {
    if (graphicFilters) {
      if ('brightness' in graphicFilters) $('#graphics-brightness').val(graphicFilters.brightness);
      if ('contrast' in graphicFilters) $('#graphics-contrast').val(graphicFilters.contrast);
    
      if ('invertR' in graphicFilters) {
        if (graphicFilters.invertR) $('.flip-button.R').addClass('inverted');
        else $('.flip-button.R').removeClass('inverted');
      }
      if ('invertG' in graphicFilters) {
        if (graphicFilters.invertG) $('.flip-button.G').addClass('inverted');
        else $('.flip-button.G').removeClass('inverted');
      }
      if ('invertB' in graphicFilters) {
        if (graphicFilters.invertB) $('.flip-button.B').addClass('inverted');
        else $('.flip-button.B').removeClass('inverted');
      }
    } else {
      this.resetGraphicsFilters();
    }
  }

  resetGraphicsFilters() {
    $('.flip-button').removeClass('inverted');
    $('#graphics-brightness').val(1);
    $('#graphics-contrast').val(1);
  }

  /**
   * TODO
   * @param {*} id
   * @param {*} color
   */
  addMeasurement(id, color) {
    const newMeasure = $('#new_measure');

    $('#clear-measures').removeClass('hidden');

    const measurement = $('<div>',
        {id: 'measurement-'+id, class: 'measurement active'});
    const line = $('<div>', {class: 'measure-line'});
    line.css('background', color);

    const distance = $('<div>', {class: 'measure-distance'});
    distance.text('? cm');

    const del = $('<div>', {class: 'delete small_button no_select'});
    const delImg = $('<img>',
        {src: '../imgs/symbol_bin.png'});

    del.click((event) => {
      const id = $(event.target).parent().attr('id').slice(12);
      this.controller.deleteMeasurement(id);
    });

    delImg.click((event) => {
      const id = $(event.target).parent().parent().attr('id').slice(12);
      this.controller.deleteMeasurement(id);
    });

    measurement.append(del);
    measurement.append(line);
    measurement.append(distance);
    measurement.append(distance);
    del.append(delImg);
    newMeasure.before(measurement);
  }

  /**
   * TODO
   * @param {*} id
   */
  deleteMeasurement(id) {
    const measurement = $('#measurement-'+id);
    measurement.remove();
    if ($('.measurement').length == 0) {
      $('#clear-measures').addClass('hidden');
    }
  }

  /**
   * TODO
   */
  clearMeasurements() {
    $.each($('.measurement'), (index, element) => {
      element.remove();
    });
    $('#clear-measures').addClass('hidden');
  }

  /**
   * TODO
   * @param {*} measurements
   */
  updateMeasurements(measurements) {
    for (const id in measurements) {
      if (Object.prototype.hasOwnProperty.call(measurements, id)) {
        const measurement = measurements[id];
        const distance = measurement.getDistanceInCm();
        const wrapper = $('#measurement-'+id);
        wrapper.removeClass('active');
        const distanceText = wrapper.find('.measure-distance');
        distanceText.text(distance + ' cm');
      }
    }
  }
}

module.exports.Sidebar = Sidebar;
