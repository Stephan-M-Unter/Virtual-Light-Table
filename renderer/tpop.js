const {ipcRenderer} = require('electron');

const batchSize = 30;
let maxIndex = null;
let lastIndex = -1;
let currentPage = 0;
const maxPageSize = 200;
let filters = [];
const filterOperators = {
  'list': ['contains', 'contains not', 'empty', 'not empty'],
  'boolean': ['true', 'false'],
  'string': ['contains', 'contains not', 'empty', 'not empty'],
  'number': ['<', '<=', '=', '>=', '>', 'empty', 'not empty'],
};
let requesting = false;

$(document).ready(() => {
  requestFilter();
  /*
    ### 1. Anfrage an Server: DATEN! ('server-load-tpop-json')

    */
});

/**
 *
 * @param {*} startIndex
 * @param {*} endIndex
 */
function requestBatch() {
  const pageEnd = (currentPage+1)*maxPageSize-1;
  if (lastIndex == pageEnd) {
    // TODO füge NEXT PAGE button hinzu
  } else if (!requesting) {
    requesting = true;
    let endIndex = lastIndex+batchSize;
    if (endIndex > pageEnd) {
      endIndex = pageEnd;
    }
    const data = {
      'startIndex': lastIndex+1,
      'endIndex': endIndex,
    };
    ipcRenderer.send('server-load-tpop-json', data);
    lastIndex = endIndex;
  }
}

/**
 *
 */
function resetTPOPView() {
  lastIndex = -1;
  currentPage = 0;
  $('#tile-view').empty();
}

/**
 *
 */
function requestFilter() {
  resetTPOPView();
  const filterRequest = [];

  const activeFilters = $('.filter');
  activeFilters.each((idx) => {
    const activeFilter = activeFilters[idx];
    const activeAttribute = $(activeFilter).attr('data-attribute');
    const activeOperator = $(activeFilter).attr('data-operator');
    const activeValue = $(activeFilter).attr('data-value');
    const activeType = filters.find((filter) => {
      return filter.attribute === activeAttribute;
    }).type;
    const activeParent = filters.find((filter) => {
      return filter.attribute === activeAttribute;
    }).parent;
    const filterData = {
      attribute: activeAttribute,
      operator: activeOperator,
      value: activeValue,
      parent: activeParent,
      type: activeType,
    };
    filterRequest.push(filterData);
  });

  ipcRenderer.send('server-tpop-filter', filterRequest);
}

/**
 *
 * @param {*} tpopID
 */
function requestPosition(tpopID) {
  ipcRenderer.send('server-tpop-position', tpopID);
}

/**
 *
 * @param {*} id
 */
function requestDetails(id) {
  console.log('Sending [server-tpop-details] for id '+id);
  ipcRenderer.send('server-tpop-details', id);
}

/**
 *
 * @param {*} details
 */
function displayDetails(details) {
  $('#detail-view .subtitle.hidden').removeClass('hidden');
  $('#detail-view .detail-symbol.hidden').removeClass('hidden');
  $('#detail-page-warning').addClass('hidden');
  $('#detail-link').attr('href', details.permalink);
  $('#detail-name').html(details.InventoryNumber);
  $('#detail-recto').attr('src', '../imgs/examples/dummy.jpg');
  $('#detail-verso').attr('src', '../imgs/examples/dummy.jpg');
  $('#detail-find').attr('data-id', details.TPOPid);

  if (details['TPOPidsJoins']) {
    if (details['TPOPidsJoins'].length == 0) {
      $('#detail-joins').addClass('hidden');
      $('#detail-joins').find('.subtitle').html('');
    } else {
      $('#detail-joins').removeClass('hidden');
      $('#detail-joins').find('.subtitle').html('Joins ('+details['TPOPidsJoins'].length+' objects)');
    }
  }
}

/**
 *
 * @param {*} newPageNumber
 */
