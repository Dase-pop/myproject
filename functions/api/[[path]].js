export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (url.pathname === '/api/debug') {
    return json({
      hasKV: !!env.SENTINEL_KV,
      envKeys: Object.keys(env)
    });
  }

  if (url.pathname === '/api/logs') {
    if (!env.SENTINEL_KV) return json({ error: 'KV_BINDING_MISSING' }, 500);
    try {
      const list = await env.SENTINEL_KV.list({ prefix: 'hit_', limit: 1000 });
      const logs = [];
      for (const key of list.keys) {
        const value = await env.SENTINEL_KV.get(key.name);
        if (value) logs.push(JSON.parse(value));
      }
      logs.sort((a, b) => new Date(b.time) - new Date(a.time));
      return json(logs);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (url.pathname === '/api/stats') {
    if (!env.SENTINEL_KV) return json({ error: 'KV_BINDING_MISSING' }, 500);
    try {
      const today = new Date().toISOString().split('T')[0];
      const stats = {
        total: parseInt(await env.SENTINEL_KV.get('stats:total') || '0', 10),
        imposters: parseInt(await env.SENTINEL_KV.get('stats:imposters') || '0', 10),
        trapped: parseInt(await env.SENTINEL_KV.get('stats:trapped') || '0', 10),
        today: parseInt(await env.SENTINEL_KV.get(`stats:daily:${today}`) || '0', 10),
        byClass: {},
        byEntity: {},
        botOfDay: null
      };

      const classList = await env.SENTINEL_KV.list({ prefix: 'stats:class:', limit: 1000 });
      for (const key of classList.keys) {
        const cls = key.name.replace('stats:class:', '');
        stats.byClass[cls] = parseInt(await env.SENTINEL_KV.get(key.name) || '0', 10);
      }

      const entityList = await env.SENTINEL_KV.list({ prefix: 'stats:entity:', limit: 1000 });
      for (const key of entityList.keys) {
        const ent = key.name.replace('stats:entity:', '');
        stats.byEntity[ent] = parseInt(await env.SENTINEL_KV.get(key.name) || '0', 10);
      }

      const botOfDay = await env.SENTINEL_KV.get(`botday:${today}`);
      if (botOfDay) stats.botOfDay = JSON.parse(botOfDay);

      return json(stats);
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  if (url.pathname.startsWith('/api/specimen/')) {
    const id = url.pathname.replace('/api/specimen/', '');
    if (!env.SENTINEL_KV) return json({ error: 'KV_BINDING_MISSING' }, 500);
    try {
      const value = await env.SENTINEL_KV.get(id);
      if (!value) return json({ error: 'NOT_FOUND' }, 404);
      return json(JSON.parse(value));
    } catch (e) {
      return json({ error: e.message }, 500);
    }
  }

  return json({ error: 'NOT_FOUND' }, 404);
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    }
  });
}
