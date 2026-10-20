"""Head-to-Head Comparative Syntactic ABSA Engine for SyntaxSense.

Compares customer feedback across two products or services:
  * Aligns extracted aspects into canonical categories
  * Computes differential aspect sentiment scores (Δ = Score_A - Score_B)
  * Resolves category winners and overall product advantages
  * Preserves shortest dependency path evidence for full explainability
"""
from __future__ import annotations

from collections import defaultdict
from typing import Any, Callable, Literal
from pydantic import BaseModel, Field

# Standard taxonomy to map varied mentions to canonical dimensions
CANONICAL_TAXONOMY: dict[str, list[str]] = {
    "Display & Screen": ["display", "screen", "oled", "retina", "brightness", "panel", "resolution", "colors"],
    "Battery & Charging": ["battery", "battery life", "charging", "charger", "endurance", "power"],
    "Keyboard & Typing": ["keyboard", "keys", "typing", "switches", "tactile feedback", "keypad"],
    "Trackpad & Controls": ["trackpad", "touchpad", "mouse", "gestures", "buttons"],
    "Performance & Speed": ["performance", "speed", "processor", "m3", "cpu", "gpu", "ram", "multitasking", "boot up"],
    "Build Quality & Design": ["build", "build quality", "chassis", "design", "weight", "materials", "aluminum", "durability"],
    "Thermal & Fan Noise": ["fan", "cooling", "heat", "overheating", "thermal", "noise", "loud"],
    "Audio & Speakers": ["speaker", "speakers", "sound", "audio", "bass", "microphones"],
    "Camera System": ["camera", "lens", "photo", "photos", "zoom", "sensors", "video"],
    "Software & OS": ["software", "os", "macos", "windows", "ios", "android", "updates", "ui"],
    "Food Quality & Taste": ["food", "dish", "dishes", "pasta", "steak", "pizza", "dessert", "flavors", "ingredients"],
    "Service & Hospitality": ["service", "staff", "waiter", "waitress", "management", "hospitality", "attentive"],
    "Ambience & Decor": ["ambience", "atmosphere", "decor", "vibe", "lighting", "music", "seating"],
    "Price & Value": ["price", "value", "cost", "bill", "worth", "pricing", "expensive"]
}

def canonicalize_aspect(raw_term: str) -> str:
    raw_lower = raw_term.lower()
    for category, keywords in CANONICAL_TAXONOMY.items():
        if any(kw in raw_lower or raw_lower in kw for kw in keywords):
            return category
    return raw_term.title()

class AspectComparisonItem(BaseModel):
    category: str
    score_a: int               # 0-100 percentage positive
    score_b: int               # 0-100 percentage positive
    mentions_a: int
    mentions_b: int
    winner: Literal["a", "b", "tie"]
    delta: int                 # score_a - score_b
    sample_opinion_a: str | None = None
    sample_opinion_b: str | None = None
    sample_quote_a: str | None = None
    sample_quote_b: str | None = None
    dependency_path_a: str | None = None
    dependency_path_b: str | None = None

class CompareResponse(BaseModel):
    name_a: str
    name_b: str
    overall_score_a: int
    overall_score_b: int
    winner: Literal["a", "b", "tie"]
    lead_margin: int
    total_aspects_a: int
    total_aspects_b: int
    total_reviews_a: int
    total_reviews_b: int
    aspect_comparisons: list[AspectComparisonItem]
    strengths_a: list[str]
    strengths_b: list[str]
    radar_data: list[dict[str, Any]]