function loadPage(newPageNumber) {
  if (!requesting) {
    if (newPageNumber <= 0) {
      $('#tpop-left-arrow').addClass('inactive');
    } else {
      $('#tpop-left-arrow').removeClass('inactive');
    }
    if (newPageNumber+1 > maxIndex / maxPageSize) {
      $('#tpop-right-arrow').addClass('inactive');
    } else {
      $('#tpop-right-arrow').removeClass('inactive');
    }
    if (newPageNumber >= 0 && newPageNumber <= maxIndex/maxPageSize) {
      $('#tile-view').empty();
      lastIndex = newPageNumber * maxPageSize - 1;
      currentPage = newPageNumber;
      requestBatch();
    }
  }
}

function checkForRequest() {
  h_offset = $('#tile-view').prop('offsetHeight');
  h_scroll = $('#tile-view').prop('scrollHeight');
  if (h_offset + 120 >= h_scroll) {
    requestBatch();
  }
}

/**
 *
 */
function updateLoadButton() {
  const objectsToLoad = $('.preview').length;
  if (objectsToLoad > 0) {
    $('#load-text').html('Add '+objectsToLoad+' fragment(s) to table');
    $('#load').removeClass('inactive');
  } else {
    $('#load-text').html('Select fragments');
    $('#load').addClass('inactive');
  }
}

/**
 *
 * @param {*} tile
 */
function chooseTile(tile) {
  const id = tile.attr('id').replace('/', '\\/');
  if (tile.hasClass('loading')) {
    tile.removeClass('loading');
    $('#load-'+id).css('animation-name', 'slideDown');
    $('#load-'+id).bind('animationend', () => {
      $('#load-'+id).remove();
      updateLoadButton();
    });
  } else {
    tile.addClass('loading');
    const tileClone = tile.clone();
    tileClone.attr('id', 'load-'+id);
    tileClone.removeClass('selected');
    if ($('#'+id).hasClass('selected')) {
      tileClone.addClass('selected');
    }
    tileClone.addClass('preview');
    tileClone.click(function(event) {
      const id = $(event.target).attr('data-id').replace('load-', '');
      $('.selected').removeClass('selected');
      $('#'+id).addClass('selected');
      $('#load-'+id).addClass('selected');
      requestDetails(id);
    });

    tileClone.find('.multibox').click(function(event) {
      const id = $(event.target).parent().attr('id').replace('load-', '');
      $('#'+id).removeClass('loading');
      tile.removeClass('loading');
      $('#load-'+id).css('animation-name', 'slideDown');
      $('#load-'+id).bind('animationend', () => {
        $('#load-'+id).remove();
        updateLoadButton();
      });
    });
    $('#loading-view').append(tileClone);
  }
  updateLoadButton();
  updateSelectedScrollers();
}

/**
 *
 */
function updateSelectedScrollers() {
  const w_scroll = $('#loading-view').prop('scrollWidth');
  const w_div = $('#loading-view').width();
  const scroll_pos = $('#loading-view').scrollLeft();

  if (w_scroll > w_div) {
    if (scroll_pos > 0) {
      $('#loading-left-arrow').removeClass('inactive');
    } else {
      $('#loading-left-arrow').addClass('inactive');
    }

    if (scroll_pos >= w_scroll-w_div) {
      $('#loading-right-arrow').addClass('inactive');
    } else {
      $('#loading-right-arrow').removeClass('inactive');
    }
  } else {
    $('#loading-left-arrow').addClass('inactive');
    $('#loading-right-arrow').addClass('inactive');
  }
}

/**
 *
 * @param {*} event
 */
function resizeSidebar(event) {
  const x = event.pageX;
  $('#sidebar').css('width', x);
  setMaxWidthMainArea();
}

/**
 *
 * @param {*} event
 */
function resizeDetailView(event) {
  const x = event.pageX;
  const view_w = $(window).width();
  $('#detail-view').css('width', view_w-x);
  setMaxWidthMainArea();
}

/**
 *
 */
