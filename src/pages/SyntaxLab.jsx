import React, { useState, useEffect } from 'react';
import { API_BASE } from '../apiConfig';
import {
  FlaskConical,
  Scale,
  Sparkles,
  TrendingUp,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sliders,
  Play,
  RotateCcw,
  Zap,
  GitFork,
  ArrowRight,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function SyntaxLab() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [ablation, setAblation] = useState({
    negation_handling: true,
    coordination_chains: true,
    compound_noun_resolution: true,
    dependency_path_filtering: true,
  });

  const runComparison = async (currentAblation = ablation) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/lab/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentAblation),
      });
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (err) {
      console.error('Failed to run Syntax Impact Lab:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    runComparison();
  }, []);

  const handleToggleAblation = (key) => {
    const updated = { ...ablation, [key]: !ablation[key] };
    setAblation(updated);
    runComparison(updated);
  };

  const resetAblation = () => {
    const full = {
      negation_handling: true,
      coordination_chains: true,
      compound_noun_resolution: true,
      dependency_path_filtering: true,
    };
    setAblation(full);
    runComparison(full);
  };

  const renderConfusionMatrix = (matrix = {}, title, subtitle, isSyntax = false) => {
    const labels = ['positive', 'negative', 'neutral'];
    return (
      <div className={`cm-card ${isSyntax ? 'cm-syntax' : 'cm-baseline'}`}>
        <div className="cm-header">
          <div>
            <span className="cm-tag">{isSyntax ? 'PROPOSED ARCHITECTURE' : 'BASELINE REFERENCE'}</span>
            <h4 className="cm-title">{title}</h4>
          </div>
          <small className="cm-sub">{subtitle}</small>
        </div>

        <table className="cm-table">
          <thead>
            <tr>
              <th className="cm-corner">Actual \ Pred</th>
              {labels.map((l) => (
                <th key={l} className="cm-col-head">{l.slice(0, 3).toUpperCase()}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {labels.map((rowLabel) => (
              <tr key={rowLabel}>
                <td className="cm-row-head">{rowLabel.slice(0, 3).toUpperCase()}</td>
                {labels.map((colLabel) => {
                  const val = matrix[rowLabel]?.[colLabel] || 0;
                  const isDiag = rowLabel === colLabel;
                  return (
                    <td
                      key={colLabel}
                      className={`cm-cell ${isDiag ? (isSyntax ? 'cm-diag-syntax' : 'cm-diag-base') : 'cm-off'}`}
                    >
                      <b>{val}</b>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <div className="page-content">
      {/* Hero Header */}
      <div className="panel-card lab-hero-card">
        <div className="hero-text-block">
          <div className="hero-pre-badge">
            <FlaskConical size={14} className="text-purple" />
            <span>RESEARCH EXPERIMENTATION BENCHMARK</span>
          </div>
          <h2 className="hero-title">Syntax Impact Lab: Baseline vs. Universal Dependencies</h2>
          <p className="hero-desc">
            Empirical validation proving why dependency parsing is essential for Aspect-Based Sentiment Analysis.
            Contrasts a standard Bag-of-Words lexicon model against SyntaxSense, and tests syntactic feature ablations in real time.
          </p>
        </div>

        <div className="hero-action-block">
          <button
            className="btn-primary"
            onClick={() => runComparison()}
            disabled={loading}
          >
            {loading ? <Zap size={15} className="spin" /> : <Play size={15} />}
            <span>{loading ? 'Recalculating Metrics...' : 'Run Head-to-Head Comparison'}</span>
          </button>
        </div>
      </div>

      {/* Metrics Scoreboard */}
      {report && (
        <div className="lab-metrics-grid">
          {/* Baseline Metric Card */}
          <div className="metric-box box-baseline">
            <div className="metric-box-top">
              <span className="model-badge badge-baseline">BASELINE</span>
              <span className="model-sub">Naive Bag-of-Words Lexicon</span>
            </div>
            <div className="metric-main-value">
              {report.baseline_metrics.f1_score}%
              <span className="metric-unit">Macro-F1</span>
            </div>
            <div className="metric-sub-stats">
              <span>Precision: <b>{report.baseline_metrics.precision}%</b></span>
              <span>Recall: <b>{report.baseline_metrics.recall}%</b></span>
              <span>Accuracy: <b>{report.baseline_metrics.accuracy}%</b></span>
            </div>
          </div>

          {/* Delta Impact Pill Card */}
          <div className="metric-box box-delta">
            <span className="delta-title">SYNTACTIC GAIN</span>
            <div className={`delta-huge ${report.f1_delta >= 0 ? 'text-emerald' : 'text-rose'}`}>
              {report.f1_delta >= 0 ? `+${report.f1_delta}%` : `${report.f1_delta}%`}
            </div>
            <span className="delta-sub">Macro-F1 Advantage</span>
            <div className="delta-detail">
              <span>Accuracy Delta: <b>{report.accuracy_delta >= 0 ? `+${report.accuracy_delta}%` : `${report.accuracy_delta}%`}</b></span>
            </div>
          </div>

          {/* SyntaxSense Metric Card */}
          <div className="metric-box box-syntax">
            <div className="metric-box-top">
              <span className="model-badge badge-syntax">SYNTAXSENSE</span>
              <span className="model-sub">Universal Dependencies 2.0</span>
            </div>
            <div className="metric-main-value text-purple">
              {report.syntax_metrics.f1_score}%
              <span className="metric-unit">Macro-F1</span>
            </div>
            <div className="metric-sub-stats">
              <span>Precision: <b>{report.syntax_metrics.precision}%</b></span>
              <span>Recall: <b>{report.syntax_metrics.recall}%</b></span>
              <span>Accuracy: <b>{report.syntax_metrics.accuracy}%</b></span>
            </div>
          </div>
        </div>
      )}

      {/* Syntactic Feature Ablation Control Deck */}
      <div className="panel-card ablation-card mt-4">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">INTERACTIVE ABLATION BENCH</span>
            <h3 className="panel-title">Syntactic Feature Switches</h3>
          </div>
          <button className="btn-secondary btn-sm" onClick={resetAblation} title="Reset all syntactic features to ON">
            <RotateCcw size={13} /> Reset to Full UD Engine
          </button>
        </div>

        <p className="ablation-intro">
          Toggle individual syntactic capabilities to observe performance degradation.
          Disabling negation inversion, for instance, mimics how naive models fail on “not bad” or “hardly impressive”.
        </p>

        <div className="ablation-toggles-grid">
          <div
            className={`ablation-toggle-item ${ablation.negation_handling ? 'toggle-on' : 'toggle-off'}`}
            onClick={() => handleToggleAblation('negation_handling')}
          >
            <div className="toggle-indicator" />
            <div className="toggle-text">
              <strong>Negation Arc Resolution (neg)</strong>
              <small>Inverts valence for negated predicates (e.g. "not bad", "never fails").</small>
            </div>
          </div>

          <div
            className={`ablation-toggle-item ${ablation.coordination_chains ? 'toggle-on' : 'toggle-off'}`}
            onClick={() => handleToggleAblation('coordination_chains')}
          >
            <div className="toggle-indicator" />
            <div className="toggle-text">
              <strong>Coordinated Aspect Binding (conj)</strong>
              <small>Follows conjunction chains across compound nouns and predicates.</small>
            </div>
          </div>

          <div
            className={`ablation-toggle-item ${ablation.compound_noun_resolution ? 'toggle-on' : 'toggle-off'}`}
            onClick={() => handleToggleAblation('compound_noun_resolution')}
          >
            <div className="toggle-indicator" />
            <div className="toggle-text">
              <strong>Compound Noun Clustering (compound)</strong>
              <small>Groups multi-token terms like "active noise cancellation" or "battery life".</small>
            </div>
          </div>

          <div
            className={`ablation-toggle-item ${ablation.dependency_path_filtering ? 'toggle-on' : 'toggle-off'}`}
            onClick={() => handleToggleAblation('dependency_path_filtering')}
          >
            <div className="toggle-indicator" />
            <div className="toggle-text">
              <strong>Shortest Path Traversal Filtering</strong>
              <small>Eliminates sentiment cross-talk in opposing clauses (e.g. camera vs battery).</small>
            </div>
          </div>
        </div>
      </div>

      {/* Side-by-Side Confusion Matrices */}
      {report && (
        <div className="panel-card mt-4">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">CLASSIFICATION ACCURACY MAPPING</span>
              <h3 className="panel-title">Side-by-Side 3×3 Confusion Matrices</h3>
            </div>
            <span className="panel-badge">{report.total_sentences} Challenge Sentences</span>
          </div>

          <div className="matrices-container">
            {renderConfusionMatrix(
              report.baseline_metrics.confusion_matrix,
              'Baseline (Naive Bag-of-Words)',
              'High false-neutral & sentiment bleed errors',
              false
            )}
            {renderConfusionMatrix(
              report.syntax_metrics.confusion_matrix,
              'SyntaxSense (Universal Dependencies)',
              'High diagonal concentration with grammatical guidance',
              true
            )}
          </div>
        </div>
      )}

      {/* Contrastive Case Studies Showcase */}
      {report && report.contrastive_examples && (
        <div className="panel-card mt-4">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">QUALITATIVE ERROR ANALYSIS</span>
              <h3 className="panel-title">Contrastive Syntactic Case Studies</h3>
            </div>
            <span className="panel-badge">Where Syntax Makes the Difference</span>
          </div>

          <div className="contrast-items-list">
            {report.contrastive_examples.map((item, idx) => (
              <div key={idx} className="contrast-card">
                <div className="contrast-card-header">
                  <span className="challenge-tag">{item.category}</span>
                  <span className={`win-pill ${item.syntax_won ? 'win-syntax' : 'win-draw'}`}>
                    {item.syntax_won ? '✓ SyntaxSense Outperformed' : '● Tie / Equal Match'}
                  </span>
                </div>

                <p className="contrast-sentence">“{item.sentence}”</p>
                <div className="contrast-challenge-note">
                  <b>Syntactic Challenge:</b> {item.challenge}
                </div>

                {/* Aspect-level prediction contrast */}
                <div className="contrast-table-wrapper">
                  <table className="contrast-table">
                    <thead>
                      <tr>
                        <th>Aspect Target</th>
                        <th>Gold Truth</th>
                        <th>Naive Baseline</th>
                        <th>SyntaxSense Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {item.gold.map((g, gIdx) => {
                        const basePred = item.baseline_predictions[gIdx]?.polarity || 'unknown';
                        const synPred = item.syntax_predictions[gIdx]?.polarity || 'unknown';
                        return (
                          <tr key={gIdx}>
                            <td><b>{g.term}</b></td>
                            <td>
                              <span className={`pill-mini pill-${g.polarity}`}>{g.polarity}</span>
                            </td>
                            <td>
                              <span
                                className={`pill-mini pill-${basePred} ${
                                  basePred === g.polarity ? 'correct' : 'incorrect'
                                }`}
                              >
                                {basePred} {basePred === g.polarity ? '✓' : '✗'}
                              </span>
                            </td>
                            <td>
                              <span
                                className={`pill-mini pill-${synPred} ${
                                  synPred === g.polarity ? 'correct' : 'incorrect'
                                }`}
                              >
                                {synPred} {synPred === g.polarity ? '✓' : '✗'}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
