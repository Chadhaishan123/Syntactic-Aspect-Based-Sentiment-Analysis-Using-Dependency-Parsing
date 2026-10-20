"""
SyntaxSense — Aspect-QA (Automated Syntactic Question-Answering Engine)
Answers natural language questions about products and aspects using grounded dependency trees.
"""

from typing import Any, Callable, Optional
from pydantic import BaseModel, Field
import re

class AspectEvidence(BaseModel):
    aspect: str
    opinion: str
    sentiment: str
    confidence: int
    dependency_path: str
    sentence: str

class AspectQAResponse(BaseModel):
    question: str
    target_aspects: list[str]
    intent: str  # "aspect_query", "complaints_query", "praise_query", "comparison_query", "general_query"
    polarity_score: int
    sentiment_label: str
    answer_text: str
    evidence: list[AspectEvidence]
    total_reviews_analyzed: int
    aspect_mention_count: int

QA_PRESET_QUESTIONS = [
    {
        "question": "How is the battery life and charging speed?",
        "intent": "aspect_query",
        "domain": "Laptops",
        "sample_reviews": [
            "The battery life easily lasts 14 hours on a single charge.",
            "Fast charging gets me to 80 percent in under 45 minutes.",
            "However, the charger brick itself is bulky and heavy to carry.",
            "Under heavy load, the battery drains slightly faster than expected."
        ]
    },
    {
        "question": "What are the biggest customer complaints?",
        "intent": "complaints_query",
        "domain": "Laptops",
        "sample_reviews": [
            "The cooling fan is ridiculously loud during video editing.",
            "The keyboard keys feel mushy and lack good tactile feedback.",
            "The trackpad occasionally lags and misses multi-finger gestures.",
            "Build quality is great and the display is stunning."
        ]
    },
    {
        "question": "Is the display good for outdoor use?",
        "intent": "aspect_query",
        "domain": "Electronics",
        "sample_reviews": [
            "The OLED screen has stunning color accuracy and deep blacks.",
            "Peak brightness reaches 1600 nits, making outdoor visibility fantastic in direct sunlight.",
            "Viewing angles are remarkably wide with zero color shifting.",
            "The glossy coating produces noticeable reflections in bright rooms."
        ]
    },
    {
        "question": "How is the customer service and food quality?",
        "intent": "aspect_query",
        "domain": "Restaurants",
        "sample_reviews": [
            "The pasta was exceptionally fresh and cooked to perfection.",
            "Our waiter was attentive, polite, and made wonderful wine pairings.",
            "However, the hostess was dismissive and we waited 30 minutes for our table.",
            "The seafood was flavorful and delightfully seasoned."
        ]
    }
]

def extract_query_aspects(question: str) -> tuple[list[str], str]:
    """
    Extracts query intent and target aspect keywords from the user question.
    """
    q_lower = question.lower()
    
    intent = "aspect_query"
    if re.search(r"\b(complaint|complain|worst|bad|hate|dislike|issue|problem|flaw|critique)\b", q_lower):
        intent = "complaints_query"
    elif re.search(r"\b(best|love|praise|highlight|greatest|favorite|stellar)\b", q_lower):
        intent = "praise_query"
    elif re.search(r"\b(compare|versus|vs|difference|better)\b", q_lower):
        intent = "comparison_query"

    aspect_keywords = [
        "battery", "charging", "charger", "screen", "display", "monitor", "oled", "brightness",
        "keyboard", "typing", "trackpad", "mouse", "fan", "cooling", "thermal", "noise",
        "performance", "speed", "processor", "cpu", "gpu", "gaming", "ram",
        "camera", "photo", "video", "sensor", "audio", "speaker", "sound", "microphone",
        "food", "pasta", "pizza", "service", "staff", "waiter", "price", "value",
        "build", "design", "weight", "durability", "hinge"
    ]

    matched = [kw for kw in aspect_keywords if kw in q_lower]
    if not matched:
        # Fallback: extract nouns
        words = re.findall(r"\b[a-zA-Z]{4,}\b", q_lower)
        stop = {"what", "when", "where", "which", "about", "there", "their", "customer", "product", "review", "does"}
        matched = [w for w in words if w not in stop][:2]

    return matched or ["general"], intent

