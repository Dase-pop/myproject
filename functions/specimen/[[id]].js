export async function onRequest(context) {
  const { env, params } = context;
  const id = params.id;

  if (!env.SENTINEL_KV) {
    return new Response('KV not bound', { status: 500 });
  }

  const value = await env.SENTINEL_KV.get(id);
  if (!value) {
    return new Response(specimenHtml({ error: 'Specimen not found' }), {
      status: 404,
      headers: { 'Content-Type': 'text/html' }
    });
  }

  const data = JSON.parse(value);
  return new Response(specimenHtml(data), {
    headers: { 'Content-Type': 'text/html' }
  });
}

function specimenHtml(data) {
  if (data.error) {
    return `<!DOCTYPE html><html><body style="background:#050505;color:#ff003c;font-family:monospace;padding:40px;">
      <h1>⚠ SPECIMEN NOT FOUND</h1>
      <p>${data.error}</p>
      <a href="/" style="color:#00ff41;">← Back to Grid</a>
    </body></html>`;
  }

  const threat = data.threatScore || 0;
  const threatColor = threat >= 50 ? '#ff003c' : (threat >= 25 ? '#ffaa00' : '#00ff41');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Specimen · ${escapeHtml(data.entity)}</title>
<style>
  body { background:#050505; color:#ccc; font-family:'Courier New',monospace; padding:20px; margin:0; }
  .container { max-width:720px; margin:0 auto; }
  h1 { color:#00ff41; text-shadow:0 0 10px rgba(0,255,65,0.5); }
  .back { color:#00ff41; text-decoration:none; display:inline-block; margin-bottom:20px; }
  .card { background:#111; border:1px solid #222; border-radius:8px; padding:20px; margin-bottom:16px; }
  .threat-box { text-align:center; padding:24px; border-radius:8px; background:#0a0a0a; border:1px solid #222; }
  .threat-value { font-size:64px; font-weight:bold; color:${threatColor}; text-shadow:0 0 20px ${threatColor}; }
  .threat-label { color:#666; font-size:12px; letter-spacing:3px; }
  table { width:100%; border-collapse:collapse; font-size:14px; }
  td { padding:10px 0; border-bottom:1px solid #1a1a1a; vertical-align:top; }
  td:first-child { color:#666; width:140px; }
  .tag { display:inline-block; padding:4px 10px; border-radius:4px; font-size:12px; font-weight:bold; }
  .tag.AI { background:#003366; color:#66b3ff; }
  .tag.Scraper { background:#4d2600; color:#ff9933; }
  .tag.Search { background:#003300; color:#66ff66; }
  .tag.Feral { background:#330000; color:#ff6666; }
  .tag.Threat { background:#660000; color:#ff4444; }
  .tag.Monitor { background:#1a1a33; color:#8888ff; }
  .tag.Petting { background:#2b1a4d; color:#b58cff; }
  .imposter { color:#ff003c; font-weight:bold; }
  .ua-block { word-break:break-all; color:#888; font-size:12px; line-height:1.5; }
  a { color:#00ff41; }
</style>
</head>
<body>
<div class="container">
  <a class="back" href="/">← Back to Grid</a>
  <h1>🔬 SPECIMEN DOSSIER</h1>
  <div class="threat-box">
    <div class="threat-label">THREAT SCORE</div>
    <div class="threat-value">${threat}</div>
    <div class="threat-label">OUT OF 100</div>
  </div>
  <div class="card" style="margin-top:16px;">
    <h2 style="color:#00ff41;margin-top:0;">${escapeHtml(data.entity)}</h2>
    <span class="tag ${escapeHtml(data.class)}">${escapeHtml(data.class)}</span>
    ${data.isImposter ? '<div class="imposter" style="margin-top:12px;">⚠ IMPOSTER DETECTED</div>' : ''}
  </div>
  <div class="card">
    <table>
      <tr><td>Log ID</td><td>${escapeHtml(data.id)}</td></tr>
      <tr><td>Time</td><td>${escapeHtml(data.time)}</td></tr>
      <tr><td>Action</td><td>${escapeHtml(data.action)}</td></tr>
      <tr><td>IP</td><td>${escapeHtml(data.ip)}</td></tr>
      <tr><td>Country</td><td>${escapeHtml(data.country || '—')}</td></tr>
      <tr><td>Path</td><td>${escapeHtml(data.path)}</td></tr>
      <tr><td>Referer</td><td>${escapeHtml(data.referer || '—')}</td></tr>
      <tr><td>Accept-Lang</td><td>${escapeHtml(data.acceptLang || '—')}</td></tr>
      <tr><td>Accept-Enc</td><td>${escapeHtml(data.acceptEnc || '—')}</td></tr>
    </table>
  </div>
  <div class="card">
    <h3 style="color:#666;margin-top:0;font-size:12px;letter-spacing:2px;">USER-AGENT</h3>
    <div class="ua-block">${escapeHtml(data.ua)}</div>
  </div>
  <div class="card" style="text-align:center;">
    <a href="/">← Return to Sentinel Grid</a>
  </div>
</div>
</body>
</html>`;
}

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
