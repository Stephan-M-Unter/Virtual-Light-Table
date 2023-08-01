const {ipcRenderer} = require('electron');
const LOGGER = require('../statics/LOGGER');

const rangeValues = [1, 2, 3, 4, 5, 10, 20];
const batchSize = 30;
let activeTPOPs = [];
let maxIndex = null;
let lastIndex = -1;
let currentPage = 0;
let isScrolling = null;
const maxPageSize = 200;
let filters = [];
let gridView = 'recto';
const filterOperators = {
  'list': ['contains', 'contains not', 'empty', 'not empty'],
  'boolean': ['true', 'false'],
  'string': ['contains', 'contains not', 'empty', 'not empty'],
  'number': ['<', '<=', '=', '>=', '>', 'empty', 'not empty'],
};
let requesting = false;

$(document).ready(() => {
  checkForData();
});

function checkForData() {
  LOGGER.send('TPOP', 'server-check-tpop-data');
  ipcRenderer.send('server-check-tpop-data');
}

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
    LOGGER.send('TPOP', 'server-load-tpop-json', data);
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

function addFilter(attribute, operator, value, ignoreRequest) {
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

  if (!ignoreRequest) {
    requestFilter();
  }
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

  LOGGER.send('TPOP', 'server-tpop-filter', filterRequest);
  ipcRenderer.send('server-tpop-filter', filterRequest);
}

/**
 *
 * @param {*} tpopID
 */
function requestPosition(tpopID) {
  LOGGER.send('TPOP', 'server-tpop-position', tpopID);
  ipcRenderer.send('server-tpop-position', tpopID);
}

/**
 *
 * @param {*} id
 */
function requestDetails(id) {
  LOGGER.send('TPOP', 'server-tpop-details', id);
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
  $('#detail-link').removeClass('hidden');
  $('#detail-link').attr('href', details.permalink);
  $('#detail-name').html(details.InventoryNumber);
  const imageRecto = details.ObjectImageRecto || '../imgs/symbol_no_pic.png';
  const imageVerso = details.ObjectImageVerso || '../imgs/symbol_no_pic.png';
  $('#detail-recto').attr('src', imageRecto);
  $('#detail-verso').attr('src', imageVerso);
  $('#detail-find').attr('data-id', details.TPOPid);
  $('#detail-joins-list').empty();

  const id = details['TPOPid'];
  $('.selected').removeClass('selected');
  $('#'+id).addClass('selected');
  $('#load-'+id).addClass('selected');

  if (details.ObjectImageRectoHi) {
    $('#detail-recto-magnify').removeClass('hidden');
    $('#detail-recto-magnify').attr('href', details.ObjectImageRectoHi);
  } else {
    $('#detail-recto-magnify').addClass('hidden');
    $('#detail-recto-magnify').attr('href', '#');
  }
  if (details.ObjectImageVersoHi) {
    $('#detail-verso-magnify').removeClass('hidden');
    $('#detail-verso-magnify').attr('href', details.ObjectImageVersoHi);
  } else {
    $('#detail-verso-magnify').addClass('hidden');
    $('#detail-verso-magnify').attr('href', '#');
  }

  if (('TPOPidsJoins' in details)) {
    if (details['TPOPidsJoins'] == null || details['TPOPidsJoins'].length == 0) {
      // object has no joins registered
      $('#detail-joins').addClass('hidden');
      $('#detail-joins').find('.subtitle').html('');
    } else {
      // object has registered joins
      // $('#detail-joins').removeClass('hidden');
      $('#detail-joins').find('.subtitle').html('Registered Joins ('+details['TPOPidsJoins'].length+' objects)');
      LOGGER.send('TPOP', 'server-tpop-basic-info', details['TPOPidsJoins']);
      ipcRenderer.send('server-tpop-basic-info', details['TPOPidsJoins']);
    }
  }
}

/**
 *
 * @param {*} newPageNumber
 */
function loadPage(newPageNumber) {
  if (!requesting) {
    if (newPageNumber >= 0 && newPageNumber <= maxIndex/maxPageSize) {
      $('#tile-view').empty();
      lastIndex = newPageNumber * maxPageSize - 1;
      currentPage = newPageNumber;
      updateTPOPScrollers();
      requestBatch();
    }
  }
}

