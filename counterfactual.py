"""
SyntaxSense — Counterfactual Grammar & What-If Syntactic Simulation Engine
Analyzes how grammatical mutations (negation injection, adversative clauses, intensifiers,
and entity shifts) alter syntactic dependency graphs and aspect-level sentiment.
"""

from typing import Any, Callable, Literal
from pydantic import BaseModel, Field
import re

class AspectDelta(BaseModel):
    aspect: str
    original_opinion: str
    mutated_opinion: str
    original_sentiment: str
    mutated_sentiment: str
    original_confidence: int
    mutated_confidence: int
    polarity_flipped: bool
    status: Literal["flipped", "shifted", "preserved", "introduced", "removed"]
    dependency_rule_triggered: str

class CounterfactualResult(BaseModel):
    original_text: str
    mutated_text: str
    mutation_type: str
    mutation_description: str
    original_score: int
    mutated_score: int
    score_delta: int
    aspect_deltas: list[AspectDelta]
    grammatical_explanation: list[str]
    original_aspects_count: int
    mutated_aspects_count: int
    original_analysis: dict[str, Any]
    mutated_analysis: dict[str, Any]

COUNTERFACTUAL_PRESETS = [
    {
        "id": "battery_negation",
        "title": "Battery Life Negation Flip",
        "category": "Negation Insertion",
        "base_text": "The battery lasts all day and charges remarkably fast.",
        "mutated_text": "The battery does not last all day and charges remarkably slow.",
        "mutation_type": "negation_and_antonym",
        "description": "Injects auxiliary negation 'does not' into the head verb and flips the adverbial modifier."
    },
    {
        "id": "screen_adversative",
        "title": "Adversative Clause Contrast ('However')",
        "category": "Concessive / Adversative",
        "base_text": "The display is vibrant, crisp, and wonderfully bright.",
        "mutated_text": "The display is vibrant and crisp, however the viewing angles are noticeably washed out.",
        "mutation_type": "adversative_clause",
        "description": "Appends an adversative conjunct clause ('however') introducing a conflicting second aspect."
    },
    {
        "id": "keyboard_intensifier",
        "title": "Degree Intensifier Escalation",
        "category": "Modifier Escalation",
        "base_text": "The keyboard has decent tactile feedback.",
        "mutated_text": "The keyboard has exceptionally tactile and extraordinarily responsive feedback.",
        "mutation_type": "intensifier_escalation",
        "description": "Upgrades neutral adjective modifier with high-degree adverbs ('exceptionally', 'extraordinarily')."
    },
    {
        "id": "restaurant_diminisher",
        "title": "Concessive Attenuation ('Although...')",
        "category": "Subordinating Conjunction",
        "base_text": "The pasta was fresh and the wine selection was outstanding.",
        "mutated_text": "Although the wine selection was outstanding, the pasta was barely fresh.",
        "mutation_type": "concessive_attenuation",
        "description": "Subordinates positive clause with 'Although' while injecting diminisher adverb 'barely'."
    },
    {
        "id": "support_sarcasm",
        "title": "Subjunctive Irony Injection",
        "category": "Modal & Sarcasm",
        "base_text": "The technical support team was helpful with my warranty request.",
        "mutated_text": "The technical support team would have been helpful if anyone actually answered the phone.",
        "mutation_type": "subjunctive_counterfactual",
        "description": "Alters indicative past tense to subjunctive conditional ('would have been... if') inverting intent."
    }
]

def generate_quick_mutations(text: str) -> list[dict[str, str]]:
    """
    Generates algorithmic counterfactual suggestions based on input sentence patterns.
    """
    suggestions = []
    lower = text.strip()

    # 1. Negation Injection / Removal
    if re.search(r"\b(is|was|are|were|has|have|had|lasts|works)\b", lower, flags=re.IGNORECASE):
        # Insert not after copula / auxiliary
        neg_text = re.sub(
            r"\b(is|was|are|were)\b",
            r"\1 not",
            lower,
            count=1,
            flags=re.IGNORECASE
        )
        if neg_text != lower:
            suggestions.append({
                "type": "negation",
                "label": "Inject Negation ('not')",
                "text": neg_text,
                "hint": "Tests how dep=neg attached to predicate inverts aspect sentiment."
            })
    elif "not " in lower:
        unneg_text = lower.replace("not ", "").replace("never ", "")
        suggestions.append({
            "type": "negation_removal",
            "label": "Remove Negation",
            "text": unneg_text,
            "hint": "Tests restoration of positive modifier polarity."
        })

    # 2. Adversative Contrast clause
    adversatives = [
        ("but the price is completely unreasonable", "Append 'but...' (Contrastive Conjunct)"),
        ("however the build quality feels extremely cheap", "Append 'however...' (Adversative Clause)"),
        ("yet customer service was utterly unhelpful", "Append 'yet...' (Concession)")
    ]
    trimmed = lower.rstrip(".!?")
    for adv_clause, adv_label in adversatives:
        suggestions.append({
            "type": "adversative",
            "label": adv_label,
            "text": f"{trimmed}, {adv_clause}.",
            "hint": "Tests multi-aspect polarity bifurcation across cc / conj clausal edges."
        })

    # 3. Intensifier escalation
    intensified = re.sub(r"\b(good|great|nice|fast|crisp|clear|fresh)\b", r"unbelievably \1", lower, count=1, flags=re.IGNORECASE)
    if intensified != lower:
        suggestions.append({
            "type": "intensifier",
            "label": "Inject Intensifier ('unbelievably...')",
            "text": intensified,
            "hint": "Tests confidence amplification via advmod degree modification."
        })

    # 4. Diminisher attenuation
    diminished = re.sub(r"\b(good|great|fast|responsive|helpful|tasty)\b", r"barely \1", lower, count=1, flags=re.IGNORECASE)
    if diminished != lower:
        suggestions.append({
            "type": "diminisher",
            "label": "Inject Diminisher ('barely...')",
            "text": diminished,
            "hint": "Tests downward polarity shift via attenuating degree adverb."
        })

    return suggestions[:5]

