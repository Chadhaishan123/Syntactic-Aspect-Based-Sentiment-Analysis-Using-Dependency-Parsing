import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  FileText,
  Activity,
  Sparkles,
  Zap,
  TrendingUp,
  ChevronRight,
  GitCommit,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  ArrowUpRight,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { motion } from 'framer-motion';
import { useRealtime } from '../context/RealtimeContext';

export default function Overview() {
  const { stats, analyses, latency, connected, sources } = useRealtime();

  // Trend of the most recent 20 analyses (oldest → newest), real data only.
  const chartData = analyses
    .slice(0, 20)
    .reverse()
    .map((item) => ({
      name: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      score: item.sentiment_score,
    }));

  const topAspects = stats.topAspects;
  const maxCount = Math.max(...topAspects.map((a) => a.count), 1);
  const healthySources = sources.filter((s) => s.last_success_at && !s.last_error).length;

  return (
    <div className="page-content">
      {/* Hero Banner */}
      <motion.section
        className="hero-banner"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="hero-info">
          <div className="hero-pill">
            <span className="live-indicator-dot" />
            <span>
              Live ingestion · {healthySources}/{sources.length || 2} sources healthy · Hacker News + Mastodon
            </span>
          </div>
          <h2 className="hero-headline">
            Syntactic Aspect Sentiment <br />
            <em>Powered by Dependency Trees</em>
          </h2>
          <p className="hero-description">
            Resolve compound clauses, inverted negations, and complex modifiers with zero
            black-box ambiguity. Trace opinions to targets along explainable syntactic paths.
          </p>
          <div className="hero-ctas">
            <NavLink to="/analyze" className="btn-primary">
              Open Syntactic Studio <ChevronRight size={16} />
            </NavLink>
            <NavLink to="/live" className="btn-secondary">
              View Live Stream <Activity size={16} />
            </NavLink>
          </div>
        </div>

        {/* Hero Interactive Graphic */}
        <div className="hero-visual">
          <div className="orbit-ring orbit-ring-1" />
          <div className="orbit-ring orbit-ring-2" />
          <div className="floating-syntactic-card">
            <div className="fsc-header">
              <Sparkles size={16} className="text-purple" />
              <span>Worked example</span>
            </div>
            <div className="fsc-formula">
              <span className="fsc-aspect">[battery life]</span>
              <span className="fsc-arc">←(nsubj)─ is ─(acomp)→</span>
              <span className="fsc-opinion">[awful]</span>
            </div>
            <div className="fsc-badge badge-negative">
              <span>Polarity: Negative</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Real-time KPI Stats Row */}
      <section className="kpi-grid">
        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
        >
          <div className="kpi-icon-wrap bg-purple-glow">
            <FileText size={20} className="text-purple" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">TOTAL TEXTS ANALYZED</span>
            <h3 className="kpi-value">{stats.totalAnalyzed}</h3>
            <span className="kpi-subtext text-emerald">
              {stats.liveCount} from live public posts
            </span>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="kpi-icon-wrap bg-emerald-glow">
            <Activity size={20} className="text-emerald" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">AVERAGE SENTIMENT INDEX</span>
            <h3 className="kpi-value">
              {stats.avgSentiment ?? '—'}
              {stats.avgSentiment !== null && <small>/100</small>}
            </h3>
            <span className="kpi-subtext">
              {stats.positiveAspects} pos · {stats.negativeAspects} neg
            </span>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="kpi-icon-wrap bg-cyan-glow">
            <GitCommit size={20} className="text-cyan" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">ASPECT TARGETS RESOLVED</span>
            <h3 className="kpi-value">{stats.aspectsExtracted}</h3>
            <span className="kpi-subtext text-cyan">Compound noun extraction</span>
          </div>
        </motion.div>

        <motion.div
          className="kpi-card"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="kpi-icon-wrap bg-amber-glow">
            <Zap size={20} className="text-amber" />
          </div>
          <div className="kpi-content">
            <span className="kpi-label">AVG PARSE TIME (SERVER)</span>
            <h3 className="kpi-value">
              {stats.avgParseMs ?? '—'}
              {stats.avgParseMs !== null && <small>ms</small>}
            </h3>
            <span className="kpi-subtext text-slate">
              WebSocket round-trip: {latency !== null ? `${latency}ms` : '—'}
            </span>
          </div>
        </motion.div>
      </section>

      {/* Main Charts & Matrix Section */}
      <section className="two-column-grid">
        {/* Real-time Momentum Chart */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">REAL-TIME TELEMETRY</span>
              <h3 className="panel-title">Sentiment Velocity Stream</h3>
            </div>
            <span className="panel-badge">Live Trajectory</span>
          </div>
          <div className="chart-container">
            {chartData.length < 2 ? (
              <div className="empty-aspects-box">
                <p>Waiting for live posts… the chart fills as analyses arrive.</p>
              </div>
            ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentimentGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#7c6cff" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#7c6cff" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                <YAxis domain={[0, 100]} stroke="#475569" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#151824',
                    border: '1px solid #232738',
                    borderRadius: '8px',
                    color: '#f1f5f9',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  stroke="#7c6cff"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#sentimentGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Aspect Frequency Snapshot */}
        <div className="panel-card">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">SYNTACTIC AGGREGATION</span>
              <h3 className="panel-title">Dominant Aspect Mentions</h3>
            </div>
            <NavLink to="/insights" className="panel-link">
              View Matrix <ArrowUpRight size={14} />
            </NavLink>
          </div>
          <div className="aspect-bars-list">
            {topAspects.length === 0 && (
              <div className="empty-aspects-box">
                <p>No aspects extracted yet.</p>
              </div>
            )}
            {topAspects.map((asp, idx) => {
              const pct = Math.round((asp.count / maxCount) * 100);
              const colors = ['#7c6cff', '#38bdf8', '#34d399', '#f59e0b', '#ec4899'];
              const col = colors[idx % colors.length];
              return (
                <div key={asp.name} className="aspect-bar-row">
                  <div className="aspect-bar-info">
                    <span className="aspect-bar-name">{asp.name}</span>
                    <span className="aspect-bar-count">{asp.count} mentions ({pct}%)</span>
                  </div>
                  <div className="aspect-bar-track">
                    <div
                      className="aspect-bar-fill"
                      style={{ width: `${pct}%`, backgroundColor: col }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Real-time Incoming Review Stream Preview */}
      <section className="panel-card">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">INCOMING REAL-TIME SIGNALS</span>
            <h3 className="panel-title">Live Ingested Reviews</h3>
          </div>
          <NavLink to="/live" className="btn-secondary btn-sm">
            Open Full Stream <ChevronRight size={14} />
          </NavLink>
        </div>

        <div className="live-signals-feed">
          {analyses.slice(0, 5).map((item) => (
            <div key={item.id} className="signal-item">
              <div className="signal-channel-badge">{item.source[0]}</div>
              <div className="signal-content">
                <div className="signal-meta">
                  <span className="signal-source">{item.source}</span>
                  <span className="signal-time">
                    <Clock size={11} /> {new Date(item.created_at).toLocaleTimeString()}
                  </span>
                </div>
                <p className="signal-text">{item.text}</p>
                <div className="signal-aspects">
                  {item.aspects.map((asp) => (
                    <span
                      key={asp.id || asp.term}
                      className={`aspect-tag-pill ${
                        asp.sentiment === 'positive'
                          ? 'tag-pos'
                          : asp.sentiment === 'negative'
                          ? 'tag-neg'
                          : 'tag-neu'
                      }`}
                    >
                      {asp.term} → {asp.opinion} ({asp.sentiment})
                    </span>
                  ))}
                </div>
              </div>
              <div className="signal-score-badge">
                <span
                  className={`score-num ${
                    item.sentiment_score >= 65
                      ? 'score-pos'
                      : item.sentiment_score <= 45
                      ? 'score-neg'
                      : 'score-neu'
                  }`}
                >
                  {item.sentiment_score}
                </span>
                <small>/100</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
