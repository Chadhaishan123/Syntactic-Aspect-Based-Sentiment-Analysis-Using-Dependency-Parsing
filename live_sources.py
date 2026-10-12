"""Live ingestion of real, public user comments for SyntaxSense.

Sources (both free and keyless):
  * Hacker News comments via the Algolia search API (query-based, filtered by timestamp)
  * Mastodon public hashtag timelines on mastodon.social (paged with since_id)

Each fetcher returns raw posts. `extract_candidate_sentences` turns a post into short,
opinion-bearing sentences suitable for aspect-level parsing.
"""
from __future__ import annotations

import html
import json
import re
import time
import urllib.parse
import urllib.request
from dataclasses import dataclass, field
from datetime import datetime, timezone
from os import getenv

USER_AGENT = "SyntaxSense/2.0 (academic aspect-based sentiment research)"
HTTP_TIMEOUT = 10

HN_QUERIES = [q.strip() for q in getenv(
    "LIVE_HN_QUERIES", "battery life,laptop,headphones,camera,keyboard,screen,phone"
).split(",") if q.strip()]
MASTODON_TAGS = [t.strip() for t in getenv(
    "LIVE_MASTODON_TAGS", "smartphone,laptop,headphones,android,iphone,gadgets"
).split(",") if t.strip()]
MASTODON_INSTANCE = getenv("LIVE_MASTODON_INSTANCE", "https://mastodon.social")

# On first start, look back this far on Hacker News so the feed is not empty.
HN_BACKFILL_SECONDS = int(getenv("LIVE_HN_BACKFILL_SECONDS", str(6 * 3600)))


@dataclass
class RawPost:
    external_id: str
    platform: str          # "Hacker News" | "Mastodon"
    channel: str           # query or hashtag that matched
    text: str              # cleaned plain text
    author: str | None
    url: str | None
    posted_at: datetime


@dataclass
class SourceStatus:
    name: str
    channels: list[str]
    enabled: bool = True
    last_poll_at: datetime | None = None
    last_success_at: datetime | None = None
    last_error: str | None = None
    posts_fetched: int = 0
    sentences_ingested: int = 0
    # Cursors (not serialised to clients)
    cursors: dict[str, str | int] = field(default_factory=dict)

    def public(self) -> dict:
        return {
            "name": self.name,
            "channels": self.channels,
            "enabled": self.enabled,
            "last_poll_at": self.last_poll_at.isoformat() if self.last_poll_at else None,
            "last_success_at": self.last_success_at.isoformat() if self.last_success_at else None,
            "last_error": self.last_error,
            "posts_fetched": self.posts_fetched,
            "sentences_ingested": self.sentences_ingested,
        }


def _get_json(url: str):
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=HTTP_TIMEOUT) as res:
        return json.loads(res.read())


_TAG_RE = re.compile(r"<[^>]+>")
_URL_RE = re.compile(r"https?://\S+")
_WS_RE = re.compile(r"\s+")


def clean_html(raw: str) -> str:
    """Convert HN/Mastodon HTML into plain text, dropping quoted lines and links."""
    if not raw:
        return ""
    text = re.sub(r"<p>|<br\s*/?>", "\n", raw, flags=re.I)
    text = _TAG_RE.sub("", text)
    text = html.unescape(text)
    # Drop quoted lines ("> ...") which are someone else's words.
    lines = [ln for ln in text.split("\n") if not ln.strip().startswith(">")]
    text = " ".join(lines)
    text = _URL_RE.sub("", text)
    text = re.sub(r"#\w+", "", text)        # hashtags
    text = re.sub(r"@\w+(@[\w.]+)?", "", text)  # mentions
    return _WS_RE.sub(" ", text).strip()


_SENT_SPLIT = re.compile(r"(?<=[.!?])\s+(?=[A-Z\"'(])")


def extract_candidate_sentences(text: str, lexicon: set[str], max_sentences: int = 2) -> list[str]:
    """Return up to `max_sentences` short sentences containing at least one opinion word."""
    out: list[str] = []
    for sent in _SENT_SPLIT.split(text):
        sent = sent.strip()
        if not (25 <= len(sent) <= 280):
            continue
        words = set(re.findall(r"[a-z']+", sent.lower()))
        if words & lexicon:
            out.append(sent)
        if len(out) >= max_sentences:
            break
    return out


def fetch_hacker_news(status: SourceStatus) -> list[RawPost]:
    posts: list[RawPost] = []
    now = int(time.time())
    for query in status.channels:
        since = int(status.cursors.get(query, now - HN_BACKFILL_SECONDS))
        params = urllib.parse.urlencode({
            "tags": "comment",
            "query": query,
            "numericFilters": f"created_at_i>{since}",
            "hitsPerPage": 20,
        })
        data = _get_json(f"https://hn.algolia.com/api/v1/search_by_date?{params}")
        newest = since
        for hit in data.get("hits", []):
            created = int(hit.get("created_at_i") or 0)
            newest = max(newest, created)
            text = clean_html(hit.get("comment_text") or "")
            if not text:
                continue
            posts.append(RawPost(
                external_id=f"hn:{hit['objectID']}",
                platform="Hacker News",
                channel=query,
                text=text,
                author=hit.get("author"),
                url=f"https://news.ycombinator.com/item?id={hit['objectID']}",
                posted_at=datetime.fromtimestamp(created, tz=timezone.utc),
            ))
        status.cursors[query] = newest
    return posts


def fetch_mastodon(status: SourceStatus) -> list[RawPost]:
    posts: list[RawPost] = []
    for tag in status.channels:
        params = {"limit": 20}
        since_id = status.cursors.get(tag)
        if since_id:
            params["since_id"] = since_id
        url = f"{MASTODON_INSTANCE}/api/v1/timelines/tag/{urllib.parse.quote(tag)}?{urllib.parse.urlencode(params)}"
        data = _get_json(url)
        if data:
            # Results are newest-first; the first id is the new cursor.
            status.cursors[tag] = data[0]["id"]
        for item in data:
            lang = item.get("language")
            if lang and not lang.startswith("en"):
                continue
            text = clean_html(item.get("content") or "")
            if not text:
                continue
            posts.append(RawPost(
                external_id=f"mastodon:{item['id']}",
                platform="Mastodon",
                channel=f"#{tag}",
                text=text,
                author=(item.get("account") or {}).get("acct"),
                url=item.get("url"),
                posted_at=datetime.fromisoformat(item["created_at"].replace("Z", "+00:00")),
            ))
    return posts


def build_sources() -> list[tuple[SourceStatus, callable]]:
    return [
        (SourceStatus(name="Hacker News", channels=HN_QUERIES), fetch_hacker_news),
        (SourceStatus(name="Mastodon", channels=MASTODON_TAGS), fetch_mastodon),
    ]
