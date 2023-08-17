$(document).ready(() => {
    let sortDirection = 'desc';
    let sortType = null;
    
    $('.faq-item').click((event) => {
        $(event.target).find('.answer').toggleClass('collapsed');
    });
    
    $('.faq-item .question').click((event) => {
        $(event.target).closest('.faq-item').click();
    });
    
    $('.bug-shorts').click((event) => {
        const bugDescription = $(event.target).next('.bug-description');
        bugDescription.toggleClass('expanded');
    });
    
    $('.bug-cell').click((event) => {
        const bugDescription = $(event.target).parent().parent().find('.bug-description');
        bugDescription.toggleClass('expanded');
    });

    $('.bug-head').click((event) => {
        const newSortType = $(event.target).attr('sort-type');
        
        if (sortType === newSortType) {
            sortDirection = sortDirection !== 'desc' ? 'desc' : 'asc';
        } else {
            sortType = newSortType;
        }

        $('.sorted').removeClass('sorted');
        $('.asc').removeClass('asc');
        $('.desc').removeClass('desc');

        $(event.target).addClass('sorted');
        $(event.target).addClass(sortDirection);

        const bugEntries = $('#bug-list').children('.bug-item');
        bugEntries.sort((a, b) => {
            const aVal = $(a).find('.bug-shorts').children(`.${sortType}`).text();
            const bVal = $(b).find('.bug-shorts').children(`.${sortType}`).text();
            if (sortDirection === 'desc') {
                return aVal.localeCompare(bVal);
            } else {
                return bVal.localeCompare(aVal);
            }
        });
        $('#bug-list').append(bugEntries);
    });
    
    $('.home').click(() => {
        window.location.href = 'index.html';
    });
});

