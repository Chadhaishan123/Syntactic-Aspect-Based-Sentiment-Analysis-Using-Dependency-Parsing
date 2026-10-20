"""SyntaxSense — Real-Time Syntactic Aspect-Based Sentiment Analysis Engine using Universal Dependency Parsing."""
from __future__ import annotations

import asyncio
import re
import time
from collections import Counter
from datetime import datetime, timezone
from os import getenv
from typing import Any, Literal
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import Body, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

import live_sources

try:
    import spacy
    nlp = spacy.load("en_core_web_sm")
except Exception as e:
    print(f"spaCy loading warning: {e}")
    nlp = None

load_dotenv()

app = FastAPI(
    title="SyntaxSense API",
    description="Real-Time Syntactic Aspect-Based Sentiment Analysis using Universal Dependency Trees",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------
# Lexicons and Grammatical Valence Shifters
# ---------------------------------------------------------
POSITIVE_WORDS = {
    "amazing", "beautiful", "better", "best", "brilliant", "clean", "clear", "crisp",
    "delightful", "durable", "easy", "effortless", "elegant", "ergonomic", "excellent",
    "exceptional", "fast", "flawless", "friendly", "good", "gorgeous", "great", "helpful",
    "impressive", "intuitive", "light", "love", "loved", "lovely", "outstanding", "perfect",
    "premium", "prompt", "quick", "reliable", "responsive", "rich", "sharp", "shine", "shines",
    "sleek", "smooth", "solid", "speedy", "stable", "stunning", "superb", "terrific",
    "thoughtful", "vibrant", "wonderful", "worthy", "worth", "recommend", "recommended",
    "tasty", "delicious", "fresh", "flavorful", "quiet", "snappy", "handy", "bright",
    "spacious", "portable", "cozy", "charm", "charming", "attentive", "polite", "courteous",
    "enjoy", "enjoyed", "top-notch", "stellar", "pleased", "fantastic", "decent", "fine",
    "satisfying", "satisfied", "gem", "spectacular", "super", "fabulous", "neat", "liked"
}

NEGATIVE_WORDS = {
    "annoying", "awful", "bad", "barely", "broken", "buggy", "cheap", "clunky",
    "complicated", "confusing", "costly", "cramped", "defective", "difficult", "dim",
    "disappointing", "disaster", "drains", "draining", "drab", "fragile", "frustrating",
    "glitchy", "hard", "heavy", "horrible", "inconsistent", "inferior", "issue", "issues",
    "laggy", "lags", "limited", "loud", "mediocre", "noisy", "overheating", "overpriced",
    "painful", "poor", "problem", "problems", "rough", "slow", "sluggish", "stiff",
    "terrible", "ugly", "uncomfortable", "unresponsive", "unreliable", "useless", "vague",
    "weak", "worse", "worst", "rude", "sub-par", "frustrated", "pricey", "pricy",
    "flimsy", "tight", "disappointed", "hate", "hated", "overrated", "bland", "cold",
    "dirty", "horrid", "sucks", "sucked", "fail", "failed", "unfriendly", "slowly"
}

NEGATIONS = {
    "not", "never", "no", "hardly", "scarcely", "barely", "isn't", "wasn't", "aren't",
    "weren't", "don't", "doesn't", "didn't", "cannot", "can't", "couldn't", "won't",
    "wouldn't", "without"
}

STOP_WORDS = {
    "a", "an", "the", "and", "but", "or", "so", "yet", "is", "are", "was", "were",
    "be", "been", "being", "to", "of", "for", "in", "on", "at", "with", "from", "by",
    "as", "i", "it", "this", "that", "they", "we", "you", "my", "your", "its", "their",
    "day", "thing", "time", "very", "really", "absolutely", "quite", "rather", "extremely",
    "although", "however", "though"
}

# ---------------------------------------------------------
# Pydantic Schemas
# ---------------------------------------------------------
class TokenNode(BaseModel):
    id: int
    text: str
    lemma: str
    pos: str
    tag: str
    dep: str
    head_id: int
    is_aspect: bool = False
    is_opinion: bool = False
    is_negation: bool = False
    aspect_id: str | None = None

class DependencyArc(BaseModel):
    id: str
    start: int
    end: int
    label: str
    dir: Literal["left", "right"]
    is_aspect_path: bool = False

class Aspect(BaseModel):
    id: str
    term: str
    opinion: str
    sentiment: Literal["positive", "negative", "neutral"]
    confidence: int
    dependency_path: str
    shortest_path_nodes: list[int] = Field(default_factory=list)
    aspect_token_ids: list[int] = Field(default_factory=list)
    opinion_token_ids: list[int] = Field(default_factory=list)

class Analysis(BaseModel):
    id: str
    source: str
    text: str
    aspects: list[Aspect]
    sentiment_score: int
    created_at: datetime
    tokens: list[TokenNode] = Field(default_factory=list)
    arcs: list[DependencyArc] = Field(default_factory=list)
    latency_ms: float = 0.0
    # Provenance: where this text came from.
    origin: Literal["live", "manual", "batch"] = "manual"
    channel: str | None = None          # e.g. HN query or Mastodon hashtag
    author: str | None = None
    url: str | None = None              # link to the original public post
    external_id: str | None = None      # dedup key for live posts
    posted_at: datetime | None = None   # when the original post was written

class AnalyzeRequest(BaseModel):
    text: str = Field(min_length=2, max_length=5000)
    source: str = Field(default="Manual Studio", max_length=100)

class BatchAnalyzeRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=100)
    source: str = Field(default="Batch Inspector", max_length=100)

