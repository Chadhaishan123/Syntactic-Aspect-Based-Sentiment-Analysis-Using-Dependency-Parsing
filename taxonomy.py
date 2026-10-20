"""
SyntaxSense — Custom Aspect Ontology & Taxonomy Management Engine
Enables defining, organizing, and validating hierarchical aspect categories across domains.
"""

from typing import Any, Callable
from pydantic import BaseModel, Field
import re

class AspectCategoryRule(BaseModel):
    category_id: str
    name: str
    description: str
    keywords: list[str] = Field(default_factory=list)
    color: str = Field(default="#38bdf8")

class DomainOntology(BaseModel):
    domain_id: str
    name: str
    description: str
    categories: list[AspectCategoryRule]

class TaxonomyMatch(BaseModel):
    extracted_aspect: str
    matched_category: str
    category_color: str
    confidence: int
    matched_by_keyword: str

class TaxonomyTestResult(BaseModel):
    text: str
    domain_id: str
    matches: list[TaxonomyMatch]
    unmapped_aspects: list[str]

BUILTIN_ONTOLOGIES: dict[str, DomainOntology] = {
    "laptops_hardware": DomainOntology(
        domain_id="laptops_hardware",
        name="Laptops & Computing Hardware",
        description="Standard hardware components, battery systems, thermals, and peripherals.",
        categories=[
            AspectCategoryRule(
                category_id="battery_power",
                name="Battery & Power",
                description="Battery longevity, charge speed, power brick, and drain rates.",
                keywords=["battery", "battery life", "charge", "charger", "charging", "drain", "power", "watt", "adapter"],
                color="#38bdf8"
            ),
            AspectCategoryRule(
                category_id="display_visuals",
                name="Display & Screen",
                description="Panel resolution, OLED/IPS technology, brightness, and viewing angles.",
                keywords=["screen", "display", "panel", "oled", "retina", "brightness", "resolution", "nits", "viewing angle", "colors"],
                color="#c084fc"
            ),
            AspectCategoryRule(
                category_id="keyboard_input",
                name="Keyboard & Input",
                description="Typing tactile response, trackpad accuracy, and palm rest ergonomics.",
                keywords=["keyboard", "keys", "typing", "trackpad", "touchpad", "click", "feedback", "backlight", "gestures"],
                color="#10b981"
            ),
            AspectCategoryRule(
                category_id="thermals_noise",
                name="Thermals & Fan Noise",
                description="Cooling fan acoustic profile, heat dissipation, and throttling.",
                keywords=["fan", "cooling", "noise", "loud", "heat", "hot", "thermal", "throttle", "quiet"],
                color="#f43f5e"
            ),
            AspectCategoryRule(
                category_id="performance_speed",
                name="Performance & Chipset",
                description="CPU, GPU, RAM, multi-tasking speed, and boot duration.",
                keywords=["performance", "speed", "fast", "cpu", "gpu", "processor", "chip", "m3", "ram", "multitask", "boot"],
                color="#f59e0b"
            )
        ]
    ),
    "saas_cloud": DomainOntology(
        domain_id="saas_cloud",
        name="SaaS & Cloud Software",
        description="Web application infrastructure, UI/UX, documentation, and pricing.",
        categories=[
            AspectCategoryRule(
                category_id="ui_usability",
                name="UI & Ease of Use",
                description="Interface modernness, onboarding speed, and workflow intuition.",
                keywords=["ui", "ux", "interface", "dashboard", "navigation", "intuitive", "easy", "complex", "clunky", "onboarding"],
                color="#38bdf8"
            ),
            AspectCategoryRule(
                category_id="reliability_uptime",
                name="Reliability & Speed",
                description="System uptime, sync latency, server errors, and stability.",
                keywords=["uptime", "downtime", "sync", "speed", "latency", "bug", "crash", "error", "stable", "reliable"],
                color="#10b981"
            ),
            AspectCategoryRule(
                category_id="pricing_value",
                name="Pricing & Subscription",
                description="Subscription tiers, enterprise licensing, and cost ROI.",
                keywords=["price", "cost", "pricing", "subscription", "plan", "expensive", "cheap", "value", "tier", "billing"],
                color="#f59e0b"
            ),
            AspectCategoryRule(
                category_id="customer_support",
                name="Customer Support",
                description="Response times, agent helpfulness, and technical resolution.",
                keywords=["support", "help", "agent", "ticket", "response", "hotline", "chat", "resolution", "representative"],
                color="#c084fc"
            )
        ]
    )
}

def map_aspects_to_ontology(
    text: str,
    domain_id: str,
    analysis_fn: Callable[[str], Any],
    custom_categories: list[AspectCategoryRule] | None = None
) -> TaxonomyTestResult:
    """
    Extracts aspects via dependency parsing and maps them against category keyword rules.
    """
    ontology = BUILTIN_ONTOLOGIES.get(domain_id)
    categories = custom_categories if custom_categories else (ontology.categories if ontology else [])

    res = analysis_fn(text)
    data = res.model_dump() if hasattr(res, "model_dump") else res

    matches: list[TaxonomyMatch] = []
    unmapped: list[str] = []

    for asp in data.get("aspects", []):
        term = asp.get("term", "").lower()
        matched = False

        for cat in categories:
            for kw in cat.keywords:
                if kw in term or term in kw:
                    matches.append(TaxonomyMatch(
                        extracted_aspect=asp.get("term", "").title(),
                        matched_category=cat.name,
                        category_color=cat.color,
                        confidence=95 if kw == term else 82,
                        matched_by_keyword=kw
                    ))
                    matched = True
                    break
            if matched:
                break

        if not matched:
            unmapped.append(asp.get("term", "").title())

    return TaxonomyTestResult(
        text=text,
        domain_id=domain_id,
        matches=matches,
        unmapped_aspects=unmapped
    )
