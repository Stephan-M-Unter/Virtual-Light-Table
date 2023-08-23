$(document).ready(function() {
    let sortOrder = 'desc';

    startSorting();
    
    function startSorting() {
        var entries = $(".ipc-entry");
        entries.sort(function(a, b) {
            var aReceiver = $(a).find(".receiver").text();
            var bReceiver = $(b).find(".receiver").text();
            var aMessage = $(a).find(".ipc-message").text();
            var bMessage = $(b).find(".ipc-message").text();
            if (aReceiver == bReceiver) {
                return aMessage.localeCompare(bMessage);
            } else {
                return aReceiver.localeCompare(bReceiver);
            }
        });
        $("#ipc-entries").empty();
        entries.each(function() {
            $("#ipc-entries").append(this);
        });
    }
    
    function sortBy(className) {
        var entries = $(".ipc-entry");
        entries.sort(function(a, b) {
            var aText = $(a).find(`.${className}`).text();
            var bText = $(b).find(`.${className}`).text();
            const sortResult = aText.localeCompare(bText);
            return sortOrder == 'asc' ? sortResult : -sortResult;
        });
        $("#ipc-entries").empty();
        entries.each(function() {
            $("#ipc-entries").append(this);
        });
    }

    $('.ipc-head.cell').click(function() {
        if ($(this).hasClass(sortOrder)) {
            sortOrder = sortOrder == 'asc' ? 'desc' : 'asc';
            $(this).removeClass('asc desc').addClass(sortOrder);
        } else {
            $(`.${sortOrder}`).removeClass('asc desc');
            $(this).addClass(sortOrder);
        }


        const sortAttribute = $(this).attr('data-sort');
        sortBy(sortAttribute);
    });
});