function setMaxWidthMainArea() {
  const w_viewport = $(window).width();
  const w_sidebar = parseInt($('#sidebar').css('width'), 10);
  const w_details = parseInt($('#detail-view').css('width'), 10);
  const max_w = w_viewport - w_sidebar - w_details;
  $('#main-area').css('width', max_w-4);
  $('#main-area').css('max-width', max_w);
  checkForRequest();
}

/**
 *
 */
function resetFilterSelection() {
  $('#filter-value').val('');
  $('.operator-selected').removeClass('operator-selected');
  $('#filter-attribute').val('');
  $('#filter-operator-container').addClass('hidden');
  $('#filter-value-container').addClass('hidden');
}

/**
 *
 * @param {*} type
 */
function setFilterOperators(type) {
  $('#filter-operator').empty();
  const operators = filterOperators[type];
  operators.forEach((operator) => {
    const op = $('<option value="'+operator+'">'+operator+'</option>');
    $('#filter-operator').append(op);
  });
  if (type == 'boolean') {
    $('#filter-input').addClass('hidden');
  } else {
    $('#filter-input').removeClass('hidden');
  }
}

/**
 *
 * @param {*} data
 */
function addTile(idx, n_objects, tpopJson) {
  setTimeout(function() {
    const data = tpopJson[idx];
    const tile = $('<div id="'+data.id+'" class="tile no-select" data-id="'+data.id+'"></div>');
    const img = $('<img src="'+data.urlRecto+'" data-id="'+data.id+'"/>');
    const name = $('<div class="name" data-id="'+data.id+'">'+data.name+'</div>');
    const distance = $('<div class="distance">xx.xxxx</div>');
    const multibox = $('<div class="multibox" data-id="'+data.id+'"></div>');

    if ($('#loading-view').find('#load-'+data.id).length > 0) {
      tile.addClass('loading');
      if ($('#load-'+data.id).hasClass('selected')) {
        tile.addClass('selected');
      }
    }
    if ($('#detail-find').attr('data-id') == data.id) {
      tile.addClass('selected');
    }

    tile.append(img);
    tile.append(name);
    tile.append(distance);
    tile.append(multibox);
    $('#tile-view').append(tile);

    tile.click(function(event) {
      const dataId = $(event.target).attr('data-id');
      const tempDataId = dataId.replace('/', '\\/');
      $('.selected').removeClass('selected');
      $('#'+tempDataId).addClass('selected');
      $('#load-'+tempDataId).addClass('selected');
      requestDetails(dataId);
    });

    tile.dblclick(function(event) {
      const dataId = $(event.target).attr('data-id');
      chooseTile($('#'+dataId));
    });

    multibox.click(function(event) {
      event.stopPropagation();
      const tile = $(event.target).parent();
      chooseTile(tile);
    });

    idx++;
    if (idx < n_objects) {
      addTile(idx, n_objects, tpopJson);
    } else {
      requesting = false;
      checkForRequest();
    }
  }, 20);
}

/**
 *
 * @param {*} exceptionElement
 */
function closeAllLists(exceptionElement) {
  $('#filter-attribute-list').addClass('hidden');
  const listElements = $('.autocomplete-items');
  listElements.each((idx, list) => {
    const listID = $(list).attr('id');
    if (listID != exceptionElement) {
      $(list).remove();
    }
  });
}

/**
 *
 */
function checkFilterCompleteness() {
  const attribute = $('#filter-attribute').val();
  const operator = $('.operator-selected').html();
  const value = $('#filter-value').val();
  let filterValid = true;

  if (['<', '<=', '=', '>=', '>'].includes(operator)) {
    if (value == '' || isNaN(value)) {
      filterValid = false;
    }
  } else if (['contains', 'contains not'].includes(operator)) {
    if (value == '') {
      filterValid = false;
    }
  }

  if (filterValid) {
    $('#filter-add-button').removeClass('hidden');
  } else {
    $('#filter-add-button').addClass('hidden');
  }
}

/**
 *
 * @param {*} attributeValue
 */
