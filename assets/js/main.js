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

  // --- Cookie Consent Banner ---
  if (!document.cookie.split(';').some(function (c) { return c.trim().indexOf('cookie_consent=') === 0; })) {
    var $banner = $(
      '<div class="cookie-banner">' +
        '<p>We use essential cookies to make our site work. With your consent, we may also use non-essential cookies to improve user experience and analyze website traffic. By clicking "Accept," you agree to our website\'s cookie use as described in our <a href="/cookies">Cookie Policy</a>.</p>' +
        '<div style="display:flex;gap:.5rem;flex-shrink:0;">' +
          '<button class="cookie-btn cookie-btn--accept">Accept</button>' +
          '<button class="cookie-btn cookie-btn--decline">Decline</button>' +
        '</div>' +
      '</div>'
    );
    $('body').append($banner);

    $banner.find('.cookie-btn--accept').on('click', function () {
      document.cookie = 'cookie_consent=accepted;path=/;max-age=31536000;SameSite=Lax';
      $banner.remove();
    });
    $banner.find('.cookie-btn--decline').on('click', function () {
      document.cookie = 'cookie_consent=declined;path=/;max-age=31536000;SameSite=Lax';
      $banner.remove();
    });
  }

});
