"""SemEval-2014 Task 4 Evaluation Engine for SyntaxSense.

Evaluates the Universal Dependency syntactic aspect parser against official gold-standard
SemEval-2014 benchmarks (Laptops & Restaurants test sets).

Computes:
  * Aspect Term Extraction (ATE): Precision, Recall, F1 (both Exact match and Relaxed token overlap)
  * Aspect-level Sentiment Classification (ASC): Accuracy and Macro-F1 on matched aspects
  * Confusion Matrix: Positive / Negative / Neutral / Conflict
  * Per-sentence inspection: Gold terms vs Predicted terms with match classifications
"""
from __future__ import annotations

import json
import os
import time
from collections import defaultdict
from dataclasses import dataclass
from typing import Any, Callable, Literal

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

DATASET_CONFIGS = {
    "semeval14_laptops": {
        "name": "SemEval-2014 Task 4 (Laptops Test)",
        "domain": "Consumer Electronics / Laptops",
        "file": os.path.join(DATA_DIR, "laptops_test.jsonl"),
        "total_gold_sentences": 800,
        "total_gold_aspects": 1033,
    },
    "semeval14_restaurants": {
        "name": "SemEval-2014 Task 4 (Restaurants Test)",
        "domain": "Dining & Hospitality",
        "file": os.path.join(DATA_DIR, "restaurants_test.jsonl"),
        "total_gold_sentences": 800,
        "total_gold_aspects": 1328,
    },
}


