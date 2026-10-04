export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (url.pathname.startsWith('/api/')) return next();

  const userAgent = request.headers.get('User-Agent') || 'Unknown';
  const ip = request.headers.get('CF-Connecting-IP') || 'Unknown';
  const referer = request.headers.get('Referer') || '';
  const acceptLang = request.headers.get('Accept-Language') || '';
  const acceptEnc = request.headers.get('Accept-Encoding') || '';
  const country = request.headers.get('CF-IPCountry') || 'XX';

  const isLikelyMe =
    /Android|iPhone/.test(userAgent) &&
    /Chrome|Firefox|Safari/.test(userAgent) &&
    !/bot|crawl|spider|scrape/i.test(userAgent) &&
    !url.pathname.startsWith('/trap/') &&
    !url.pathname.startsWith('/specimen/');

  if (isLikelyMe) return next();

  const entity = identifyEntity(userAgent, ip, referer);
  const threatScore = calculateThreatScore(entity, acceptLang, referer);
  const now = Date.now();

  // ===== TRAP ROOM: respond immediately, write to KV only first time per hour =====
  if (url.pathname.startsWith('/trap/')) {
    let isNewTrapIp = true;
    try {
      const loggedKey = `trap_logged:${ip}`;
      const alreadyLogged = await env.SENTINEL_KV.get(loggedKey);
      if (alreadyLogged) isNewTrapIp = false;
    } catch (e) {}

    if (isNewTrapIp) {
      const logKey = `hit_${now}_${Math.random().toString(36).substring(7)}`;
      const logData = {
        id: logKey, ip, ua: userAgent, path: url.pathname,
        referer, country, acceptLang, acceptEnc,
        time: new Date().toISOString(),
        entity: entity.name, class: entity.class,
        isImposter: entity.isImposter, threatScore,
        action: 'TRAPPED'
      };
      try {
        if (env.SENTINEL_KV) {
          await env.SENTINEL_KV.put(logKey, JSON.stringify(logData), { expirationTtl: 604800 });
          await env.SENTINEL_KV.put(`trap_logged:${ip}`, '1', { expirationTtl: 3600 });
        }
      } catch (e) {}
    }

    return new Response(generateLabyrinth(), {
      headers: {
        'Content-Type': 'text/html',
        'X-Sentinel-KV': isNewTrapIp ? 'ok' : 'deduped',
        'X-Sentinel-Entity': entity.name
      }
    });
  }

  // ===== NORMAL REQUESTS: rate-limit KV writes per IP =====
  // Check if this IP was already logged in the last 5 minutes
  let isDuplicate = false;
  try {
    const recentKey = `recent_ip:${ip}`;
    const lastSeen = await env.SENTINEL_KV.get(recentKey);
    if (lastSeen && (now - parseInt(lastSeen, 10)) < 300000) {
      isDuplicate = true;
    }
  } catch (e) {}

  if (isDuplicate) {
    // Don't write to KV, just serve the page
    const response = await next();
    const newResponse = new Response(response.body, response);
    newResponse.headers.set('X-Sentinel-KV', 'rate-limited');
    newResponse.headers.set('X-Sentinel-Entity', entity.name);
    newResponse.headers.set('X-Sentinel-Threat', String(threatScore));
    return newResponse;
  }

  const logKey = `hit_${now}_${Math.random().toString(36).substring(7)}`;
  const logData = {
    id: logKey, ip, ua: userAgent, path: url.pathname,
    referer, country, acceptLang, acceptEnc,
    time: new Date().toISOString(),
    entity: entity.name, class: entity.class,
    isImposter: entity.isImposter, threatScore,
    action: 'OBSERVED'
  };

  let kvResult = 'ok';
  try {
    if (!env.SENTINEL_KV) {
      kvResult = 'BINDING_MISSING';
    } else {
      await env.SENTINEL_KV.put(logKey, JSON.stringify(logData), { expirationTtl: 604800 });
      await env.SENTINEL_KV.put(`recent_ip:${ip}`, String(now), { expirationTtl: 3600 });
      context.waitUntil(updateStats(env, logData));
      if (entity.isImposter) context.waitUntil(trackImposter(env, ip));
    }
  } catch (e) {
    kvResult = 'ERROR: ' + e.message;
  }

  const shouldAlert = entity.class === 'AI' || entity.class === 'Scraper' || entity.isImposter === true;
  if (shouldAlert && env.RESEND_API_KEY) {
    context.waitUntil(sendAlertIfNotRecent(env, logData));
  }

  const response = await next();
  const newResponse = new Response(response.body, response);
  newResponse.headers.set('X-Sentinel-KV', kvResult);
  newResponse.headers.set('X-Sentinel-Entity', entity.name);
  newResponse.headers.set('X-Sentinel-Threat', String(threatScore));
  return newResponse;
}

