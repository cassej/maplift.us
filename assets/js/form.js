/* ============================================
   MapLift — Form Validation & Submit
   ============================================ */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showError($field, msg) {
  $field.addClass('error');
  var $err = $field.siblings('.error-msg');
  if ($err.length) {
    $err.text(msg);
  } else {
    $('<p class="error-msg text-red-500 text-sm mt-1">').text(msg).insertAfter($field);
  }
}

function clearErrors($form) {
  $form.find('.error').removeClass('error');
  $form.find('.error-msg').remove();
}

// --- Maps Link Preview ---
var MAPS_DOMAINS = ['maps.app.goo.gl', 'goo.gl/maps', 'google.com/maps', 'google.ru/maps'];
var $mapsPreview = null;
var mapsPreviewTimer = null;

function looksLikeMapsLink(url) {
  var lower = url.toLowerCase();
  return MAPS_DOMAINS.some(function (d) { return lower.indexOf(d) !== -1; });
}

function renderStars(rating) {
  var full = Math.floor(rating);
  var half = rating - full >= 0.25;
  var html = '';
  for (var i = 0; i < full; i++) {
    html += '<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>';
  }
  if (half) {
    html += '<svg class="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><defs><linearGradient id="hg"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="#D1D5DB"/></linearGradient></defs><path fill="url(#hg)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>';
  }
  var empty = 5 - full - (half ? 1 : 0);
  for (var j = 0; j < empty; j++) {
    html += '<svg class="w-4 h-4 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.784.57-1.838-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.063 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/></svg>';
  }
  return html;
}

function showMapsPreview(d) {
  removeMapsPreview();

  var ratingBlock = '';
  if (d.rating) {
    ratingBlock = '<div class="flex items-center gap-1.5">' +
      '<div class="flex gap-0.5">' + renderStars(parseFloat(d.rating)) + '</div>' +
      '<span class="text-sm font-semibold text-text">' + d.rating + '</span>' +
      (d.reviews ? '<span class="text-sm text-secondary">(' + d.reviews + ' reviews)</span>' : '') +
    '</div>';
  }

  var addressBlock = d.address
    ? '<div class="flex items-start gap-2 text-sm text-secondary"><svg class="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' + d.address + '</div>'
    : '';

  var mapEmbed = d.embedUrl
    ? '<div class="mt-3 rounded-xl overflow-hidden border border-gray-100"><iframe src="' + d.embedUrl + '" width="100%" height="160" style="border:0;" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe></div>'
    : '';

  $mapsPreview = $(
    '<div class="maps-preview-card">' +
      '<div class="flex items-start gap-3">' +
        '<div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center shrink-0">' +
          '<svg class="w-5 h-5 text-primary" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>' +
        '</div>' +
        '<div class="flex-1 min-w-0">' +
          (d.name ? '<p class="font-semibold text-text truncate">' + d.name + '</p>' : '') +
          ratingBlock +
          addressBlock +
        '</div>' +
      '</div>' +
      mapEmbed +
    '</div>'
  );

  $('#audit-maps').closest('div').after($mapsPreview);
}

function showMapsPreviewError(msg) {
  removeMapsPreview();
  $mapsPreview = $('<div class="maps-preview-card maps-preview-error"><p class="text-sm text-red-600">' + msg + '</p></div>');
  $('#audit-maps').closest('div').after($mapsPreview);
}

function showMapsPreviewLoading() {
  removeMapsPreview();
  $mapsPreview = $('<div class="maps-preview-card maps-preview-loading"><div class="flex items-center gap-2 text-sm text-secondary"><svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>Loading preview...</div></div>');
  $('#audit-maps').closest('div').after($mapsPreview);
}

function removeMapsPreview() {
  if ($mapsPreview) { $mapsPreview.remove(); $mapsPreview = null; }
}

function fetchMapsPreview(url) {
  showMapsPreviewLoading();
  fetch('/api/maps-info', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url: url }),
  })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      if (data.ok && data.data) {
        showMapsPreview(data.data);
      } else {
        showMapsPreviewError(data.error || 'Could not load preview for this link.');
      }
    })
    .catch(function () {
      showMapsPreviewError('Network error loading preview.');
    });
}

// --- Audit Form ---
$(function () {
  var $auditForm = $('#audit-form');
  if (!$auditForm.length) return;

  var $maps = $('#audit-maps');

  // Live preview on paste / input (debounced)
  function onMapsInputChange() {
    var val = $maps.val().trim();
    clearTimeout(mapsPreviewTimer);
    if (!val || !looksLikeMapsLink(val)) {
      removeMapsPreview();
      return;
    }
    mapsPreviewTimer = setTimeout(function () { fetchMapsPreview(val); }, 600);
  }

  $maps.on('paste', function () { setTimeout(onMapsInputChange, 50); });
  $maps.on('input', onMapsInputChange);

  $auditForm.on('submit', function (e) {
    e.preventDefault();
    clearErrors($auditForm);

    var valid = true;
    var $email = $('#audit-email');

    if (!isValidEmail($email.val())) { showError($email, 'Enter a valid email'); valid = false; }
    if (!$maps.val().trim()) { showError($maps, 'Google Maps link is required'); valid = false; }

    if (!valid) return;

    var $btn = $auditForm.find('button[type="submit"]');
    $btn.prop('disabled', true).text('Sending...');

    fetch('/api/audit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $email.val().trim(), mapsUrl: $maps.val().trim() }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          $auditForm.hide();
          $('#audit-success').removeClass('hidden');
        } else {
          alert(data.error || 'Something went wrong. Please try again.');
          $btn.prop('disabled', false).text('Send My Free Audit');
        }
      })
      .catch(function () {
        alert('Network error. Please try again.');
        $btn.prop('disabled', false).text('Send My Free Audit');
      });
  });
});

// --- Contact Form ---
$(function () {
  var $contactForm = $('#contact-form');
  if (!$contactForm.length) return;

  $contactForm.on('submit', function (e) {
    e.preventDefault();
    clearErrors($contactForm);

    var valid = true;
    var $email   = $('#contact-email');
    var $message = $('#contact-message');

    if (!isValidEmail($email.val())) { showError($email, 'Enter a valid email'); valid = false; }
    if (!$message.val().trim()) { showError($message, 'Message is required'); valid = false; }

    if (!valid) return;

    var $btn = $contactForm.find('button[type="submit"]');
    $btn.prop('disabled', true).text('Sending...');

    fetch('/api/contact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: $email.val().trim(), message: $message.val().trim() }),
    })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.ok) {
          $contactForm.hide();
          $('#contact-success').removeClass('hidden');
        } else {
          alert(data.error || 'Something went wrong. Please try again.');
          $btn.prop('disabled', false).text('Send Message');
        }
      })
      .catch(function () {
        alert('Network error. Please try again.');
        $btn.prop('disabled', false).text('Send Message');
      });
  });
});

// --- Login Form ---
$(function () {
  var $loginForm = $('#login-form');
  if (!$loginForm.length) return;

  $loginForm.on('submit', function (e) {
    e.preventDefault();
    alert('Login is not yet active. This is a demo.');
  });
});
