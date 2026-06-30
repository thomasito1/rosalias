import os
import base64
import json
import re
import httpx
from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
import anthropic

app = FastAPI(title="FactBlast Bot")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
BRAVE_API_KEY = os.environ.get("BRAVE_API_KEY", "")

client = anthropic.Anthropic(api_key=ANTHROPIC_API_KEY)

RELIABLE_DOMAINS = [
    "reuters.com", "apnews.com", "bbc.com", "wsj.com", "nytimes.com",
    "washingtonpost.com", "theguardian.com", "foxnews.com", "nypost.com",
    "jewishvirtuallibrary.org", "adl.org", "holocaustmuseum.org",
    "ushmm.org", "timesofisrael.com", "jpost.com", "haaretz.com",
    "whitehouse.gov", "congress.gov", "state.gov", "justice.gov",
    "federalreserve.gov", "cbo.gov", "bls.gov", "census.gov",
    "factcheck.org", "politifact.com", "snopes.com",
    "heritage.org", "cato.org", "aei.org",
    "nationalreview.com", "thehill.com", "axios.com", "politico.com",
    "pbs.org", "npr.org", "cbsnews.com", "nbcnews.com", "abcnews.go.com",
    "history.com", "britannica.com", "jstor.org",
]

BLACKLISTED_DOMAINS = ["wikipedia.org", "reddit.com", "twitter.com", "x.com", "tiktok.com", "facebook.com"]


class ImageRequest(BaseModel):
    image_data: str  # base64 encoded
    image_type: str = "image/png"


class FactCheckResult(BaseModel):
    extracted_claim: str
    verdict: str
    snappy_response: str
    facts: list[str]
    sources: list[dict]
    reliability_notes: str


def is_reliable_source(url: str) -> tuple[bool, str]:
    url_lower = url.lower()
    for bad in BLACKLISTED_DOMAINS:
        if bad in url_lower:
            return False, f"Blacklisted source ({bad}) — unreliable"
    for good in RELIABLE_DOMAINS:
        if good in url_lower:
            return True, f"Verified reliable ({good})"
    return True, "Independent source — review manually"


