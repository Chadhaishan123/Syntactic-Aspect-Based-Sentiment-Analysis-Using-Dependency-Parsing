import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Copy,
  Sliders,
  Compass,
  FileCode,
  Tag,
  Share2,
  Check,
  HelpCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import DependencyTreeViewer from '../components/DependencyTreeViewer';
import WhyPredictionModal from '../components/WhyPredictionModal';
import { useRealtime } from '../context/RealtimeContext';

const PRESETS = [
  {
    label: 'Contrasting Clauses',
    text: 'The battery life is really awful, but the vibrant display is stunning.',
    desc: 'Two opposing sentiments tied to different aspects in compound clauses.',
  },
  {
    label: 'Inverted Negation',
    text: 'Not only is the camera exceptional, but the audio never disappoints.',
    desc: 'Negative markers ("Not only", "never") flipped to positive valence.',
  },
  {
    label: 'Distant Modifier',
    text: 'Service from the polite staff was truly commendable despite long lines.',
    desc: 'Syntactic head separated from opinion by prepositional phrases.',
  },
  {
    label: 'Multi-Word Compound',
    text: 'Active noise cancellation works wonders, although bluetooth pairing was annoying.',
    desc: 'Multi-word compound nouns resolved as unified aspect entities.',
  },
];

export default function Studio() {
  const { analyzeText, parseText } = useRealtime();
  const location = useLocation();

  const [text, setText] = useState(
    'The battery life is really awful, but the vibrant display is stunning.'
  );
  const [liveTyping, setLiveTyping] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [activeAspectId, setActiveAspectId] = useState(null);
  const [selectedWhyAspect, setSelectedWhyAspect] = useState(null);
  const [copiedShare, setCopiedShare] = useState(false);
  const debounceTimerRef = useRef(null);

  // Trigger analysis (persisted & broadcast) or preview (non-persisting)
  const executeAnalysis = async (queryText = text, isPreview = false) => {
    if (!queryText.trim() || queryText.trim().length < 2) return;
    setLoading(true);
    setError('');
    try {
      const fn = isPreview ? parseText : analyzeText;
      const data = await fn(queryText.trim(), 'Syntactic Studio');
      setResult(data);
      if (data.aspects && data.aspects.length > 0) {
        setActiveAspectId(data.aspects[0].id);
      } else {
        setActiveAspectId(null);
      }
    } catch (err) {
      setError(err.message || 'Error executing syntactic parsing');
    } finally {
      setLoading(false);
    }
  };

  // Initial load: inspect URL params or router location state
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const queryParamText = searchParams.get('text');
    const initialText = location.state?.text || queryParamText || text;
    if (initialText !== text) {
      setText(initialText);
    }
    executeAnalysis(initialText);
  }, [location]);

  const handleCopyShareLink = () => {
    const url = `${window.location.origin}/analyze?text=${encodeURIComponent(text)}`;
    navigator.clipboard.writeText(url);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Handle live typing debounce using non-persisting preview
  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    if (liveTyping) {
      if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = setTimeout(() => {
        executeAnalysis(val, true);
      }, 450);
    }
  };

  const handleSelectPreset = (presetText) => {
    setText(presetText);
    executeAnalysis(presetText);
  };

  return (
    <div className="page-content">
      {/* Studio Header Bar */}
      <div className="studio-top-bar">
        <div className="studio-presets">
          <span className="preset-label">SYNTACTIC BENCHMARKS:</span>
          {PRESETS.map((p) => (
            <button
              key={p.label}
              className="preset-chip"
              onClick={() => handleSelectPreset(p.text)}
              title={p.desc}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="live-typing-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={liveTyping}
              onChange={(e) => setLiveTyping(e.target.checked)}
            />
            <span>Real-time Parse on Type</span>
          </label>
        </div>
      </div>

      {/* Input Editor Card */}
      <div className="panel-card editor-card">
        <div className="editor-header">
          <div className="editor-title">
            <Sparkles size={16} className="text-purple" />
            <span>Target Text for Dependency Analysis</span>
          </div>
          <span className="editor-counter">{text.length} characters</span>
        </div>

        <textarea
          className="studio-textarea"
          rows={3}
          value={text}
          onChange={handleTextChange}
          placeholder="Paste or type customer feedback, product reviews, or tweets..."
        />

        <div className="editor-footer">
          <div className="editor-meta">
            {result && (
              <span className="parse-speed-badge">
                ⚡ Parsed in {result.latency_ms}ms · {result.tokens?.length || 0} tokens
              </span>
            )}
            {error && <span className="parse-error-badge">⚠️ {error}</span>}
          </div>

          <div className="editor-actions">
            <button
              className="btn-secondary btn-sm"
              onClick={handleCopyShareLink}
              title="Copy shareable permalink"
            >
              {copiedShare ? <Check size={14} className="text-emerald" /> : <Share2 size={14} />}
              <span>{copiedShare ? 'Copied Permalink!' : 'Share'}</span>
            </button>
            <button
              className="btn-secondary btn-sm"
              onClick={() => {
                setText('');
                setResult(null);
              }}
            >
              <RotateCcw size={14} /> Clear
            </button>
            <button
              className="btn-primary"
              disabled={loading || !text.trim()}
              onClick={() => executeAnalysis()}
            >
              {loading ? 'Parsing Dependency Graph...' : 'Parse Dependencies'}
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Dependency Tree Visualization Canvas */}
      <section className="panel-card tree-panel">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">EXPLAINABLE GRAMMATICAL GRAPH</span>
            <h3 className="panel-title">Interactive Universal Dependency Tree</h3>
          </div>
          <div className="tree-stats-badge">
            <span>
              {result?.aspects?.length || 0} aspect{result?.aspects?.length === 1 ? '' : 's'} linked
            </span>
          </div>
        </div>

        <DependencyTreeViewer
          tokens={result?.tokens || []}
          arcs={result?.arcs || []}
          aspects={result?.aspects || []}
          activeAspectId={activeAspectId}
          onSelectAspect={(id) => setActiveAspectId(id)}
          onOpenWhy={(asp) => setSelectedWhyAspect(asp)}
        />
      </section>

      {/* Extracted Aspects & Polarity Grid */}
      <section className="studio-results-grid">
        {/* Left: Aspect Sentiment Cards */}
        <div className="panel-card aspects-list-panel">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">RESOLVED ENTITIES</span>
              <h3 className="panel-title">Aspect-Level Sentiments</h3>
            </div>
            {result && (
              <span className="overall-score-pill">
                Overall Score: {result.sentiment_score}/100
              </span>
            )}
          </div>

          <div className="aspect-cards-container">
            {result?.aspects && result.aspects.length > 0 ? (
              result.aspects.map((asp) => {
                const isActive = activeAspectId === asp.id;
                return (
                  <motion.div
                    key={asp.id}
                    className={`aspect-card-item ${isActive ? 'aspect-card-active' : ''}`}
                    onClick={() => setActiveAspectId(asp.id)}
                    whileHover={{ scale: 1.01 }}
                  >
                    <div className="aspect-card-top">
                      <div className="aspect-entity-group">
                        <span className="aspect-target-name">{asp.term}</span>
                        <span className="aspect-opinion-chip">modifier: “{asp.opinion}”</span>
                      </div>
                      <span
                        className={`polarity-pill ${
                          asp.sentiment === 'positive'
                            ? 'pill-positive'
                            : asp.sentiment === 'negative'
                            ? 'pill-negative'
                            : 'pill-neutral'
                        }`}
                      >
                        {asp.sentiment.toUpperCase()} · {asp.confidence}%
                      </span>
                    </div>

                    <div className="aspect-syntactic-path">
                      <span className="path-title">Shortest Dependency Path:</span>
                      <code>{asp.dependency_path}</code>
                    </div>

                    <div className="aspect-card-bottom">
                      <span className="click-to-focus">
                        {isActive ? '● Currently focused in tree' : 'Click to highlight in dependency tree'}
                      </span>
                      <button
                        className="btn-why-chip"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedWhyAspect(asp);
                        }}
                        title="Audit why this prediction was made"
                      >
                        <HelpCircle size={12} />
                        <span>Why This Prediction?</span>
                      </button>
                    </div>
                  </motion.div>
                );
              })
            ) : (
              <div className="empty-aspects-box">
                <Compass size={24} className="text-slate" />
                <p>No noun aspect targets identified in this statement.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Grammatical Token Inspector Table */}
        <div className="panel-card token-table-panel">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">SYNTACTIC MORPHOLOGY</span>
              <h3 className="panel-title">Token Universal Dependencies</h3>
            </div>
          </div>

          <div className="token-table-wrapper">
            <table className="token-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Token</th>
                  <th>Lemma</th>
                  <th>POS</th>
                  <th>Dep Rel</th>
                  <th>Head</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {result?.tokens && result.tokens.length > 0 ? (
                  result.tokens.map((tok) => (
                    <tr
                      key={tok.id}
                      className={
                        tok.is_aspect
                          ? 'row-aspect'
                          : tok.is_opinion
                          ? 'row-opinion'
                          : tok.is_negation
                          ? 'row-negation'
                          : ''
                      }
                    >
                      <td><code>{tok.id}</code></td>
                      <td><b>{tok.text}</b></td>
                      <td><span className="text-slate">{tok.lemma}</span></td>
                      <td><span className="pos-badge-sm">{tok.pos}</span></td>
                      <td><code>{tok.dep}</code></td>
                      <td>#{tok.head_id}</td>
                      <td>
                        {tok.is_aspect ? (
                          <span className="role-tag role-aspect">Aspect Target</span>
                        ) : tok.is_opinion ? (
                          <span className="role-tag role-opinion">Opinion Modifier</span>
                        ) : tok.is_negation ? (
                          <span className="role-tag role-neg">Negation</span>
                        ) : (
                          <span className="role-tag role-gram">Grammar</span>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-slate">
                      Tokens will appear once text is parsed.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Explainable Why This Prediction Modal */}
      {selectedWhyAspect && (
        <WhyPredictionModal
          aspect={selectedWhyAspect}
          text={text}
          tokens={result?.tokens || []}
          arcs={result?.arcs || []}
          onClose={() => setSelectedWhyAspect(null)}
        />
      )}
    </div>
  );
}
