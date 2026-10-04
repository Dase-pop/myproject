export async function onRequest(context) {
  const { env } = context;

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
