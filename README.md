<div align="center">

# 🛡️ SENTINEL GRID

**A live bot intelligence grid. Every crawler, scraper, and AI agent that visits this site becomes a permanent dossier.**

[![Live](https://img.shields.io/badge/live-sentinel--grid--6nk.pages.dev-00ff41?style=for-the-badge&logo=cloudflare&logoColor=black)](https://sentinel-grid-6nk.pages.dev/)
[![Cost](https://img.shields.io/badge/cost-%240%2Fmonth-00ff41?style=for-the-badge)](https://sentinel-grid-6nk.pages.dev/)
[![Cloudflare Pages](https://img.shields.io/badge/Cloudflare-Pages-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://pages.cloudflare.com/)
[![License](https://img.shields.io/badge/license-MIT-00ff41?style=for-the-badge)](LICENSE)

**[🌐 Open the Live Grid →](https://sentinel-grid-6nk.pages.dev/)**

</div>

---

## ◈ What is Sentinel Grid?

Most visitors to most websites aren't people. They're crawlers, scrapers, AI bots, and security scanners — quietly harvesting content, testing endpoints, and mapping the internet.

**Sentinel Grid is a live menagerie of every non-human entity that visits this site.**

Each bot is fingerprinted, classified, threat-scored, logged, and — when it misbehaves — trapped in an infinite labyrinth. High-value targets trigger email alerts. Repeat imposters get auto-blocked. Everything is displayed on a public dashboard in real time.

**Built entirely on free-tier infrastructure: $0/month.**

---

## ◈ Live Dashboard

> **→ [https://sentinel-grid-6nk.pages.dev](https://sentinel-grid-6nk.pages.dev/)**

```

┌─────────────────────────────────────────────────────────────┐
│  🛡️  SENTINEL GRID                         jusspound@gmail  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   LIFETIME      TODAY       IMPOSTERS      TRAPPED          │
│    4,340        2,913           0           3,199           │
│                                                             │
│  ◈ BOT OF THE DAY                                           │
│  SEO Harvester · Scraper · DE · Threat 35/100               │
│                                                             │
│  ⚠️  ENTER THE TRAP ROOM                                    │
│                                                             │
│  ▶ LIVE ARRIVALS                          ☑ hide trap flood │
│  ┌───────────────┐ ┌───────────────┐ ┌───────────────┐      │
│  │ AI Scraper    │ │ Fake Googlebot│ │ SEO Harvester │      │
│  │ AI        [15]│ │ Search   [50] │ │ Scraper  [20] │      │
│  │ IP: 2a02:...  │ │ ⚠ IMPOSTER    │ │ IP: 2a02:...  │      │
│  └───────────────┘ └───────────────┘ └───────────────┘      │
│                                                             │
└─────────────────────────────────────────────────────────────┘

```
```

## ◈ Features

<table>
<tr><td width="50%" valign="top">

### 🎯 Detection

- **7-class bot taxonomy**
  `AI · Scraper · Search · Threat · Monitor · Petting · Feral`
- **IP-validated imposter detection**
  Google, Bing, and GoogleOther IP ranges
- **Threat scoring (0–100)**
  Computed per request based on class, headers, referer
- **Country geolocation**
  via `CF-IPCountry`
- **Header fingerprinting**
  `Accept-Language` · `Accept-Encoding` · `Referer`

</td><td width="50%" valign="top">

### 🔒 Defense

- **Trap Room** — infinite labyrinth of `/trap/*` links
- **Trap dedupe** — 1 log per IP per hour
- **Rate-limited writes** — 1 KV write per IP per 5 min
- **Auto-block** — 5 imposter hits → 7-day ban
- **Self-filter** — skips your own browser traffic
- **Fake 503** served to blocked IPs

</td></tr>
<tr><td width="50%" valign="top">

### 📊 Intelligence

- **Live dashboard** with real-time polling
- **Specimen dossiers** at `/specimen/{id}`
- **Bot of the Day** — highest threat score
- **Lifetime stats** + daily counters
- **Class & entity breakdowns**
- **Email alerts** via Resend for AI/Scraper/Imposter hits

</td><td width="50%" valign="top">

### 💰 Cost & Scale

- **$0/month** — Cloudflare free tier
- **Never exceeds** free-tier KV limits
- **Rate-limited writes** prevent runaway costs
- **Pauses polling** when browser tab is hidden
- **Globally distributed** on Cloudflare's edge
- **Deployed from Termux** with `git push`

</td></tr>
</table>

---

## ◈ Architecture

```

┌──────────────────────────────────────────────────────────────────┐
│                       VISITOR (bot or human)                     │
└────────────────────────────┬─────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE PAGES (global edge)                 │
│                                                                  │
│   functions/middleware.js  ──►  Runs on EVERY request          │
│     1. Fingerprint UA, IP, country, headers                      │
│     2. Classify entity + compute threat score                    │
│     3. Rate-limit check (skip if IP seen < 5 min ago)            │
│     4. Write to KV (if allowed)                                  │
│     5. context.waitUntil() → async stats + email alerts          │
│     6. If /trap/* → serve infinite labyrinth                     │
│                                                                  │
│   functions/api/[[path]].js ──►  /api/logs · /stats · /specimen  │
│   functions/specimen/[[id]].js ──►  Per-bot dossier pages        │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE KV  (sentinel-grid-kv)               │
│                                                                  │
│   hit{ts}_{rand}          →  Full log JSON         (7 days)     │
│   stats:total              →  Lifetime counter      (∞)          │
│   stats:class:{name}       →  Per-class counter     (∞)          │
│   stats:entity:{name}      →  Per-entity counter    (∞)          │
│   stats:daily:{date}       →  Daily counter         (90 days)    │
│   recent_ip:{ip}           →  Rate-limit timestamp  (1 hour)     │
│   trap_logged:{ip}         →  Trap dedupe flag      (1 hour)     │
│   blocked:{ip}             →  Auto-block entry      (7 days)     │
│                                                                  │
└────────────────────────────┬─────────────────────────────────────┘
│
▼
┌──────────────────────────────────────────────────────────────────┐
│                       RESEND (email alerts)                      │
│            https://api.resend.com/emails — free 3k/month         │
└──────────────────────────────────────────────────────────────────┘

```

---

## ◈ Bot Taxonomy

| Class | Color | Examples | Alert? | Threat |
|---|---|---|---|---|
| **AI** | 🔵 blue | ChatGPT-User, ClaudeBot, GPTBot, Bytespider, Perplexity | ✅ | +15 |
| **Scraper** | 🟠 orange | AhrefsBot, SemrushBot, MJ12bot, DotBot, BLEXBot | ✅ | +20 |
| **Search** | 🟢 green | Googlebot, Bingbot, GoogleOther | ❌ (trusted) | −30 |
| **Threat** | 🔴 red | Nikto, SQLMap, Nmap, DirBuster, Wfuzz | ✅ | +40 |
| **Monitor** | 🟣 purple | UptimeRobot, Pingdom, StatusCake | ❌ | +0 |
| **Petting Zoo** | 🟪 violet | Slackbot, Twitterbot, Discordbot, LinkedInBot | ❌ | +0 |
| **Feral** | ⚫ grey | Everything unknown | ❌ | +10 |

**Imposter bonus:** +50 threat (fake Googlebot, fake Bingbot, etc.)

---

## ◈ Threat Scoring

| Signal | Score |
|---|---|
| Imposter detection | **+50** |
| Threat class (Nikto/SQLMap/etc.) | +40 |
| Scraper class | +20 |
| AI class | +15 |
| Feral class | +10 |
| Missing `Accept-Language` | +10 |
| Missing `Referer` | +5 |
| Verified search engine | **−30** |

Final score is clamped to `[0, 100]`.

---
```
```

## ◈ Tech Stack

<div align="center">

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Static HTML + vanilla JS | $0 |
| Edge compute | Cloudflare Pages Functions (Workers) | $0 |
| Storage | Cloudflare Workers KV | $0 |
| Email | Resend free tier (3k/month) | $0 |
| Version control | GitHub | $0 |
| Development | Termux on Android + nano | $0 |
| **Total** | | **$0/month** |

</div>

---

## ◈ Project Structure

```

myproject/
├── index.html                    Live dashboard
├── wrangler.toml                 Cloudflare config + KV binding
├── README.md                     This file
├── .gitignore
└── functions/
├── _middleware.js            Runs on every request (the brain)
├── api/
│   └── [[path]].js           /api/logs · /stats · /specimen · /debug
└── specimen/
└── [[id]].js             Per-bot dossier pages

```

---

## ◈ API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/logs` | `GET` | Last 1,000 bot hits, newest first |
| `/api/stats` | `GET` | Aggregated lifetime + daily stats |
| `/api/specimen/{id}` | `GET` | Single hit record JSON |
| `/api/debug` | `GET` | Environment diagnostic (hasKV, envKeys) |

### Example response — `/api/stats`

```json
{
  "total": 4340,
  "today": 2913,
  "imposters": 0,
  "trapped": 3199,
  "byClass": { "AI": 5, "Feral": 501, "Scraper": 1 },
  "byEntity": { "AI Scraper": 5, "SEO Harvester": 1, "Unknown Entity": 467 },
  "botOfDay": {
    "entity": "SEO Harvester",
    "class": "Scraper",
    "country": "DE",
    "threatScore": 35,
    "action": "OBSERVED",
    "time": "2026-10-04T06:37:58.446Z"
  }
}
```

---

◈ Free Tier Protection

The single most important design constraint: never exceed Cloudflare's free tier limits.

Limit Free tier Sentinel Grid usage Status
KV writes / day 1,000 ~50–200 ✅ Safe
KV reads / day 100,000 ~500–2,000 ✅ Safe
KV lists / day 1,000 ~480 ✅ Safe
KV deletes / day 1,000 ~0 ✅ Safe
Pages requests / day 100,000 unlimited ✅ Safe

How it stays safe

1. Trap dedupe — 1 log per IP per hour, no matter how many times a bot hits the labyrinth
2. Per-IP rate limiting — 1 KV write per IP per 5 minutes
3. 30-second polling — dashboard doesn't hammer the API
4. Hidden-tab pause — polling stops when the browser tab is closed
5. prefix: queries — API only lists what it needs, never full namespace scans

---

```

## ◈ Getting Started

### Prerequisites

- A Cloudflare account (free)
- A GitHub account
- A Resend account (free) for email alerts
- Termux (Android) or any Unix-like terminal

### Clone & Deploy

```bash
# Clone
git clone https://github.com/Dase-pop/myproject.git
cd myproject

# Install Wrangler (Cloudflare CLI)
npm install -g wrangler
wrangler login

# Create KV namespace
wrangler kv:namespace create "sentinel-grid-kv"

# Update wrangler.toml with the returned ID
nano wrangler.toml

# Push changes
git add .
git commit -m "Configure KV"
git push

```

## ◈ Philosophy

> *"Most visitors to most websites aren't people. It's time we knew who they are."*

Sentinel Grid is built on three principles:

1. **Transparency** — Every bot that visits is publicly logged. No secrets.
2. **Fairness** — Legitimate bots (Googlebot, Bingbot, uptime monitors) are respected. Rule-breakers aren't.
3. **Zero cost** — Security intelligence shouldn't require a paid tier. Ever.

---

## ◈ License

MIT — use it, fork it, deploy it, extend it. Attribution appreciated but not required.

---

## ◈ Credits

Built with [Termux](https://termux.dev/) on Android, powered by [Cloudflare Pages](https://pages.cloudflare.com/), [Workers KV](https://developers.cloudflare.com/kv/), and [Resend](https://resend.com/).

Inspired by the original [Crawler Zoo](https://thecrawlerzoo.com/) concept.

---

<div align="center">

**🛡️ [Open the Live Grid →](https://sentinel-grid-6nk.pages.dev/) 🛡️**

*Printed on recycled bandwidth · No bots were harmed · Several were mildly inconvenienced*

</div>