function checkForRequest() {
  const h_offset = $('#tile-view').prop('offsetHeight');
  const h_scroll = $('#tile-view').prop('scrollHeight');
  if (h_offset + 120 >= h_scroll) {
    requestBatch();
  }
}

/**
 *
 */
function updateLoadButton() {
  const objectsToLoad = $('#loading-view').children().length;
  if (objectsToLoad > 0) {
    $('#load-text').html('Add '+objectsToLoad+' fragment(s) to table');
    $('#load').removeClass('disabled');
  } else {
    $('#load-text').html('Select fragments');
    $('#load').addClass('disabled');
  }
}

/**
 * 
 */
function updateMLButton() {
  let fragments_selected = false;
  let ml_modes_selected = false;
  const objectsToLoad = $('#loading-view').children().length;

  if (objectsToLoad > 0) {
    fragments_selected = true;
  }

  for (const mode of $('.ml-weight')) {
    if (!$(mode).is(':disabled')) {
      ml_modes_selected = true;
      break;
    }
  }
  
  if (fragments_selected && ml_modes_selected) {
    $('#ml-calculate').removeClass('inactive');
  } else {
    $('#ml-calculate').addClass('inactive');
  }
}

function updateMLSliders() {
  for (const slider of $('.ml-weight')) {
    const mode = $(slider).attr('id').replace('ml-', '');
    if ($(slider).is(':disabled')) {
      $('#ml-label-'+mode).addClass('invisible');
      continue;
    }
    const sliderValue = $(slider).val();
    const modeValue = rangeValues[sliderValue];
    $('#ml-label-'+mode).removeClass('invisible');
    $('#ml-label-'+mode).html(modeValue);

  }
}

/**
 *
 */
function updateTPOPScrollers() {
  const maxPage = Math.floor(maxIndex / maxPageSize);
  if (currentPage <= 0) {
    $('#tpop-left-arrow').addClass('inactive');
  } else {
    $('#tpop-left-arrow').removeClass('inactive');
  }
  if (currentPage >= maxPage) {
    $('#tpop-right-arrow').addClass('inactive');
  } else {
    $('#tpop-right-arrow').removeClass('inactive');
  }
}

/**
 *
 * @param {*} id
 * @param {*} d_name
 * @param {*} url
 */
function selectTile(id, d_name, url) {
  $('#'+id).addClass('loading');
  $('#join-'+id).addClass('loading');
  $('#join-'+id).find('img').attr('src', '../imgs/symbol_minus_zoom.png');

  if ($('#load-'+id).length == 0) {
    const tile = $('<div id="load-'+id+'" class="tile no-select" data-id="'+id+'"></div>');
    const img = $('<img src="'+url+'" data-id="'+id+'"/>');
    const name = $('<div class="name" data-id="'+id+'">'+d_name+'</div>');
    const multibox = $('<div class="multibox" data-id="'+id+'"></div>');
  
    $(tile).attr('data-features', $('#'+id).attr('data-features'));
  
    tile.addClass('loading');
    if ($('#'+id).hasClass('selected')) {
      tile.addClass('selected');
    }
  
    tile.append(img);
    tile.append(name);
    tile.append(multibox);
    $('#loading-view').append(tile);
  
    tile.click(function(event) {
      const id = $(event.target).attr('data-id');
      requestDetails(id);
    });
  
    tile.dblclick(function(event) {
      const id = $(event.target).attr('data-id');
      deselectTile(id);
    });
  
    multibox.click(function(event) {
      event.stopPropagation();
      const id = $(this).parent().attr('data-id').replace('load-', '');
      deselectTile(id);
    });
  
    const selectedElements = $('#loading-view').children().length;
    if (selectedElements == 0) {
      $('#loading-tile-view').find('.rotated-title').html('Selected');
    } else {
      $('#loading-tile-view').find('.rotated-title').html('Selected ('+selectedElements+')');
    }
    
    checkAvailableMLFeatures();
    updateSelectedScrollers();
    updateLoadButton();
    updateMLButton();
  }
}

/**
 *
 * @param {*} id
 */
