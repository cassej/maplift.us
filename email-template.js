/**
 * Build HTML email template for audit confirmation
 */
export function buildAuditEmailHtml(d) {
  const name = d.name || 'your business';
  const rating = d.rating || '—';
  const reviews = d.reviews || '—';
  const address = d.address || '—';
  const phone = d.phone || '—';
  const category = d.category || '—';

  let starsHtml = '';
  if (d.rating) {
    const full = Math.floor(d.rating);
    const half = d.rating - full >= 0.25;
    for (let i = 0; i < full; i++) starsHtml += '<span style="color:#F59E0B;font-size:20px;">&#9733;</span>';
    if (half) starsHtml += '<span style="color:#F59E0B;font-size:20px;">&#9733;</span>';
    const empty = 5 - full - (half ? 1 : 0);
    for (let j = 0; j < empty; j++) starsHtml += '<span style="color:#D1D5DB;font-size:20px;">&#9733;</span>';
  }

  let hoursHtml = '<tr><td style="padding:8px 0;color:#6B7280;font-size:14px;">Not available</td></tr>';
  if (d.hours && d.hours.length) {
    hoursHtml = d.hours.map(h =>
      `<tr>
        <td style="padding:4px 0;color:#374151;font-size:14px;font-weight:600;width:120px;">${h.dayName}</td>
        <td style="padding:4px 0;color:#6B7280;font-size:14px;">${h.hoursText}</td>
      </tr>`
    ).join('');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your MapLift Audit</title>
</head>
<body style="margin:0;padding:0;background-color:#F3F4F6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
<center style="width:100%;margin:0 auto;">

<!-- Header -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:12px 12px 0 0;margin-top:40px;">
<tr>
<td style="padding:32px 40px 24px 40px;border-bottom:1px solid #E5E7EB;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="font-size:24px;font-weight:800;color:#2563EB;letter-spacing:-0.5px;">MapLift</td>
<td style="text-align:right;font-size:13px;color:#9CA3AF;">maplift.us</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Hero -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;">
<tr>
<td style="padding:40px 40px 16px 40px;">
<h1 style="margin:0;font-size:28px;font-weight:700;color:#111827;line-height:36px;">Your free audit for<br><span style="color:#2563EB;">${name}</span> is on its way!</h1>
</td>
</tr>
<tr>
<td style="padding:0 40px 32px 40px;">
<p style="margin:0;font-size:16px;line-height:24px;color:#6B7280;">We've received your request and are already analyzing your Google Maps listing. Here's what we found so far:</p>
</td>
</tr>
</table>

<!-- Business Card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;">
<tr>
<td style="padding:0 40px 32px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
<tr>
<td style="padding:24px;">

<!-- Name & Category -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding-bottom:4px;">
<span style="font-size:18px;font-weight:700;color:#111827;">${name}</span>
</td>
</tr>
${category !== '—' ? `<tr><td style="padding-bottom:16px;"><span style="display:inline-block;background:#DBEAFE;color:#2563EB;font-size:12px;font-weight:600;padding:3px 10px;border-radius:99px;">${category}</span></td></tr>` : ''}
</table>

<!-- Rating -->
<table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
<tr>
<td style="padding-right:8px;">${starsHtml}</td>
<td style="font-size:16px;font-weight:600;color:#111827;">${rating}</td>
<td style="font-size:14px;color:#6B7280;padding-left:4px;">(${reviews} reviews)</td>
</tr>
</table>

<!-- Details -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${address !== '—' ? `<tr>
<td style="padding:6px 0;width:28px;vertical-align:top;"><span style="color:#9CA3AF;font-size:16px;">&#128205;</span></td>
<td style="padding:6px 0;font-size:14px;color:#374151;">${address}</td>
</tr>` : ''}
${phone !== '—' ? `<tr>
<td style="padding:6px 0;width:28px;vertical-align:top;"><span style="color:#9CA3AF;font-size:16px;">&#128222;</span></td>
<td style="padding:6px 0;font-size:14px;color:#374151;">${phone}</td>
</tr>` : ''}
</table>

</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Hours -->
${d.hours && d.hours.length ? `<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;">
<tr>
<td style="padding:0 40px 32px 40px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F9FAFB;border:1px solid #E5E7EB;border-radius:12px;">
<tr>
<td style="padding:20px 24px;">
<p style="margin:0 0 12px 0;font-size:14px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">Opening Hours</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
${hoursHtml}
</table>
</td>
</tr>
</table>
</td>
</tr>
</table>` : ''}

<!-- CTA -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;">
<tr>
<td align="center" style="padding:0 40px 40px 40px;">
<table role="presentation" cellpadding="0" cellspacing="0">
<tr>
<td align="center" style="background-color:#2563EB;border-radius:8px;">
<a href="https://maplift.us/pricing" target="_blank" style="display:inline-block;padding:14px 32px;font-size:16px;font-weight:600;color:#ffffff;text-decoration:none;">Get Your Full Audit Report</a>
</td>
</tr>
</table>
<p style="margin:12px 0 0 0;font-size:13px;color:#9CA3AF;">Full report with actionable insights delivered in 24 hours</p>
</td>
</tr>
</table>

<!-- What's Next -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;border-top:1px solid #E5E7EB;">
<tr>
<td style="padding:32px 40px;">
<p style="margin:0 0 20px 0;font-size:18px;font-weight:700;color:#111827;">What happens next?</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">1</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">We analyze</strong> your Google Maps listing for SEO, visibility, and accuracy issues.</td>
</tr>
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">2</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">We prepare</strong> a detailed audit with actionable recommendations.</td>
</tr>
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">3</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">You receive</strong> the full report with a plan to rank higher on Google Maps.</td>
</tr>
</table>
</td>
</tr>
</table>

<!-- Footer -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;border-top:1px solid #E5E7EB;border-radius:0 0 12px 12px;margin-bottom:40px;">
<tr>
<td align="center" style="padding:24px 40px;font-size:13px;color:#9CA3AF;line-height:20px;">
MapLift &mdash; Get found on Google Maps.<br>
<a href="https://maplift.us" style="color:#2563EB;text-decoration:none;">maplift.us</a>
</td>
</tr>
</table>

</center>
</body>
</html>`;
}
