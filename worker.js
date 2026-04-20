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
 * Parse embed page HTML for rating, reviews, address, phone, category
 * Data lives inside initEmbed([...]) as a deeply nested JS array
 */
function parseEmbedHtml(html) {
  const extra = { rating: null, reviews: null, address: null, phone: null, category: null };

  try {
    const initMatch = html.match(/initEmbed\((\[[\s\S]*?\])\);?\s*\n?\s*function onApiLoad/);
    if (!initMatch) return extra;

    let jsonStr = initMatch[1].replace(/undefined/g, 'null');
    const arr = JSON.parse(jsonStr);

    // Find the business-data array: contains a number (1-5) followed by "X reviews"
    const biz = findBizArray(arr);
    if (!biz) return extra;

    // biz structure:
    //  [0]  [placeId, fullTitle, [lat,lng], numericId]
    //  [1]  name
    //  [2]  [addrLine, country]
    //  [3]  rating (number)
    //  [4]  "X reviews" (string)
    //  [7]  phone
    //  [12] category
    //  [13] full address

    if (typeof biz[3] === 'number') extra.rating = biz[3];

    if (typeof biz[4] === 'string') {
      const m = biz[4].match(/(\d+(?:,\d+)?)/);
      if (m) extra.reviews = m[1];
    }

    if (Array.isArray(biz[2]) && biz[2].length >= 2) {
      extra.address = biz[2].filter(Boolean).join(', ');
    }

    if (typeof biz[7] === 'string') extra.phone = biz[7];
    if (typeof biz[12] === 'string') extra.category = biz[12];

    // Prefer full address from [13] if available
    if (typeof biz[13] === 'string') extra.address = biz[13];

  } catch (e) {
    console.error('parseEmbedHtml error:', e);
  }

  return extra;
}

/**
 * Recursively find the business-data array:
 * element[3] is a number 1-5 AND element[4] is a string matching "X reviews"
 */
function findBizArray(obj) {
  if (!obj) return null;

  if (Array.isArray(obj)) {
    if (typeof obj[3] === 'number' && obj[3] >= 1 && obj[3] <= 5 &&
        typeof obj[4] === 'string' && /^\d[\d,]*\s+reviews?$/i.test(obj[4])) {
      return obj;
    }
    for (let i = 0; i < obj.length; i++) {
      const found = findBizArray(obj[i]);
      if (found) return found;
    }
  } else if (typeof obj === 'object') {
    for (const key in obj) {
      const found = findBizArray(obj[key]);
      if (found) return found;
    }
  }

  return null;
}