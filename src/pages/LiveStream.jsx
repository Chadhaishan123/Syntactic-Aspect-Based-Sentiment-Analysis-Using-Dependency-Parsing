import React, { useState } from 'react';
import {
  Activity,
  Play,
  Pause,
  Plus,
  Radio,
  Clock,
  Sparkles,
  Send,
  Zap,
  Filter,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  Globe,
  Database,
  Search,
  X,
  HelpCircle,
  Bell,
  ShieldAlert,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRealtime } from '../context/RealtimeContext';
import WhyPredictionModal from '../components/WhyPredictionModal';

const COMMON_ASPECT_FILTERS = [
  'All',
  'Battery',
  'Camera',
  'Display',
  'Performance',
  'Keyboard',
  'Price',
  'Service',
  'Audio',
];

export default function LiveStream() {
  const {
    analyses,
    alerts = [],
    streamingActive,
    toggleStreaming,
    injectReview,
    connected,
    sources,
    pollInterval,
  } = useRealtime();

  const [reviewInput, setReviewInput] = useState('');
  const [channelInput, setChannelInput] = useState('Manual Ingestion');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAspect, setSelectedAspect] = useState('All');
  const [filterSentiment, setFilterSentiment] = useState('all');
  const [filterOrigin, setFilterOrigin] = useState('all');
  const [confidenceFilter, setConfidenceFilter] = useState('all'); // 'all', 'high', 'uncertain'
  const [isInjecting, setIsInjecting] = useState(false);
  const [whyModalData, setWhyModalData] = useState(null); // { aspect, text, tokens, arcs }

  const handleInject = async (e) => {
    e.preventDefault();
    if (!reviewInput.trim()) return;
    setIsInjecting(true);
    try {
      await injectReview(reviewInput.trim(), channelInput);
      setReviewInput('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsInjecting(false);
    }
  };

  // Filter analyses by sentiment, origin, search query, aspect term, and confidence
  const filteredAnalyses = analyses.filter((item) => {
    // Sentiment filter
    if (filterSentiment === 'positive' && item.sentiment_score < 60) return false;
    if (filterSentiment === 'negative' && item.sentiment_score > 45) return false;
    if (filterSentiment === 'neutral' && (item.sentiment_score < 45 || item.sentiment_score > 60)) return false;

    // Origin filter
    if (filterOrigin === 'live' && item.origin !== 'live') return false;
    if (filterOrigin === 'manual' && item.origin !== 'manual') return false;

    // Search query filter (matches text, author, channel, or aspect term)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const textMatch = item.text.toLowerCase().includes(q);
      const authorMatch = item.author?.toLowerCase().includes(q);
      const channelMatch = item.channel?.toLowerCase().includes(q);
      const aspectMatch = item.aspects?.some(
        (a) => a.term.toLowerCase().includes(q) || a.opinion.toLowerCase().includes(q)
      );
      if (!textMatch && !authorMatch && !channelMatch && !aspectMatch) return false;
    }

    // Aspect category filter
    if (selectedAspect !== 'All') {
      const aspTarget = selectedAspect.toLowerCase();
      const hasAspect = item.aspects?.some((a) => a.term.toLowerCase().includes(aspTarget));
      if (!hasAspect) return false;
    }

    // Confidence filter
    if (confidenceFilter === 'high') {
      const hasHigh = item.aspects?.some((a) => a.confidence >= 75);
      if (!hasHigh) return false;
    } else if (confidenceFilter === 'uncertain') {
      const hasUncertain = item.aspects?.some((a) => a.confidence < 70);
      if (!hasUncertain) return false;
    }

    return true;
  });

  const posCount = analyses.filter((a) => a.sentiment_score >= 60).length;
  const negCount = analyses.filter((a) => a.sentiment_score <= 45).length;
  const neuCount = analyses.length - posCount - negCount;
  const posRatio = analyses.length ? Math.round((posCount / analyses.length) * 100) : null;
  const liveCount = analyses.filter((a) => a.origin === 'live').length;

  return (
    <div className="page-content">
      {/* Aspect-Specific Smart Alerts Banner */}
      {alerts && alerts.length > 0 && (
        <div className="live-smart-alerts-banner">
          <div className="banner-left">
            <span className="banner-badge">
              <ShieldAlert size={14} className="pulse-fast" /> SMART SENTIMENT ALERTS
            </span>
            <div className="banner-alert-ticker">
              <strong>{alerts[0].title}:</strong> {alerts[0].message}
            </div>
          </div>
          <div className="banner-actions">
            <button
              className="btn-filter-alert"
              onClick={() => {
                setSelectedAspect(alerts[0].aspect);
                setFilterSentiment('negative');
              }}
              title={`Filter stream to reviews discussing ${alerts[0].aspect}`}
            >
              Isolate {alerts[0].aspect} ({alerts[0].metric_label})
            </button>
          </div>
        </div>
      )}

      {/* Live Stream Control Bar */}
      <div className="live-control-deck">
        <div className="live-deck-left">
          <div className="live-status-pill">
            <Radio size={14} className={connected ? 'pulse-fast text-emerald' : 'text-slate'} />
            <span>{connected ? 'WebSocket Stream Active' : 'Connecting to Stream...'}</span>
          </div>
          <span className="live-stream-counter">
            {analyses.length} Buffered ({liveCount} Live Public Posts)
          </span>
        </div>

        <div className="live-deck-actions">
          {/* Origin filter */}
          <div className="filter-pill-group">
            <button
              className={`filter-btn ${filterOrigin === 'all' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterOrigin('all')}
            >
              All Sources
            </button>
            <button
              className={`filter-btn ${filterOrigin === 'live' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterOrigin('live')}
            >
              Live Only ({liveCount})
            </button>
          </div>

          {/* Sentiment Filter Pills */}
          <div className="filter-pill-group">
            <button
              className={`filter-btn ${filterSentiment === 'all' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('all')}
            >
              All
            </button>
            <button
              className={`filter-btn ${filterSentiment === 'positive' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('positive')}
            >
              Pos ({posCount})
            </button>
            <button
              className={`filter-btn ${filterSentiment === 'negative' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('negative')}
            >
              Neg ({negCount})
            </button>
          </div>

          {/* Toggle Ingestion */}
          <button
            className={`btn-toggle-stream ${streamingActive ? 'active' : ''}`}
            onClick={() => toggleStreaming(!streamingActive)}
          >
            {streamingActive ? <Pause size={14} /> : <Play size={14} />}
            <span>{streamingActive ? 'Pause Ingestion' : 'Resume Ingestion'}</span>
          </button>
        </div>
      </div>

      {/* Real-Time Review Search & Aspect Quick-Filter Bar */}
      <div className="live-search-filter-bar">
        <div className="search-input-wrapper">
          <Search size={15} className="search-icon text-slate" />
          <input
            type="text"
            className="stream-search-input"
            placeholder="Real-time filter by product, keyword, author, or aspect..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search-btn" onClick={() => setSearchQuery('')}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Confidence Filter */}
        <div className="confidence-filter-dropdown">
          <select
            className="stream-select"
            value={confidenceFilter}
            onChange={(e) => setConfidenceFilter(e.target.value)}
          >
            <option value="all">All Confidence Levels</option>
            <option value="high">High Confidence Only (≥75%)</option>
            <option value="uncertain">Uncertain / Review (&lt;70%)</option>
          </select>
        </div>

        {/* Aspect Quick-Chips */}
        <div className="aspect-quick-chips">
          {COMMON_ASPECT_FILTERS.map((asp) => (
            <button
              key={asp}
              className={`aspect-quick-chip ${selectedAspect === asp ? 'chip-active' : ''}`}
              onClick={() => setSelectedAspect(asp)}
            >
              {asp}
            </button>
          ))}
        </div>
      </div>

      {/* Live Ingestion Sources Health Bar */}
      {sources && sources.length > 0 && (
        <div className="live-sources-health-strip">
          <div className="health-strip-title">
            <Globe size={15} className="text-cyan" />
            <span>Live Feed Sources (polling every {pollInterval || 30}s):</span>
          </div>
          <div className="source-health-cards">
            {sources.map((src) => (
              <div key={src.name} className="source-health-card">
                <div className="src-header">
                  <span className={`src-status-dot ${src.last_error ? 'dot-err' : 'dot-ok'}`} />
                  <b>{src.name}</b>
                  <span className="src-count">{src.sentences_ingested} parsed</span>
                </div>
                <div className="src-sub">
                  <span>Tags/Queries: {src.channels?.slice(0, 4).join(', ')}</span>
                  {src.last_error && <span className="src-err">{src.last_error}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="stream-layout-grid mt-4">
        {/* Left: Cascading Live Review Stream */}
        <div className="stream-feed-column">
          <div className="panel-card stream-feed-card">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">REAL-TIME INGESTION CASCADE</span>
                <h3 className="panel-title">Active Stream ({filteredAnalyses.length} displayed)</h3>
              </div>
              <span className="live-ping-badge">
                <span className="ping-dot" /> Live WebSockets
              </span>
            </div>

            <div className="stream-items-container">
              {filteredAnalyses.length === 0 ? (
                <div className="empty-aspects-box">
                  <Database size={28} className="text-slate" />
                  <p>No posts matching this filter. Waiting for live ingestion…</p>
                </div>
              ) : (
                <AnimatePresence initial={false}>
                  {filteredAnalyses.map((item) => (
                    <motion.div
                      key={item.id}
                      className="stream-card-item"
                      initial={{ opacity: 0, y: -15, scale: 0.99 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="stream-card-header">
                        <div className="stream-origin">
                          <span className="origin-icon">{item.source[0]}</span>
                          <b>{item.source}</b>
                          {item.channel && (
                            <span className="origin-channel-tag">{item.channel}</span>
                          )}
                          {item.origin === 'live' && (
                            <span className="origin-live-tag">LIVE FEED</span>
                          )}
                          <span className="stream-timestamp">
                            <Clock size={11} /> {new Date(item.created_at).toLocaleTimeString()}
                          </span>
                        </div>

                        <div className="stream-score-tag">
                          <span
                            className={`score-badge ${
                              item.sentiment_score >= 60
                                ? 'score-pos'
                                : item.sentiment_score <= 45
                                ? 'score-neg'
                                : 'score-neu'
                            }`}
                          >
                            Score: {item.sentiment_score}
                          </span>
                        </div>
                      </div>

                      <p className="stream-card-text">{item.text}</p>

                      <div className="stream-card-footer">
                        {item.aspects && item.aspects.length > 0 && (
                          <div className="stream-card-aspects">
                            {item.aspects.map((asp) => (
                              <button
                                key={asp.id || asp.term}
                                className={`stream-aspect-pill ${
                                  asp.sentiment === 'positive'
                                    ? 'asp-pos'
                                    : asp.sentiment === 'negative'
                                    ? 'asp-neg'
                                    : 'asp-neu'
                                }`}
                                onClick={() =>
                                  setWhyModalData({
                                    aspect: asp,
                                    text: item.text,
                                    tokens: item.tokens || [],
                                    arcs: item.arcs || [],
                                  })
                                }
                                title="Click to audit: Why This Prediction?"
                              >
                                <strong>{asp.term}</strong> ↔ <em>{asp.opinion}</em> ({asp.sentiment})
                                <HelpCircle size={11} className="pill-why-icon" />
                              </button>
                            ))}
                          </div>
                        )}

                        {item.url && (
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="stream-post-link"
                            title="Open original public post"
                          >
                            <span>Original post</span>
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </div>
        </div>

        {/* Right: Live Diagnostics & Real-Time Review Injector */}
        <div className="stream-sidebar-column">
          {/* Live Speedometer / Ratio Card */}
          <div className="panel-card stream-ratio-card">
            <span className="panel-pre-title">STREAM POLARITY BALANCE</span>
            <h3 className="panel-title">Real-Time Mood Gauge</h3>

            <div className="ratio-gauge-display">
              <div className="gauge-score-large">
                {posRatio !== null ? `${posRatio}%` : '—'}
              </div>
              <span className="gauge-label">Positive Sentiment Ratio</span>
            </div>

            <div className="ratio-stacked-bar">
              <div
                className="bar-pos"
                style={{ width: `${(posCount / (analyses.length || 1)) * 100}%` }}
                title={`Positive: ${posCount}`}
              />
              <div
                className="bar-neu"
                style={{ width: `${(neuCount / (analyses.length || 1)) * 100}%` }}
                title={`Neutral: ${neuCount}`}
              />
              <div
                className="bar-neg"
                style={{ width: `${(negCount / (analyses.length || 1)) * 100}%` }}
                title={`Negative: ${negCount}`}
              />
            </div>

            <div className="ratio-legend">
              <span>● Positive: {posCount}</span>
              <span>● Neutral: {neuCount}</span>
              <span>● Negative: {negCount}</span>
            </div>
          </div>

          {/* Real-time Review Injector */}
          <div className="panel-card stream-injector-card">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">INTERACTIVE TEST BED</span>
                <h3 className="panel-title">Inject Simulated Review</h3>
              </div>
              <Sparkles size={16} className="text-purple" />
            </div>

            <form onSubmit={handleInject} className="injector-form">
              <div className="form-group">
                <label>Target Review Sentence</label>
                <textarea
                  rows={3}
                  className="injector-textarea"
                  placeholder="e.g., The battery life drains in 3 hours, but the camera is extraordinary."
                  value={reviewInput}
                  onChange={(e) => setReviewInput(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Feed Source</label>
                <input
                  type="text"
                  className="injector-input"
                  value={channelInput}
                  onChange={(e) => setChannelInput(e.target.value)}
                />
              </div>

              <button
                type="submit"
                className="btn-primary w-full"
                disabled={isInjecting || !reviewInput.trim()}
              >
                <Send size={14} />
                <span>{isInjecting ? 'Broadcasting...' : 'Inject into Live WebSocket Stream'}</span>
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* Why This Prediction Explainability Modal */}
      {whyModalData && (
        <WhyPredictionModal
          aspect={whyModalData.aspect}
          text={whyModalData.text}
          tokens={whyModalData.tokens}
          arcs={whyModalData.arcs}
          onClose={() => setWhyModalData(null)}
        />
      )}
    </div>
  );
}
