/* ============================================
   MapLift — Shared JS (nav, scroll, accordion)
   ============================================ */

$(function () {

  // --- Mobile Nav ---
  var $overlay = $('#mobile-nav');
  var $body = $('body');

  $('#hamburger').on('click', function () {
    $overlay.addClass('active');
    $body.addClass('nav-open');
  });

  function closeNav() {
    $overlay.removeClass('active');
    $body.removeClass('nav-open');
  }

  $overlay.find('.close-btn, a').on('click', closeNav);
  $(document).on('keydown', function (e) {
    if (e.key === 'Escape') closeNav();
  });

  // --- Scroll Animations ---
  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        $(entry.target).addClass('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.15 });

  $('.fade-in-up').each(function () {
    observer.observe(this);
  });

  // --- Nav Shadow on Scroll ---
  var $nav = $('nav');
  $(window).on('scroll', function () {
    if ($(window).scrollTop() > 10) {
      $nav.addClass('shadow-md');
    } else {
      $nav.removeClass('shadow-md');
    }
  });

  // --- FAQ Accordion ---
  $('.faq-question').on('click', function () {
    var $item = $(this).closest('.faq-item');
    var wasOpen = $item.hasClass('open');

    $('.faq-item').removeClass('open');
    if (!wasOpen) $item.addClass('open');
  });

});
