export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... (ваши существующие методы /api/contact и /api/audit) ...
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      return new Response(JSON.stringify({ ok: true }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (request.method === 'POST' && url.pathname === '/api/audit') {
      try {
        const body = await request.json();
        if (!body.email || !body.mapsUrl) {
          return new Response(JSON.stringify({ ok: false, error: 'Email and mapsUrl are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Resolve short URL → expanded URL
        let finalUrl = body.mapsUrl;
        for (let i = 0; i < 5; i++) {
          const res = await fetch(finalUrl, { method: 'GET', redirect: 'manual' });
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('Location');
            if (loc) { finalUrl = new URL(loc, finalUrl).href; continue; }
          }
          finalUrl = res.url || finalUrl;
          break;
        }

        // Build embed URL and fetch business data
        let mapsData = {};
        const embedUrl = parseMapUrl(finalUrl);
        if (embedUrl) {
          try {
            const embedRes = await fetch(embedUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
                'Accept-Language': 'en-US,en;q=0.9',
              },
            });
            const html = await embedRes.text();
            mapsData = parseEmbedHtml(html);
          } catch (_) {}
        }

        // Send to Telegram
        const text = formatAuditMessage(body.email, finalUrl, mapsData);
        await sendTelegram(env, text);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        });
      }
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

        // Follow redirects manually — only read Location header, no body download
        let finalUrl = targetUrl;
        for (let i = 0; i < 5; i++) {
          const res = await fetch(finalUrl, { method: 'GET', redirect: 'manual' });
          if (res.status >= 300 && res.status < 400) {
            const loc = res.headers.get('Location');
            if (loc) {
              finalUrl = new URL(loc, finalUrl).href;
              continue;
            }
          }
          finalUrl = res.url || finalUrl;
          break;
        }

        // Build embedUrl from the expanded URL
        const embedUrl = parseMapUrl(finalUrl);
        if (!embedUrl) {
          return new Response(JSON.stringify({ ok: false, error: 'Could not build embed URL from the expanded URL.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Fetch embed page to extract rating, reviews, address, etc. from HTML
        const embedRes = await fetch(embedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
        });
        const html = await embedRes.text();
        const data = parseEmbedHtml(html);
        data.embedUrl = embedUrl;

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
 * Parse expanded Google Maps URL → build embed URL string
 * Returns embedUrl string or null
 */
function parseMapUrl(urlStr) {
  try {
    const urlObj = new URL(urlStr);
    const lang = urlObj.searchParams.get('hl') || 'en';

    // 1. Coordinates from /@lat,lng,zoom
    const coordsMatch = urlStr.match(/@(-?\d+\.\d+),(-?\d+\.\d+),([\d.]+)z/);
    if (!coordsMatch) return null;

    const lat = parseFloat(coordsMatch[1]);
    const lng = parseFloat(coordsMatch[2]);
    const zoom = parseFloat(coordsMatch[3]);

    // 2. Name from /place/Name/
    const nameMatch = urlStr.match(/\/place\/([^/@]+)/);
    const name = nameMatch && nameMatch[1]
      ? decodeURIComponent(nameMatch[1].replace(/\+/g, ' '))
      : null;

    // 3. Place ID (hex format)
    const idMatch = urlStr.match(/0x[0-9a-fA-F]+:0x[0-9a-fA-F]+/);
    const placeId = idMatch ? idMatch[0] : null;

    // 4. Build embed URL
    const scale = 0.01 * Math.pow(2, (15 - zoom));
    const encodedName = encodeURIComponent(name || 'Unknown Place');
    const pidPart = placeId ? `!1s${placeId}` : '';
    const region = lang === 'en' ? 'US' : 'PA';

    const pb = [
      '!1m18',
      '!1m12',
      '!1m3',
      `!1d${(scale * 111000).toFixed(6)}`,
      `!2d${lng}`,
      `!3d${lat}`,
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

    return `https://www.google.com/maps/embed?pb=${pb}`;

  } catch (e) {
    console.error('parseMapUrl error:', e);
    return null;
  }
}

/**
 * Parse embed page HTML for rating, reviews, address, phone, category
 * Data lives inside initEmbed([...]) as a deeply nested JS array
 */
function parseEmbedHtml(html) {
  // Структура для возврата
  const extra = {
    name: null,
    rating: null,
    reviews: null,
    address: null,
    fullAddress: null,
    phone: null,
    category: null,
    placeId: null,
    coords: null,
    hours: null
  };

  try {
    // 1. Ищем блок initEmbed(...)
    // Регулярка захватывает всё внутри скобок initEmbed
    const initMatch = html.match(/initEmbed\(([\s\S]*?)\);/);
    if (!initMatch) {
      console.warn("initEmbed not found in HTML");
      return extra;
    }

    let jsonStr = initMatch[1];

    // Google иногда использует undefined в JS объектах, что невалидно для JSON
    // Заменяем undefined на null
    jsonStr = jsonStr.replace(/\bundefined\b/g, 'null');

    // Парсим JSON
    const rootArr = JSON.parse(jsonStr);

    // 2. Находим массив с данными бизнеса
    const biz = findBizArray(rootArr);

    if (!biz) {
      console.warn("Business data array not found");
      return extra;
    }

    // --- ИЗВЛЕЧЕНИЕ ДАННЫХ ПО ИНДЕКСАМ ---

    // [0] - Массив идентификаторов и координат
    if (Array.isArray(biz[0])) {
      extra.placeId = biz[0][0] || null; // Hex ID or CID
      // [0][2] usually contains [lat, lng]
      if (Array.isArray(biz[0][2]) && biz[0][2].length === 2) {
        extra.coords = { lat: biz[0][2][0], lng: biz[0][2][1] };
      }
    }

    // [1] - Название места (Short Name)
    if (typeof biz[1] === 'string') {
      extra.name = biz[1];
    }

    // [2] - Адрес частями [Street, Country]
    if (Array.isArray(biz[2]) && biz[2].length > 0) {
      extra.address = biz[2].filter(Boolean).join(', ');
    }

    // [3] - Рейтинг (Number)
    if (typeof biz[3] === 'number') {
      extra.rating = biz[3];
    }

    // [4] - Количество отзывов (String "X reviews")
    if (typeof biz[4] === 'string') {
      const m = biz[4].match(/(\d+(?:,\d+)*)/);
      if (m) extra.reviews = parseInt(m[1].replace(/,/g, ''), 10);
    }

    // [7] - Телефон
    if (typeof biz[7] === 'string') {
      extra.phone = biz[7];
    }

    // [12] - Категория (например, "Barber shop")
    if (typeof biz[12] === 'string') {
      extra.category = biz[12];
    }

    // [13] - Полный адрес (Priority over [2])
    if (typeof biz[13] === 'string') {
      extra.fullAddress = biz[13];
      extra.address = biz[13]; // Перезаписываем address полным вариантом
    }

    // [38] - Часы работы (если есть)
    // Структура: [ [DayName, DayNum, Date, [HoursString, [OpenMin, CloseMin]], isOpenToday, ...], ... ]
    if (Array.isArray(biz[38])) {
      extra.hours = biz[38].map(day => {
        if (!Array.isArray(day)) return null;
        return {
          dayName: day[0],       // "Monday"
          dayNum: day[1],        // 1
          hoursText: day[3] ? day[3][0] : null, // "1–7:30 PM"
          isOpen: day[4] === 1   // 1 = open today logic usually
        };
      }).filter(Boolean);
    }

  } catch (e) {
    console.error('parseEmbedHtml error:', e);
  }

  return extra;
}

/**
 * Рекурсивный поиск массива данных о бизнесе.
 * Критерии:
 * 1. Это массив.
 * 2. Индекс [3] - число от 1 до 5 (рейтинг).
 * 3. Индекс [4] - строка, содержащая слово "review" или "отзыв".
 * 4. (Опционально) Индекс [0] существует и является массивом (для надежности).
 */
function findBizArray(obj) {
  if (!obj) return null;

  if (Array.isArray(obj)) {
    // Проверка основных критериев
    const rating = obj[3];
    const reviewStr = obj[4];

    const isRatingValid = typeof rating === 'number' && rating >= 1 && rating <= 5;
    const isReviewValid = typeof reviewStr === 'string' && /review/i.test(reviewStr);

    if (isRatingValid && isReviewValid) {
      // Дополнительная проверка: у настоящих данных бизнеса обычно есть [0] элемент с ID/Coords
      // или [1] с названием. Это отсеет ложные срабатывания на мелких внутренних массивах.
      if (Array.isArray(obj[0]) || typeof obj[1] === 'string') {
        return obj;
      }
    }

    // Рекурсивный поиск по элементам массива
    // Оптимизация: не идем слишком глубоко, если нашли похожее, но лучше проверить всё
    for (let i = 0; i < obj.length; i++) {
      // Пропускаем примитивы для скорости
      if (typeof obj[i] === 'object' && obj[i] !== null) {
        const found = findBizArray(obj[i]);
        if (found) return found;
      }
    }
  } else if (typeof obj === 'object') {
    // Если это объект, идем по ключам (в JSON от Google такое редко, обычно массивы, но на всякий случай)
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const found = findBizArray(obj[key]);
        if (found) return found;
      }
    }
  }

  return null;
}

/**
 * Send message to Telegram chat via bot API
 */
async function sendTelegram(env, text) {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    console.warn('Telegram secrets not configured');
    return;
  }
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    }),
  });
}

/**
 * Format audit notification message for Telegram
 */
function formatAuditMessage(email, mapsUrl, d) {
  const stars = d.rating ? '⭐'.repeat(Math.round(d.rating)) + ` ${d.rating}` : '—';
  const reviews = d.reviews ? `${d.reviews} reviews` : '—';
  const name = d.name || 'Unknown';
  const address = d.address || '—';
  const phone = d.phone || '—';
  const category = d.category || '—';

  let hoursText = '—';
  if (d.hours && d.hours.length) {
    hoursText = d.hours.map(h => {
      const label = h.dayName || '';
      const time = h.hoursText || 'Closed';
      return `${label}: ${time}`;
    }).join('\n            ');
  }

  let coords = '—';
  if (d.coords) {
    coords = `${d.coords.lat}, ${d.coords.lng}`;
  }

  return `📋 <b>New Audit Request</b>

<b>Client:</b> ${email}

<b>Business:</b> ${name}
<b>Category:</b> ${category}
<b>Rating:</b> ${stars} (${reviews})
<b>Address:</b> ${address}
<b>Phone:</b> ${phone}
<b>Coords:</b> ${coords}

<b>Hours:</b>
            ${hoursText}

<b>Google Maps:</b> ${mapsUrl}`;
}