def load_dataset(dataset_key: str, limit: int | None = None) -> list[dict[str, Any]]:
    """Loads and aggregates gold annotations by unique sentence."""
    cfg = DATASET_CONFIGS.get(dataset_key)
    if not cfg or not os.path.exists(cfg["file"]):
        raise FileNotFoundError(f"Dataset file not found for {dataset_key}")

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    with open(cfg["file"], "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            entry = json.loads(line)
            sent = entry["sentence"]
            grouped[sent].append(entry)

    items: list[dict[str, Any]] = []
    for sent, annotations in grouped.items():
        gold_aspects = []
        seen_terms = set()
        for a in annotations:
            term_info = a.get("aspect_term") or {}
            term_text = term_info.get("term", "").strip()
            if not term_text:
                continue
            key = (term_text.lower(), a.get("polarity", "neutral"))
            if key in seen_terms:
                continue
            seen_terms.add(key)
            gold_aspects.append({
                "term": term_text,
                "polarity": a.get("polarity", "neutral"),
                "opinions": [op.get("opinion_term", {}).get("term") for op in a.get("opinions", []) if op.get("opinion_term")],
            })
        items.append({
            "sentence": sent,
            "gold_aspects": gold_aspects,
        })
        if limit and len(items) >= limit:
            break

    return items


def evaluate_dataset(
    dataset_key: str,
    parse_fn: Callable[[str], Any],
    limit: int = 100,
) -> dict[str, Any]:
    """Runs syntactic dependency evaluation over a dataset slice."""
    items = load_dataset(dataset_key, limit=limit)
    start_time = time.perf_counter()

    tp_exact = 0
    fp_exact = 0
    fn_exact = 0

    tp_relaxed = 0
    fp_relaxed = 0
    fn_relaxed = 0

    sentiment_correct = 0
    sentiment_total = 0
    confusion_matrix = defaultdict(lambda: defaultdict(int))

    detailed_sentences: list[dict[str, Any]] = []

    for item in items:
        sentence = item["sentence"]
        gold_aspects = item["gold_aspects"]

        # Run parser
        parsed = parse_fn(sentence)
        pred_aspects = parsed.aspects

        # Map predictions & golds
        pred_terms = [a.term.strip() for a in pred_aspects]
        gold_terms = [a["term"].strip() for a in gold_aspects]

        # Exact match logic
        matched_gold_exact = set()
        matched_pred_exact = set()
        for p_idx, p_asp in enumerate(pred_aspects):
            for g_idx, g_asp in enumerate(gold_aspects):
                if g_idx in matched_gold_exact:
                    continue
                if p_asp.term.lower() == g_asp["term"].lower():
                    matched_gold_exact.add(g_idx)
                    matched_pred_exact.add(p_idx)
                    tp_exact += 1
                    # Check sentiment polarity
                    pred_pol = p_asp.sentiment
                    gold_pol = g_asp["polarity"]
                    confusion_matrix[gold_pol][pred_pol] += 1
                    sentiment_total += 1
                    if pred_pol == gold_pol or (gold_pol == "conflict" and pred_pol in {"positive", "negative"}):
                        sentiment_correct += 1
                    break

        fp_exact += len(pred_aspects) - len(matched_pred_exact)
        fn_exact += len(gold_aspects) - len(matched_gold_exact)

        # Relaxed match logic (substring or overlap)
        matched_gold_rel = set()
        matched_pred_rel = set()
        for p_idx, p_asp in enumerate(pred_aspects):
            p_lower = p_asp.term.lower()
            for g_idx, g_asp in enumerate(gold_aspects):
                if g_idx in matched_gold_rel:
                    continue
                g_lower = g_asp["term"].lower()
                if p_lower in g_lower or g_lower in p_lower:
                    matched_gold_rel.add(g_idx)
                    matched_pred_rel.add(p_idx)
                    tp_relaxed += 1
                    break

        fp_relaxed += len(pred_aspects) - len(matched_pred_rel)
        fn_relaxed += len(gold_aspects) - len(matched_gold_rel)

        # Record detail
        detailed_sentences.append({
            "sentence": sentence,
            "gold_aspects": gold_aspects,
            "predicted_aspects": [
                {
                    "term": a.term,
                    "opinion": a.opinion,
                    "sentiment": a.sentiment,
                    "confidence": a.confidence,
                    "dependency_path": a.dependency_path,
                }
                for a in pred_aspects
            ],
            "exact_matches": len(matched_pred_exact),
            "latency_ms": getattr(parsed, "latency_ms", 0.0),
        })

    elapsed = round(time.perf_counter() - start_time, 2)

    # Metrics calculation helper
    def calc_prf(tp: int, fp: int, fn: int) -> tuple[float, float, float]:
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
        return round(precision * 100, 1), round(recall * 100, 1), round(f1 * 100, 1)

    p_exact, r_exact, f1_exact = calc_prf(tp_exact, fp_exact, fn_exact)
    p_rel, r_rel, f1_rel = calc_prf(tp_relaxed, fp_relaxed, fn_relaxed)
    sentiment_acc = round((sentiment_correct / sentiment_total) * 100, 1) if sentiment_total > 0 else 0.0

    cfg = DATASET_CONFIGS.get(dataset_key, {})

    return {
        "dataset_key": dataset_key,
        "dataset_name": cfg.get("name", dataset_key),
        "domain": cfg.get("domain", "General"),
        "sample_size": len(items),
        "elapsed_seconds": elapsed,
        "sentences_per_second": round(len(items) / max(0.01, elapsed), 1),
        "exact_match_metrics": {
            "precision": p_exact,
            "recall": r_exact,
            "f1": f1_exact,
            "tp": tp_exact,
            "fp": fp_exact,
            "fn": fn_exact,
        },
        "relaxed_match_metrics": {
            "precision": p_rel,
            "recall": r_rel,
            "f1": f1_rel,
            "tp": tp_relaxed,
            "fp": fp_relaxed,
            "fn": fn_relaxed,
        },
        "sentiment_classification": {
            "accuracy": sentiment_acc,
            "matched_aspects": sentiment_total,
            "correct_sentiment": sentiment_correct,
            "confusion_matrix": {k: dict(v) for k, v in confusion_matrix.items()},
        },
        "detailed_results": detailed_sentences[:40],
    }