class StreamInjectRequest(BaseModel):
    text: str = Field(min_length=2, max_length=1000)
    source: str = Field(default="Real-Time Feed", max_length=100)

# ---------------------------------------------------------
# In-Memory & MongoDB Persistence Layer
# ---------------------------------------------------------
history: list[Analysis] = []
collection = None
mongo_url = getenv("MONGODB_URL")
if mongo_url:
    try:
        from pymongo import MongoClient
        mongo_client = MongoClient(mongo_url, serverSelectionTimeoutMS=3000)
        mongo_client.admin.command("ping")
        collection = mongo_client[getenv("MONGODB_DATABASE", "syntaxsense")]["analyses"]
        print("Connected to MongoDB successfully.")
    except Exception as err:
        print(f"MongoDB not connected; using in-memory store: {err}")

def saved_analyses(limit: int = 150) -> list[Analysis]:
    if collection is not None:
        try:
            return [Analysis.model_validate(item) for item in collection.find({}, {"_id": 0}).sort("created_at", -1).limit(limit)]
        except Exception:
            pass
    return history[:limit]

def save_analysis(item: Analysis) -> None:
    if collection is not None:
        try:
            collection.insert_one(item.model_dump())
            return
        except Exception:
            pass
    history.insert(0, item)
    if len(history) > 500:
        history.pop()

# ---------------------------------------------------------
# WebSocket Real-Time Connection Manager
# ---------------------------------------------------------
class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict[str, Any]):
        dead = []
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception:
                dead.append(connection)
        for dead_conn in dead:
            self.disconnect(dead_conn)

ws_manager = ConnectionManager()

# ---------------------------------------------------------
# Core Syntactic Dependency Parsing Algorithm
# ---------------------------------------------------------
def get_word_sentiment(word: str) -> int:
    w = word.lower()
    if w in POSITIVE_WORDS:
        return 1
    if w in NEGATIVE_WORDS:
        return -1
    return 0

def classify_sentiment(score: int) -> tuple[Literal["positive", "negative", "neutral"], int]:
    if score > 0:
        return "positive", min(98, 70 + score * 14)
    if score < 0:
        return "negative", min(95, 66 + abs(score) * 14)
    return "neutral", 55

