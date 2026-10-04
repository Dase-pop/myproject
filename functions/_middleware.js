export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';

  const entity = identifyEntity(userAgent, ip);
  const logKey = `hit_${Date.now()}_${Math.random().toString(36).substring(7)}`;

  const logData = {
    id: logKey,
    ip: ip,
    ua: userAgent,
    path: url.pathname,
    time: new Date().toISOString(),
    entity: entity.name,
    class: entity.class,
    isImposter: entity.isImposter,
    action: url.pathname.startsWith('/trap/') ? 'TRAPPED' : 'OBSERVED'
  };

  let kvResult = 'ok';
  try {
    if (!env.SENTINEL_KV) {
      kvResult = 'BINDING_MISSING';
    } else {
      await env.SENTINEL_KV.put(logKey, JSON.stringify(logData), { expirationTtl: 604800 });
    }
  } catch (e) {
    kvResult = 'ERROR: ' + e.message;
  }

  if (url.pathname.startsWith('/trap/')) {
    return new Response(generateLabyrinth(), {
      headers: {
        'Content-Type': 'text/html',
        'X-Sentinel-KV': kvResult,
        'X-Sentinel-Entity': entity.name
      }
    });
  }

  const response = await next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-Sentinel-KV', kvResult);
  newResponse.headers.set('X-Sentinel-Entity', entity.name);
  return newResponse;
}

function identifyEntity(ua, ip) {
  let name = 'Unknown Entity';
  let classType = 'Feral';
  let isImposter = false;

  if (/chatgpt-user|claudebot|gptbot|anthropic|bytespider|perplexity/i.test(ua)) {
    name = 'AI Scraper';
    classType = 'AI';
  } else if (/ahrefs|semrush|mj12|dotbot|blexbot|dataforseo/i.test(ua)) {
    name = 'SEO Harvester';
    classType = 'Scraper';
  } else if (/googlebot/i.test(ua)) {
    name = 'Googlebot';
    classType = 'Search Engine';
    if (!ip.startsWith('66.249.') && !ip.startsWith('34.')) {
      isImposter = true;
      name = 'Fake Googlebot';
    }
  } else if (/bingbot/i.test(ua)) {
    name = 'Bingbot';
    classType = 'Search Engine';
  } else if (/slackbot|twitterbot|facebookexternalhit|discordbot/i.test(ua)) {
    name = 'Link Preview Bot';
    classType = 'Petting Zoo';
  }

  return { name, class: classType, isImposter };
}

function generateLabyrinth() {
  let html = `<html><head><title>Sentinel Grid</title></head>
  <body style="background:#000;color:#0f0;font-family:monospace;padding:40px;">
  <h1>⚠️ SENTINEL GRID: TRAP TRIGGERED ⚠️</h1>
  <p>You have entered a restricted zone. Your IP and User-Agent have been logged.</p>
  <ul>`;
  for (let i = 0; i < 50; i++) {
    html += `<li><a href="/trap/${Math.random().toString(36).substring(7)}" style="color:#0f0;">Decrypting Sector ${i}...</a></li>`;
  }
  html += `</ul></body></html>`;
  return html;
}