def answer_aspect_question(
    question: str,
    reviews: list[str],
    analysis_fn: Callable[[str], Any]
) -> AspectQAResponse:
    """
    Synthesizes an aspect-grounded answer directly supported by dependency parse trees.
    """
    target_aspects, intent = extract_query_aspects(question)
    evidence_list: list[AspectEvidence] = []
    
    pos_count = 0
    neg_count = 0
    neu_count = 0

    for review in reviews:
        if not review.strip():
            continue
        res = analysis_fn(review)
        data = res.model_dump() if hasattr(res, "model_dump") else res
        
        for asp in data.get("aspects", []):
            term = asp.get("term", "").lower()
            sentiment = asp.get("sentiment", "neutral")
            
            # Check if aspect matches target or general complaints/praise query
            is_match = any(t in term for t in target_aspects) or (intent in {"complaints_query", "praise_query"})
            
            if is_match:
                if sentiment == "positive":
                    pos_count += 1
                elif sentiment == "negative":
                    neg_count += 1
                else:
                    neu_count += 1

                evidence_list.append(AspectEvidence(
                    aspect=asp.get("term", "").title(),
                    opinion=asp.get("opinion", ""),
                    sentiment=sentiment,
                    confidence=asp.get("confidence", 50),
                    dependency_path=asp.get("dependency_path", ""),
                    sentence=review
                ))

    # Calculate overall polarity for the matched query
    total_matched = pos_count + neg_count + neu_count
    if total_matched > 0:
        score = round((pos_count / total_matched) * 100)
    else:
        score = 50

    if score >= 65:
        sentiment_label = "Positive"
    elif score <= 40:
        sentiment_label = "Negative"
    else:
        sentiment_label = "Mixed / Neutral"

    # Synthesize natural language answer
    aspect_names = ", ".join([a.title() for a in target_aspects])
    
    if intent == "complaints_query":
        neg_evidence = [e for e in evidence_list if e.sentiment == "negative"]
        if neg_evidence:
            items_str = "; ".join([f"{e.aspect} ({e.opinion})" for e in neg_evidence[:3]])
            answer = f"The primary customer complaints centered around: {items_str}. Syntactic dependency traces indicate recurring negative modifiers."
        else:
            answer = "No strong negative sentiment clusters were detected across the analyzed customer statements."
    elif intent == "praise_query":
        pos_evidence = [e for e in evidence_list if e.sentiment == "positive"]
        if pos_evidence:
            items_str = "; ".join([f"{e.aspect} ({e.opinion})" for e in pos_evidence[:3]])
            answer = f"Top customer praise focuses on: {items_str}. Syntactic relations show consistently strong positive modifiers."
        else:
            answer = "No prominent positive praise clusters were detected in the provided review sample."
    else:
        if total_matched == 0:
            answer = f"No direct syntactic mentions of '{aspect_names}' were identified in the current corpus of {len(reviews)} reviews."
        elif score >= 65:
            top_opinions = ", ".join(list(set([e.opinion for e in evidence_list if e.sentiment == "positive"]))[:3])
            answer = f"Customer sentiment regarding {aspect_names} is predominantly favorable ({score}% positive). Highlighted syntactic opinions include: '{top_opinions}'."
        elif score <= 40:
            top_opinions = ", ".join(list(set([e.opinion for e in evidence_list if e.sentiment == "negative"]))[:3])
            answer = f"Customer sentiment regarding {aspect_names} indicates substantial friction ({score}% favorable). Dominant critical modifiers include: '{top_opinions}'."
        else:
            answer = f"Customer opinion on {aspect_names} is balanced or mixed ({score}% favorable). Both favorable praise and negative critiques were detected across dependency paths."

    return AspectQAResponse(
        question=question,
        target_aspects=target_aspects,
        intent=intent,
        polarity_score=score,
        sentiment_label=sentiment_label,
        answer_text=answer,
        evidence=evidence_list,
        total_reviews_analyzed=len(reviews),
        aspect_mention_count=total_matched
    )