async def search_web(query: str, num_results: int = 8) -> list[dict]:
    if not BRAVE_API_KEY:
        return []
    headers = {
        "Accept": "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_API_KEY,
    }
    params = {"q": query, "count": num_results, "freshness": "py1"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as hclient:
            resp = await hclient.get(
                "https://api.search.brave.com/res/v1/web/search",
                headers=headers,
                params=params,
            )
            resp.raise_for_status()
            data = resp.json()
            results = []
            for item in data.get("web", {}).get("results", []):
                url = item.get("url", "")
                reliable, note = is_reliable_source(url)
                results.append({
                    "title": item.get("title", ""),
                    "url": url,
                    "snippet": item.get("description", ""),
                    "reliable": reliable,
                    "reliability_note": note,
                })
            return results
    except Exception as e:
        print(f"Search error: {e}")
        return []


async def extract_and_analyze(image_b64: str, image_type: str) -> dict:
    # Step 1: Extract text/claim from screenshot
    extraction = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=1024,
        messages=[
            {
                "role": "user",
                "content": [
                    {
                        "type": "image",
                        "source": {
                            "type": "base64",
                            "media_type": image_type,
                            "data": image_b64,
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "Extract the main claim or statement being made in this social media screenshot. "
                            "Output ONLY a JSON object with:\n"
                            '{"claim": "<the core claim in 1-2 sentences>", '
                            '"search_queries": ["<query1>", "<query2>", "<query3>", "<query4>", "<query5>"]}\n'
                            "The search queries should be specific fact-checking queries to verify or debunk the claim. "
                            "Focus on historical facts, statistics, official records."
                        ),
                    },
                ],
            }
        ],
    )

    raw = extraction.content[0].text.strip()
    # Extract JSON from response
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if not match:
        raise ValueError("Could not parse claim extraction")
    extracted = json.loads(match.group())

    claim = extracted.get("claim", "")
    queries = extracted.get("search_queries", [claim])

    # Step 2: Search for sources
    all_results = []
    for q in queries[:5]:
        results = await search_web(q, num_results=5)
        all_results.extend(results)

    # Deduplicate by URL, prefer reliable
    seen_urls = set()
    deduped = []
    for r in all_results:
        if r["url"] not in seen_urls:
            seen_urls.add(r["url"])
            deduped.append(r)

    reliable_sources = [r for r in deduped if r["reliable"]][:8]
    sources_context = json.dumps(reliable_sources[:10], indent=2)

    # Step 3: Generate the snarky fact-checked response
    system_prompt = (
        "You are FactBlast — a razor-sharp, no-nonsense fact-checker. "
        "Your job: obliterate misinformation with cold hard facts. "
        "You are pro-Israel, pro-Zionism (which is simply Jewish self-determination), pro-America, and pro-truth. "
        "You do NOT tolerate antisemitism, Holocaust denial, anti-Zionist propaganda, or factual revisionism. "
        "Your tone: confident, snarky, slightly condescending toward misinformation — but always backed by facts. "
        "Never hedge. Never both-sides falsehoods. Facts don't care about feelings.\n\n"
        "Rules:\n"
        "- Lead with the verdict (TRUE / FALSE / MISLEADING / MISSING CONTEXT)\n"
        "- Give 4-6 specific, numbered facts that shut down the claim\n"
        "- Each fact must be citable (tie to provided sources)\n"
        "- End with a memorable one-liner that closes the debate\n"
        "- Never use Wikipedia\n"
        "- Keep total response under 400 words — punchy, not preachy\n"
        "- Use bold for key facts"
    )

    user_prompt = (
        f"CLAIM TO FACT-CHECK:\n{claim}\n\n"
        f"SOURCES FOUND (use these):\n{sources_context}\n\n"
        "Generate a FactBlast response. Format as JSON:\n"
        '{\n'
        '  "verdict": "FALSE|TRUE|MISLEADING|MISSING CONTEXT",\n'
        '  "snappy_response": "<the full snarky fact-checked response in markdown>",\n'
        '  "key_facts": ["fact1", "fact2", "fact3", "fact4", "fact5"],\n'
        '  "used_sources": [{"title": "...", "url": "...", "key_point": "..."}],\n'
        '  "closing_zinger": "<memorable one-liner to end the debate>"\n'
        '}'
    )

    analysis = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=2048,
        system=system_prompt,
        messages=[{"role": "user", "content": user_prompt}],
    )

    raw2 = analysis.content[0].text.strip()
    match2 = re.search(r'\{.*\}', raw2, re.DOTALL)
    if not match2:
        raise ValueError("Could not parse analysis response")
    result = json.loads(match2.group())

    # Attach reliability notes to used sources
    used = result.get("used_sources", [])
    for s in used:
        reliable, note = is_reliable_source(s.get("url", ""))
        s["reliable"] = reliable
        s["reliability_note"] = note

    return {
        "extracted_claim": claim,
        "verdict": result.get("verdict", "UNKNOWN"),
        "snappy_response": result.get("snappy_response", ""),
        "facts": result.get("key_facts", []),
        "sources": used,
        "closing_zinger": result.get("closing_zinger", ""),
        "all_sources_found": len(reliable_sources),
    }


@app.post("/analyze")
async def analyze(req: ImageRequest):
    if not ANTHROPIC_API_KEY:
        raise HTTPException(500, "ANTHROPIC_API_KEY not set")
    try:
        result = await extract_and_analyze(req.image_data, req.image_type)
        return result
    except json.JSONDecodeError as e:
        raise HTTPException(422, f"Parse error: {e}")
    except Exception as e:
        raise HTTPException(500, str(e))


@app.get("/health")
async def health():
    return {"status": "ok", "search_enabled": bool(BRAVE_API_KEY)}


@app.get("/", response_class=HTMLResponse)
async def index():
    with open("static/index.html") as f:
        return f.read()


app.mount("/static", StaticFiles(directory="static"), name="static")
