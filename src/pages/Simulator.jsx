import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Sparkles,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
  ArrowRight,
  GitCommit,
  FlaskConical,
  HelpCircle,
  Cpu,
  RefreshCw,
  Shuffle
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function Simulator() {
  const navigate = useNavigate();

  // State
  const [presets, setPresets] = useState([]);
  const [selectedPresetId, setSelectedPresetId] = useState('battery_negation');
  const [baseText, setBaseText] = useState('The battery lasts all day and charges remarkably fast.');
  const [mutatedText, setMutatedText] = useState('The battery does not last all day and charges remarkably slow.');
  const [mutationType, setMutationType] = useState('negation_and_antonym');
  const [mutationDesc, setMutationDesc] = useState('Injects auxiliary negation and flips adverbial modifier.');
  
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [simResult, setSimResult] = useState(null);
  const [activeTreeTab, setActiveTreeTab] = useState('mutated'); // 'mutated', 'original', 'split'

  // Load presets on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/simulator/presets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.presets && data.presets.length > 0) {
          setPresets(data.presets);
          loadPreset(data.presets[0]);
        }
      })
      .catch((err) => console.warn('Failed to load simulator presets:', err));
  }, []);

  // Fetch quick algorithmic mutation suggestions when baseText changes
  useEffect(() => {
    if (!baseText || baseText.trim().length < 5) return;
    const timeout = setTimeout(() => {
      fetch(`${API_BASE}/api/simulator/suggest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: baseText.trim() })
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.suggestions) {
            setSuggestions(data.suggestions);
          }
        })
        .catch(() => {});
    }, 400);
    return () => clearTimeout(timeout);
  }, [baseText]);

  const loadPreset = (preset) => {
    setSelectedPresetId(preset.id);
    setBaseText(preset.base_text);
    setMutatedText(preset.mutated_text);
    setMutationType(preset.mutation_type);
    setMutationDesc(preset.description);
    setSimResult(null);
  };

  const handleApplySuggestion = (sug) => {
    setMutatedText(sug.text);
    setMutationType(sug.type);
    setMutationDesc(sug.hint);
  };

  const handleRunSimulation = async () => {
    if (!baseText.trim() || !mutatedText.trim()) {
      alert('Please provide both the original sentence and the mutated counterfactual sentence.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/simulator/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          base_text: baseText.trim(),
          mutated_text: mutatedText.trim(),
          mutation_type: mutationType,
          mutation_description: mutationDesc
        })
      });
      if (res.ok) {
        const data = await res.json();
        setSimResult(data);
      } else {
        alert('Simulator analysis failed. Please verify backend status.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error communicating with the Counterfactual Simulator on Render.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-content simulator-page">
      {/* Hero Header */}
      <section className="compare-hero simulator-hero">
        <div className="hero-pill">
          <FlaskConical size={14} className="text-amber" />
          <span>GRAMMATICAL PERTURBATION & EXPLAINABLE AI</span>
        </div>
        <h2 className="compare-title">
          "What-If" <em>Counterfactual Grammar Simulator</em>
        </h2>
        <p className="compare-sub">
          Inject real-time syntactic perturbations—negations (<code className="code-pill">neg</code>), contrastive conjuncts (<code className="code-pill">conj</code>), degree intensifiers (<code className="code-pill">advmod</code>), and entity swaps. Observe how Universal Dependency relations dynamically re-route aspect sentiment.
        </p>

        {/* Preset Selector Buttons */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Perturbation Presets:</span>
          {presets.map((p) => (
            <button
              key={p.id}
              className={`preset-btn ${selectedPresetId === p.id ? 'active' : ''}`}
              onClick={() => loadPreset(p)}
            >
              <Zap size={14} />
              <span>{p.title}</span>
            </button>
          ))}
          <button
            className={`preset-btn ${selectedPresetId === 'custom' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPresetId('custom');
              setMutationType('custom_user');
              setMutationDesc('Custom user-defined syntactic mutation');
              setSimResult(null);
            }}
          >
            <Sliders size={14} />
            <span>Custom Mutation</span>
          </button>
        </div>
      </section>

      {/* Side-by-Side Dual Editor Panels */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">GRAMMAR MUTATION BENCH</span>
            <h3 className="panel-title">Original vs. Counterfactual Sentence</h3>
          </div>
          <button
            className="btn-primary"
            onClick={handleRunSimulation}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner-border" /> : <Play size={16} />}
            <span>{loading ? 'Parsing Dependency Graph...' : 'Simulate Grammar Mutation'}</span>
          </button>
        </div>

        <div className="two-column-grid compare-inputs-grid">
          {/* Base Sentence Card */}
          <div className="compare-input-card card-product-a">
            <div className="product-card-header">
              <span className="product-badge badge-a">ORIGINAL SENTENCE</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Baseline Syntax</span>
            </div>
            <textarea
              className="compare-textarea"
              rows={4}
              value={baseText}
              onChange={(e) => setBaseText(e.target.value)}
              placeholder="Enter the baseline customer review sentence..."
            />
            <div className="input-footer">
              <small>{baseText.split(' ').filter(Boolean).length} tokens</small>
            </div>
          </div>

          {/* Mutated Sentence Card */}
          <div className="compare-input-card card-product-b">
            <div className="product-card-header">
              <span className="product-badge badge-b">COUNTERFACTUAL PERTURBATION</span>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>Mutated Graph</span>
            </div>
            <textarea
              className="compare-textarea"
              rows={4}
              value={mutatedText}
              onChange={(e) => setMutatedText(e.target.value)}
              placeholder="Inject negation, add adversative 'however', or change modifier..."
            />
            
            {/* Quick 1-Click Suggestions */}
            {suggestions.length > 0 && (
              <div className="quick-suggestions-row">
                <span className="qs-label">⚡ Quick Inject:</span>
                {suggestions.map((sug, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="btn-suggestion-pill"
                    onClick={() => handleApplySuggestion(sug)}
                    title={sug.hint}
                  >
                    + {sug.label}
                  </button>
                ))}
              </div>
            )}

            <div className="input-footer">
              <small>{mutatedText.split(' ').filter(Boolean).length} tokens</small>
            </div>
          </div>
        </div>
      </section>

      {/* Simulation Results Section */}
      {simResult && (
        <>
          {/* Summary KPI Banner */}
          <section className="panel-card mt-6 sim-kpi-banner">
            <div className="sim-kpi-grid">
              {/* Score Shift */}
              <div className="sim-kpi-item">
                <span className="sim-kpi-label">Overall Sentiment Shift</span>
                <div className="sim-kpi-values">
                  <span className="kpi-old">{simResult.original_score}%</span>
                  <ArrowRight size={18} className="text-dim" />
                  <span className="kpi-new">{simResult.mutated_score}%</span>
                  <span className={`kpi-badge ${simResult.score_delta >= 0 ? 'badge-pos' : 'badge-neg'}`}>
                    {simResult.score_delta >= 0 ? `+${simResult.score_delta}%` : `${simResult.score_delta}%`}
                  </span>
                </div>
              </div>

              {/* Polarity Status */}
              <div className="sim-kpi-item">
                <span className="sim-kpi-label">Aspect Polarity Status</span>
                <div className="sim-status-val">
                  {simResult.aspect_deltas.some((d) => d.polarity_flipped) ? (
                    <span className="text-ruby" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <AlertTriangle size={18} />
                      <strong>Polarity Inverted</strong>
                    </span>
                  ) : (
                    <span className="text-emerald" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckCircle2 size={18} />
                      <strong>Polarity Preserved</strong>
                    </span>
                  )}
                </div>
                <small style={{ color: 'var(--text-dim)' }}>
                  {simResult.aspect_deltas.filter((d) => d.polarity_flipped).length} of {simResult.aspect_deltas.length} aspects shifted
                </small>
              </div>

              {/* Mutation Class */}
              <div className="sim-kpi-item">
                <span className="sim-kpi-label">Perturbation Type</span>
                <span className="code-pill text-cyan" style={{ fontSize: '0.85rem' }}>
                  {simResult.mutation_type}
                </span>
                <small style={{ color: 'var(--text-muted)', marginTop: '4px' }}>
                  {simResult.mutation_description}
                </small>
              </div>
            </div>
          </section>

          {/* Side-by-Side Aspect Delta Matrix */}
          <section className="panel-card mt-6">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">SYNTACTIC POLARITY DELTA</span>
                <h3 className="panel-title">Aspect-by-Aspect Impact Matrix</h3>
              </div>
            </div>

            <div className="table-responsive">
              <table className="differential-matrix-table">
                <thead>
                  <tr>
                    <th>Target Aspect</th>
                    <th>Original Polarity</th>
                    <th>Mutated Polarity</th>
                    <th>Status</th>
                    <th>Syntactic Rule Triggered</th>
                    <th>Studio Audit</th>
                  </tr>
                </thead>
                <tbody>
                  {simResult.aspect_deltas.map((delta, i) => (
                    <tr key={i} className="matrix-row">
                      <td>
                        <strong>{delta.aspect}</strong>
                        <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                          Opinion: <em>"{delta.original_opinion}"</em> ➔ <em>"{delta.mutated_opinion}"</em>
                        </div>
                      </td>
                      <td>
                        <span className={`sentiment-badge badge-${delta.original_sentiment}`}>
                          {delta.original_sentiment.toUpperCase()} ({delta.original_confidence}%)
                        </span>
                      </td>
                      <td>
                        <span className={`sentiment-badge badge-${delta.mutated_sentiment}`}>
                          {delta.mutated_sentiment.toUpperCase()} ({delta.mutated_confidence}%)
                        </span>
                      </td>
                      <td>
                        {delta.status === 'flipped' ? (
                          <span className="winner-tag tag-flipped">
                            <RefreshCw size={12} /> Inverted
                          </span>
                        ) : delta.status === 'introduced' ? (
                          <span className="winner-tag tag-a">
                            + Introduced
                          </span>
                        ) : delta.status === 'removed' ? (
                          <span className="winner-tag tag-b">
                            - Detached
                          </span>
                        ) : (
                          <span className="winner-tag tag-tie">
                            = Preserved
                          </span>
                        )}
                      </td>
                      <td>
                        <code className="rule-code">{delta.dependency_rule_triggered}</code>
                      </td>
                      <td>
                        <button
                          className="btn-tiny-studio"
                          onClick={() => navigate('/studio', { state: { text: simResult.mutated_text } })}
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

          {/* Explainability Log & Dependency Path Visualizer */}
          <div className="two-column-grid mt-6">
            {/* Grammatical Explainability Log */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">XAI GRAMMAR LOG</span>
                  <h4 className="panel-title">Natural Language Explanation</h4>
                </div>
              </div>
              <div className="explainability-log-box">
                {simResult.grammatical_explanation.map((exp, idx) => (
                  <div key={idx} className="log-item">
                    <span className="log-bullet">▸</span>
                    <p className="log-text">{exp}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Syntactic Tokens & Dependency Arc Comparison */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">GRAPH MORPHOLOGY</span>
                  <h4 className="panel-title">Active Dependency Tokens</h4>
                </div>
                <div className="tree-toggle-pills">
                  <button
                    className={`filter-pill ${activeTreeTab === 'mutated' ? 'active' : ''}`}
                    onClick={() => setActiveTreeTab('mutated')}
                  >
                    Counterfactual ({simResult.mutated_analysis.tokens?.length || 0} tokens)
                  </button>
                  <button
                    className={`filter-pill ${activeTreeTab === 'original' ? 'active' : ''}`}
                    onClick={() => setActiveTreeTab('original')}
                  >
                    Original ({simResult.original_analysis.tokens?.length || 0} tokens)
                  </button>
                </div>
              </div>

              {/* Render Selected Token Deck */}
              {activeTreeTab === 'mutated' ? (
                <div className="token-stream-deck">
                  <div className="token-flow-container">
                    {simResult.mutated_analysis.tokens?.map((t) => (
                      <div
                        key={t.id}
                        className={`sim-token-node ${t.is_aspect ? 'token-aspect' : ''} ${t.is_opinion ? 'token-opinion' : ''} ${t.is_negation ? 'token-negation' : ''}`}
                      >
                        <span className="stn-text">{t.text}</span>
                        <span className="stn-pos">{t.pos}</span>
                        <span className="stn-dep">{t.dep}</span>
                      </div>
                    ))}
                  </div>
                  <div className="token-legend mt-4">
                    <span className="legend-item"><span className="dot dot-cyan" /> Aspect Noun</span>
                    <span className="legend-item"><span className="dot dot-purple" /> Opinion Modifier</span>
                    <span className="legend-item"><span className="dot dot-ruby" /> Inverted Negation (neg)</span>
                  </div>
                </div>
              ) : (
                <div className="token-stream-deck">
                  <div className="token-flow-container">
                    {simResult.original_analysis.tokens?.map((t) => (
                      <div
                        key={t.id}
                        className={`sim-token-node ${t.is_aspect ? 'token-aspect' : ''} ${t.is_opinion ? 'token-opinion' : ''} ${t.is_negation ? 'token-negation' : ''}`}
                      >
                        <span className="stn-text">{t.text}</span>
                        <span className="stn-pos">{t.pos}</span>
                        <span className="stn-dep">{t.dep}</span>
                      </div>
                    ))}
                  </div>
                  <div className="token-legend mt-4">
                    <span className="legend-item"><span className="dot dot-cyan" /> Aspect Noun</span>
                    <span className="legend-item"><span className="dot dot-purple" /> Opinion Modifier</span>
                    <span className="legend-item"><span className="dot dot-ruby" /> Inverted Negation (neg)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
