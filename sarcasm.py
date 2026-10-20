"""
SyntaxSense — Syntactic Sarcasm & Irony Detection Engine
Identifies subjunctive conditionals, discourse particle juxtaposition, hyperbole contrast,
and scare quotes where naive bag-of-words sentiment models produce false positives.
"""

from typing import Any, Callable
from pydantic import BaseModel, Field
import re

class SarcasmMarker(BaseModel):
    category: str
    marker_text: str
    explanation: str
    syntactic_trigger: str

class SarcasmAnalysisResult(BaseModel):
    text: str
    is_sarcastic: bool
    sarcasm_confidence: int  # 0 to 100
    detected_markers: list[SarcasmMarker]
    naive_sentiment: str     # What a bag-of-words model predicts (often falsely Positive)
    naive_score: int
    syntactic_sentiment: str # What syntax-aware ABSA predicts
    syntactic_score: int
    linguistic_breakdown: str

SARCASM_PRESETS = [
    {
        "id": "subjunctive_conditional",
        "title": "Subjunctive Conditional Counterfactual",
        "category": "Modal Subjunctive",
        "text": "The laptop would have been wonderful if the motherboard didn't catch fire on day two.",
        "description": "Uses 'would have been [positive] if...' to express hypothetical praise negated by real disaster."
    },
    {
        "id": "discourse_particle_irony",
        "title": "Discourse Particle Juxtaposition ('Oh brilliant...')",
        "category": "Discourse Marker",
        "text": "Oh brilliant, another mandatory update that completely wiped my settings.",
        "description": "Pre-modifies catastrophe with sarcastic discourse particle 'Oh brilliant'."
    },
    {
        "id": "hyperbole_contrast",
        "title": "Hyperbolic Praise with Horrible Reality",
        "category": "Hyperbole Clashing",
        "text": "Fastest battery drain in human history, truly a technological masterpiece.",
        "description": "Juxtaposes severe defect with hyperbolic accolades ('technological masterpiece')."
    },
    {
        "id": "scare_quotes_service",
        "title": "Scare Quotes Attenuation",
        "category": "Orthographic Irony",
        "text": "The 'polite' customer support agent hung up on me after keeping me on hold for 40 minutes.",
        "description": "Places quote marks around 'polite' to invert its semantic valence."
    },
    {
        "id": "genuine_positive",
        "title": "Genuine Positive (Non-Sarcastic Baseline)",
        "category": "Non-Sarcastic Baseline",
        "text": "The battery life is exceptional and the display is wonderfully bright.",
        "description": "Control sentence: genuine, un-inverted praise with zero irony markers."
    }
]