function deselectTile(id) {
  $('#join-'+id).removeClass('loading');
  $('#join-'+id).find('img').attr('src', '../imgs/symbol_plus_zoom.png');
  $('#'+id).removeClass('loading');
  $('#load-'+id).css('animation-name', 'slideDown');
  $('#load-'+id).bind('animationend', () => {
    $('#load-'+id).remove();
    const n_selected = +$('#loading-view').children().length;
    if (n_selected > 0) {
      $('#loading-tile-view').find('.rotated-title').html('Selected ('+n_selected+')');
    } else {
      $('#loading-tile-view').find('.rotated-title').html('Selected');
    }
    checkAvailableMLFeatures();
    updateLoadButton();
    updateMLButton();
  });
  updateSelectedScrollers();
}

function displayFolders(folderList) {
  let total = 0;
  let minFolder = null;
  let maxFolder = null;
  const minPercent = 0.2;
  const maxPercent = 0.8;

  for (const folder of folderList) {
    total += folder.amount;
    if (!minFolder || folder.amount < minFolder) minFolder = folder.amount;
    if (!maxFolder || folder.amount > maxFolder) maxFolder = folder.amount;
  }

  $('#folder-grid').empty();
  $('#folder-overlay').css('display', 'flex');
  for (const folder of folderList) {
    const folderTile = document.createElement('div');
    const folderImage = document.createElement('img');
    const folderLabel = document.createElement('div');
    const folderLabelText = document.createTextNode(folder.name);
    const folderAmount = document.createElement('div');
    const folderAmountText = document.createTextNode(folder.amount);

    folderTile.setAttribute('class', 'folder-tile');
    folderImage.setAttribute('class', 'folder-image');
    folderLabel.setAttribute('class', 'folder-label');
    folderAmount.setAttribute('class', 'folder-amount');
    folderImage.src = "../imgs/symbol_folder.png";

    const ratio = (folder.amount - minFolder) / (maxFolder - minFolder);
    const ratioPercent = ratio * (maxPercent - minPercent) + minPercent;

    $(folderImage).css('width', ratioPercent*100+'%');
    $(folderImage).css('height', ratioPercent*100+'%');

    folderTile.appendChild(folderImage);
    folderTile.appendChild(folderLabel);
    folderLabel.appendChild(folderLabelText);
    folderTile.appendChild(folderAmount);
    folderAmount.appendChild(folderAmountText);
    $('#folder-grid').append(folderTile);

    folderTile.addEventListener('click', function(event) {
      $('.filter[data-attribute="InventoryNumber"]').remove();
      addFilter('InventoryNumber', 'contains', folder.name);
      $('#folder-overlay').css('display', 'none');
    });
  }
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

    if (w_scroll <= Math.ceil(w_div) || scroll_pos >= Math.floor(w_scroll-w_div)) {
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
  $('#filter-attribute').val('');
  $('#filter-add-button').addClass('disabled');
  $('.operator-selected').removeClass('operator-selected');
  $('#filter-value').attr('disabled', true);
  $('#filter-operator-wheel').empty();
  $('#filter-operator-wheel').append('<div>Select Valid Attribute</div>');
}

/**
 *
 */
function flipGrid() {
  if (gridView == 'recto') {
    gridView = 'verso';
    $('#flip-grid-label').removeClass('recto');
  } else {
    gridView = 'recto';
    $('#flip-grid-label').addClass('recto');
  }
  for (const el of $('.tile img')) {
    const op = $(el).attr('data-opposite');
    const src = $(el).attr('src');
    $(el).attr('data-opposite', src);
    $(el).attr('src', op);
  }
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

    
    let img;
    if (gridView == 'recto') {
      img = $('<img src="'+data.urlRecto+'" data-id="'+data.id+'" data-opposite="'+data.urlVerso+'"/>');
    } else {
      img = $('<img src="'+data.urlVerso+'" data-id="'+data.id+'" data-opposite="'+data.urlRecto+'"/>');
    }
    const name = $('<div class="name" data-id="'+data.id+'">'+data.name+'</div>');
    let d = '';
    if (data.distance) {
      d = data.distance;
    }
    const distance = $('<div class="distance">'+d+'</div>');
    const multibox = $('<div class="multibox" data-id="'+data.id+'"></div>');
    const ml = $('<div class="ml-indicator"></div>');
    
    if ('features' in data) {
      $(tile).attr('data-features', data.features);
    }
    
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
    if (activeTPOPs.includes(data.id)) {
      const overlay = $('<div title="Already used on this table" class="used" data-id="'+data.id+'"></div>')
      // const overlay = $('<div title="Already used on this table" class="used"></div>')
      tile.append(overlay);
    }
    tile.append(name);
    tile.append(distance);
    tile.append(multibox);
    tile.append(ml);
    $('#tile-view').append(tile);

    tile.click(function(event) {
      const dataId = $(tile).attr('data-id');
      requestDetails(dataId);
    });

    tile.dblclick(function(event) {
      const dataId = $(event.target).attr('data-id');
      if ($(this).hasClass('loading')) {
        deselectTile(dataId);
      } else {
        const name = $(this).find('.name').html();
        const url = $(this).find('img').attr('src');
        selectTile(dataId, name, url);
      }
    });

    multibox.click(function(event) {
      event.stopPropagation();
      const tile = $(event.target).parent();
      const dataId = tile.attr('data-id');
      if (tile.hasClass('loading')) {
        deselectTile(dataId);
      } else {
        const name = tile.find('.name').html();
        const url = tile.find('img').attr('src');
        selectTile(dataId, name, url);
      }
    });

    idx++;
    if (idx < n_objects) {
      addTile(idx, n_objects, tpopJson);
    } else {
      requesting = false;
      if (isScrolling) scrollToID(isScrolling);
      updateMLIndicators();
      checkForRequest();
    }
  }, 10);
}