def parse_with_spacy(text: str) -> tuple[list[Aspect], list[TokenNode], list[DependencyArc]]:
    doc = nlp(text)
    token_nodes: list[TokenNode] = []
    arcs: list[DependencyArc] = []

    # Map tokens
    for token in doc:
        token_nodes.append(TokenNode(
            id=token.i,
            text=token.text,
            lemma=token.lemma_,
            pos=token.pos_,
            tag=token.tag_,
            dep=token.dep_,
            head_id=token.head.i,
            is_negation=(token.dep_ == "neg" or token.lower_ in NEGATIONS)
        ))

        # Arc from head to child (dependency direction)
        if token.head.i != token.i:
            arcs.append(DependencyArc(
                id=f"arc-{token.head.i}-{token.i}",
                start=token.head.i,
                end=token.i,
                label=token.dep_,
                dir="right" if token.i > token.head.i else "left"
            ))

    # Graph adjacency for shortest path
    adj: dict[int, list[tuple[int, str]]] = {t.i: [] for t in doc}
    for token in doc:
        if token.head.i != token.i:
            adj[token.head.i].append((token.i, token.dep_))
            adj[token.i].append((token.head.i, f"inv_{token.dep_}"))

    def shortest_path(src: int, dst: int) -> list[int]:
        if src == dst:
            return [src]
        queue = [[src]]
        visited = {src}
        while queue:
            path = queue.pop(0)
            node = path[-1]
            for neighbor, _ in adj.get(node, []):
                if neighbor == dst:
                    return path + [neighbor]
                if neighbor not in visited:
                    visited.add(neighbor)
                    queue.append(path + [neighbor])
        return []

    # Aggregate candidate aspects by normalized term to support multi-opinion links
    aspect_map: dict[str, dict[str, Any]] = {}

    for token in doc:
        score = get_word_sentiment(token.lemma_) or get_word_sentiment(token.text)
        if not score:
            continue

        # Check negation in children or head
        has_negation = any(child.dep_ == "neg" or child.lower_ in NEGATIONS for child in token.children)
        if not has_negation and token.head and token.head != token:
            has_negation = any(child.dep_ == "neg" or child.lower_ in NEGATIONS for child in token.head.children)
        if not has_negation and token.i > 0 and doc[token.i - 1].lower_ in NEGATIONS:
            has_negation = True

        effective_score = -score if has_negation else score

        candidates: list[spacy.tokens.Token] = []

        # 1. Direct children that are nouns
        candidates.extend([c for c in token.children if c.pos_ in {"NOUN", "PROPN"} and c.dep_ not in {"poss"}])

        # 2. Verbal / adjectival predicates with direct objects or prepositional phrases
        # e.g., "loved the screen", "enjoyed the food", "pleased with customer support"
        if token.pos_ in {"VERB", "ADJ"}:
            candidates.extend([c for c in token.children if c.dep_ in {"dobj", "pobj"} and c.pos_ in {"NOUN", "PROPN"}])
            for c in token.children:
                if c.dep_ == "prep":
                    for prep_child in c.children:
                        if prep_child.dep_ in {"pobj"} and prep_child.pos_ in {"NOUN", "PROPN"}:
                            candidates.append(prep_child)

        # 3. Predicate adjective / copula (e.g. "display is vibrant and stunning")
        curr_gov = token
        # Follow coordination chain if conj (e.g. "stunning" conj to "vibrant")
        while curr_gov.dep_ == "conj" and curr_gov.head and curr_gov.head != curr_gov:
            curr_gov = curr_gov.head

        if curr_gov.head:
            head = curr_gov.head
            # Subject of copula
            for sib in head.children:
                if sib.dep_ in {"nsubj", "nsubjpass"} and sib.pos_ in {"NOUN", "PROPN"}:
                    candidates.append(sib)
            # Relative clause: e.g. "screen which was clear"
            if head.dep_ in {"relcl", "acl"} and head.head.pos_ in {"NOUN", "PROPN"}:
                candidates.append(head.head)

        # 4. Adjectival modifier ('amod'): head is the noun (e.g. "vibrant display")
        if token.dep_ == "amod" and token.head.pos_ in {"NOUN", "PROPN"}:
            candidates.append(token.head)

        # 5. Fallback: closest noun within 4 tokens
        if not candidates:
            surrounding = [
                t for t in doc[max(0, token.i - 4): min(len(doc), token.i + 5)]
                if t.pos_ in {"NOUN", "PROPN"} and t.lower_ not in STOP_WORDS
            ]
            if surrounding:
                candidates.append(min(surrounding, key=lambda c: abs(c.i - token.i)))

        candidates = [c for c in candidates if c.i != token.i]
        if not candidates:
            continue

        # Primary target candidate plus any coordinated nouns (e.g. "the keyboard and mouse are responsive")
        targets = [candidates[0]]
        for c in candidates[0].children:
            if c.dep_ == "conj" and c.pos_ in {"NOUN", "PROPN"}:
                targets.append(c)

        for target in targets:
            # Extract compound noun components (e.g. "battery life", "customer support service", "Windows 8")
            left_mods = [
                c for c in target.lefts
                if c.dep_ in {"compound", "nmod", "nummod"} or (c.dep_ == "amod" and not get_word_sentiment(c.lemma_))
            ]
            right_mods = [
                c for c in target.rights
                if c.dep_ in {"compound", "nmod", "nummod"}
            ]
            all_aspect_tokens = sorted(left_mods + [target] + right_mods, key=lambda x: x.i)
            aspect_term = " ".join([t.text for t in all_aspect_tokens])
            t_key = aspect_term.lower()

            op_text = f"not {token.text}" if has_negation else token.text
            path_nodes = shortest_path(target.i, token.i)

            if t_key in aspect_map:
                entry = aspect_map[t_key]
                if op_text not in entry["opinions"]:
                    entry["opinions"].append(op_text)
                    entry["scores"].append(effective_score)
                    entry["opinion_token_ids"].append(token.i)
                    for n in path_nodes:
                        if n not in entry["shortest_path_nodes"]:
                            entry["shortest_path_nodes"].append(n)
            else:
                aspect_map[t_key] = {
                    "term": aspect_term.title(),
                    "opinions": [op_text],
                    "scores": [effective_score],
                    "target_head_id": target.i,
                    "aspect_token_ids": [t.i for t in all_aspect_tokens],
                    "opinion_token_ids": [token.i],
                    "shortest_path_nodes": path_nodes,
                    "dep": token.dep_ or "dep",
                    "has_negation": has_negation
                }

    aspects: list[Aspect] = []
    for t_key, data in aspect_map.items():
        total_score = sum(data["scores"])
        sentiment_label, confidence = classify_sentiment(total_score)
        aspect_id = f"asp-{uuid4().hex[:6]}"

        opinions_str = ", ".join(data["opinions"])
        dep_route = f"{data['term']} ←[{data['dep']}] {opinions_str}"
        if data["has_negation"]:
            dep_route += " (negated)"

        aspect_obj = Aspect(
            id=aspect_id,
            term=data["term"],
            opinion=opinions_str,
            sentiment=sentiment_label,
            confidence=confidence,
            dependency_path=dep_route,
            shortest_path_nodes=data["shortest_path_nodes"],
            aspect_token_ids=data["aspect_token_ids"],
            opinion_token_ids=data["opinion_token_ids"]
        )
        aspects.append(aspect_obj)

        # Flag tokens and arcs for SVG visualizer
        for t_idx in aspect_obj.aspect_token_ids:
            if 0 <= t_idx < len(token_nodes):
                token_nodes[t_idx].is_aspect = True
                token_nodes[t_idx].aspect_id = aspect_id

        for op_idx in aspect_obj.opinion_token_ids:
            if 0 <= op_idx < len(token_nodes):
                token_nodes[op_idx].is_opinion = True

        path_nodes = aspect_obj.shortest_path_nodes
        for p_i in range(len(path_nodes) - 1):
            n1, n2 = path_nodes[p_i], path_nodes[p_i + 1]
            for arc in arcs:
                if (arc.start == n1 and arc.end == n2) or (arc.start == n2 and arc.end == n1):
                    arc.is_aspect_path = True

    return aspects, token_nodes, arcs

