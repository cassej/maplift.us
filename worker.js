export default {
  async fetch(request, env) {
    if (request.method === 'POST' && new URL(request.url).pathname === '/api/audit') {
      const { email, mapsUrl } = await request.json();

      if (!email || !mapsUrl) {
        return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const text = `🔔 New Audit Request\n\nEmail: ${email}\nGoogle Maps: ${mapsUrl}`;

      const tgRes = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: 237296040, text, parse_mode: 'Markdown' }),
        }
      );

      if (!tgRes.ok) {
        return new Response(JSON.stringify({ ok: false }), {
          status: 502,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return env.ASSETS.fetch(request);
  },
};