function checkAvailableMLFeatures() {
  let fragmentFeatures = [];
  for (const tile of $('.loading')) {
    let feats = $(tile).attr('data-features');
    if (feats) {
      feats = feats.split(',');
      fragmentFeatures = fragmentFeatures.concat(feats);
    }
  }
}

function checkMLFeatures(tpopid) {
  const features = $('#'+tpopid).attr('data-features');
  const activeFeatures = [];
  for (const slider of $('.ml-weight')) {
    if ($(slider).is(':disabled')) continue;
    const name = $(slider).attr('id').replace('ml-', '');
    activeFeatures.push(name);
  }
  if (activeFeatures.length == 0) {
    $('#'+tpopid).find('.ml-indicator').removeClass('negative');
    $('#'+tpopid).find('.ml-indicator').removeClass('positive');
    return 'noFeatures';
  }
  for (const feature of activeFeatures) {
    if (!features || features.indexOf(feature) == -1) {
      $('#'+tpopid).find('.ml-indicator').addClass('negative');
      return false;
    }
  }
  $('#'+tpopid).find('.ml-indicator').addClass('positive');
  return true;
}

/**
 *
 * @param {*} exceptionElement
 */
function closeAllLists(exceptionElement) {
  $('#filter-attribute-list').addClass('hidden');
  $('#filter-attribute-dropdown').addClass('collapsed');
  const listElements = $('.autocomplete-items');
  listElements.each((idx, list) => {
    const listID = $(list).attr('id');
    if (listID != exceptionElement) {
      $(list).remove();
    }
  });
}

function toggleSelected(id) {
  const tile = $('#'+id);
  if ($(tile).hasClass('loading')) {
    deselectTile(id);
  } else {
    const name = $(tile).find('.name').html();
    const url = $(tile).find('img').attr('src');
    selectTile(id, name, url);
  }
}

/**
 *
 */
function checkFilterCompleteness() {
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
    $('#filter-add-button').removeClass('disabled');
  } else {
    $('#filter-add-button').addClass('disabled');
  }
}

/**
 *
 * @param {*} attributeValue
 */
function checkOperators(attributeValue) {
  $("#filter-value").prop("disabled", true);
  $('#filter-value').val('');
  if (filters.map((e) => e.attribute).includes(attributeValue)) {
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
          $("#filter-value").prop("disabled", true);
        } else {
          $("#filter-value").prop("disabled", false);
        }
        checkFilterCompleteness();
        closeAllLists();
      });
      $('#filter-operator-wheel').append(operatorItem);
    }
  } else {
    $('#filter-operator-wheel').empty();
    $('#filter-operator-wheel').append('<div>Select Valid Attribute</div>');
  }
}