COMPARISON_PRESETS: dict[str, dict[str, Any]] = {
    "macbook_vs_xps": {
        "title": "MacBook Air M3 vs. Dell XPS 13",
        "domain": "Ultrabooks & Laptops",
        "name_a": "MacBook Air M3",
        "name_b": "Dell XPS 13",
        "texts_a": [
            "The battery life is exceptional, lasting over 16 hours with ease.",
            "The Liquid Retina display is vibrant, sharp, and super bright outdoors.",
            "Typing on the Magic Keyboard feels effortless and crisp.",
            "The fanless design remains completely silent under heavy multitasking.",
            "Build quality is solid and premium aluminum feels sturdy.",
            "Sound from the four-speaker sound system is rich and punchy.",
            "Port selection is slightly limited with only two Thunderbolt ports."
        ],
        "texts_b": [
            "The OLED display is gorgeous with pitch black levels and rich contrast.",
            "The capacitive touch function row is frustrating and unreliable.",
            "The cooling fan is noticeably loud whenever running demanding tasks.",
            "Battery life is mediocre, barely reaching 7 hours of standard usage.",
            "Build quality is sleek with lightweight carbon fiber palm rest.",
            "The haptic trackpad is seamless and responsive.",
            "Typing feedback from the zero-lattice keyboard feels cramped and stiff."
        ]
    },
    "iphone_vs_galaxy": {
        "title": "iPhone 16 Pro vs. Galaxy S24 Ultra",
        "domain": "Flagship Smartphones",
        "name_a": "iPhone 16 Pro",
        "name_b": "Galaxy S24 Ultra",
        "texts_a": [
            "The titanium chassis feels lightweight and comfortable to hold.",
            "Camera details are natural and color reproduction is brilliant.",
            "A18 Pro performance is lightning fast with zero UI lag.",
            "The dedicated Camera Control button is clunky and awkward to press.",
            "Battery endurance is reliable, lasting well through an intense day.",
            "The 120Hz ProMotion display is smooth and responsive.",
            "Charging speed remains slow compared to Android flagships."
        ],
        "texts_b": [
            "The anti-reflective Gorilla Armor screen is stunning in direct sunlight.",
            "5x optical zoom camera lens captures razor-sharp telephoto shots.",
            "Built-in S-Pen stylus is handy for precise note taking.",
            "The flat display corners are sharp and slightly uncomfortable in one-hand use.",
            "Battery life is phenomenal with 45W fast charging.",
            "One UI software has minor stutter during heavy background app switching.",
            "AI photo editing features are fun, but results can look artificial."
        ]
    },
    "dining_duel": {
        "title": "Gramercy Tavern vs. Le Bernardin",
        "domain": "Fine Dining & Hospitality",
        "name_a": "Gramercy Tavern",
        "name_b": "Le Bernardin",
        "texts_a": [
            "The roasted duck breast was tender, juicy, and freshly prepared.",
            "Warm rustic ambience creates an inviting and cozy atmosphere.",
            "The wait staff was polite, attentive, and knowledgeable about pairings.",
            "Cocktails were creative and flavorful with great seasonal craft.",
            "The chocolate blackout cake was rich and decadent.",
            "Table spacing in the front tavern room felt slightly cramped."
        ],
        "texts_b": [
            "The seafood tasting menu was flawless and artfully presented.",
            "Tuna tartare with white truffle oil is a culinary masterpiece.",
            "Formal dining room decor is elegant, pristine, and sophisticated.",
            "Sommelier service was impeccable and perfectly timed.",
            "The dessert course was surprisingly plain and forgettable.",
            "The final bill is extremely pricey even for Michelin standards."
        ]
    }
}

