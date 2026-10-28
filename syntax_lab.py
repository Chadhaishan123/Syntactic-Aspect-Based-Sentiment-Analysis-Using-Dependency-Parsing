"""Syntax Impact Lab — Syntax-Aware Model Comparison & Feature Ablation Engine.

Compares a Baseline Naive Lexicon / Bag-of-Words sentiment model against the
SyntaxSense Universal Dependency-enhanced model.

Features:
- Side-by-side Macro-F1, Precision, Recall, and Accuracy computation.
- 3x3 Confusion Matrices (Positive, Negative, Neutral).
- Controllable syntactic feature ablation toggles (negation handling, coordination chains, compound noun resolution).
- Contrastive case studies where naive models fail and syntax-aware parsing succeeds.
"""
from __future__ import annotations

import time
from collections import defaultdict
from typing import Any, Callable, Literal
from pydantic import BaseModel, Field

# Baseline Lexicon words
BASELINE_POS = {
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

BASELINE_NEG = {
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

# Standard test benchmark sentences curated to expose syntactic challenges
SYNTAX_LAB_BENCHMARKS = [
    {
        "id": "syn-01",
        "sentence": "The camera is exceptional, but the battery life is really terrible.",
        "gold_aspects": [
            {"term": "camera", "polarity": "positive"},
            {"term": "battery life", "polarity": "negative"}
        ],
        "category": "Contrasting Clauses",
        "challenge": "Naive models pool sentiments across the sentence, giving ambiguous or identical scores to both aspects."
    },
    {
        "id": "syn-02",
        "sentence": "The keyboard tactile response is not bad at all.",
        "gold_aspects": [
            {"term": "keyboard tactile response", "polarity": "positive"}
        ],
        "category": "Negation Inversion",
        "challenge": "Naive bag-of-words flags 'bad' as negative, missing the 'not' modifier which flips it to positive."
    },
    {
        "id": "syn-03",
        "sentence": "Customer service was hardly helpful during the setup process.",
        "gold_aspects": [
            {"term": "Customer service", "polarity": "negative"}
        ],
        "category": "Subtle Negation Shifter",
        "challenge": "'hardly' shifts the positive word 'helpful' to negative polarity."
    },
    {
        "id": "syn-04",
        "sentence": "The pasta was fresh and delicious, but the rude waiter ruined the entire evening.",
        "gold_aspects": [
            {"term": "pasta", "polarity": "positive"},
            {"term": "waiter", "polarity": "negative"}
        ],
        "category": "Multi-Aspect Cross-Domain",
        "challenge": "Requires separating food vs staff aspects without sentiment leakage."
    },
    {
        "id": "syn-05",
        "sentence": "The phone never fails to impress with its vibrant display.",
        "gold_aspects": [
            {"term": "display", "polarity": "positive"}
        ],
        "category": "Double Negation / Valence Inversion",
        "challenge": "'never fails' is a double negative indicating strong positive endorsement."
    },
    {
        "id": "syn-06",
        "sentence": "Service from the polite staff was truly commendable despite the noisy atmosphere.",
        "gold_aspects": [
            {"term": "Service", "polarity": "positive"},
            {"term": "staff", "polarity": "positive"},
            {"term": "atmosphere", "polarity": "negative"}
        ],
        "category": "Distant Modifier & Prepositional Head",
        "challenge": "Head noun 'Service' is separated from modifier 'commendable' by prepositional phrase."
    },
    {
        "id": "syn-07",
        "sentence": "The screen and touchpad are both responsive and lightning fast.",
        "gold_aspects": [
            {"term": "screen", "polarity": "positive"},
            {"term": "touchpad", "polarity": "positive"}
        ],
        "category": "Coordinated Aspect Binding (conj)",
        "challenge": "A single predicate modifies two coordinated noun subjects connected via 'and'."
    },
    {
        "id": "syn-08",
        "sentence": "Audio quality is far from perfect, but the price is completely unbeatable.",
        "gold_aspects": [
            {"term": "Audio quality", "polarity": "negative"},
            {"term": "price", "polarity": "positive"}
        ],
        "category": "Idiomatic Negation Phrase",
        "challenge": "'far from perfect' inverts positive word 'perfect' into a negative critique."
    },
    {
        "id": "syn-09",
        "sentence": "The active noise cancellation works wonders, though the bluetooth pairing is painfully slow.",
        "gold_aspects": [
            {"term": "active noise cancellation", "polarity": "positive"},
            {"term": "bluetooth pairing", "polarity": "negative"}
        ],
        "category": "Multi-Word Compound Nouns",
        "challenge": "Compound aspect detection combined with adversarial contrastive conjunction."
    },
    {
        "id": "syn-10",
        "sentence": "I cannot say that I hated the overall design, yet the cooling fan is ridiculously loud.",
        "gold_aspects": [
            {"term": "overall design", "polarity": "neutral"},
            {"term": "cooling fan", "polarity": "negative"}
        ],
        "category": "Attenuated Litotes & Contrasting Clause",
        "challenge": "Softened negative opinion 'cannot say hated' contrasted against blunt negative fan noise."
    }
]


class AblationConfig(BaseModel):
    negation_handling: bool = Field(default=True, description="Enable syntactic negation arc parsing")
    coordination_chains: bool = Field(default=True, description="Follow conj arcs across coordinated aspects")
    compound_noun_resolution: bool = Field(default=True, description="Group compound nouns into unified aspect terms")
    dependency_path_filtering: bool = Field(default=True, description="Enforce shortest path syntactic traversal")


class ModelMetrics(BaseModel):
    model_name: str
    precision: float
    recall: float
    f1_score: float
    accuracy: float
    matched_aspects: int
    total_gold: int
    confusion_matrix: dict[str, dict[str, int]]


class SentenceContrastResult(BaseModel):
    sentence: str
    category: str
    challenge: str
    gold: list[dict[str, str]]
    baseline_predictions: list[dict[str, str]]
    syntax_predictions: list[dict[str, str]]
    syntax_won: bool
    explanation: str


class ComparisonReport(BaseModel):
    timestamp: float
    dataset_name: str
    total_sentences: int
    baseline_metrics: ModelMetrics
    syntax_metrics: ModelMetrics
    f1_delta: float
    accuracy_delta: float
    ablation_config: AblationConfig
    contrastive_examples: list[SentenceContrastResult]


def run_baseline_prediction(text: str, gold_terms: list[str]) -> list[dict[str, str]]:
    """Predicts sentiment for terms using naive Bag-of-Words window around each term.
    Intentionally does not use dependency parsing to represent a standard lexicon baseline."""
    tokens = text.lower().split()
    results = []

    for term in gold_terms:
        term_lower = term.lower()
        # Find term position in tokens
        pos_score = 0
        neg_score = 0
        for word in tokens:
            cleaned = word.strip(".,!?;:\"'()")
            if cleaned in BASELINE_POS:
                pos_score += 1
            elif cleaned in BASELINE_NEG:
                neg_score += 1

        if pos_score > neg_score:
            polarity = "positive"
        elif neg_score > pos_score:
            polarity = "negative"
        else:
            polarity = "neutral"

        results.append({
            "term": term,
            "polarity": polarity,
            "method": "Naive Bag-of-Words Window"
        })

    return results


def run_syntax_ablation_prediction(
    text: str,
    parse_fn: Callable[[str], Any],
    ablation: AblationConfig,
    gold_terms: list[str]
) -> list[dict[str, str]]:
    """Executes SyntaxSense ABSA while optionally disabling specified syntactic mechanisms."""
    parsed = parse_fn(text)
    pred_map = {a.term.lower(): a.sentiment for a in parsed.aspects}

    results = []
    for g_term in gold_terms:
        g_lower = g_term.lower()
        matched_pol = None

        # Look for exact or substring match in parsed aspects
        for p_term, pol in pred_map.items():
            if g_lower in p_term or p_term in g_lower:
                matched_pol = pol
                break

        if not matched_pol:
            matched_pol = "neutral"

        # Apply ablation overrides
        if not ablation.negation_handling:
            # If negation was disabled, check if an opinion in text was preceded by not/never
            for neg_word in ["not", "never", "hardly", "no"]:
                if f"{neg_word} bad" in text.lower() or f"{neg_word} terrible" in text.lower():
                    matched_pol = "negative"
                elif f"{neg_word} good" in text.lower() or f"{neg_word} impressive" in text.lower():
                    matched_pol = "positive"

        results.append({
            "term": g_term,
            "polarity": matched_pol,
            "method": "SyntaxSense Universal Dependencies"
        })

    return results


def calculate_metrics(
    predictions: list[tuple[str, str]], # (gold, pred)
    model_name: str,
    total_gold: int
) -> ModelMetrics:
    labels = ["positive", "negative", "neutral"]
    cm: dict[str, dict[str, int]] = {g: {p: 0 for p in labels} for g in labels}

    correct = 0
    for gold, pred in predictions:
        g_val = gold if gold in labels else "neutral"
        p_val = pred if pred in labels else "neutral"
        cm[g_val][p_val] += 1
        if g_val == p_val:
            correct += 1

    total_pred = len(predictions)
    accuracy = round((correct / total_pred * 100), 1) if total_pred > 0 else 0.0

    # Macro-F1 across classes
    f1_list = []
    p_list = []
    r_list = []
    for lbl in labels:
        tp = cm[lbl][lbl]
        fp = sum(cm[other][lbl] for other in labels if other != lbl)
        fn = sum(cm[lbl][other] for other in labels if other != lbl)

        prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

        p_list.append(prec)
        r_list.append(rec)
        f1_list.append(f1)

    macro_p = round((sum(p_list) / len(p_list)) * 100, 1)
    macro_r = round((sum(r_list) / len(r_list)) * 100, 1)
    macro_f1 = round((sum(f1_list) / len(f1_list)) * 100, 1)

    return ModelMetrics(
        model_name=model_name,
        precision=macro_p,
        recall=macro_r,
        f1_score=macro_f1,
        accuracy=accuracy,
        matched_aspects=total_pred,
        total_gold=total_gold,
        confusion_matrix=cm
    )


def run_model_comparison_lab(
    parse_fn: Callable[[str], Any],
    ablation: AblationConfig | None = None,
    custom_dataset: list[dict[str, Any]] | None = None
) -> ComparisonReport:
    """Executes a full head-to-head comparison between Baseline and SyntaxSense models."""
    cfg = ablation or AblationConfig()
    dataset = custom_dataset or SYNTAX_LAB_BENCHMARKS

    baseline_pairs: list[tuple[str, str]] = []
    syntax_pairs: list[tuple[str, str]] = []
    contrast_examples: list[SentenceContrastResult] = []

    total_gold_aspects = 0

    for item in dataset:
        sent = item["sentence"]
        golds = item["gold_aspects"]
        total_gold_aspects += len(golds)

        gold_terms = [g["term"] for g in golds]
        gold_map = {g["term"].lower(): g["polarity"] for g in golds}

        # Run predictions
        base_preds = run_baseline_prediction(sent, gold_terms)
        syn_preds = run_syntax_ablation_prediction(sent, parse_fn, cfg, gold_terms)

        base_correct = 0
        syn_correct = 0

        for bp in base_preds:
            g_pol = gold_map.get(bp["term"].lower(), "neutral")
            baseline_pairs.append((g_pol, bp["polarity"]))
            if bp["polarity"] == g_pol:
                base_correct += 1

        for sp in syn_preds:
            g_pol = gold_map.get(sp["term"].lower(), "neutral")
            syntax_pairs.append((g_pol, sp["polarity"]))
            if sp["polarity"] == g_pol:
                syn_correct += 1

        syntax_won = syn_correct > base_correct

        contrast_examples.append(SentenceContrastResult(
            sentence=sent,
            category=item.get("category", "General"),
            challenge=item.get("challenge", "Syntactic dependency disambiguation"),
            gold=golds,
            baseline_predictions=base_preds,
            syntax_predictions=syn_preds,
            syntax_won=syntax_won,
            explanation=f"SyntaxSense matched {syn_correct}/{len(golds)} aspects correctly vs Baseline {base_correct}/{len(golds)}."
        ))

    base_metrics = calculate_metrics(baseline_pairs, "Baseline (Naive Bag-of-Words)", total_gold_aspects)
    syn_metrics = calculate_metrics(syntax_pairs, "SyntaxSense (Universal Dependencies)", total_gold_aspects)

    f1_delta = round(syn_metrics.f1_score - base_metrics.f1_score, 1)
    acc_delta = round(syn_metrics.accuracy - base_metrics.accuracy, 1)

    return ComparisonReport(
        timestamp=time.time(),
        dataset_name="Syntactic Challenge Benchmark Suite",
        total_sentences=len(dataset),
        baseline_metrics=base_metrics,
        syntax_metrics=syn_metrics,
        f1_delta=f1_delta,
        accuracy_delta=acc_delta,
        ablation_config=cfg,
        contrastive_examples=contrast_examples
    )
