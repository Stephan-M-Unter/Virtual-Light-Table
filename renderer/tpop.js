const {ipcRenderer} = require('electron');

const batchSize = 30;
let lastIndex = -1;
let currentPage = 0;
const maxPageSize = 100;
const filters = [];
let requesting = false;

$(document).ready(() => {
  requestBatch();
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
 * @param {*} id
 */
function requestDetails(id) {
  console.log("Sending [server-tpop-details] for id "+id);
  ipcRenderer.send('server-tpop-details', id);
}

/**
 *
 * @param {*} details
 */
function displayDetails(details) {
  $('#detail-name').html('--- '+details.name+' ---');
  $('#detail-recto').attr('src', details.urlRecto);
  $('#detail-verso').attr('src', details.urlVerso);
}

function loadPage(newPageNumber) {
  if (!requesting) {
    if (newPageNumber <= 0) {
      $('#tpop-left-arrow').addClass('inactive');
    } else {
      $('#tpop-left-arrow').removeClass('inactive');
    }
    if (newPageNumber >= 0) {
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
 * @param {*} data
 */
function addTile(idx, n_objects, tpopJson) {
  setTimeout(function() {
    const data = tpopJson[idx];
    const tile = $('<div id="'+data.name+'" class="tile no-select" data-id="'+data.name+'"></div>');
    const img = $('<img src="'+data.urlRecto+'" data-id="'+data.name+'"/>');
    const name = $('<div class="name" data-id="'+data.name+'">'+data.name+'</div>');
    const distance = $('<div class="distance">xx.xxxx</div>');
    const multibox = $('<div class="multibox" data-id="'+data.name+'"></div>');

    if ($('#loading-view').find('#load-'+data.name).length > 0) {
      tile.addClass('loading');
      if ($('#load-'+data.name).hasClass('selected')) {
        tile.addClass('selected');
      }
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
  $('#filter-overlay').css('display', 'flex');
});

$('#filter-add-button').click((event) => {
  const attribute = $('#filter-attribute').val();
  const operator = $('#filter-operator').val();
  const value = $('#filter-input').val();

  const filter = $('<div class="filter"></div>');
  filter.attr('data-attribute', attribute);
  filter.attr('data-operator', operator);
  filter.attr('data-value', value);

  const filterDescriptor = $('<div class="filter-descriptor">'+attribute+' '+operator+' '+value+'</div>');
  const filterDelete = $('<div class="filter-delete no-select">x</div>');

  filterDelete.click(function(event) {
    $(this).parent().remove();
  });

  filter.append(filterDescriptor);
  filter.append(filterDelete);

  $('#filter-list').append(filter);
  $('#filter-overlay').css('display', 'none');
});

$('#filter-close').click(function(event) {
  $('#filter-overlay').css('display', 'none');
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
  loadPage(currentPage-1);
});
$('#tpop-right-arrow').click(function() {
  loadPage(currentPage+1);
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
  //$('#loading-view').scrollLeft(scroll_w + 154);
  $('#loading-view').stop().animate({scrollLeft: scroll_w+154}, 100, () => {
    updateSelectedScrollers();
  });
});

$('#cancel').click(function() {
  ipcRenderer.send('server-close-tpop');
});

ipcRenderer.on('tpop-json-data', (event, tpopJson) => {
  // show data
  const n_objects = tpopJson.length;
  addTile(0, n_objects, tpopJson);
});

ipcRenderer.on('tpop-json-failed', () => {
  // TODO show error message
  // show options to close or retry
  console.log('json failed');
});

ipcRenderer.on('tpop-details', (event, details) => {
  console.log("Receiving details:", details);
  displayDetails(details);
});
