const origin = 'https://signin.fcu.edu.tw';
const formUrl = origin + '/clockIn/ClassClockinQR.aspx';
const timeUrl = origin + '/clockIn/TimeService.svc/servertime';

export async function handleCheckin(request, route, headers) {
  const plain = { ...headers, 'Content-Type': 'text/plain; charset=utf-8', 'X-Content-Type-Options': 'nosniff' };
  const failed = () => new Response('校方打卡服務未回傳結果', { status: 502, headers: plain });
  try {
    if (route === '/checkin/time') {
      const response = await fetch(timeUrl, { redirect: 'error' });
      return response.ok ? new Response(response.body, { headers: plain }) : failed();
    }
    const data = await request.json().catch(() => null);
    if (data?.ndt !== 'web' || ['username', 'password', 'token'].some(
      key => typeof data[key] !== 'string' || !data[key].length
    ) || (data.appversion != null && typeof data.appversion !== 'string')) {
      return new Response('打卡欄位格式錯誤', { status: 400, headers: plain });
    }
    const form = new URLSearchParams();
    for (const key of ['username', 'password', 'token', 'ndt', 'appversion']) {
      if (data[key] != null) form.set(key, data[key]);
    }
    let url = new URL(formUrl);
    let response = await fetch(url, { method: 'POST', body: form, redirect: 'manual' });
    const cookies = new Map();
    for (let hop = 0; [301, 302, 303].includes(response.status); hop++) {
      const location = response.headers.get('location');
      if (!location || hop >= 5) return failed();
      url = new URL(location, url);
      if (url.origin !== origin || url.username || url.password) return failed();
      const setCookies = typeof response.headers.getSetCookie === 'function'
        ? response.headers.getSetCookie() : response.headers.getAll('Set-Cookie');
      for (const cookie of setCookies) {
        const pair = cookie.split(';', 1)[0];
        const separator = pair.indexOf('=');
        if (separator > 0) cookies.set(pair.slice(0, separator), pair);
      }
      response = await fetch(url, {
        redirect: 'manual',
        headers: cookies.size ? { Cookie: [...cookies.values()].join('; ') } : {},
      });
    }
    return response.ok ? new Response(response.body, { headers: plain }) : failed();
  } catch {
    return failed();
  }
}