def fallback_parse(text: str) -> tuple[list[Aspect], list[TokenNode], list[DependencyArc]]:
    tokens = re.findall(r"[A-Za-z0-9][A-Za-z0-9'-]*", text)
    token_nodes = [
        TokenNode(
            id=i,
            text=t,
            lemma=t.lower(),
            pos="NOUN" if t.lower() not in (POSITIVE_WORDS | NEGATIVE_WORDS | STOP_WORDS) else "ADJ",
            tag="NN",
            dep="dep",
            head_id=max(0, i - 1),
            is_negation=(t.lower() in NEGATIONS)
        )
        for i, t in enumerate(tokens)
    ]
    arcs = [
        DependencyArc(id=f"arc-{i-1}-{i}", start=i-1, end=i, label="seq", dir="right")
        for i in range(1, len(tokens))
    ]
    aspects: list[Aspect] = []
    found_terms: set[str] = set()

    for i, word in enumerate(tokens):
        score = get_word_sentiment(word)
        if not score:
            continue
        prev = tokens[i - 1].lower() if i > 0 else ""
        has_neg = prev in NEGATIONS
        effective_score = -score if has_neg else score

        before = [tokens[j] for j in range(max(0, i - 3), i) if tokens[j].lower() not in (POSITIVE_WORDS | NEGATIVE_WORDS | NEGATIONS | STOP_WORDS)]
        after = [tokens[j] for j in range(i + 1, min(len(tokens), i + 4)) if tokens[j].lower() not in (POSITIVE_WORDS | NEGATIVE_WORDS | NEGATIONS | STOP_WORDS)]
        candidates = before or after
        term = candidates[-1] if before else (candidates[0] if after else "General Performance")

        if term.lower() in found_terms:
            continue
        found_terms.add(term.lower())

        label, conf = classify_sentiment(effective_score)
        aspects.append(Aspect(
            id=f"asp-{uuid4().hex[:6]}",
            term=term.title(),
            opinion=f"not {word}" if has_neg else word,
            sentiment=label,
            confidence=conf,
            dependency_path=f"{term} ← {word}",
            shortest_path_nodes=[max(0, i - 1), i],
            aspect_token_ids=[max(0, i - 1)],
            opinion_token_ids=[i]
        ))
    return aspects, token_nodes, arcs