def run_head_to_head_comparison(
    name_a: str,
    texts_a: list[str],
    name_b: str,
    texts_b: list[str],
    parse_fn: Callable[[str], Any]
) -> CompareResponse:
    """Computes differential syntactic aspect metrics between two entities."""
    # Data structures per product: category -> list of aspect records
    cat_data_a: dict[str, list[dict[str, Any]]] = defaultdict(list)
    cat_data_b: dict[str, list[dict[str, Any]]] = defaultdict(list)

    score_val = {"positive": 1, "negative": 0, "neutral": 0.5}

    total_asp_a = 0
    for text in texts_a:
        res = parse_fn(text)
        for asp in res.aspects:
            total_asp_a += 1
            cat = canonicalize_aspect(asp.term)
            cat_data_a[cat].append({
                "term": asp.term,
                "opinion": asp.opinion,
                "sentiment": asp.sentiment,
                "confidence": asp.confidence,
                "dependency_path": asp.dependency_path,
                "quote": text,
            })

    total_asp_b = 0
    for text in texts_b:
        res = parse_fn(text)
        for asp in res.aspects:
            total_asp_b += 1
            cat = canonicalize_aspect(asp.term)
            cat_data_b[cat].append({
                "term": asp.term,
                "opinion": asp.opinion,
                "sentiment": asp.sentiment,
                "confidence": asp.confidence,
                "dependency_path": asp.dependency_path,
                "quote": text,
            })

    # Find all shared or prominent categories
    all_categories = sorted(
        set(cat_data_a.keys()) | set(cat_data_b.keys()),
        key=lambda c: len(cat_data_a.get(c, [])) + len(cat_data_b.get(c, [])),
        reverse=True
    )

    aspect_items: list[AspectComparisonItem] = []
    radar_data: list[dict[str, Any]] = []

    strengths_a: list[str] = []
    strengths_b: list[str] = []

    overall_pos_a = 0
    overall_tot_a = 0
    overall_pos_b = 0
    overall_tot_b = 0

    for cat in all_categories:
        list_a = cat_data_a.get(cat, [])
        list_b = cat_data_b.get(cat, [])

        mentions_a = len(list_a)
        mentions_b = len(list_b)

        if mentions_a > 0:
            score_a = round((sum(score_val[x["sentiment"]] for x in list_a) / mentions_a) * 100)
            overall_pos_a += sum(score_val[x["sentiment"]] for x in list_a)
            overall_tot_a += mentions_a
        else:
            score_a = 50

        if mentions_b > 0:
            score_b = round((sum(score_val[x["sentiment"]] for x in list_b) / mentions_b) * 100)
            overall_pos_b += sum(score_val[x["sentiment"]] for x in list_b)
            overall_tot_b += mentions_b
        else:
            score_b = 50

        delta = score_a - score_b
        if delta > 8:
            winner: Literal["a", "b", "tie"] = "a"
            strengths_a.append(f"{cat} (+{delta}%)")
        elif delta < -8:
            winner = "b"
            strengths_b.append(f"{cat} (+{abs(delta)}%)")
        else:
            winner = "tie"

        sample_a = list_a[0] if list_a else {}
        sample_b = list_b[0] if list_b else {}

        item = AspectComparisonItem(
            category=cat,
            score_a=score_a,
            score_b=score_b,
            mentions_a=mentions_a,
            mentions_b=mentions_b,
            winner=winner,
            delta=delta,
            sample_opinion_a=sample_a.get("opinion"),
            sample_opinion_b=sample_b.get("opinion"),
            sample_quote_a=sample_a.get("quote"),
            sample_quote_b=sample_b.get("quote"),
            dependency_path_a=sample_a.get("dependency_path"),
            dependency_path_b=sample_b.get("dependency_path"),
        )
        aspect_items.append(item)

        # Include top categories in radar chart (up to 8)
        if len(radar_data) < 8 and (mentions_a > 0 or mentions_b > 0):
            radar_data.append({
                "category": cat,
                name_a: score_a,
                name_b: score_b,
                "delta": delta
            })

    final_score_a = round((overall_pos_a / overall_tot_a * 100)) if overall_tot_a else 50
    final_score_b = round((overall_pos_b / overall_tot_b * 100)) if overall_tot_b else 50
    lead_margin = abs(final_score_a - final_score_b)

    if final_score_a > final_score_b:
        overall_winner: Literal["a", "b", "tie"] = "a"
    elif final_score_b > final_score_a:
        overall_winner = "b"
    else:
        overall_winner = "tie"

    return CompareResponse(
        name_a=name_a,
        name_b=name_b,
        overall_score_a=final_score_a,
        overall_score_b=final_score_b,
        winner=overall_winner,
        lead_margin=lead_margin,
        total_aspects_a=total_asp_a,
        total_aspects_b=total_asp_b,
        total_reviews_a=len(texts_a),
        total_reviews_b=len(texts_b),
        aspect_comparisons=aspect_items,
        strengths_a=strengths_a[:4],
        strengths_b=strengths_b[:4],
        radar_data=radar_data
    )
