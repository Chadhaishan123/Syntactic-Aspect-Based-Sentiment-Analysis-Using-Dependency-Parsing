import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  PieChart,
  Layers,
  Sparkles,
  Award,
  AlertOctagon,
  RefreshCw,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
} from 'recharts';
import { motion } from 'framer-motion';
import { useRealtime } from '../context/RealtimeContext';
import { API_BASE } from '../apiConfig';

export default function Insights() {
  const { stats, analyses } = useRealtime();
  const [insightData, setInsightData] = useState(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/insights`);
      if (res.ok) {
        const data = await res.json();
        setInsightData(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [analyses.length]);

  const radarData = insightData?.radar_data || [];

  const topAspectsData = (insightData?.top_aspects || []).slice(0, 8).map((a, i) => ({
    name: a.name,
    mentions: a.mentions,
    color: ['#7c6cff', '#38bdf8', '#34d399', '#f59e0b', '#ec4899', '#8b5cf6'][i % 6],
  }));

  const allAspects = analyses.flatMap((a) => a.aspects || []);
  const positiveOpinions = allAspects
    .filter((a) => a.sentiment === 'positive')
    .map((a) => a.opinion);
  const negativeOpinions = allAspects
    .filter((a) => a.sentiment === 'negative')
    .map((a) => a.opinion);

  return (
    <div className="page-content">
      {/* Metrics Row */}
      <section className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-label">TOTAL EXTRACTED ASPECTS</span>
          <h3 className="kpi-value">{insightData?.aspects_identified || stats.aspectsExtracted}</h3>
          <span className="kpi-subtext text-purple">Universal Dependency entities</span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">POSITIVE SENTIMENT SHARE</span>
          <h3 className="kpi-value text-emerald">
            {insightData?.polarity_breakdown?.positive_pct ?? 0}%
          </h3>
          <span className="kpi-subtext">
            {insightData?.polarity_breakdown?.positive || stats.positiveAspects} positive attributes
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">CRITICAL VULNERABILITIES</span>
          <h3 className="kpi-value text-ruby">
            {insightData?.polarity_breakdown?.negative_pct ?? 0}%
          </h3>
          <span className="kpi-subtext text-ruby">
            {insightData?.polarity_breakdown?.negative || stats.negativeAspects} negative issues
          </span>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">MEAN PARSE SPEED</span>
          <h3 className="kpi-value text-cyan">
            {insightData?.average_latency_ms ?? '—'}<small>ms</small>
          </h3>
          <span className="kpi-subtext text-slate">Server-side spaCy parse time per text</span>
        </div>
      </section>

      {/* Visual Analytics Grid */}
      <div className="two-column-grid mt-6">
        {/* Radar Profile */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">MULTIDIMENSIONAL BENCHMARK</span>
              <h3 className="panel-title">Top Aspects: Positive Share</h3>
            </div>
            <span className="panel-badge">% of mentions that are positive</span>
          </div>

          <div className="radar-container" style={{ height: 280 }}>
            {radarData.length < 3 ? (
              <div className="empty-aspects-box">
                <p>Needs at least 3 distinct aspects — currently {radarData.length}.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData}>
                <PolarGrid stroke="#2a3045" />
                <PolarAngleAxis dataKey="category" stroke="#94a3b8" fontSize={12} />
                <PolarRadiusAxis domain={[0, 100]} stroke="#475569" fontSize={10} />
                <Radar
                  name="Sentiment Satisfaction"
                  dataKey="score"
                  stroke="#7c6cff"
                  fill="#7c6cff"
                  fillOpacity={0.4}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151824',
                    border: '1px solid #232738',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
              </RadarChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Top Aspect Frequency Bar Chart */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">ASPECT VOLUME DISTRIBUTION</span>
              <h3 className="panel-title">Top Mentioned Components</h3>
            </div>
          </div>

          <div className="chart-container" style={{ height: 280 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={topAspectsData}
                margin={{ top: 10, right: 10, left: -20, bottom: 25 }}
              >
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-25} textAnchor="end" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151824',
                    border: '1px solid #232738',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                  }}
                />
                <Bar dataKey="mentions" radius={[6, 6, 0, 0]}>
                  {topAspectsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Opinion Lexicon Clusters */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">SYNTACTIC OPINION MODIFIERS</span>
            <h3 className="panel-title">Syntactically Bound Lexicons</h3>
          </div>
        </div>

        <div className="two-column-grid">
          {/* Positive Modifiers */}
          <div className="modifier-cluster-box bg-emerald-tint">
            <span className="cluster-title text-emerald">
              ★ Positive Modifiers (amod / acomp / advmod)
            </span>
            <div className="opinion-chips-cloud">
              {Array.from(new Set(positiveOpinions)).slice(0, 16).map((op, i) => (
                <span key={i} className="opinion-chip chip-pos">
                  {op}
                </span>
              ))}
              {positiveOpinions.length === 0 && (
                <span className="text-slate">No positive modifiers detected yet.</span>
              )}
            </div>
          </div>

          {/* Negative Modifiers */}
          <div className="modifier-cluster-box bg-ruby-tint">
            <span className="cluster-title text-ruby">
              ⚠️ Negative Modifiers & Inversions
            </span>
            <div className="opinion-chips-cloud">
              {Array.from(new Set(negativeOpinions)).slice(0, 16).map((op, i) => (
                <span key={i} className="opinion-chip chip-neg">
                  {op}
                </span>
              ))}
              {negativeOpinions.length === 0 && (
                <span className="text-slate">No negative modifiers detected yet.</span>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
