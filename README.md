# FactBlast — Social Media Screenshot Fact-Checker

Paste any screenshot → get an instant, source-backed debunk in seconds.

## What it does

1. **Vision analysis** — Claude reads the screenshot and extracts the core claim
2. **Multi-source search** — queries Brave Search with 4-5 targeted fact-check queries
3. **Source vetting** — auto-checks every source against a whitelist of reliable outlets (Reuters, AP, WSJ, JPost, Times of Israel, USHMM, ADL, government sites, etc.) and blacklists Wikipedia/Reddit/social media
4. **Snarky response** — generates a punchy, fact-backed response you can copy-paste directly into any comment section

## Quick Start

```bash
pip install -r requirements.txt

# Set your keys
export ANTHROPIC_API_KEY=sk-ant-...
export BRAVE_API_KEY=BSA...   # optional but enables live search

uvicorn app:app --host 0.0.0.0 --port 8000
```

Then open `http://localhost:8000`, paste a screenshot with **Ctrl+V**, and hit **Fact-Check This**.

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | Yes | Powers vision + response generation |
| `BRAVE_API_KEY` | Recommended | Free tier: 2,000 searches/month at brave.com/search/api |

## Reliable Sources (built-in whitelist)

Reuters, AP News, BBC, WSJ, NYT, Washington Post, Fox News, NY Post, Jewish Virtual Library, ADL, USHMM, Times of Israel, Jerusalem Post, Haaretz, all `.gov` domains, FactCheck.org, PolitiFact, Heritage Foundation, Cato Institute, National Review, Axios, Politico, PBS, NPR, and more.

**Never Wikipedia. Never Reddit. Never social media.**

## Deployment

Works on any server. For cloud deployment:
- **Railway / Render / Fly.io** — set env vars in their dashboard, deploy directly
- **Docker** — standard Python image, expose port 8000