def run_syntactic_analysis(text: str, source: str = "Manual Studio", **provenance: Any) -> Analysis:
    start_time = time.perf_counter()
    if nlp is not None:
        aspects, tokens, arcs = parse_with_spacy(text)
    else:
        aspects, tokens, arcs = fallback_parse(text)

    # Calculate overall sentiment score (0 - 100)
    score_map = {"positive": 1, "negative": -1, "neutral": 0}
    if aspects:
        total_val = sum(score_map[a.sentiment] for a in aspects)
        computed_score = max(5, min(95, 50 + int(total_val * (40 / max(1, len(aspects))))))
    else:
        computed_score = 50

    latency_ms = round((time.perf_counter() - start_time) * 1000, 2)

    return Analysis(
        id=str(uuid4()),
        source=source,
        text=text,
        aspects=aspects,
        sentiment_score=computed_score,
        created_at=datetime.now(timezone.utc),
        tokens=tokens,
        arcs=arcs,
        latency_ms=latency_ms,
        **provenance,
    )

# ---------------------------------------------------------
# Real-Time Ingestion of Live Public Posts (Hacker News + Mastodon)
# ---------------------------------------------------------
INGESTION_ACTIVE = getenv("LIVE_INGESTION", "on").lower() != "off"
POLL_INTERVAL_SECONDS = int(getenv("LIVE_POLL_SECONDS", "30"))
MAX_SENTENCES_PER_POLL = int(getenv("LIVE_MAX_PER_POLL", "12"))
SOURCES = live_sources.build_sources()
seen_external_ids: set[str] = set()
OPINION_LEXICON = POSITIVE_WORDS | NEGATIVE_WORDS

def sources_public() -> list[dict]:
    return [status.public() for status, _ in SOURCES]

