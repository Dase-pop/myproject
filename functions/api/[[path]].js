export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/debug') {
    return new Response(JSON.stringify({
      hasKV: !!env.SENTINEL_KV,
      envKeys: Object.keys(env),
      path: url.pathname
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  if (url.pathname === '/api/logs') {
    if (!env.SENTINEL_KV) {
      return new Response(JSON.stringify({ error: 'KV_BINDING_MISSING' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    try {
      const list = await env.SENTINEL_KV.list({ limit: 100 });
      const logs = [];

      for (const key of list.keys) {
        const value = await env.SENTINEL_KV.get(key.name);
        if (value) logs.push(JSON.parse(value));
      }

      logs.sort((a, b) => new Date(b.time) - new Date(a.time));

      return new Response(JSON.stringify(logs), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store'
        }
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Not found', { status: 404 });
}
