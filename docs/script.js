$(document).ready(() => {
    
});


$('.faq-item').click((event) => {
    $(event.target).find('.answer').toggleClass('collapsed');
});

$('.faq-item .question').click((event) => {
    $(event.target).closest('.faq-item').click();
});