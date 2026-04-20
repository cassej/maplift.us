export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // --- СУЩЕСТВУЮЩИЙ МЕТОД: CONTACT ---
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      try {
        const { email, message } = await request.json();

        if (!email || !message) {
          return new Response(JSON.stringify({ ok: false, error: 'Missing fields' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        const text = `💬 New Contact Message\n\nEmail: ${email}\n\n${message}`;

        const tgRes = await fetch(
            `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: 237296040, text }),
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
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
      }
    }

    // --- СУЩЕСТВУЮЩИЙ МЕТОД: AUDIT ---
    if (request.method === 'POST' && url.pathname === '/api/audit') {
      try {
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
              body: JSON.stringify({ chat_id: 237296040, text }),
            }
        );

        if (!tgRes.ok) {
          return new Response(JSON.stringify({ ok: false, res: tgRes }), {
            status: 502,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: e.message }), { status: 500 });
      }
    }

    // --- НОВЫЙ МЕТОД: MAPS INFO PARSER ---
    if (request.method === 'POST' && url.pathname === '/api/maps-info') {
      try {
        const { url: targetUrl } = await request.json();

        if (!targetUrl) {
          return new Response(JSON.stringify({ ok: false, error: 'URL is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 1. Валидация: проверяем, что это ссылка на Google Maps
        const allowedDomains = [
          'google.com/maps',
          'google.ru/maps', // и другие локали
          'goo.gl/maps',
          'maps.app.goo.gl'
        ];

        const isValidLink = allowedDomains.some(domain => targetUrl.includes(domain));

        if (!isValidLink) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid Google Maps URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // 2. Скачивание страницы
        // Важно подменить User-Agent, иначе Google отдаст урезанную мобильную версию без данных
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
          },
          cf: {
            cacheTtl: 86400, // Кэшируем ответ на 24 часа (опционально)
            cacheEverything: true,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch Google Maps page: ${response.status}`);
        }

        const html = await response.text();

        // 3. Парсинг данных
        const data = parseGoogleMapsHtml(html, targetUrl);

        if (!data.lat || !data.lng) {
          return new Response(JSON.stringify({ ok: false, error: 'Could not extract coordinates. Link might be invalid or private.' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          });
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
 * Функция парсинга HTML Google Maps
 */
function parseGoogleMapsHtml(html, originalUrl) {
  const result = {
    name: null,
    lat: null,
    lng: null,
    placeId: null,
    address: null,
    rating: null,
    reviews: null,
    embedUrl: null,
    plusCode: null
  };

  try {
    // 1. Название (из Title или OG:title)
    const titleMatch = html.match(/<title>(.*?)<\/title>/i) || html.match(/property="og:title"\s+content="(.*?)"/i);
    if (titleMatch) {
      result.name = titleMatch[1].replace(" - Google Maps", "").trim();
    }

    // 2. Координаты
    // Ищем паттерн !3d(LAT)!4d(LNG) в параметрах инициализации
    const latMatch = html.match(/!3d(-?\d+\.\d+)/);
    const lngMatch = html.match(/!4d(-?\d+\.\d+)/);

    if (latMatch && lngMatch) {
      result.lat = parseFloat(latMatch[1]);
      result.lng = parseFloat(lngMatch[1]);
    } else {
      // Фолбэк на @lat,lng,zoom
      const centerMatch = html.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
      if (centerMatch) {
        result.lat = parseFloat(centerMatch[1]);
        result.lng = parseFloat(centerMatch[2]);
      }
    }

    // 3. Place ID (Hex формат)
    const placeIdMatch = html.match(/!1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)/);
    if (placeIdMatch) {
      result.placeId = placeIdMatch[1];
    }

    // 4. Адрес и Отзывы (ищем в JSON-LD или скрытых скриптах)
    // Google часто кладет структурированные данные в script type="application/ld+json"
    const jsonLdMatch = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/i);
    if (jsonLdMatch) {
      try {
        // Иногда там несколько JSON объектов, берем первый валидный
        const jsonData = JSON.parse(jsonLdMatch[1]);

        if (jsonData.address && jsonData.address.streetAddress) {
          result.address = `${jsonData.address.streetAddress}, ${jsonData.address.addressLocality || ''} ${jsonData.address.postalCode || ''}`.trim();
        }

        if (jsonData.aggregateRating) {
          result.rating = jsonData.aggregateRating.ratingValue;
          result.reviews = jsonData.aggregateRating.reviewCount;
        }
      } catch (e) {
        // Игнорируем ошибки парсинга JSON-LD, пробуем дальше
      }
    }

    // Если в JSON-LD не нашли отзывы, попробуем найти в тексте страницы паттерн "X.X stars" или "X reviews"
    if (!result.reviews) {
      const reviewMatch = html.match(/(\d+(?:,\d+)?)\s+reviews?/i);
      if (reviewMatch) result.reviews = reviewMatch[1];

      const ratingMatch = html.match(/(\d+\.\d+)\s+stars?/i);
      if (ratingMatch) result.rating = ratingMatch[1];
    }

    // 5. Plus Code (геоплюс код)
    const plusCodeMatch = html.match(/([A-Z0-9]+\+[A-Z0-9]+)\s+[A-Za-z\s,]+/);
    if (plusCodeMatch) {
      result.plusCode = plusCodeMatch[1];
    }

    // 6. Генерация Embed URL
    if (result.lat && result.lng) {
      const encodedName = result.name ? encodeURIComponent(result.name) : "";
      const pidPart = result.placeId ? `!1s${result.placeId}` : "";

      // Простая генерация pb параметра для бесплатного эмбеда
      // !1m18 - режим
      // !1m12 - параметры зума и центра
      // !1d3000 - фиктивный зум (можно настроить)
      // !2d{lng} !3d{lat} - координаты
      // !3m3 - размеры окна
      // !4f13.1 - угол
      // !3m3 - блок маркера
      // !1m2 - ID маркера
      // !1s{PlaceID}
      // !2s{Name}

      const pb = `!1m18!1m12!1m3!1d3000!2d${result.lng}!3d${result.lat}!3m2!1i1024!2i768!4f13.1!3m3!1m2!${pidPart}!2s${encodedName}!5e0!3m2!1sru!2sus!4v${Date.now()}`;
      result.embedUrl = `https://www.google.com/maps/embed?pb=${pb}`;
    }

  } catch (e) {
    console.error("Parsing error:", e);
  }

  return result;
}