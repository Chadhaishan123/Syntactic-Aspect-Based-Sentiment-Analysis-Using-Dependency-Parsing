import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Flame,
  ThumbsUp,
  ThumbsDown,
  AlertOctagon,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  Filter,
  Search,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Utensils,
  Smartphone,
  Layers,
  ArrowRight,
  Zap,
  Sparkles,
  FileSpreadsheet
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function ReviewMining() {
  const navigate = useNavigate();

  // Dataset states
  const [datasets, setDatasets] = useState([]);
  const [selectedDatasetId, setSelectedDatasetId] = useState('amazon_laptops');
  const [reviewsPool, setReviewsPool] = useState([]);
  const [datasetTitle, setDatasetTitle] = useState('Amazon Electronics (MacBook & Pro Laptops)');

  // Real-time streaming states
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamIndex, setStreamIndex] = useState(0);
  const [streamSpeed, setStreamSpeed] = useState(120); // ms per review
  const streamIntervalRef = useRef(null);

  // Analysis result state
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);

  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAspectFilter, setActiveAspectFilter] = useState(null);
  const [activeSeverityFilter, setActiveSeverityFilter] = useState('all'); // 'all', 'love', 'hate', 'dealbreaker'

  // Load available pre-loaded datasets on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/mining/datasets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.datasets && data.datasets.length > 0) {
          setDatasets(data.datasets);
          loadDataset(data.datasets[0].id);
        }
      })
      .catch((err) => console.warn('Failed to load datasets:', err));
  }, []);

  const loadDataset = async (datasetId) => {
    stopStream();
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mining/dataset/${datasetId}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedDatasetId(datasetId);
        setDatasetTitle(data.name);
        setReviewsPool(data.reviews);
        setStreamIndex(0);
        setActiveAspectFilter(null);
        // Process initial batch immediately
        processBatch(data.name, data.reviews);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const processBatch = async (title, reviewsToProcess) => {
    if (!reviewsToProcess || reviewsToProcess.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/mining/analyze-batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dataset_name: title,
          reviews: reviewsToProcess
        })
      });
      if (res.ok) {
        const resultData = await res.json();
        setAnalytics(resultData);
        setStreamIndex(reviewsToProcess.length);
      }
    } catch (err) {
      console.error('Batch analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Real-time stream step controller
  const startStream = () => {
    if (streamIndex >= reviewsPool.length) {
      setStreamIndex(0);
    }
    setIsStreaming(true);
  };

  const stopStream = () => {
    setIsStreaming(false);
    if (streamIntervalRef.current) {
      clearInterval(streamIntervalRef.current);
    }
  };

  // Handle stream progression
  useEffect(() => {
    if (!isStreaming) {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
      return;
    }

    streamIntervalRef.current = setInterval(() => {
      setStreamIndex((prev) => {
        const next = prev + 1;
        if (next > reviewsPool.length) {
          stopStream();
          return prev;
        }
        // Live re-process up to current index
        const currentSlice = reviewsPool.slice(0, next);
        fetch(`${API_BASE}/api/mining/analyze-batch`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dataset_name: datasetTitle,
            reviews: currentSlice
          })
        })
          .then((r) => r.json())
          .then((data) => setAnalytics(data))
          .catch(() => {});

        return next;
      });
    }, streamSpeed);

    return () => {
      if (streamIntervalRef.current) clearInterval(streamIntervalRef.current);
    };
  }, [isStreaming, reviewsPool, datasetTitle, streamSpeed]);

  // Handle custom CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target.result;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) return;

      // Extract review text from CSV
      const parsedReviews = [];
      const header = lines[0].split(',').map((h) => h.replace(/["']/g, '').trim().toLowerCase());
      
      let textColIndex = header.findIndex((h) =>
        ['review', 'reviews', 'text', 'body', 'comment', 'feedback', 'statement'].some((k) => h.includes(k))
      );
      if (textColIndex === -1) textColIndex = 0;

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split(',');
        if (parts[textColIndex]) {
          parsedReviews.push(parts[textColIndex].replace(/^["']|["']$/g, '').trim());
        }
      }

      const finalReviews = parsedReviews.length > 0 ? parsedReviews : lines.slice(1);
      setSelectedDatasetId('custom_upload');
      setDatasetTitle(file.name);
      setReviewsPool(finalReviews);
      setStreamIndex(0);
      processBatch(file.name, finalReviews);
    };
    reader.readAsText(file);
  };

  // Export Enriched CSV
  const handleExportEnrichedCSV = () => {
    if (!analytics || !analytics.records) return;
    const headers = [
      'ID',
      'Customer_Review_Text',
      'Sentiment_Score',
      'Dominant_Sentiment',
      'Extracted_Aspects',
      'Dominant_Opinions',
      'Is_Critical_Dealbreaker',
      'Syntactic_Evidence_Path'
    ];

    const rows = analytics.records.map((r) => [
      r.id,
      `"${r.text.replace(/"/g, '""')}"`,
      r.sentiment_score,
      `"${r.dominant_sentiment}"`,
      `"${r.aspects.join('; ')}"`,
      `"${r.opinions.join('; ')}"`,
      r.is_dealbreaker ? 'YES' : 'NO',
      `"${r.syntactic_evidence.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(',')).join('\n')];
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SyntaxSense_Enriched_${selectedDatasetId}_${Date.now()}.csv`);
    link.click();
  };

  // Filtered Review Records
  const filteredRecords = analytics
    ? analytics.records.filter((rec) => {
        const matchesSearch =
          rec.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
          rec.aspects.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase()));

        if (!matchesSearch) return false;

        if (activeAspectFilter) {
          if (!rec.aspects.some((a) => a.toLowerCase() === activeAspectFilter.toLowerCase())) {
            return false;
          }
        }

        if (activeSeverityFilter === 'dealbreaker') return rec.is_dealbreaker;
        if (activeSeverityFilter === 'love') return rec.sentiment_score >= 60;
        if (activeSeverityFilter === 'hate') return rec.sentiment_score <= 45;

        return true;
      })
    : [];

  const currentReviewSnippet = reviewsPool[streamIndex - 1] || reviewsPool[0] || '';

  return (
    <div className="page-content review-mining-page">
      {/* Hero Header */}
      <section className="compare-hero mining-hero">
        <div className="hero-pill">
          <Flame size={14} className="text-amber" />
          <span>REAL-TIME REVIEW INTELLIGENCE & PRODUCT MINING</span>
        </div>
        <h2 className="compare-title">
          Customer <em>Review Mining & Love/Hate Engine</em>
        </h2>
        <p className="compare-sub">
          Feed real customer review datasets into the Universal Dependency parsing pipeline. Automatically mine What Customers Love vs. What Customers Hate, flag critical product dealbreakers, and monitor real-time satisfaction velocity.
        </p>

        {/* Dataset Switcher & Ingestion Bar */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Real Review Corpora:</span>
          {datasets.map((d) => (
            <button
              key={d.id}
              className={`preset-btn ${selectedDatasetId === d.id ? 'active' : ''}`}
              onClick={() => loadDataset(d.id)}
            >
              {d.icon === 'Laptop' ? <Laptop size={14} /> : d.icon === 'Utensils' ? <Utensils size={14} /> : <Smartphone size={14} />}
              <span>{d.name} ({d.review_count})</span>
            </button>
          ))}

          {/* Upload Custom CSV */}
          <label className="preset-btn custom-upload-btn" title="Upload custom CSV review file">
            <Upload size={14} />
            <span>Upload Custom CSV</span>
            <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} style={{ display: 'none' }} />
          </label>
        </div>
      </section>

      {/* Real-time Streaming Ticker & Controls */}
      <section className="panel-card mt-6 stream-control-deck">
        <div className="stream-header-row">
          <div className="stream-status-info">
            <span className={`live-pulse-dot ${isStreaming ? 'pulse-active' : ''}`} />
            <div>
              <h4 className="stream-title">
                {isStreaming ? 'Streaming Live Review Feed...' : 'Real-Time Ingestion Engine'}
              </h4>
              <small className="stream-meta">
                Corpus: <strong>{datasetTitle}</strong> · Ingested {streamIndex} of {reviewsPool.length} reviews
              </small>
            </div>
          </div>

          <div className="stream-action-buttons">
            {isStreaming ? (
              <button className="btn-secondary btn-sm" onClick={stopStream}>
                <Pause size={14} /> Pause Stream
              </button>
            ) : (
              <button
                className="btn-primary btn-sm"
                onClick={startStream}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Play size={14} /> {streamIndex >= reviewsPool.length ? 'Replay Stream' : 'Start Live Ingestion'}
              </button>
            )}

            <button
              className="btn-secondary btn-sm"
              onClick={() => processBatch(datasetTitle, reviewsPool)}
              disabled={loading}
              title="Process entire dataset instantly"
            >
              <Zap size={14} /> Process All ({reviewsPool.length})
            </button>

            <button
              className="btn-secondary btn-sm"
              onClick={handleExportEnrichedCSV}
              disabled={!analytics}
              title="Export Enriched CSV with mined sentiment columns"
            >
              <Download size={14} /> Export Enriched CSV
            </button>
          </div>
        </div>

        {/* Live Progress Bar */}
        <div className="stream-progress-track mt-4">
          <div
            className="stream-progress-fill"
            style={{ width: `${(streamIndex / Math.max(1, reviewsPool.length)) * 100}%` }}
          />
        </div>

        {/* Active Streaming Review Ticker */}
        {currentReviewSnippet && (
          <div className="active-ticker-box mt-4">
            <span className="ticker-badge">LATEST REVIEW INGESTION:</span>
            <p className="ticker-text">“{currentReviewSnippet}”</p>
          </div>
        )}
      </section>

      {/* Real-Time Impact Counters */}
      {analytics && (
        <>
          <div className="mining-kpi-grid mt-6">
            <div className="mkpi-card mkpi-health">
              <span className="mkpi-label">Overall Customer Health</span>
              <div className="mkpi-val-row">
                <span className="mkpi-number">{analytics.overall_health_score}%</span>
                <span className={`mkpi-badge ${analytics.overall_health_score >= 60 ? 'badge-pos' : 'badge-neg'}`}>
                  {analytics.overall_health_score >= 60 ? 'FAVORABLE' : 'FRICTION'}
                </span>
              </div>
              <small>Across {analytics.total_reviews_processed} parsed reviews</small>
            </div>

            <div className="mkpi-card mkpi-love">
              <span className="mkpi-label text-emerald">What People Love</span>
              <div className="mkpi-val-row">
                <span className="mkpi-number text-emerald">{analytics.loved_aspects.length}</span>
                <ThumbsUp size={20} className="text-emerald" />
              </div>
              <small>Aspect dimensions with positive bias</small>
            </div>

            <div className="mkpi-card mkpi-hate">
              <span className="mkpi-label text-ruby">What People Hate</span>
              <div className="mkpi-val-row">
                <span className="mkpi-number text-ruby">{analytics.hated_aspects.length}</span>
                <ThumbsDown size={20} className="text-ruby" />
              </div>
              <small>Aspect dimensions with complaint bias</small>
            </div>

            <div className={`mkpi-card mkpi-dealbreaker ${analytics.dealbreakers.length > 0 ? 'card-alert-glow' : ''}`}>
              <span className="mkpi-label text-amber">Critical Dealbreakers</span>
              <div className="mkpi-val-row">
                <span className="mkpi-number text-amber">{analytics.dealbreakers.length}</span>
                <AlertOctagon size={20} className="text-amber" />
              </div>
              <small>Refund, defective, or crash risks</small>
            </div>
          </div>

          {/* Critical Dealbreaker Alert Feed (if any detected) */}
          {analytics.dealbreakers.length > 0 && (
            <section className="panel-card mt-6 dealbreaker-alert-banner">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <AlertOctagon size={18} className="text-ruby" />
                  <div>
                    <span className="panel-pre-title text-ruby">CHURN & DEFECT RISK DETECTED</span>
                    <h3 className="panel-title text-ruby">
                      {analytics.dealbreakers.length} Critical Product Dealbreakers Flagged
                    </h3>
                  </div>
                </div>
              </div>

              <div className="dealbreaker-cards-row mt-4">
                {analytics.dealbreakers.slice(0, 4).map((db, idx) => (
                  <div key={idx} className="dealbreaker-alert-card">
                    <div className="db-card-header">
                      <span className="db-severity-tag">{db.severity}</span>
                      <span className="db-review-id">Review #{db.review_index}</span>
                    </div>
                    <p className="db-quote">“{db.text}”</p>
                    <div className="db-keywords-wrap">
                      <span className="db-label">Triggered By:</span>
                      {db.flagged_keywords.map((kw) => (
                        <span key={kw} className="db-kw-pill">{kw}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* The Core Dual Love vs. Hate Matrix */}
          <div className="two-column-grid mt-6">
            {/* 🟢 What Customers Love */}
            <div className="panel-card love-board-card">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ThumbsUp size={18} className="text-emerald" />
                  <div>
                    <span className="panel-pre-title text-emerald">CORE PRODUCT STRENGTHS</span>
                    <h3 className="panel-title">What Customers Love</h3>
                  </div>
                </div>
                <small style={{ color: 'var(--text-dim)' }}>Ranked by praise volume</small>
              </div>

              <div className="aspect-cards-list mt-4">
                {analytics.loved_aspects.map((item) => (
                  <div
                    key={item.aspect}
                    className={`aspect-love-item ${activeAspectFilter === item.aspect ? 'aspect-selected' : ''}`}
                    onClick={() => setActiveAspectFilter(activeAspectFilter === item.aspect ? null : item.aspect)}
                    title="Click to filter reviews discussing this aspect"
                  >
                    <div className="ali-header">
                      <strong className="ali-name">{item.aspect}</strong>
                      <span className="ali-pct text-emerald">{item.satisfaction_rate}% Positive</span>
                    </div>

                    <div className="ali-meter">
                      <div className="ali-fill fill-emerald" style={{ width: `${item.satisfaction_rate}%` }} />
                    </div>

                    <div className="ali-footer">
                      <small>{item.total_mentions} customer mentions</small>
                      <div className="ali-opinions">
                        {item.top_opinions.map((op, i) => (
                          <span key={i} className="op-pill pill-pos">★ {op}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 🔴 What Customers Hate */}
            <div className="panel-card hate-board-card">
              <div className="panel-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ThumbsDown size={18} className="text-ruby" />
                  <div>
                    <span className="panel-pre-title text-ruby">URGENT FRICTION POINTS</span>
                    <h3 className="panel-title">What Customers Hate</h3>
                  </div>
                </div>
                <small style={{ color: 'var(--text-dim)' }}>Ranked by complaint severity</small>
              </div>

              <div className="aspect-cards-list mt-4">
                {analytics.hated_aspects.length > 0 ? (
                  analytics.hated_aspects.map((item) => (
                    <div
                      key={item.aspect}
                      className={`aspect-hate-item ${activeAspectFilter === item.aspect ? 'aspect-selected' : ''}`}
                      onClick={() => setActiveAspectFilter(activeAspectFilter === item.aspect ? null : item.aspect)}
                      title="Click to filter reviews discussing this complaint"
                    >
                      <div className="ali-header">
                        <strong className="ali-name">{item.aspect}</strong>
                        <span className="ali-pct text-ruby">{100 - item.satisfaction_rate}% Negative</span>
                      </div>

                      <div className="ali-meter">
                        <div className="ali-fill fill-ruby" style={{ width: `${100 - item.satisfaction_rate}%` }} />
                      </div>

                      <div className="ali-footer">
                        <small>{item.total_mentions} customer complaints</small>
                        <div className="ali-opinions">
                          {item.top_opinions.map((op, i) => (
                            <span key={i} className="op-pill pill-neg">✕ {op}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-hated-aspects">
                    <CheckCircle2 size={24} className="text-emerald" />
                    <p>No critical negative complaint clusters detected in current slice!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Interactive Review Ledger & Aspect Drill-Down */}
          <section className="panel-card mt-6">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">DATA DRILL-DOWN LEDGER</span>
                <h3 className="panel-title">
                  {filteredRecords.length} Customer Reviews
                  {activeAspectFilter && (
                    <span className="active-filter-tag">
                      Filtered by #{activeAspectFilter}
                      <button className="clear-filter-btn" onClick={() => setActiveAspectFilter(null)}>×</button>
                    </span>
                  )}
                </h3>
              </div>

              {/* Severity Quick Filters */}
              <div className="filter-pill-group">
                <button
                  className={`filter-pill ${activeSeverityFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveSeverityFilter('all')}
                >
                  All ({analytics.records.length})
                </button>
                <button
                  className={`filter-pill ${activeSeverityFilter === 'love' ? 'active' : ''}`}
                  onClick={() => setActiveSeverityFilter('love')}
                >
                  Loved (60%+)
                </button>
                <button
                  className={`filter-pill ${activeSeverityFilter === 'hate' ? 'active' : ''}`}
                  onClick={() => setActiveSeverityFilter('hate')}
                >
                  Complaints (≤45%)
                </button>
                <button
                  className={`filter-pill ${activeSeverityFilter === 'dealbreaker' ? 'active' : ''}`}
                  onClick={() => setActiveSeverityFilter('dealbreaker')}
                >
                  Dealbreakers ({analytics.dealbreakers.length})
                </button>
              </div>
            </div>

            <div className="search-box-wrap mt-4">
              <Search size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search reviews by feature keyword, complaint, or praise..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="table-responsive mt-4">
              <table className="differential-matrix-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Customer Review Text</th>
                    <th>Score</th>
                    <th>Mined Aspects</th>
                    <th>Syntactic Evidence Path</th>
                    <th>Studio</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((rec) => (
                    <tr key={rec.id} className="matrix-row">
                      <td style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>#{rec.id}</td>
                      <td style={{ maxWidth: '420px' }}>
                        <p style={{ margin: 0, fontSize: '0.9rem', lineHeight: 1.45 }}>{rec.text}</p>
                        {rec.is_dealbreaker && (
                          <span className="dealbreaker-flag-tag">⚠️ Critical Dealbreaker</span>
                        )}
                      </td>
                      <td>
                        <span className={`history-score-pill ${rec.sentiment_score >= 60 ? 'score-pos' : rec.sentiment_score <= 45 ? 'score-neg' : 'score-neu'}`}>
                          {rec.sentiment_score}%
                        </span>
                      </td>
                      <td>
                        <div className="aspects-cell-chips">
                          {rec.aspects.map((asp, i) => (
                            <span
                              key={i}
                              className="chip-aspect"
                              onClick={() => setActiveAspectFilter(asp)}
                              title="Click to filter by this aspect"
                              style={{ cursor: 'pointer' }}
                            >
                              {asp}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td>
                        <code className="rule-code">{rec.syntactic_evidence}</code>
                      </td>
                      <td>
                        <button
                          className="btn-tiny-studio"
                          onClick={() => navigate('/studio', { state: { text: rec.text } })}
                          title="Open in Syntactic Studio"
                        >
                          <ExternalLink size={12} /> Studio
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
