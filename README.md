# 🛡️ Sentinel Grid

A live bot intelligence grid.

[Open the Live Grid](https://sentinel-grid-6nk.pages.dev/)

---

## Features

- 7-class bot taxonomy (AI, Scraper, Search, Threat, Monitor, Petting, Feral)
- IP-validated imposter detection
- Threat scoring 0-100
- Trap Room with infinite labyrinth
- Rate-limited KV writes
- Auto-block repeat imposters
- Specimen dossier pages
- Bot of the Day
- Email alerts via Resend
- $0/month forever

---

## Bot Taxonomy

| Class | Examples | Alert | Threat |
|---|---|---|---|
| AI | ChatGPT-User, ClaudeBot, GPTBot, Bytespider | Yes | +15 |
| Scraper | AhrefsBot, SemrushBot, MJ12bot, DotBot | Yes | +20 |
| Search | Googlebot, Bingbot, GoogleOther | No | -30 |
| Threat | Nikto, SQLMap, Nmap, DirBuster | Yes | +40 |
| Monitor | UptimeRobot, Pingdom, StatusCake | No | +0 |
| Petting Zoo | Slackbot, Twitterbot, Discordbot | No | +0 |
| Feral | Everything unknown | No | +10 |

---

## API Endpoints

| Endpoint | Description |
|---|---|
| /api/logs | Last 1,000 bot hits |
| /api/stats | Aggregated lifetime + daily stats |
| /api/specimen/{id} | Single hit record JSON |
| /api/debug | Environment diagnostic |

---

## Tech Stack

| Layer | Technology | Cost |
|---|---|---|
| Frontend | Static HTML + JS | $0 |
| Edge | Cloudflare Pages Functions | $0 |
| Storage | Cloudflare Workers KV | $0 |
| Email | Resend free tier | $0 |
| Hosting | GitHub | $0 |
| Total | | $0/month |

---

## Roadmap

- [x] 7-class taxonomy
- [x] Imposter detection
- [x] Threat scoring
- [x] Trap Room
- [x] Email alerts
- [x] Auto-block
- [x] Specimen dossiers
- [x] Bot of the Day
- [x] Free-tier protection
- [ ] Public leaderboard
- [ ] Geo map
- [ ] Weekly digest
- [ ] CSV export

---

## License

MIT

---

Built with Termux on Android · Cloudflare Pages · Workers KV · Resend

**Open the Live Grid → https://sentinel-grid-6nk.pages.dev/**