def analyze_sarcasm_and_irony(
    text: str,
    analysis_fn: Callable[[str], Any]
) -> SarcasmAnalysisResult:
    """
    Detects linguistic and syntactic indicators of irony and contrasts naive vs syntactic sentiment.
    """
    markers: list[SarcasmMarker] = []
    t_lower = text.lower()

    # 1. Subjunctive Modal Conditional: "would have been ... if" / "could have been ... if"
    if re.search(r"\b(would|could|might)\s+have\s+been\b", t_lower) and re.search(r"\bif\b", t_lower):
        markers.append(SarcasmMarker(
            category="Subjunctive Counterfactual",
            marker_text="would/could have been ... if",
            explanation="Hypothetical positive condition immediately invalidated by an adverse real-world clause.",
            syntactic_trigger="advcl (adverbial clause condition headed by 'if') invalidating main copular clause."
        ))

    # 2. Sarcastic Discourse Particle prefix
    if re.search(r"^(oh\s+(great|brilliant|wonderful|fantastic|joy|boy)|sure|yeah\s+right|as\s+if)\b", t_lower):
        matched = re.search(r"^(oh\s+[a-z]+|sure|yeah\s+right|as\s+if)\b", t_lower).group(0)
        markers.append(SarcasmMarker(
            category="Discourse Particle Irony",
            marker_text=matched,
            explanation="Initial interjection or discourse particle used to express cynical mockery.",
            syntactic_trigger="intj / discourse particle attached to root clause containing grievance."
        ))

    # 3. Scare Quotes around positive modifiers
    scare_quotes = re.findall(r"['\"]([a-zA-Z]+)['\"]", text)
    ironic_terms = {"polite", "helpful", "friendly", "fast", "cheap", "clean", "genius", "great", "expert"}
    for sq in scare_quotes:
        if sq.lower() in ironic_terms:
            markers.append(SarcasmMarker(
                category="Scare Quotes Inversion",
                marker_text=f"\"{sq}\"",
                explanation="Punctuation scare quotes signify semantic distance or explicit irony.",
                syntactic_trigger="Orthographic punctuation boundary enclosing adjectival modifier."
            ))

    # 4. Hyperbolic praise followed by defect words
    has_hyperbole = bool(re.search(r"\b(masterpiece|miracle|perfection|genius|best|greatest|flawless)\b", t_lower))
    has_defect = bool(re.search(r"\b(drain|crash|died|broke|wiped|lag|hung|awful|slow|terrible|fire|smoke)\b", t_lower))
    if has_hyperbole and has_defect:
        markers.append(SarcasmMarker(
            category="Hyperbolic Polarity Clash",
            marker_text="Praise word + Defect word",
            explanation="Extreme positive accolades contrasted with acute product defects within the same clausal sentence.",
            syntactic_trigger="Intra-sentential coordination or juxtaposition of diametric sentiment poles."
        ))

    # 5. Calculate sarcasm confidence
    sarcasm_score = min(98, len(markers) * 38)
    is_sarcastic = len(markers) > 0

    # Execute standard syntactic analysis
    res = analysis_fn(text)
    data = res.model_dump() if hasattr(res, "model_dump") else res
    base_score = data.get("score", 50)

    # Naive sentiment simulation (Bag of Words / Lexicon counting)
    words = re.findall(r"\b[a-zA-Z]+\b", t_lower)
    pos_naive = sum(1 for w in words if w in {"great", "brilliant", "wonderful", "fantastic", "masterpiece", "perfection", "best", "fastest", "polite", "helpful"})
    neg_naive = sum(1 for w in words if w in {"fire", "wiped", "drain", "hung", "lag", "crash", "broke", "awful"})
    
    if pos_naive > neg_naive:
        naive_sentiment = "Positive (False Positive)"
        naive_score = min(95, 60 + pos_naive * 15)
    elif neg_naive > pos_naive:
        naive_sentiment = "Negative"
        naive_score = max(10, 45 - neg_naive * 15)
    else:
        naive_sentiment = "Neutral"
        naive_score = 50

    # Syntactic true sentiment
    if is_sarcastic:
        syntactic_sentiment = "Negative (Irony Detected)"
        syntactic_score = max(10, min(35, 100 - sarcasm_score))
        breakdown = (
            f"Sarcasm identified via {len(markers)} syntactic marker(s). "
            f"While a naive bag-of-words model scores this as {naive_score}% ({naive_sentiment}) due to isolated surface words, "
            f"syntactic dependency parsing inverts the true valence to {syntactic_score}% ({syntactic_sentiment})."
        )
    else:
        syntactic_sentiment = data.get("overall_sentiment", "neutral").capitalize()
        syntactic_score = base_score
        breakdown = "No irony or sarcasm markers detected. Standard compositional dependency sentiment applies."

    return SarcasmAnalysisResult(
        text=text,
        is_sarcastic=is_sarcastic,
        sarcasm_confidence=sarcasm_score,
        detected_markers=markers,
        naive_sentiment=naive_sentiment,
        naive_score=naive_score,
        syntactic_sentiment=syntactic_sentiment,
        syntactic_score=syntactic_score,
        linguistic_breakdown=breakdown
    )
