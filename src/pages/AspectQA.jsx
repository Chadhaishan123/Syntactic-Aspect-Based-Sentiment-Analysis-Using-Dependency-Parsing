import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MessageSquare,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Layers,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Quote
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function AspectQA() {
  const navigate = useNavigate();

  const [presets, setPresets] = useState([]);
  const [question, setQuestion] = useState('How is the battery life and charging speed?');
  const [reviewsText, setReviewsText] = useState(
    "The battery life easily lasts 14 hours on a single charge.\nFast charging gets me to 80 percent in under 45 minutes.\nHowever, the charger brick itself is bulky and heavy to carry.\nUnder heavy load, the battery drains slightly faster than expected."
  );
  const [loading, setLoading] = useState(false);
  const [qaResult, setQaResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/qa/presets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.presets && data.presets.length > 0) {
          setPresets(data.presets);
        }
      })
      .catch((err) => console.warn('Failed to load QA presets:', err));
  }, []);

  const handleSelectPreset = (p) => {
    setQuestion(p.question);
    setReviewsText(p.sample_reviews.join('\n'));
    setQaResult(null);
  };

  const handleAskQuestion = async () => {
    if (!question.trim()) return;
    const revs = reviewsText.split('\n').map((r) => r.trim()).filter(Boolean);
    if (revs.length === 0) {
      alert('Please provide at least one customer review statement.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/qa/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: question.trim(),
          reviews: revs
        })
      });
      if (res.ok) {
        const data = await res.json();
        setQaResult(data);
      } else {
        alert('Failed to get answer from Aspect-QA engine.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to Aspect-QA service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content aspect-qa-page">
      {/* Hero Header */}
      <section className="compare-hero qa-hero">
        <div className="hero-pill">
          <MessageSquare size={14} className="text-cyan" />
          <span>SYNTACTICALLY-GROUNDED QUESTION ANSWERING</span>
        </div>
        <h2 className="compare-title">
          Automated <em>Aspect-QA Engine</em>
        </h2>
        <p className="compare-sub">
          Ask natural language questions about specific features, product dimensions, or recurring complaints. The system extracts aspects, traces shortest dependency paths across your review corpus, and generates grounded answers with exact syntactic evidence.
        </p>

        {/* Preset Question Pills */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Sample Inquiries:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              className={`preset-btn ${question === p.question ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p)}
            >
              <HelpCircle size={14} />
              <span>{p.question}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Query & Corpus Inputs */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">QUERY INTERACTION</span>
            <h3 className="panel-title">Natural Language Question</h3>
          </div>
          <button
            className="btn-primary"
            onClick={handleAskQuestion}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner-border" /> : <Search size={16} />}
            <span>{loading ? 'Synthesizing Evidence...' : 'Ask Aspect-QA'}</span>
          </button>
        </div>

        <div className="qa-input-container">
          <div className="qa-search-bar-wrap">
            <Search size={18} className="search-icon-cyan" />
            <input
              type="text"
              className="qa-search-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="e.g. How is the battery life? Or: What do customers complain about?"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleAskQuestion();
              }}
            />
          </div>

          <label className="input-label mt-4">Underlying Customer Review Statements (One per line):</label>
          <textarea
            className="compare-textarea"
            rows={4}
            value={reviewsText}
            onChange={(e) => setReviewsText(e.target.value)}
            placeholder="Paste customer reviews to interrogate..."
          />
          <div className="input-footer">
            <small>{reviewsText.split('\n').filter(Boolean).length} review sentences in corpus</small>
          </div>
        </div>
      </section>

      {/* Grounded Answer Card */}
      {qaResult && (
        <>
          <section className="panel-card mt-6 qa-answer-card">
            <div className="qa-answer-header">
              <div className="qa-answer-meta">
                <span className="qa-intent-tag">{qaResult.intent.toUpperCase()}</span>
                <span className="qa-aspect-tags">
                  Targeted: {qaResult.target_aspects.map((t) => (
                    <span key={t} className="aspect-target-pill">#{t}</span>
                  ))}
                </span>
              </div>

              <div className="qa-score-badge">
                <span className={`qa-score-number ${qaResult.polarity_score >= 60 ? 'text-emerald' : qaResult.polarity_score <= 40 ? 'text-ruby' : 'text-amber'}`}>
                  {qaResult.polarity_score}%
                </span>
                <span className="qa-score-label">{qaResult.sentiment_label}</span>
              </div>
            </div>

            <div className="qa-answer-body mt-4">
              <h3 className="qa-answer-text">“{qaResult.answer_text}”</h3>
              <p className="qa-evidence-count">
                Synthesized across <strong>{qaResult.total_reviews_analyzed}</strong> review statements with <strong>{qaResult.aspect_mention_count}</strong> direct aspect mentions.
              </p>
            </div>
          </section>

          {/* Syntactic Evidence Drawer */}
          <section className="panel-card mt-6">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">CITATION AUDIT</span>
                <h3 className="panel-title">Grounded Grammatical Evidence ({qaResult.evidence.length})</h3>
              </div>
            </div>

            <div className="evidence-cards-grid mt-4">
              {qaResult.evidence.map((ev, i) => (
                <div key={i} className="evidence-item-card">
                  <div className="evidence-card-header">
                    <span className="ev-aspect-name">{ev.aspect}</span>
                    <span className={`sentiment-badge badge-${ev.sentiment}`}>
                      {ev.sentiment.toUpperCase()} ({ev.confidence}%)
                    </span>
                  </div>

                  <p className="ev-sentence">“{ev.sentence}”</p>

                  <div className="ev-path-box">
                    <span className="ev-path-label">Syntactic Route:</span>
                    <code>{ev.dependency_path}</code>
                  </div>

                  <button
                    className="btn-tiny-studio mt-2"
                    onClick={() => navigate('/studio', { state: { text: ev.sentence } })}
                  >
                    <ExternalLink size={12} /> Inspect Graph in Studio
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