function checkOperators(attributeValue) {
  $('#filter-value-container').addClass('hidden');
  $('#filter-value').val('');
  if (filters.map((e) => e.attribute).includes(attributeValue)) {
    $('#filter-operator-container').removeClass('hidden');
    $('#filter-operator-wheel').empty();
    const type = filters.find((e) => {
      return e.attribute === attributeValue;
    }).type;
    for (const operator of filterOperators[type]) {
      const operatorItem = $('<div>'+operator+'</div>');
      operatorItem.click(function() {
        $('.operator-selected').removeClass('operator-selected');
        $(this).addClass('operator-selected');
        if (['empty', 'not empty', 'true', 'false'].includes($(this).html())) {
          $('#filter-value-container').addClass('hidden');
        } else {
          $('#filter-value-container').removeClass('hidden');
        }
        checkFilterCompleteness();
        closeAllLists();
      });
      $('#filter-operator-wheel').append(operatorItem);
    }
  } else {
    $('#filter-operator-container').addClass('hidden');
    $('#filter-operator-wheel').empty();
  }
}

/**
 *
 * @returns
 */
function checkAttributeInput() {
  const val = $('#filter-attribute').val();
  const val_low = val.toLowerCase();

  closeAllLists();

  if (val == '') return false;

  checkOperators(val);

  let arr = filters.map((obj) => {
    const attribute = obj.attribute.toLowerCase();
    if (attribute.toLowerCase().includes(val_low)) {
      return obj.attribute;
    }
  });
  arr = arr.filter((x) => {
    return x !== undefined;
  });

  if (arr.length < 1) {
    return false;
  }

  const autocompleteList = $('<div id="attribute-autocomplete-items" class="autocomplete-items"></div>');
  $(this).parent().append(autocompleteList);

  for (const attribute of arr) {
    const attribute_low = attribute.toLowerCase();
    const pos = attribute_low.indexOf(val_low);
    let html = attribute.slice(0, pos);
    html += '<span class="autocomplete-highlight">';
    html += attribute.slice(pos, pos+val.length);
    html += '</span>';
    html += attribute.slice(pos+val.length);
    html += '<input type="hidden" value="'+attribute+'">';
    const autocompleteItem = $('<div>'+html+'</div>');

    autocompleteItem.on('click', function(event) {
      $('#filter-attribute').val($($(this).find('input')[0]).val());
      closeAllLists();
      checkAttributeInput();
    });
    autocompleteList.append(autocompleteItem);
  }
}

$('#left-resize-slider').on('mousedown', (event) => {
  $(window).on('mousemove', (event) => {
    resizeSidebar(event);
  });
});

$('#right-resize-slider').on('mousedown', (event) => {
  $(window).on('mousemove', (event) => {
    resizeDetailView(event);
  });
});
$(window).on('mouseup', (event) => {
  $(window).off('mousemove');
});

$('#filter-add').click((event) => {
  resetFilterSelection();
  $('#filter-overlay').css('display', 'flex');
});

$('#filter-attribute').on('change', () => {
  const attribute = $('#filter-attribute').val();
  if (attribute in filters.map((obj) => {
    return obj.attribute;
  })) {
    const type = filters.find((filter) => {
      return filter.attribute === attribute;
    }).type;
    setFilterOperators(type);
  }
});

$('#filter-add-button').click(() => {
  const attribute = $('#filter-attribute').val();
  const operator = $('.operator-selected').html();
  let value = $('#filter-value').val();
  const filter = $('<div class="filter"></div>');
  filter.attr('data-attribute', attribute);
  filter.attr('data-operator', operator);
  filter.attr('data-value', value);

  if (operator == 'contains' || operator == 'contains not') {
    value = '"' + value + '"';
  }

  const filterDescriptor = $('<div class="filter-descriptor">'+attribute+' '+operator+' '+value+'</div>');
  const filterDelete = $('<div class="filter-delete no-select">x</div>');

  filterDelete.click(function(event) {
    $(this).parent().remove();
    requestFilter();
  });

  filter.append(filterDescriptor);
  filter.append(filterDelete);

  $('#filter-list').append(filter);
  $('#filter-overlay').css('display', 'none');

  requestFilter();
});

