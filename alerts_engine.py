"""Alerts Engine — Emerging Complaint Detector & Aspect-Specific Smart Alerts for SyntaxSense.

Provides real-time anomaly detection and aspect sentiment monitoring:
- Aspect-Specific Negative Spikes: Alerts when a specific aspect (e.g. Battery, Cooling Fan)
  experiences a sharp rise in negative sentiment.
- Emerging Complaint Detector: Uncovers nascent complaint topics that begin appearing frequently,
  even if historically infrequent.
- Active alert queue with severity levels (CRITICAL, WARNING, INFO).
"""
from __future__ import annotations

import time
from collections import defaultdict, deque
from typing import Any, Literal
from uuid import uuid4
from pydantic import BaseModel, Field


class SmartAlert(BaseModel):
    id: str = Field(default_factory=lambda: f"alt-{uuid4().hex[:8]}")
    aspect: str
    alert_type: Literal["spike", "emerging_complaint", "polarization"]
    severity: Literal["critical", "warning", "info"]
    title: str
    message: str
    metric_label: str
    change_pct: str
    sample_snippets: list[str] = Field(default_factory=list)
    created_at: float = Field(default_factory=time.time)
    acknowledged: bool = False


class AspectStats:
    def __init__(self, name: str):
        self.name = name
        self.historical_pos = 0
        self.historical_neg = 0
        self.historical_neu = 0
        # Rolling recent window of sentiments (1 for pos, -1 for neg, 0 for neu)
        self.recent_sentiments = deque(maxlen=20)
        self.recent_snippets = deque(maxlen=6)

    @property
    def total_historical(self) -> int:
        return self.historical_pos + self.historical_neg + self.historical_neu

    @property
    def historical_neg_rate(self) -> float:
        total = self.total_historical
        return (self.historical_neg / total) if total > 0 else 0.0

    @property
    def recent_neg_rate(self) -> float:
        if not self.recent_sentiments:
            return 0.0
        neg_count = sum(1 for s in self.recent_sentiments if s == -1)
        return neg_count / len(self.recent_sentiments)

    def record(self, sentiment: str, snippet: str):
        if sentiment == "positive":
            self.historical_pos += 1
            self.recent_sentiments.append(1)
        elif sentiment == "negative":
            self.historical_neg += 1
            self.recent_sentiments.append(-1)
            self.recent_snippets.append(snippet)
        else:
            self.historical_neu += 1
            self.recent_sentiments.append(0)


class AlertMonitor:
    def __init__(self):
        self.aspects: dict[str, AspectStats] = defaultdict(lambda: AspectStats("general"))
        self.active_alerts: list[SmartAlert] = []
        self.last_alert_time: dict[str, float] = {}
        # Prepopulate with initial monitoring baselines so system is instantly alive and responsive
        self._initialize_baselines()

    def _initialize_baselines(self):
        # Initial laptop & electronics aspects
        initial_seeds = {
            "battery": [("positive", 12), ("negative", 4), ("neutral", 2)],
            "screen": [("positive", 18), ("negative", 2), ("neutral", 1)],
            "camera": [("positive", 15), ("negative", 3), ("neutral", 2)],
            "keyboard": [("positive", 14), ("negative", 3), ("neutral", 2)],
            "cooling fan": [("positive", 5), ("negative", 3), ("neutral", 1)],
            "price": [("positive", 8), ("negative", 5), ("neutral", 2)],
        }
        for asp_name, counts in initial_seeds.items():
            stat = AspectStats(asp_name)
            for sentiment, count in counts:
                for _ in range(count):
                    stat.record(sentiment, f"Seed sample discussing {asp_name}")
            self.aspects[asp_name] = stat

    def process_analysis(self, text: str, aspects: list[dict[str, Any]]) -> list[SmartAlert]:
        """Ingests an analysis record, updates aspect rolling counters, and fires any triggered smart alerts."""
        newly_fired: list[SmartAlert] = []
        now = time.time()

        for asp in aspects:
            term = asp.get("term", "").strip()
            if not term:
                continue
            key = term.lower()
            if key not in self.aspects:
                self.aspects[key] = AspectStats(term)

            stats = self.aspects[key]
            pol = asp.get("sentiment", "neutral")
            stats.record(pol, text)

            # Check if this aspect had an alert fired very recently (< 60 seconds debounce)
            last_alert = self.last_alert_time.get(key, 0)
            if now - last_alert < 45:
                continue

            # 1. Aspect-Specific Negative Spike Detection
            if len(stats.recent_sentiments) >= 4:
                rec_neg = stats.recent_neg_rate
                hist_neg = stats.historical_neg_rate
                # If recent negative rate is high (>= 50%) and represents a spike (>= +20% jump over baseline)
                if rec_neg >= 0.50 and (rec_neg - hist_neg >= 0.20 or stats.total_historical < 10):
                    severity = "critical" if rec_neg >= 0.70 else "warning"
                    spike_pct = round((rec_neg - hist_neg) * 100)
                    alert = SmartAlert(
                        aspect=stats.name.title(),
                        alert_type="spike",
                        severity=severity,
                        title=f"⚠️ Negative Sentiment Surge: {stats.name.title()}",
                        message=f"Negative sentiment for '{stats.name.title()}' reached {round(rec_neg * 100)}% in recent reviews ({spike_pct:+}% spike relative to baseline).",
                        metric_label=f"{round(rec_neg * 100)}% Negativity",
                        change_pct=f"{spike_pct:+}%",
                        sample_snippets=list(stats.recent_snippets)[-3:],
                    )
                    self.active_alerts.insert(0, alert)
                    self.last_alert_time[key] = now
                    newly_fired.append(alert)
                    continue

            # 2. Emerging Complaint Topic Detector
            # For low-frequency terms that suddenly appear with multiple negative hits
            if pol == "negative" and stats.total_historical <= 8:
                neg_hits = sum(1 for s in stats.recent_sentiments if s == -1)
                if neg_hits >= 2:
                    alert = SmartAlert(
                        aspect=stats.name.title(),
                        alert_type="emerging_complaint",
                        severity="warning",
                        title=f"🚨 Emerging Complaint: {stats.name.title()}",
                        message=f"New friction topic '{stats.name.title()}' appeared with {neg_hits} negative reports in recent stream items.",
                        metric_label=f"{neg_hits} Negative Mentions",
                        change_pct="New Spike",
                        sample_snippets=list(stats.recent_snippets)[-2:],
                    )
                    self.active_alerts.insert(0, alert)
                    self.last_alert_time[key] = now
                    newly_fired.append(alert)

        # Cap active alerts list
        if len(self.active_alerts) > 40:
            self.active_alerts = self.active_alerts[:40]

        return newly_fired

    def get_active_alerts(self) -> list[SmartAlert]:
        return self.active_alerts

    def acknowledge_alert(self, alert_id: str) -> bool:
        for a in self.active_alerts:
            if a.id == alert_id:
                a.acknowledged = True
                return True
        return False

    def clear_alerts(self):
        self.active_alerts = []


# Global singleton instance
monitor = AlertMonitor()
