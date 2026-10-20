"""
SyntaxSense — Executive Report Generation & Auditing Engine
Synthesizes executive briefs, academic markdown dossiers, and structured
Universal Dependency audit trails for production analysis.
"""

from typing import Any, Optional
from pydantic import BaseModel, Field
import datetime
import uuid

class ReportSection(BaseModel):
    title: str
    content: str
    items: list[str] = Field(default_factory=list)

class ExecutiveReport(BaseModel):
    report_id: str
    title: str
    generated_at: str
    sample_count: int
    overall_health_score: int
    health_rating: str
    positive_aspects: list[dict[str, Any]]
    negative_aspects: list[dict[str, Any]]
    neutral_aspects: list[dict[str, Any]]
    swot_summary: dict[str, list[str]]
    syntactic_audit_trail: list[dict[str, Any]]
    markdown_content: str
    executive_summary: str

def generate_executive_report(
    analyses_data: list[dict[str, Any]],
    title: str = "Aspect-Based Sentiment Intelligence Brief",
    organization: str = "SyntaxSense Universal Dependencies Analytics"
) -> ExecutiveReport:
    """
    Synthesizes an executive report from a collection of analysis records.
    """
    report_id = f"REP-{uuid.uuid4().hex[:8].upper()}"
    now_str = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    if not analyses_data:
        return ExecutiveReport(
            report_id=report_id,
            title=title,
            generated_at=now_str,
            sample_count=0,
            overall_health_score=50,
            health_rating="Neutral / Insufficient Data",
            positive_aspects=[],
            negative_aspects=[],
            neutral_aspects=[],
            swot_summary={"Strengths": [], "Weaknesses": [], "Opportunities": [], "Threats": []},
            syntactic_audit_trail=[],
            markdown_content="# Executive Brief\nNo analysis data provided.",
            executive_summary="No data analyzed."
        )

    # Aggregate scores and aspects
    total_score = 0
    aspect_tally: dict[str, dict[str, Any]] = {}
    audit_trail: list[dict[str, Any]] = []

    for item in analyses_data:
        score = item.get("sentiment_score", 50)
        total_score += score
        text = item.get("text", "")
        source = item.get("source", "System")

        for asp in item.get("aspects", []):
            term = asp.get("term", "Unknown").title()
            sentiment = asp.get("sentiment", "neutral")
            opinion = asp.get("opinion", "")
            dep_path = asp.get("dependency_path", "")
            confidence = asp.get("confidence", 50)

            audit_trail.append({
                "aspect": term,
                "opinion": opinion,
                "sentiment": sentiment,
                "confidence": confidence,
                "dependency_path": dep_path,
                "review_snippet": text[:90] + ("..." if len(text) > 90 else ""),
                "source": source
            })

            if term not in aspect_tally:
                aspect_tally[term] = {"term": term, "positive": 0, "negative": 0, "neutral": 0, "opinions": []}
            aspect_tally[term][sentiment] += 1
            if opinion and opinion not in aspect_tally[term]["opinions"]:
                aspect_tally[term]["opinions"].append(opinion)

    avg_score = round(total_score / max(1, len(analyses_data)))

    # Sort aspects by sentiment polarity
    positives = []
    negatives = []
    neutrals = []

    for term, tally in aspect_tally.items():
        total_mentions = tally["positive"] + tally["negative"] + tally["neutral"]
        pos_ratio = tally["positive"] / max(1, total_mentions)
        neg_ratio = tally["negative"] / max(1, total_mentions)

        data = {
            "term": term,
            "total_mentions": total_mentions,
            "positive_count": tally["positive"],
            "negative_count": tally["negative"],
            "neutral_count": tally["neutral"],
            "top_opinions": ", ".join(tally["opinions"][:3]),
            "score_pct": round(pos_ratio * 100)
        }

        if pos_ratio > neg_ratio and tally["positive"] > 0:
            positives.append(data)
        elif neg_ratio > pos_ratio and tally["negative"] > 0:
            negatives.append(data)
        else:
            neutrals.append(data)

    positives.sort(key=lambda x: x["positive_count"], reverse=True)
    negatives.sort(key=lambda x: x["negative_count"], reverse=True)
    neutrals.sort(key=lambda x: x["total_mentions"], reverse=True)

    # Health Rating
    if avg_score >= 75:
        health_rating = "Excellent (Strong Positive Bias)"
    elif avg_score >= 60:
        health_rating = "Favorable (Mild Positive Bias)"
    elif avg_score >= 45:
        health_rating = "Equilibrium (Neutral / Mixed Feedback)"
    elif avg_score >= 30:
        health_rating = "At Risk (Negative Friction Points)"
    else:
        health_rating = "Critical (High Negative Discontent)"

    # SWOT synthesis
    strengths = [f"{p['term']}: praised for '{p['top_opinions']}' ({p['positive_count']} mentions)" for p in positives[:3]]
    weaknesses = [f"{n['term']}: critiqued for '{n['top_opinions']}' ({n['negative_count']} mentions)" for n in negatives[:3]]
    opportunities = [f"Capitalize on positive sentiment in {positives[0]['term'] if positives else 'core features'} to improve overall market differentiation."]
    threats = [f"Mitigate recurring dissatisfaction regarding {negatives[0]['term'] if negatives else 'potential performance bottlenecks'} to avoid customer churn."]

    swot_summary = {
        "Strengths": strengths or ["No strong positive clusters identified yet."],
        "Weaknesses": weaknesses or ["No dominant negative complaints detected."],
        "Opportunities": opportunities,
        "Threats": threats
    }

    executive_summary = (
        f"Analyzed {len(analyses_data)} customer review texts spanning {len(aspect_tally)} distinct grammatical aspects. "
        f"Overall customer sentiment stands at {avg_score}% ({health_rating}). "
        f"Key drivers of satisfaction include {', '.join([p['term'] for p in positives[:2]]) if positives else 'baseline features'}. "
        f"Primary pain points requiring engineering/operational attention center on {', '.join([n['term'] for n in negatives[:2]]) if negatives else 'minor friction points'}."
    )

    # Generate Markdown Dossier
    md_lines = [
        f"# {title}",
        f"**Document ID:** `{report_id}` | **Generated:** {now_str} | **Organization:** {organization}\n",
        "## Executive Summary",
        executive_summary,
        f"\n**Overall Sentiment Health Index:** `{avg_score}/100` ({health_rating})\n",
        "## Strategic SWOT Analysis",
        "### Strengths (Core Positive Drivers)",
        "\n".join([f"- {s}" for s in swot_summary["Strengths"]]),
        "\n### Weaknesses (Friction & Negative Drivers)",
        "\n".join([f"- {w}" for w in swot_summary["Weaknesses"]]),
        "\n### Opportunities & Recommendations",
        "\n".join([f"- {o}" for o in swot_summary["Opportunities"]]),
        "\n### Threats & Risk Mitigations",
        "\n".join([f"- {t}" for t in swot_summary["Threats"]]),
        "\n## Aspect Inventory Breakdown",
        "| Aspect Dimension | Mentions | Pos | Neg | Neu | Score | Top Modifier Opinions |",
        "| :--- | :---: | :---: | :---: | :---: | :---: | :--- |"
    ]

    for p in positives + negatives + neutrals:
        md_lines.append(
            f"| **{p['term']}** | {p['total_mentions']} | {p['positive_count']} | {p['negative_count']} | {p['neutral_count']} | {p['score_pct']}% | {p['top_opinions']} |"
        )

    md_lines.extend([
        "\n## Syntactic Audit Trail (First 15 Evidence Paths)",
        "| Target Aspect | Polarity | Opinion Modifier | Universal Dependency Route | Context Snippet |",
        "| :--- | :---: | :--- | :--- | :--- |"
    ])

    for a in audit_trail[:15]:
        md_lines.append(
            f"| **{a['aspect']}** | `{a['sentiment'].upper()}` | {a['opinion']} | `{a['dependency_path']}` | \"{a['review_snippet']}\" |"
        )

    md_lines.append(
        "\n---\n*Synthesized via SyntaxSense Universal Dependency Parsing Engine with Spacy en_core_web_sm.*"
    )

    return ExecutiveReport(
        report_id=report_id,
        title=title,
        generated_at=now_str,
        sample_count=len(analyses_data),
        overall_health_score=avg_score,
        health_rating=health_rating,
        positive_aspects=positives,
        negative_aspects=negatives,
        neutral_aspects=neutrals,
        swot_summary=swot_summary,
        syntactic_audit_trail=audit_trail,
        markdown_content="\n".join(md_lines),
        executive_summary=executive_summary
    )