function updateMLIndicators() {
  for (const tile of $('.tile')) {
    checkMLFeatures($(tile).attr('data-id'));
  }
}

function moveSelectionLeftRight(direction) {
  if ($('.selected').length > 0) {
    let newID;
    if (direction > 0) {
      newID = $('.selected').next().attr('id');
    } else {
      newID = $('.selected').prev().attr('id');
    }
    $('#'+newID).click();
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

$('#select-folder').click((event) => {
  LOGGER.send('TPOP', 'server-display-folders');
  ipcRenderer.send('server-display-folders');
});

$('#filter-add').click((event) => {
  resetFilterSelection();
  $('#filter-overlay').css('display', 'flex');
});

$('#filter-attribute').on('change', () => {
  const attribute = $('#filter-attribute').val();
  if (filters.map((obj) => {
    return obj.attribute;
  }).includes(attribute)) {
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

  if (!($('#filter-add-button').hasClass('disabled'))) {
    addFilter(attribute, operator, value);
  }
});

$('#filter-close').click(function(event) {
  $('#filter-overlay').css('display', 'none');
  resetFilterSelection();
});

$('#folder-close').click(function() {
  $('#folder-overlay').css('display', 'none');
});

$('html').keydown(function(event) {
  if (event.keyCode == 27) {
    // ESC -> close filter and folder view
    $('#filter-overlay').css('display', 'none');
    $('#folder-overlay').css('display', 'none');
  } else if (event.keyCode == 37) {
    // Left Arrow -> Move selection left
    moveSelectionLeftRight(-1);
  } else if (event.keyCode == 39) {
    // Right Arrow -> Move selection right
    moveSelectionLeftRight(1);
  } else if (event.keyCode == 32) {
    // Space -> select/deselect tile
    event.preventDefault();
    if ($('.selected').length > 0) {
      toggleSelected($('.selected').attr('id'));
    }
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

$('#tpop-left-arrow').click(function(event) {
  if (!$('#tpop-left-arrow').hasClass('inactive')) {
    if (event.ctrlKey) {
      loadPage(Math.max(0, currentPage-10));
    } else {
      loadPage(currentPage-1);
    }
  }
});
$('#tpop-right-arrow').click(function(event) {
  if (!$('#tpop-right-arrow').hasClass('inactive')) {
    if (event.ctrlKey) {
      loadPage(Math.min(Math.ceil(maxIndex/maxPageSize)-1, currentPage+10));
    } else {
      loadPage(currentPage+1);
    }
  }
});

$('#loading-left-arrow').click(function() {
  const scroll_w = $('#loading-view').scrollLeft();
  $('#loading-view').stop().animate({scrollLeft: scroll_w-154}, 100, () => {
    updateSelectedScrollers();
  });
});

$('#loading-right-arrow').click(function() {
  const scroll_w = $('#loading-view').scrollLeft();
  $('#loading-view').stop().animate({scrollLeft: scroll_w+154}, 100, () => {
    updateSelectedScrollers();
  });
});

$('#cancel').click(function() {
  LOGGER.send('TPOP', 'server-close-tpop');
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
  if (closed) {
    $('#filter-attribute-dropdown').removeClass('collapsed');
    $('#filter-attribute-list').removeClass('hidden');
  }
});

$('#detail-add-joins').click(function() {
  const selectedID = $('#detail-find').attr('data-id');
  const selectedName = $('#detail-name').html();
  const selectedURL = $('#detail-recto').attr('src');
  selectTile(selectedID, selectedName, selectedURL);
  const  buttons = $('.detail-join-item:not(.loading) .detail-join-add-item');
  for (const button of buttons) {
    $(button).click();
  }
});

$('#detail-remove-joins').click(function() {
  const selectedID = $('#detail-find').attr('data-id');
  deselectTile(selectedID);
  const  buttons = $('.detail-join-item.loading .detail-join-add-item');
  for (const button of buttons) {
    $(button).click();
  }
});

$('#ml-calculate').click(function() {
  if (!$('#ml-calculate').hasClass('inactive')) {
    const tpopids = [];

    const weights = {};

    for (const slider of $('.ml-weight')) {
      const name = $(slider).attr('id').replace('ml-', '');
      if ($(slider).is(':disabled')) {
        weights[name] = 0;
      } else {
        weights[name] = rangeValues[$('#ml-'+name).val()];
      }
    }
    
    for (const el of $('#loading-view .loading')) {
      tpopids.push($(el).attr('data-id'));
    }
    let mode = 'min';
    if ($('#ml-toggle').is(':checked')) {
      mode = 'avg';
    }
    const data = {
      'mode': mode,
      'weights': weights,
      'ids': tpopids,
    };
    LOGGER.send('TPOP', 'server-calculate-distances', data);
    ipcRenderer.send('server-calculate-distances', data);
  }
});

$('#ml-reset').click(function() {
  LOGGER.send('TPOP', 'server-reset-sorting');
  ipcRenderer.send('server-reset-sorting');
});

$('#reload-json').click(() => {
  if (!requesting) {
    $('#reload-json img').attr('src', '../imgs/VLT_small.gif');
    requesting = true;
    LOGGER.send('TPOP', 'server-reload-json');
    ipcRenderer.send('server-reload-json');
    $('.filter').remove();
    filters = [];
    $('#tpop-loading-overlay').css('display', 'flex');
  }
});

$('.ml-checkbox').click(function(event) {
  const mode = $(event.target).attr('id').replace('ml-check-', '');
  const mode_val = $(event.target).prop("checked");
  $('#ml-'+mode).prop('disabled', !mode_val);
  updateMLIndicators();
  updateMLButton();
  updateMLSliders();
});

$('.ml-weight').on('input', () => {
  updateMLSliders();
});

$('#load').on('click', (event) => {
  if (!$('#load').hasClass('disabled')) { 
    const selectedFragments = [];
    for (const fragment of $('#loading-view .loading')) {
      selectedFragments.push($(fragment).attr('id').replace('load-', ''));
    }
    LOGGER.send('TPOP', 'server-load-tpop-fragments', selectedFragments);
    ipcRenderer.send('server-load-tpop-fragments', selectedFragments);
  }
});

ipcRenderer.on('tpop-json-data', (event, tpopJson) => {
  LOGGER.receive('TPOP', 'tpop-json-data', tpopJson);
  // show data
  const objects = tpopJson.objects;

  if ('activeTPOPs' in tpopJson) activeTPOPs = tpopJson.activeTPOPs;

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

  $('#data-mtime').html(tpopJson.mtime);
  $('#data-ctime').html(tpopJson.ctime);
  $('#reload-json img').attr('src', '../imgs/symbol_reload.png');

  if (maxIndex == null || maxIndex != tpopJson.maxObjects) {
    maxIndex = tpopJson.maxObjects;
    updateTPOPScrollers();
  }
  let text = 'TPOP Fragments ('+maxIndex+' fragments)';
  text += ' - Page '+(currentPage+1)+'/'+Math.ceil(maxIndex/maxPageSize);
  $('#tpop-tile-view').find('.rotated-title').html(text);
  const n_objects = objects.length;
  if (n_objects > 0) {
    addTile(0, n_objects, objects);
  } else {
    requesting = false;
  }
});

ipcRenderer.on('tpop-active-filters', (event, activeFilters) => {
  LOGGER.receive('TPOP', 'tpop-active-filters', activeFilters);
  activeFilters.forEach((filter) => {
    const attribute = filter.attribute;
    const operator = filter.operator;
    const value = filter.value;
    addFilter(attribute, operator, value, true);
  });
});

$('#flip-grid').click(() => {
  flipGrid();
});

ipcRenderer.on('tpop-json-failed', () => {
  LOGGER.receive('TPOP', 'tpop-json-failed');
  // TODO show error message
  // show options to close or retry
  LOGGER.err('TPOP', 'json failed');
});

ipcRenderer.on('tpop-details', (event, details) => {
  LOGGER.receive('TPOP', 'tpop-details', details);
  displayDetails(details);
});

ipcRenderer.on('tpop-filtered', () => {
  LOGGER.receive('TPOP', 'tpop-filtered');
  requestBatch();
});

function scrollToID(id) {
  // check if tile with ID is available; if not, request more tiles
  if ($('#'+id).length == 0) {
    isScrolling = id;
    requestBatch();
  } else {
    isScrolling = null;
    $('#tile-view').stop().animate({
      scrollTop: $('#tile-view').scrollTop() + $('#'+id).position().top - 100
    }, 1000);
  }
}

ipcRenderer.on('tpop-position', (event, data) => {
  LOGGER.receive('TPOP', 'tpop-position', data);
  if (data.pos == -1) {
    $('#detail-page-warning').removeClass('hidden');
  } else {
    const page = Math.ceil(data.pos/maxPageSize)-1;
    if (page != currentPage) {
      loadPage(page);
    }
    
    const id = data.tpopID;
    scrollToID(id);
  }
});

ipcRenderer.on('tpop-basic-info', (event, data) => {
  LOGGER.receive('TPOP', 'tpop-basic-info', data);
  $('#detail-joins-list').empty();

  if (data.length == 0) {
    $('#detail-joins').addClass('hidden');
  } else {
    data.sort((a, b) => {
      let nameA = a.name;
      let nameB = b.name;
      
      if (nameA.indexOf('CP') == 0) {
        const folderA = nameA.slice(0, nameA.indexOf('/')).slice(2);
        const missingDigitsA = 4 - String(folderA).length;
        nameA = 'CP' + '0'.repeat(missingDigitsA) + nameA.slice(2);
      }
      if (nameB.indexOf('CP') == 0) {
        const folderB = nameB.slice(0, nameB.indexOf('/')).slice(2);
        const missingDigitsB = 4 - String(folderB).length;
        nameB = 'CP' + '0'.repeat(missingDigitsB) + nameB.slice(2);
      }
      
      if (nameA.toLowerCase() > nameB.toLowerCase()) {
        return 1;
      } else {
        return -1;
      }
    });
    for (const obj of data) {
      const joinItem = $('<div class="detail-join-item no-select">'+obj.name+'</div>');
      joinItem.attr('id', 'join-'+obj.id);
      joinItem.attr('data-name', obj.name);
      joinItem.attr('data-url-recto', obj.urlRecto);
      joinItem.attr('data-url-verso', obj.urlVerso);
      joinItem.attr('data-id', obj.id);
      
      const addItemButton = $('<div class="detail-join-add-item"></div>');
      const addItemImage = $('<img src="../imgs/symbol_plus_zoom.png"/>');
      addItemButton.append(addItemImage);
      joinItem.append(addItemButton);
      
      if ($('#load-'+obj.id).length == 1) {
        joinItem.addClass('loading');
        addItemImage.attr('src', '../imgs/symbol_minus_zoom.png');
      }
      
      joinItem.click(function() {
        const id = $(this).attr('data-id');
        requestDetails(id);
        requestPosition(id);
      });
      
      addItemButton.click(function(event) {
        event.stopPropagation();
        const id = $(this).parent().attr('data-id');
        if ($(this).parent().hasClass('loading')) {
          deselectTile(id);
        } else {
          // add item to selection
          const name = $(this).parent().attr('data-name');
          let url = '../imgs/symbol_no_pic.png';
          if($(this).parent().attr('data-url-recto')) {
            url = $(this).parent().attr('data-url-recto');
          }
          selectTile(id, name, url);
        }
      });
      
      $('#detail-joins-list').append(joinItem);
      $('#detail-joins').removeClass('hidden');
    }
  }
});

ipcRenderer.on('tpop-calculation-done', () => {
  LOGGER.receive('TPOP', 'tpop-calculation-done');
  $('#tpop-loading-overlay').css('display', 'none');
  requesting = false;
  loadPage(0);
});

ipcRenderer.on('tpop-display-folders', (event, data) => {
  LOGGER.receive('TPOP', 'tpop-display-folders', data);
  displayFolders(data);
});

ipcRenderer.on('tpop-data-loaded', () => {
  LOGGER.receive('TPOP', 'tpop-data-loaded');
  $('#tpop-loading-overlay').css('display', 'none');
  requestFilter();
});