function identifyEntity(ua, ip) {
  let name = 'Unknown Entity', classType = 'Feral', isImposter = false;
  if (/chatgpt-user|claudebot|gptbot|anthropic|bytespider|perplexity|cohere|youbot/i.test(ua)) {
    name = 'AI Scraper'; classType = 'AI';
  } else if (/ahrefs|semrush|mj12|dotbot|blexbot|dataforseo|screaming|seokicks/i.test(ua)) {
    name = 'SEO Harvester'; classType = 'Scraper';
  } else if (/googlebot/i.test(ua)) {
    name = 'Googlebot'; classType = 'Search Engine';
    if (!ip.startsWith('66.249.') && !ip.startsWith('34.') && !ip.startsWith('35.')) {
      isImposter = true; name = 'Fake Googlebot';
    }
  } else if (/googleother|google-inspectiontool/i.test(ua)) {
    name = 'GoogleOther'; classType = 'Search Engine';
    if (!ip.startsWith('66.249.') && !ip.startsWith('34.') && !ip.startsWith('35.')) {
      isImposter = true; name = 'Fake GoogleOther';
    }
  } else if (/bingbot/i.test(ua)) {
    name = 'Bingbot'; classType = 'Search Engine';
    if (!ip.startsWith('40.77.') && !ip.startsWith('157.55.') && !ip.startsWith('207.46.')) {
      isImposter = true; name = 'Fake Bingbot';
    }
  } else if (/slackbot|twitterbot|facebookexternalhit|discordbot|linkedinbot|telegrambot|whatsapp/i.test(ua)) {
    name = 'Link Preview Bot'; classType = 'Petting Zoo';
  } else if (/uptimerobot|pingdom|statuscake|betteruptime/i.test(ua)) {
    name = 'Uptime Monitor'; classType = 'Monitor';
  } else if (/nikto|sqlmap|nmap|masscan|acunetix|nessus|dirbuster|wfuzz|zgrab/i.test(ua)) {
    name = 'Security Scanner'; classType = 'Threat';
  }
  return { name, class: classType, isImposter };
}

function calculateThreatScore(entity, acceptLang, referer) {
  let score = 0;
  if (entity.isImposter) score += 50;
  if (entity.class === 'Threat') score += 40;
  if (entity.class === 'Scraper') score += 20;
  if (entity.class === 'AI') score += 15;
  if (entity.class === 'Feral') score += 10;
  if (!acceptLang) score += 10;
  if (!referer) score += 5;
  if (entity.class === 'Search Engine' && !entity.isImposter) score -= 30;
  return Math.max(0, Math.min(100, score));
}

async function updateStats(env, data) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const total = parseInt(await env.SENTINEL_KV.get('stats:total') || '0', 10);
    await env.SENTINEL_KV.put('stats:total', String(total + 1));

    const classKey = `stats:class:${data.class}`;
    const classCount = parseInt(await env.SENTINEL_KV.get(classKey) || '0', 10);
    await env.SENTINEL_KV.put(classKey, String(classCount + 1));

    const entityKey = `stats:entity:${data.entity}`;
    const entityCount = parseInt(await env.SENTINEL_KV.get(entityKey) || '0', 10);
    await env.SENTINEL_KV.put(entityKey, String(entityCount + 1));

    if (data.isImposter) {
      const imp = parseInt(await env.SENTINEL_KV.get('stats:imposters') || '0', 10);
      await env.SENTINEL_KV.put('stats:imposters', String(imp + 1));
    }

    const dailyKey = `stats:daily:${today}`;
    const daily = parseInt(await env.SENTINEL_KV.get(dailyKey) || '0', 10);
    await env.SENTINEL_KV.put(dailyKey, String(daily + 1), { expirationTtl: 90 * 86400 });

    const botDayKey = `botday:${today}`;
    const currentBotDay = await env.SENTINEL_KV.get(botDayKey);
    if (!currentBotDay || data.threatScore > 30) {
      await env.SENTINEL_KV.put(botDayKey, JSON.stringify(data), { expirationTtl: 90 * 86400 });
    }
  } catch (e) {}
}

