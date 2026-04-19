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

// --- Audit Form ---
$(function () {
  var $auditForm = $('#audit-form');
  if (!$auditForm.length) return;

  $auditForm.on('submit', function (e) {
    e.preventDefault();
    clearErrors($auditForm);

    var valid = true;
    var $email = $('#audit-email');
    var $maps  = $('#audit-maps');

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
