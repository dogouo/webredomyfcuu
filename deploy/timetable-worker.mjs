const upstream = 'https://service206-sds.fcu.edu.tw/mobileservice/CourseService.svc/Timetable2';

export default {
  async fetch(request, env) {
    // 1. 路徑檢查
    if (new URL(request.url).pathname !== '/timetable') {
      return new Response('Not Found', { status: 404 });
    }

    // 2. 來源檢查 (保護機制)
    const origin = request.headers.get('Origin');
    if (!origin || origin !== env.PAGES_ORIGIN) {
      console.warn(`[403 Blocked] Origin mismatch. Request Origin: ${origin}, Expected: ${env.PAGES_ORIGIN}`);
      return new Response('Forbidden', { status: 403 });
    }

    // 3. CORS 標頭
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
    };

    // 4. 處理預檢請求 (OPTIONS)
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers });
    }
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405, headers });
    }

    // 5. 解析請求資料
    const data = await request.json().catch(() => null);
    if (typeof data?.Account !== 'string' || typeof data?.Password !== 'string') {
      return new Response('Bad Request', { status: 400, headers });
    }

    // 6. 向學校 API 請求
    try {
      const response = await fetch(upstream, {
        method: 'POST',
        // 移除 redirect: 'error'，讓它預設自動跟隨轉向
        headers: { 
          'Content-Type': 'application/json', // 改為標準格式
          'Accept': 'application/json'
        },
        body: JSON.stringify({ Account: data.Account, Password: data.Password }),
      });

      // 如果學校回傳 400, 401, 500 等錯誤，這裡會攔截到
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[502 Upstream Error] Status: ${response.status}, Body: ${errorText}`);
        // 把學校的錯誤碼直接回傳給前端，方便除錯
        return new Response(JSON.stringify({ error: 'Upstream Error', details: errorText }), { status: response.status, headers });
      }

      // 成功取得資料
      const json = await response.json();
      return Response.json(json, { headers });

    } catch (error) {
      // 這裡會捕捉到網路錯誤、DNS 錯誤等
      console.error(`[502 Fetch Exception] ${error.message}`);
      return new Response(JSON.stringify({ error: 'Internal Worker Error', details: error.message }), { status: 502, headers });
    }
  },
};