async def poll_source(status: live_sources.SourceStatus, fetcher) -> int:
    """Fetch new posts from one source, parse opinion sentences, save + broadcast. Returns count ingested."""
    status.last_poll_at = datetime.now(timezone.utc)
    try:
        posts = await asyncio.to_thread(fetcher, status)
        status.last_error = None
        status.last_success_at = datetime.now(timezone.utc)
    except Exception as err:  # network errors, rate limits, schema changes
        status.last_error = f"{type(err).__name__}: {err}"[:200]
        return 0

    status.posts_fetched += len(posts)
    ingested = 0
    # Oldest first so the feed order matches real posting order.
    for post in sorted(posts, key=lambda p: p.posted_at):
        if post.external_id in seen_external_ids:
            continue
        seen_external_ids.add(post.external_id)
        for idx, sentence in enumerate(live_sources.extract_candidate_sentences(post.text, OPINION_LEXICON)):
            item = await asyncio.to_thread(
                run_syntactic_analysis, sentence, post.platform,
                origin="live", channel=post.channel, author=post.author, url=post.url,
                external_id=f"{post.external_id}#{idx}", posted_at=post.posted_at,
            )
            if not item.aspects:
                continue  # no aspect-opinion pair found; not useful for ABSA
            save_analysis(item)
            await ws_manager.broadcast({"type": "NEW_ANALYSIS", "data": item.model_dump(mode="json")})
            ingested += 1
            if ingested >= MAX_SENTENCES_PER_POLL:
                break
        if ingested >= MAX_SENTENCES_PER_POLL:
            break
    status.sentences_ingested += ingested
    return ingested

async def ingestion_loop():
    while True:
        if INGESTION_ACTIVE:
            for status, fetcher in SOURCES:
                if status.enabled:
                    await poll_source(status, fetcher)
            await ws_manager.broadcast({"type": "SOURCE_STATUS", "data": sources_public()})
        await asyncio.sleep(POLL_INTERVAL_SECONDS)

@app.on_event("startup")
async def startup_event():
    # Avoid re-ingesting posts already stored (relevant when MongoDB persists across restarts).
    for item in saved_analyses(150):
        if item.external_id:
            seen_external_ids.add(item.external_id.split("#")[0])
    asyncio.create_task(ingestion_loop())

# ---------------------------------------------------------
# REST Endpoints
# ---------------------------------------------------------
@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "parser": "Universal Dependencies (spaCy en_core_web_sm)" if nlp else "Syntactic Rule Fallback",
        "active_ws_clients": len(ws_manager.active_connections),
        "total_records": len(history),
        "realtime_streaming": INGESTION_ACTIVE,
        "poll_interval_seconds": POLL_INTERVAL_SECONDS,
        "sources": sources_public(),
        "spacy_loaded": nlp is not None
    }

@app.get("/api/sources")
def get_sources():
    return {"ingestion_active": INGESTION_ACTIVE, "poll_interval_seconds": POLL_INTERVAL_SECONDS, "sources": sources_public()}

@app.post("/api/parse", response_model=Analysis)
def parse_only(payload: AnalyzeRequest):
    """Parse without saving or broadcasting — used for live-typing previews."""
    return run_syntactic_analysis(payload.text.strip(), payload.source)

@app.post("/api/analyze", response_model=Analysis, status_code=201)
async def create_analysis(payload: AnalyzeRequest):
    item = run_syntactic_analysis(payload.text.strip(), payload.source)
    save_analysis(item)
    # Real-time WebSocket broadcast to all connected viewers
    await ws_manager.broadcast({
        "type": "NEW_ANALYSIS",
        "data": item.model_dump(mode="json")
    })
    return item

@app.post("/api/batch", status_code=200)
async def batch_analysis(payload: BatchAnalyzeRequest):
    results: list[Analysis] = []
    for txt in payload.texts:
        if txt.strip():
            item = run_syntactic_analysis(txt.strip(), payload.source, origin="batch")
            save_analysis(item)
            results.append(item)
            # Live broadcast
            await ws_manager.broadcast({
                "type": "NEW_ANALYSIS",
                "data": item.model_dump(mode="json")
            })
    return {"processed": len(results), "items": results}

@app.get("/api/analyses", response_model=list[Analysis])
def list_analyses(limit: int = 50):
    return saved_analyses(max(1, min(limit, 150)))

@app.get("/api/analyses/{analysis_id}", response_model=Analysis)
def get_analysis(analysis_id: str):
    records = saved_analyses()
    match = next((x for x in records if x.id == analysis_id), None)
    if not match:
        raise HTTPException(status_code=404, detail="Analysis record not found")
    return match

