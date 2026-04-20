export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... (ваши существующие методы /api/contact и /api/audit) ...
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      // ... ваш код ...
      return new Response('Contact OK');
    }

    if (request.method === 'POST' && url.pathname === '/api/audit') {
      // ... ваш код ...
      return new Response('Audit OK');
    }

    // --- MAPS INFO: redirect → parse → embed ---
    if (request.method === 'POST' && url.pathname === '/api/maps-info') {
      try {
        const { url: targetUrl } = await request.json();

        if (!targetUrl) {
          return new Response(JSON.stringify({ ok: false, error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Валидация
        const allowedDomains = ['google.com/maps', 'google.ru/maps', 'goo.gl/maps', 'maps.app.goo.gl'];
        if (!allowedDomains.some(d => targetUrl.includes(d))) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid Google Maps URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Follow redirects — response.url is the expanded Google Maps URL
        const response = await fetch(targetUrl, {
          method: 'GET',
          redirect: 'follow',
          cf: { cacheTtl: 86400, cacheEverything: true },
        });

        const finalUrl = response.url;

        // Parse the expanded URL into data + embed
        const data = parseMapUrl(finalUrl);

        if (!data.lat || !data.lng) {
          return new Response(JSON.stringify({ ok: false, error: 'Could not extract coordinates from the expanded URL.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Fetch embed page to extract rating, reviews, address from HTML
        if (data.embedUrl) {
          try {
            const embedRes = await fetch(data.embedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            if (embedRes.ok) {
              const html = await embedRes.text();
              const extra = parseEmbedHtml(html);
              data.rating = extra.rating;
              data.reviews = extra.reviews;
              data.address = extra.address;
            }
          } catch (_) {
            // Non-critical — return what we have
          }
        }

        return new Response(JSON.stringify({ ok: true, data }), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response('Not Found', { status: 404 });
  },
};

/**
 * Parse expanded Google Maps URL → extract fields + build embed URL
 */
function parseMapUrl(urlStr) {
  const result = {
    name: null,
    lat: null,
    lng: null,
    placeId: null,
    embedUrl: null
  };

  try {
    const urlObj = new URL(urlStr);
    const lang = urlObj.searchParams.get('hl') || 'en';

    // 1. Coordinates from /@lat,lng,zoom
    const coordsMatch = urlStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+),([\d.]+)z/);
    if (!coordsMatch) return result;

    result.lat = parseFloat(coordsMatch[1]);
    result.lng = parseFloat(coordsMatch[2]);
    const zoom = parseFloat(coordsMatch[3]);

    // 2. Name from /place/Name/
    const nameMatch = urlStr.match(/\/place\/([^/@]+)/);
    if (nameMatch && nameMatch[1]) {
      result.name = decodeURIComponent(nameMatch[1].replace(/\+/g, ' '));
    }

    // 3. Place ID (hex format)
    const idMatch = urlStr.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
    if (idMatch) {
      result.placeId = idMatch[0];
    }

    // 4. Build embed URL
    const scale = 0.01 * Math.pow(2, (15 - zoom));
    const encodedName = encodeURIComponent(result.name || 'Unknown Place');
    const pidPart = result.placeId ? `!1s${result.placeId}` : '';
    const region = lang === 'en' ? 'US' : 'PA';

    const pb = [
      '!1m18',
      '!1m12',
      '!1m3',
      `!1d${(scale * 111000).toFixed(6)}`,
      `!2d${result.lng}`,
      `!3d${result.lat}`,
      '!2m3',
      '!1f0',
      '!2f0',
      '!3f0',
      '!3m2',
      '!1i1024',
      '!2i768',
      '!4f13.1',
      '!3m3',
      '!1m2',
      pidPart,
      `!2s${encodedName}`,
      '!5e0',
      '!3m2',
      `!1s${lang}`,
      `!2s${region}`,
      `!4v${Date.now()}`,
      '!5m2',
      `!1s${lang}`,
      `!2s${region}`,
    ].join('');

    result.embedUrl = `https://www.google.com/maps/embed?pb=${pb}`;

  } catch (e) {
    console.error('parseMapUrl error:', e);
  }

  return result;
}

/**
 * Parse embed page HTML for rating, reviews, address
 */
function parseEmbedHtml(html) {
  const extra = { rating: null, reviews: null, address: null };

  try {
    // 1. JSON-LD structured data
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        const jsonData = JSON.parse(jsonLdMatch[1]);

        if (jsonData.address && jsonData.address.streetAddress) {
          extra.address = `${jsonData.address.streetAddress}, ${jsonData.address.addressLocality || ''} ${jsonData.address.postalCode || ''}`.trim();
        }

        if (jsonData.aggregateRating) {
          extra.rating = jsonData.aggregateRating.ratingValue;
          extra.reviews = jsonData.aggregateRating.reviewCount;
        }
      } catch (_) {}
    }

    // 2. Fallback regex if JSON-LD didn't have data
    if (!extra.reviews) {
      const reviewMatch = html.match(/(\d+(?:,\d+)?)\s+reviews?/i);
      if (reviewMatch) extra.reviews = reviewMatch[1];

      const ratingMatch = html.match(/(\d+\.\d+)\s+stars?/i);
      if (ratingMatch) extra.rating = ratingMatch[1];
    }

    // 3. Fallback for address
    if (!extra.address) {
      const addrMatch = html.match(/"address"\s*:\s*"([^"]+)"/);
      if (addrMatch) extra.address = addrMatch[1];
    }

  } catch (e) {
    console.error('parseEmbedHtml error:', e);
  }

  return extra;
}