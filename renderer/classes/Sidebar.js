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
  _addFragment(id, name, imgUrl) {
    const sidebar = this;
    const controller = this.controller;
    // thumbnail wrapper
    const fragmentWrapper = document.createElement('div');
    fragmentWrapper.setAttribute('class', 'fragment_list_item');
    fragmentWrapper.setAttribute('id', id);

    // thumbnail description
    const fragmentName = document.createElement('div');
    fragmentName.setAttribute('class', 'fragment_list_item_name');
    const text = document.createTextNode(name);
    fragmentName.append(text);

    // thumbnail itself
    const fragmentThumbWrapper = document.createElement('div');
    fragmentThumbWrapper.setAttribute('class',
        'fragment_list_item_thumbwrapper');

    const fragmentThumb = document.createElement('img');
    fragmentThumb.setAttribute('class', 'fragment_list_item_img');
    fragmentThumb.src = imgUrl;

    // interface buttons
    const deleteButton = document.createElement('div');
    deleteButton.setAttribute('class',
        'fragment_list_button delete_button hidden');
    const gotoButton = document.createElement('div');
    gotoButton.setAttribute('class', 'fragment_list_button goto_button hidden');
    const detailsButton = document.createElement('div');
    detailsButton.setAttribute('class',
        'fragment_list_button details_button hidden');

    // generating DOM structure
    fragmentThumbWrapper.appendChild(fragmentThumb);
    fragmentWrapper.appendChild(fragmentThumbWrapper);
    fragmentWrapper.appendChild(fragmentName);
    fragmentWrapper.appendChild(deleteButton);
    fragmentWrapper.appendChild(gotoButton);
    // fragmentWrapper.appendChild(detailsButton); TODO - temporarily removed

    $('#fragment_list_content').append(fragmentWrapper);


    // Interactions
    fragmentWrapper.addEventListener('click', function(event) {
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
    fragmentWrapper.addEventListener('mouseenter', function(event) {
      controller.highlightFragment(id);
      sidebar.addFragmentListButtons(id);
    });
    fragmentWrapper.addEventListener('mouseleave', function(event) {
      controller.unhighlightFragment(id);
      if (!$(event.target).hasClass('fragment_list_item_active')) {
        sidebar.removeFragmentListButtons(id);
      }
    });

    deleteButton.addEventListener('click', function(event) {
      controller.removeFragment(id);
    }, false);
    gotoButton.addEventListener('click', function(event) {
      controller.centerToFragment(id);
    }, false);
    detailsButton.addEventListener('click', function(event) {
      controller.sendToServer('server-open-details', id);
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
          this._addFragment(id, fragmentList[id].getName(),
              fragmentList[id].getImageURL());
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
    $(wrapper).find('.details_button').removeClass('hidden');
  }

  /**
   * TODO
   * @param {*} id
   */
  removeFragmentListButtons(id) {
    const wrapper = $('div[id="'+id+'"]');
    $(wrapper).find('.delete_button').addClass('hidden');
    $(wrapper).find('.details_button').addClass('hidden');
    $(wrapper).find('.goto_button').addClass('hidden');
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