@app.delete("/api/analyses/{analysis_id}")
async def delete_analysis(analysis_id: str):
    global history
    history = [x for x in history if x.id != analysis_id]
    if collection is not None:
        try:
            collection.delete_one({"id": analysis_id})
        except Exception:
            pass
    await ws_manager.broadcast({"type": "RECORD_DELETED", "id": analysis_id})
    return {"status": "deleted", "id": analysis_id}

@app.delete("/api/analyses")
async def clear_all_analyses():
    global history
    history = []
    if collection is not None:
        try:
            collection.delete_many({})
        except Exception:
            pass
    await ws_manager.broadcast({"type": "HISTORY_CLEARED"})
    return {"status": "cleared"}

@app.get("/api/insights")
def get_insights():
    records = saved_analyses(150)
    aspects = [a for item in records for a in item.aspects]
    counts = Counter(a.term for a in aspects).most_common(12)

    pos_count = sum(1 for a in aspects if a.sentiment == "positive")
    neg_count = sum(1 for a in aspects if a.sentiment == "negative")
    neu_count = sum(1 for a in aspects if a.sentiment == "neutral")
    total_aspects = len(aspects)

    avg_score = round(sum(x.sentiment_score for x in records) / len(records), 1) if records else None
    avg_latency = round(sum(x.latency_ms for x in records) / len(records), 2) if records else None

    # Radar over the most-mentioned aspects actually observed (no placeholder values).
    radar_data = []
    for term, mentions in counts[:8]:
        matches = [a for a in aspects if a.term == term]
        pos = sum(1 for m in matches if m.sentiment == "positive")
        radar_data.append({"category": term, "score": round(pos / len(matches) * 100), "mentions": mentions})

    return {
        "texts_analyzed": len(records),
        "average_sentiment": avg_score,
        "average_latency_ms": avg_latency,
        "aspects_identified": total_aspects,
        "polarity_breakdown": {
            "positive": pos_count,
            "negative": neg_count,
            "neutral": neu_count,
            "positive_pct": round(pos_count / total_aspects * 100) if total_aspects else 0,
            "negative_pct": round(neg_count / total_aspects * 100) if total_aspects else 0,
            "neutral_pct": round(neu_count / total_aspects * 100) if total_aspects else 0
        },
        "top_aspects": [{"name": n, "mentions": c} for n, c in counts],
        "radar_data": radar_data
    }

@app.get("/api/live", response_model=list[Analysis])
def get_live_feed(limit: int = 15):
    return saved_analyses(limit)

@app.post("/api/stream/inject")
async def inject_stream_review(payload: StreamInjectRequest):
    item = run_syntactic_analysis(payload.text.strip(), source=payload.source, origin="manual")
    save_analysis(item)
    await ws_manager.broadcast({
        "type": "NEW_ANALYSIS",
        "data": item.model_dump(mode="json")
    })
    return item

@app.post("/api/stream/toggle")
async def toggle_stream(active: bool | None = Body(default=None, embed=True)):
    """Turn live ingestion on/off. Accepts JSON body {"active": bool}; omit to toggle."""
    global INGESTION_ACTIVE
    INGESTION_ACTIVE = (not INGESTION_ACTIVE) if active is None else active
    await ws_manager.broadcast({"type": "INGESTION_STATE", "active": INGESTION_ACTIVE})
    return {"streaming": INGESTION_ACTIVE}

import evaluation

class EvaluationRunRequest(BaseModel):
    dataset_key: Literal["semeval14_laptops", "semeval14_restaurants"] = "semeval14_laptops"
    limit: int = Field(default=50, ge=10, le=800)

@app.get("/api/evaluation/datasets")
def get_evaluation_datasets():
    return {
        "datasets": [
            {
                "key": key,
                "name": cfg["name"],
                "domain": cfg["domain"],
                "total_sentences": cfg["total_gold_sentences"],
                "total_aspects": cfg["total_gold_aspects"],
            }
            for key, cfg in evaluation.DATASET_CONFIGS.items()
        ]
    }

