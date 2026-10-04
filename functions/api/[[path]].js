export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
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

  try {
    await env.SENTINEL_KV.put(logKey, JSON.stringify(logData), { expirationTtl: 604800 });
  } catch (e) {
    console.error("KV write failed", e);
  }

  if (entity.class === 'AI' || entity.class === 'Scraper' || entity.isImposter) {
    context.waitUntil(sendAlertEmail(env, logData));
  }

  if (url.pathname.startsWith('/trap/')) {
    return new Response(generateLabyrinth(), {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return context.next();
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

async function sendAlertEmail(env, data) {
  const text = `SENTINEL GRID ALERT

Entity: ${data.entity}
Class: ${data.class}
IP: ${data.ip}
Path: ${data.path}
User-Agent: ${data.ua}
Imposter: ${data.isImposter ? 'YES' : 'NO'}
Time: ${data.time}
Log ID: ${data.id}`;

  try {
    await fetch('https://api.mailchannels.net/tx/v1/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: 'jusspound@gmail.com' }] }],
        from: { email: 'alert@yourdomain.com', name: 'Sentinel Grid' },
        subject: `[Sentinel] ${data.entity} detected`,
        content: [{ type: 'text/plain', value: text }]
      })
    });
  } catch (e) {
    console.error("Email failed", e);
  }
}