$('#filter-close').click(function(event) {
  $('#filter-overlay').css('display', 'none');
  resetFilterSelection();
});

$('html').keydown(function(event) {
  if (event.keyCode == 27) {
    // ESC -> close filter view
    $('#filter-overlay').css('display', 'none');
  }
});

$('#tile-view').scroll(function(event) {
  const h_scroll = $('#tile-view').prop('scrollHeight');
  const h_div = $('#tile-view').height();
  const h_current = $('#tile-view').scrollTop();
  if (h_scroll - h_div - 120 < h_current) {
    requestBatch();
  }
});

$('#tpop-left-arrow').click(function() {
  if (!$('#tpop-left-arrow').hasClass('inactive')) {
    loadPage(currentPage-1);
  }
});
$('#tpop-right-arrow').click(function() {
  if (!$('#tpop-right-arrow').hasClass('inactive')) {
    loadPage(currentPage+1);
  }
});

$('#loading-left-arrow').click(function() {
  const scroll_w = $('#loading-view').scrollLeft();
  // $('#loading-view').scrollLeft(scroll_w - 154);
  $('#loading-view').stop().animate({scrollLeft: scroll_w-154}, 100, () => {
    updateSelectedScrollers();
  });
});

$('#loading-right-arrow').click(function() {
  const scroll_w = $('#loading-view').scrollLeft();
  // $('#loading-view').scrollLeft(scroll_w + 154);
  $('#loading-view').stop().animate({scrollLeft: scroll_w+154}, 100, () => {
    updateSelectedScrollers();
  });
});

$('#cancel').click(function() {
  ipcRenderer.send('server-close-tpop');
});

$('#detail-find').click(function() {
  const tpopID = $('#detail-find').attr('data-id');
  $('#detail-page-warning').addClass('hidden');
  requestPosition(tpopID);
});

$('#filter-attribute').on('input', checkAttributeInput);
$('#filter-value').on('input', checkFilterCompleteness);

$('#filter-attribute-dropdown').click(function() {
  const closed = $('#filter-attribute-list').hasClass('hidden');
  closeAllLists();
  if (closed) $('#filter-attribute-list').removeClass('hidden');
});

ipcRenderer.on('tpop-json-data', (event, tpopJson) => {
  // show data
  const objects = tpopJson.objects;

  filters = tpopJson.filters;
  const filterAttributes = filters.map((e) => e.attribute).sort();
  $('#filter-attribute-list').empty();
  for (const attribute of filterAttributes) {
    const filterItem = $('<div class="filter-attribute-item">'+attribute+'</div>');
    filterItem.click(function() {
      $('#filter-attribute').val($(this).html());
      closeAllLists();
      checkAttributeInput();
    });
    $('#filter-attribute-list').append(filterItem);
  }

  maxIndex = tpopJson.maxObjects;
  let text = 'TPOP Fragments ('+maxIndex+' fragments)';
  text += ' - Page '+(currentPage+1)+'/'+Math.ceil(maxIndex/maxPageSize);
  $('#tpop-tile-view').find('.rotated-title').html(text);
  if (maxIndex < maxPageSize) {
    $('#tpop-right-arrow').addClass('inactive');
  } else {
    $('#tpop-right-arrow').removeClass('inactive');
  }
  const n_objects = objects.length;
  if (n_objects > 0) {
    addTile(0, n_objects, objects);
  } else {
    requesting = false;
  }
});

ipcRenderer.on('tpop-json-failed', () => {
  // TODO show error message
  // show options to close or retry
  console.log('json failed');
});

ipcRenderer.on('tpop-details', (event, details) => {
  console.log('Receiving details:', details);
  displayDetails(details);
});

ipcRenderer.on('tpop-filtered', () => {
  requestBatch();
});

ipcRenderer.on('tpop-position', (event, data) => {
  if (data.pos == -1) {
    $('#detail-page-warning').removeClass('hidden');
  } else {
    const tpopID = data.tpopID;
    const page = Math.ceil(data.pos/maxPageSize)-1;
    loadPage(page);
  }
});