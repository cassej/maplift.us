export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // ... (ваши существующие методы /api/contact и /api/audit остаются без изменений) ...
    if (request.method === 'POST' && url.pathname === '/api/contact') {
      // ... ваш код ...
      return new Response('Contact OK'); // заглушка для примера
    }

    if (request.method === 'POST' && url.pathname === '/api/audit') {
      // ... ваш код ...
      return new Response('Audit OK'); // заглушка для примера
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

        // Валидация
        if (!targetUrl.includes('google.com/maps') && !targetUrl.includes('goo.gl') && !targetUrl.includes('maps.app.goo.gl')) {
          return new Response(JSON.stringify({ ok: false, error: 'Invalid Google Maps URL' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        // Скачивание страницы
        const response = await fetch(targetUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          },
          cf: { cacheTtl: 86400, cacheEverything: true },
        });

        if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);

        const html = await response.text();
        const data = parseGoogleMapsDeep(html);

        if (!data.lat || !data.lng) {
          return new Response(JSON.stringify({ ok: false, error: 'Could not extract coordinates' }), {
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
 * Глубокий парсинг APP_OPTIONS для получения точных данных
 */
function parseGoogleMapsDeep(html) {
  const result = {
    name: null,
    lat: null,
    lng: null,
    placeId: null,
    address: null,
    rating: null,
    reviews: null,
    embedUrl: null
  };

  try {
    // 1. Ищем массив APP_OPTIONS
    const match = html.match(/window\.APP_OPTIONS\s*=\s*(\[[\s\S]*?\]);/);
    if (!match) return result;

    let jsonString = match[1];

    // Подготовка строки к JSON.parse (замена JS-специфичных значений)
    // Важно: заменяем undefined на null, но аккуратно
    jsonString = jsonString.replace(/undefined/g, "null");

    // Парсим
    const appOptions = JSON.parse(jsonString);

    // 2. Навигация по структуре APP_OPTIONS
    // Структура может меняться, но обычно данные о месте лежат в appOptions[6] или appOptions[7]
    // В предоставленном примере это appOptions[6][0][14] или около того.
    // Мы будем искать массив, содержащий координаты и название.

    // Рекурсивный поиск нужного блока данных
    const placeData = findPlaceData(appOptions);

    if (placeData) {
      // placeData - это массив вида [PlaceID, Name, [Coords...], ...]
      // Обычно: [0] = PlaceID (Hex), [1] = Name, [2] или [3] = Coords

      result.placeId = placeData[0];
      result.name = placeData[1];

      // Координаты часто лежат в [2] или [3] в формате [zoom, lng, lat] или [lat, lng]
      // В примере из файла: [[12369..., -92.85..., 38.20...], null, [1024, 768], 13.1]
      // А точные координаты пина: [null, null, 38.1998908, -92.8351234] (индексы 2 и 3 внутри подмассива)

      let coordsArray = null;

      // Пробуем найти массив с координатами внутри placeData
      // Обычно это 3-й элемент (index 2) или 4-й (index 3)
      if (Array.isArray(placeData[2]) && placeData[2].length >= 3) {
        // Формат [zoom, lng, lat]
        result.lng = placeData[2][1];
        result.lat = placeData[2][2];
      } else if (Array.isArray(placeData[3]) && placeData[3].length >= 4) {
        // Формат [null, null, lat, lng]
        result.lat = placeData[3][2];
        result.lng = placeData[3][3];
      }
    }

    // Если не нашли через глубокий парсинг, пробуем фолбэк на Regex (как раньше)
    if (!result.lat) {
      const latMatch = html.match(/!3d(-?\d+\.\d+)/);
      const lngMatch = html.match(/!4d(-?\d+\.\d+)/);
      if (latMatch && lngMatch) {
        result.lat = parseFloat(latMatch[1]);
        result.lng = parseFloat(lngMatch[1]);
      }
    }

    // Если не нашли имя, берем из Title
    if (!result.name) {
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) result.name = titleMatch[1].replace(" - Google Maps", "").trim();
    }

    // Генерация Embed URL с ТОЧНЫМИ координатами
    if (result.lat && result.lng) {
      const encodedName = result.name ? encodeURIComponent(result.name) : "";
      const pidPart = result.placeId ? `!1s${result.placeId}` : "";

      // Формируем pb параметр
      const pb = `!1m18!1m12!1m3!1d3000!2d${result.lng}!3d${result.lat}!3m2!1i1024!2i768!4f13.1!3m3!1m2!${pidPart}!2s${encodedName}!5e0!3m2!1sru!2sus!4v${Date.now()}`;
      result.embedUrl = `https://www.google.com/maps/embed?pb=${pb}`;
    }

  } catch (e) {
    console.error("Deep parsing error:", e);
  }

  return result;
}

/**
 * Рекурсивная функция для поиска массива с данными места
 * Ищет массив, где есть Hex ID (0x...) и название
 */
function findPlaceData(obj) {
  if (!obj) return null;

  // Если это массив
  if (Array.isArray(obj)) {
    // Проверяем, похож ли этот массив на данные места
    // Пример структуры: ["0x87c4ebdf0900b82f:0xb73ed8c395f14760", "Don's Barber Shop", [...], ...]
    if (typeof obj[0] === 'string' && obj[0].startsWith('0x') && typeof obj[1] === 'string') {
      return obj;
    }

    // Рекурсивно ищем в элементах массива
    for (let i = 0; i < obj.length; i++) {
      const found = findPlaceData(obj[i]);
      if (found) return found;
    }
  }
  // Если объект
  else if (typeof obj === 'object') {
    for (const key in obj) {
      const found = findPlaceData(obj[key]);
      if (found) return found;
    }
  }

  return null;
}