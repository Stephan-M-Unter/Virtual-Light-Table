$(document).ready(() => {

    $('#left-resize-slider').on('mousedown', (event) => {
        $(window).on('mousemove', (event) => {
            resizeSidebar(event);
        });
    })    

    $('#right-resize-slider').on('mousedown', (event) => {
        $(window).on('mousemove', (event) => {
            resizeDetailView(event);
        });
    })    
    $(window).on('mouseup', (event) => {
        $(window).off('mousemove');
    })

    for (var i = 0; i < 25; i++) {
        var data = {
            'imgUrl': '../imgs/examples/dummy.jpg',
            'name': 'CPXX/00'+i,
        }
        addTile(data);
    }
});

function resizeSidebar(event) {
    const x = event.pageX;
    $('#sidebar').css('width', x);
}

function resizeDetailView(event) {
    const x = event.pageX;
    const view_w = $(window).width();
    $('#detail-view').css('width', view_w-x);
}

function addTile(data) {
    var tile = $('<div id="'+data.name+'" class="tile"></div>');
    var img = $('<img src="'+data.imgUrl+'"/>');
    var name = $('<div class="name">'+data.name+'</div>');
    var distance = $('<div class="distance">xx.xxxx</div>');

    tile.append(img);
    tile.append(name);
    tile.append(distance);
    $('#tile-view').append(tile);
}