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
<img height="60" src="data:image/png;base64,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" alt="MapLift">
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

<!-- Email notice -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;">
<tr>
<td align="center" style="padding:0 40px 40px 40px;">
<p style="margin:0;font-size:16px;line-height:24px;color:#374151;">We'll send the full audit results to this email as soon as they're ready.</p>
</td>
</tr>
</table>

<!-- What's Next -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" align="center" style="max-width:600px;background:#ffffff;border-top:1px solid #E5E7EB;">
<tr>
<td style="padding:32px 40px;">
<p style="margin:0 0 20px 0;font-size:18px;font-weight:700;color:#111827;">What's in your report?</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">1</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">Local Ranking</strong> — your positions across different directions and radii (3, 5, 8 km).</td>
</tr>
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">2</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">Competitor Analysis</strong> — how you compare to top competitors in your area.</td>
</tr>
<tr>
<td style="padding:8px 0;vertical-align:top;width:32px;">
<span style="display:inline-block;width:24px;height:24px;line-height:24px;text-align:center;background:#DBEAFE;color:#2563EB;font-size:13px;font-weight:700;border-radius:50%;">3</span>
</td>
<td style="padding:8px 0;font-size:14px;color:#374151;"><strong style="color:#111827;">Health Score</strong> — profile completeness, critical issues, and citation breakdown.</td>
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
