/* ============================================
   MapLift — Form Validation & Submit
   ============================================ */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPhone(phone) {
  return /^[\d\s\-\+\(\)]{7,}$/.test(phone);
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
    var $name = $('#audit-name');
    var $biz  = $('#audit-business');
    var $url  = $('#audit-url');
    var $email = $('#audit-email');
    var $phone = $('#audit-phone');

    if (!$name.val().trim()) { showError($name, 'Name is required'); valid = false; }
    if (!$biz.val().trim())  { showError($biz, 'Business name is required'); valid = false; }
    if (!$url.val().trim())  { showError($url, 'Website URL is required'); valid = false; }
    if (!isValidEmail($email.val())) { showError($email, 'Enter a valid email'); valid = false; }
    if ($phone.val().trim() && !isValidPhone($phone.val())) {
      showError($phone, 'Enter a valid phone number');
      valid = false;
    }

    if (valid) {
      $auditForm.hide();
      $('#audit-success').removeClass('hidden');
    }
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
