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
  _addFragment(id, name, imgUrl, tpopUrl) {
    const sidebar = this;
    const controller = this.controller;

    // creating elements
    const fragmentListItem = document.createElement('div');
    const fragmentItemThumbWrapper = document.createElement('div');
    const fragmentItemThumbnail = document.createElement('img');
    const fragmentItemName = document.createElement('div');
    const fragmentItemButtonWrapper = document.createElement('div');
    const fragmentItemButtonRemove = document.createElement('div');
    const fragmentItemButtonGoto = document.createElement('div');
    const fragmentItemButtonEdit = document.createElement('div');
    const fragmentItemNameText = document.createTextNode(name);
    
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
    */

    fragmentListItem.appendChild(fragmentItemThumbWrapper);
    fragmentListItem.appendChild(fragmentItemButtonWrapper);

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
          const name = fragmentList[id].getName();
          const imageUrl = fragmentList[id].getImageURL();
          const tpopURL = fragmentList[id].getTPOPURL();
          this._addFragment(id, name, imageUrl, tpopURL);
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
    if (data.undoSteps) {
      $('#undo').removeClass('disabled');
    } else {
      $('#undo').addClass('disabled');
    }
    if (data.redoSteps) {
      $('#redo').removeClass('disabled');
    } else {
      $('#redo').addClass('disabled');
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

  resetGraphicsFilters() {
    $('.flip-button').removeClass('inverted');
    $('#graphics-brightness').val(0);
    $('#graphics-contrast').val(0);
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