async function trackImposter(env, ip) {
  try {
    const key = `imposter_count:${ip}`;
    const count = parseInt(await env.SENTINEL_KV.get(key) || '0', 10) + 1;
    await env.SENTINEL_KV.put(key, String(count), { expirationTtl: 7 * 86400 });
    if (count >= 5) {
      await env.SENTINEL_KV.put(`blocked:${ip}`, 'auto-blocked', { expirationTtl: 7 * 86400 });
    }
  } catch (e) {}
}

async function sendAlertIfNotRecent(env, data) {
  try {
    const rateKey = `alert_sent:${data.entity}:${data.ip}`;
    const recent = await env.SENTINEL_KV.get(rateKey);
    if (recent) return;
    await env.SENTINEL_KV.put(rateKey, '1', { expirationTtl: 3600 });
    await sendAlertEmail(env, data);
  } catch (e) {}
}

function generateLabyrinth() {
  let html = `<html><head><title>Sentinel Grid</title></head>
  <body style="background:#000;color:#0f0;font-family:monospace;padding:40px;">
  <h1>⚠️ SENTINEL GRID: TRAP TRIGGERED ⚠️</h1>
  <p>Your IP and User-Agent have been logged.</p>
  <ul>`;
  for (let i = 0; i < 50; i++) {
    html += `<li><a href="/trap/${Math.random().toString(36).substring(7)}" style="color:#0f0;">Decrypting Sector ${i}...</a></li>`;
  }
  html += `</ul></body></html>`;
  return html;
}

async function sendAlertEmail(env, data) {
  const subjectTag = data.isImposter ? '🚨 IMPOSTER' : (data.class === 'AI' ? '🤖 AI SCRAPER' : '🕷 SCRAPER');
  const threatColor = data.threatScore >= 50 ? '#ff003c' : (data.threatScore >= 25 ? '#ffaa00' : '#00ff41');
  const html = `
    <div style="font-family:monospace;background:#050505;color:#00ff41;padding:24px;border-radius:8px;">
      <h2 style="color:#00ff41;margin:0 0 16px;">🛡️ SENTINEL GRID ALERT</h2>
      <div style="background:#111;padding:12px;border-radius:6px;margin-bottom:16px;">
        <span style="color:#666;font-size:12px;">THREAT SCORE</span>
        <div style="color:${threatColor};font-size:28px;font-weight:bold;">${data.threatScore}<span style="color:#666;font-size:14px;">/100</span></div>
      </div>
      <table style="border-collapse:collapse;color:#ccc;font-size:13px;">
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Entity:</td><td style="padding:4px 0;"><strong>${escapeHtml(data.entity)}</strong></td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Class:</td><td style="padding:4px 0;">${escapeHtml(data.class)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">IP:</td><td style="padding:4px 0;">${escapeHtml(data.ip)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Country:</td><td style="padding:4px 0;">${escapeHtml(data.country)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Path:</td><td style="padding:4px 0;">${escapeHtml(data.path)}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;color:#666;">Time:</td><td style="padding:4px 0;">${escapeHtml(data.time)}</td></tr>
      </table>
      <p style="margin:20px 0 0;">
        <a href="https://sentinel-grid-6nk.pages.dev/specimen/${escapeHtml(data.id)}" style="color:#00ff41;">View Specimen →</a>
      </p>
    </div>`;
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: 'Sentinel Grid <onboarding@resend.dev>',
        to: ['jusspound@gmail.com'],
        subject: `${subjectTag} · ${data.entity} · threat ${data.threatScore}`,
        html
      })
    });
  } catch (e) {}
}

function escapeHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
