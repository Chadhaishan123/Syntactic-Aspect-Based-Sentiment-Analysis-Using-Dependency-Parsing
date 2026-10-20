import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldAlert,
  Sparkles,
  AlertOctagon,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Flame,
  Zap,
  Info
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function SarcasmDetector() {
  const navigate = useNavigate();

  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('subjunctive_conditional');
  const [text, setText] = useState(
    "The laptop would have been wonderful if the motherboard didn't catch fire on day two."
  );
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/api/sarcasm/presets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.presets && data.presets.length > 0) {
          setPresets(data.presets);
        }
      })
      .catch((err) => console.warn('Failed to load sarcasm presets:', err));
  }, []);

  const handleSelectPreset = (p) => {
    setSelectedPresetId(p.id);
    setText(p.text);
    setResult(null);
  };

  const handleAnalyzeSarcasm = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/sarcasm/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: text.trim() })
      });
      if (res.ok) {
        const data = await res.json();
        setResult(data);
      } else {
        alert('Failed to analyze sarcasm.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to Sarcasm Detector service.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content sarcasm-page">
      {/* Hero Header */}
      <section className="compare-hero sarcasm-hero">
        <div className="hero-pill">
          <ShieldAlert size={14} className="text-ruby" />
          <span>IRONY, MODALITIES & FALSE POSITIVE FILTERING</span>
        </div>
        <h2 className="compare-title">
          Syntactic <em>Sarcasm & Irony Shield</em>
        </h2>
        <p className="compare-sub">
          Traditional bag-of-words and keyword models notoriously fail when customer reviews use irony, subjunctive conditionals (<em>"would have been great if..."</em>), or sarcastic discourse particles (<em>"Oh brilliant..."</em>). This module identifies syntactic dissonance where surface words clash with grammatical relations.
        </p>

        {/* Preset Selector */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Irony Presets:</span>
          {presets.map((p) => (
            <button
              key={p.id}
              className={`preset-btn ${selectedPresetId === p.id ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p)}
              title={p.description}
            >
              <Flame size={14} />
              <span>{p.title}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Input Panel */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">TEXT INTERROGATION</span>
            <h3 className="panel-title">Statement to Screen for Sarcasm</h3>
          </div>
          <button
            className="btn-primary"
            onClick={handleAnalyzeSarcasm}
            disabled={loading || !text.trim()}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner-border" /> : <ShieldAlert size={16} />}
            <span>{loading ? 'Evaluating Syntactic Dissonance...' : 'Screen for Sarcasm'}</span>
          </button>
        </div>

        <textarea
          className="compare-textarea"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste customer review to evaluate for sarcasm or irony..."
        />
      </section>

      {/* Analysis Result */}
      {result && (
        <>
          {/* Contrast Card: Naive Model vs Syntactic Sense */}
          <section className="panel-card mt-6">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">PARADIGM BENCHMARK</span>
                <h3 className="panel-title">Naive Model vs. Syntactic Sense Resolution</h3>
              </div>
            </div>

            <div className="two-column-grid mt-4">
              {/* Naive Bag of Words Box */}
              <div className="sarcasm-model-card card-naive">
                <span className="smc-label text-ruby">NAIVE BAG-OF-WORDS / KEYWORD LEXICON</span>
                <div className="smc-score-row">
                  <span className="smc-score-val">{result.naive_score}%</span>
                  <span className="smc-badge badge-naive">{result.naive_sentiment}</span>
                </div>
                <p className="smc-desc">
                  Scores isolated surface tokens independently. Falsely treats praise words as unconditioned positive sentiment, completely blind to clausal subordination.
                </p>
              </div>

              {/* Syntactic Sense Box */}
              <div className="sarcasm-model-card card-syntax">
                <span className="smc-label text-cyan">SYNTAX-SENSE (UNIVERSAL DEPENDENCY PARSER)</span>
                <div className="smc-score-row">
                  <span className="smc-score-val text-cyan">{result.syntactic_score}%</span>
                  <span className={`smc-badge ${result.is_sarcastic ? 'badge-syntax-neg' : 'badge-syntax-pos'}`}>
                    {result.syntactic_sentiment}
                  </span>
                </div>
                <p className="smc-desc">
                  Resolves clausal dependencies and subjunctive modals. Detects when hypothetical conditions or discourse particles invert the true semantic polarity.
                </p>
              </div>
            </div>
          </section>

          {/* Sarcasm Confidence & Markers */}
          <div className="two-column-grid mt-6">
            {/* Confidence Banner */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">CLASSIFICATION STATUS</span>
                  <h4 className="panel-title">Irony Confidence Level</h4>
                </div>
              </div>

              <div className="sarcasm-confidence-box">
                <div className="gauge-meter-wrapper">
                  <span className={`gauge-number ${result.is_sarcastic ? 'text-ruby' : 'text-emerald'}`}>
                    {result.sarcasm_confidence}%
                  </span>
                  <span className="gauge-label">
                    {result.is_sarcastic ? 'SARCASM DETECTED' : 'GENUINE INTENT'}
                  </span>
                </div>
                <p className="sarcasm-explanation-text mt-4">
                  {result.linguistic_breakdown}
                </p>
                <button
                  className="btn-tiny-studio mt-4"
                  onClick={() => navigate('/studio', { state: { text: result.text } })}
                >
                  <ExternalLink size={12} /> Inspect Full Dependency Tree in Studio
                </button>
              </div>
            </div>

            {/* Detected Linguistic Triggers */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">GRAMMATICAL TRIGGERS</span>
                  <h4 className="panel-title">Detected Sarcasm Markers ({result.detected_markers.length})</h4>
                </div>
              </div>

              <div className="markers-list-box">
                {result.detected_markers.length > 0 ? (
                  result.detected_markers.map((m, idx) => (
                    <div key={idx} className="sarcasm-marker-item">
                      <div className="smi-header">
                        <span className="smi-category">{m.category}</span>
                        <code className="smi-token">{m.marker_text}</code>
                      </div>
                      <p className="smi-explanation">{m.explanation}</p>
                      <div className="smi-syntactic">
                        <strong>Rule:</strong> <code>{m.syntactic_trigger}</code>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="no-markers-notice">
                    <CheckCircle2 size={24} className="text-emerald" />
                    <p>No adversarial sarcasm or irony patterns found. This review is interpreted as literal customer sentiment.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
