import { handleCheckin } from './checkin.mjs';

const upstream = 'https://service206-sds.fcu.edu.tw/mobileservice/CourseService.svc/Timetable2';

export default {
  async fetch(request, env) {
    const route = new URL(request.url).pathname;
    if (!['/timetable', '/checkin', '/checkin/time'].includes(route)) {
      return new Response(null, { status: 404 });
    }
    const origin = request.headers.get('Origin');
    if (!origin || origin !== env.PAGES_ORIGIN) {
      return new Response(null, { status: 403 });
    }
    const method = route === '/checkin/time' ? 'GET' : 'POST';
    const headers = {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': method,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Cache-Control': 'no-store',
      'Vary': 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== method) return new Response(null, { status: 405, headers });
    if (route !== '/timetable') return handleCheckin(request, route, headers);
    const data = await request.json().catch(() => null);
    if (typeof data?.Account !== 'string' || typeof data?.Password !== 'string') {
      return new Response(null, { status: 400, headers });
    }
    try {
      const response = await fetch(upstream, {
        method: 'POST',
        redirect: 'error',
        headers: { 'Content-Type': 'text/json' },
        body: JSON.stringify({ Account: data.Account, Password: data.Password }),
      });
      if (!response.ok) return new Response(null, { status: 502, headers });
      return Response.json(await response.json(), { headers });
    } catch {
      return new Response(null, { status: 502, headers });
    }
  },
};
