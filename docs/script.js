$(document).ready(() => {
    
});


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

$('.home').click(() => {
    window.location.href = 'index.html';
});