def run_counterfactual_simulation(
    base_text: str,
    mutated_text: str,
    analysis_fn: Callable[[str], Any],
    mutation_type: str = "custom",
    mutation_description: str = "User-defined counterfactual perturbation"
) -> CounterfactualResult:
    """
    Executes comparative syntactic dependency parsing between the base text and mutated text,
    aligning aspects, computing polarity shifts, and logging triggered grammatical rules.
    """
    res_orig = analysis_fn(base_text)
    res_mut = analysis_fn(mutated_text)

    orig_dict = res_orig.model_dump() if hasattr(res_orig, "model_dump") else res_orig
    mut_dict = res_mut.model_dump() if hasattr(res_mut, "model_dump") else res_mut

    orig_aspects = {a["term"].lower(): a for a in orig_dict.get("aspects", [])}
    mut_aspects = {a["term"].lower(): a for a in mut_dict.get("aspects", [])}

    all_keys = list(set(list(orig_aspects.keys()) + list(mut_aspects.keys())))
    aspect_deltas: list[AspectDelta] = []
    explanations: list[str] = []

    for key in all_keys:
        a_orig = orig_aspects.get(key)
        a_mut = mut_aspects.get(key)

        if a_orig and a_mut:
            orig_sent = a_orig.get("sentiment", "neutral")
            mut_sent = a_mut.get("sentiment", "neutral")
            orig_conf = a_orig.get("confidence", 50)
            mut_conf = a_mut.get("confidence", 50)
            flipped = (orig_sent != mut_sent)

            # Determine rule
            rule_str = ""
            if "not" in a_mut.get("opinion", "").lower() and "not" not in a_orig.get("opinion", "").lower():
                rule_str = f"Negation inversion rule: 'neg' dependency arc detected targeting predicate '{a_mut.get('opinion')}'."
                explanations.append(f"Aspect '{a_orig['term']}': Polarity inverted from {orig_sent.upper()} to {mut_sent.upper()} due to newly bound negation operator.")
            elif flipped:
                rule_str = f"Lexical modifier swap: '{a_orig.get('opinion')}' -> '{a_mut.get('opinion')}' altered polarity."
                explanations.append(f"Aspect '{a_orig['term']}': Polarity shifted from {orig_sent.upper()} to {mut_sent.upper()} via modified head opinion.")
            else:
                rule_str = f"Polarity preserved ({orig_sent.upper()}); confidence delta: {mut_conf - orig_conf}%."
                if mut_conf != orig_conf:
                    explanations.append(f"Aspect '{a_orig['term']}': Sentiment maintained as {orig_sent.upper()} with confidence shift from {orig_conf}% to {mut_conf}%.")

            aspect_deltas.append(AspectDelta(
                aspect=a_orig["term"],
                original_opinion=a_orig.get("opinion", ""),
                mutated_opinion=a_mut.get("opinion", ""),
                original_sentiment=orig_sent,
                mutated_sentiment=mut_sent,
                original_confidence=orig_conf,
                mutated_confidence=mut_conf,
                polarity_flipped=flipped,
                status="flipped" if flipped else "preserved",
                dependency_rule_triggered=rule_str
            ))

        elif a_orig and not a_mut:
            aspect_deltas.append(AspectDelta(
                aspect=a_orig["term"],
                original_opinion=a_orig.get("opinion", ""),
                mutated_opinion="[Removed / Detached]",
                original_sentiment=a_orig.get("sentiment", "neutral"),
                mutated_sentiment="none",
                original_confidence=a_orig.get("confidence", 0),
                mutated_confidence=0,
                polarity_flipped=True,
                status="removed",
                dependency_rule_triggered="Syntactic detachment: Head noun no longer governed by sentiment modifier."
            ))
            explanations.append(f"Aspect '{a_orig['term']}': Pruned from dependency graph in counterfactual mutation.")

        elif a_mut and not a_orig:
            aspect_deltas.append(AspectDelta(
                aspect=a_mut["term"],
                original_opinion="[New Aspect]",
                mutated_opinion=a_mut.get("opinion", ""),
                original_sentiment="none",
                mutated_sentiment=a_mut.get("sentiment", "neutral"),
                original_confidence=0,
                mutated_confidence=a_mut.get("confidence", 50),
                polarity_flipped=False,
                status="introduced",
                dependency_rule_triggered=f"New clausal conjunct introduced aspect '{a_mut['term']}' governed by '{a_mut.get('opinion')}'."
            ))
            explanations.append(f"New Aspect '{a_mut['term']}': Emerged via introduced clausal conjunct with {a_mut.get('sentiment', 'neutral').upper()} polarity.")

    if not explanations:
        explanations.append("No significant aspect polarity shifts were detected between original and counterfactual sentences.")

    orig_score = orig_dict.get("score", 50)
    mut_score = mut_dict.get("score", 50)

    return CounterfactualResult(
        original_text=base_text,
        mutated_text=mutated_text,
        mutation_type=mutation_type,
        mutation_description=mutation_description,
        original_score=orig_score,
        mutated_score=mut_score,
        score_delta=mut_score - orig_score,
        aspect_deltas=aspect_deltas,
        grammatical_explanation=explanations,
        original_aspects_count=len(orig_dict.get("aspects", [])),
        mutated_aspects_count=len(mut_dict.get("aspects", [])),
        original_analysis=orig_dict,
        mutated_analysis=mut_dict
    )