@app.post("/api/evaluation/run")
async def run_evaluation(payload: EvaluationRunRequest):
    """Executes gold-standard SemEval-2014 evaluation and computes Precision, Recall, F1, and Accuracy."""
    report = await asyncio.to_thread(
        evaluation.evaluate_dataset,
        payload.dataset_key,
        run_syntactic_analysis,
        payload.limit,
    )
    return report

import comparison

class CompareRequest(BaseModel):
    name_a: str = Field(default="Product A", max_length=100)
    texts_a: list[str] = Field(..., min_length=1, max_length=100)
    name_b: str = Field(default="Product B", max_length=100)
    texts_b: list[str] = Field(..., min_length=1, max_length=100)

@app.get("/api/compare/presets")
def get_comparison_presets():
    return {
        "presets": [
            {
                "key": key,
                "title": p["title"],
                "domain": p["domain"],
                "name_a": p["name_a"],
                "name_b": p["name_b"],
                "sample_count_a": len(p["texts_a"]),
                "sample_count_b": len(p["texts_b"]),
                "preset_data": p
            }
            for key, p in comparison.COMPARISON_PRESETS.items()
        ]
    }

@app.post("/api/compare", response_model=comparison.CompareResponse)
async def run_product_comparison(payload: CompareRequest):
    """Executes head-to-head syntactic aspect sentiment comparison between two entities."""
    result = await asyncio.to_thread(
        comparison.run_head_to_head_comparison,
        payload.name_a,
        payload.texts_a,
        payload.name_b,
        payload.texts_b,
        run_syntactic_analysis,
    )
    return result

@app.get("/api/benchmarks")
def get_benchmarks():
    return {
        "semeval_laptops": [
            "The battery life is really awful, but the vibrant display is stunning.",
            "The keyboard tactile feedback is unmatched, although the touchpad could be smoother.",
            "Boot up time is super fast, yet the cooling fan is noticeably loud.",
            "Build quality is solid and premium, but the weight is slightly heavy for travel.",
            "The trackpad is unresponsive, while the bright screen colors look incredible."
        ],
        "semeval_restaurants": [
            "The food was delicious and freshly prepared, but the wait staff was rude and inattentive.",
            "Ambience is cozy and charming, though the pasta portion size was disappointing.",
            "The garlic bread was crisp and flavorful, but the delivery took forever.",
            "Cocktails were creative and tasty, but the background music was unbearably loud.",
            "Service from the polite staff was truly commendable despite long lines outside."
        ],
        "smartphones_2026": [
            "Camera details shine in daylight; low-light results are inconsistent.",
            "The charging speed is lightning fast, but battery drains quickly with 5G enabled.",
            "Haptic motor feels crisp, yet the software update introduced laggy animations.",
            "OLED display brightness is gorgeous outdoors, though the curved edges register accidental touches.",
            "Face unlock is instantaneous and reliable, but fingerprint sensor feels sluggish."
        ]
    }

# ---------------------------------------------------------
# WebSocket Live Endpoint
# ---------------------------------------------------------
@app.websocket("/ws/live")
async def websocket_endpoint(websocket: WebSocket):
    await ws_manager.connect(websocket)
    try:
        # Send initial handshake with recent analyses
        recent = saved_analyses(10)
        await websocket.send_json({
            "type": "INIT_STATE",
            "data": [r.model_dump(mode="json") for r in recent],
            "client_count": len(ws_manager.active_connections),
            "ingestion_active": INGESTION_ACTIVE,
            "sources": sources_public(),
        })
        await ws_manager.broadcast({"type": "CLIENT_COUNT", "count": len(ws_manager.active_connections)})
        while True:
            # Keep connection alive & handle incoming live client actions
            msg = await websocket.receive_json()
            msg_type = msg.get("type")
            if msg_type == "PING":
                await websocket.send_json({"type": "PONG", "timestamp": time.time()})
            elif msg_type == "ANALYZE_LIVE":
                text = msg.get("text", "")
                src = msg.get("source", "Realtime WebSocket Client")
                if text:
                    item = run_syntactic_analysis(text, source=src)
                    save_analysis(item)
                    await ws_manager.broadcast({
                        "type": "NEW_ANALYSIS",
                        "data": item.model_dump(mode="json")
                    })
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket)
    except Exception:
        ws_manager.disconnect(websocket)
