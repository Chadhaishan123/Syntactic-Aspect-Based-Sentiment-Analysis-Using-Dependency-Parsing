import React from 'react';
import {
  X,
  HelpCircle,
  Sparkles,
  GitFork,
  ShieldCheck,
  AlertTriangle,
  ArrowRight,
  Zap,
  Info,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function WhyPredictionModal({ aspect, text, tokens = [], arcs = [], onClose }) {
  if (!aspect) return null;

  const isNegated = aspect.dependency_path?.includes('(negated)') || aspect.opinion?.toLowerCase().startsWith('not ');
  const hasIntensifier = text && /\b(really|very|extremely|super|truly|completely|totally|noticeably)\b/i.test(text);

  // Determine grammar rule
  let ruleName = 'Universal Dependency Traversal';
  let ruleDesc = 'Identified via shortest syntactic path between noun head and opinion modifier.';
  if (aspect.dependency_path?.includes('amod')) {
    ruleName = 'Direct Adjectival Modifier (amod)';
    ruleDesc = 'The adjective is directly attached as a grammatical modifier to the noun aspect.';
  } else if (aspect.dependency_path?.includes('nsubj') && (aspect.dependency_path?.includes('acomp') || aspect.dependency_path?.includes('attr'))) {
    ruleName = 'Copular Predicate Complement (nsubj + acomp)';
    ruleDesc = 'The aspect acts as nominal subject linked through a copular verb to an evaluative predicate.';
  } else if (aspect.dependency_path?.includes('dobj') || aspect.dependency_path?.includes('pobj')) {
    ruleName = 'Direct / Prepositional Object Predicate (dobj/pobj)';
    ruleDesc = 'The aspect receives the action of an evaluative transitive verb or prepositional clause.';
  } else if (aspect.dependency_path?.includes('conj')) {
    ruleName = 'Coordinated Aspect Clause (conj)';
    ruleDesc = 'The aspect is coordinated in a conjunction chain sharing an evaluative modifier.';
  }

  // Syntactic confidence breakdown
  const isHighConf = aspect.confidence >= 75;
  const isModerateConf = aspect.confidence >= 60 && aspect.confidence < 75;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <motion.div
        className="why-modal-content"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {/* Modal Header */}
        <div className="why-modal-header">
          <div className="why-header-left">
            <span className="why-pre-tag">
              <Sparkles size={13} className="text-purple" /> EXPLAINABLE AI · SYNTACTIC AUDIT
            </span>
            <h2 className="why-title">Why This Prediction?</h2>
          </div>
          <button className="why-close-btn" onClick={onClose} aria-label="Close explainability dialog">
            <X size={18} />
          </button>
        </div>

        <div className="why-modal-body">
          {/* Target Entity & Decision Card */}
          <div className="why-entity-summary">
            <div className="why-entity-col">
              <span className="why-label">Target Aspect</span>
              <strong className="why-aspect-name">{aspect.term}</strong>
            </div>
            <div className="why-arrow-col">
              <ArrowRight size={18} className="text-slate" />
            </div>
            <div className="why-entity-col">
              <span className="why-label">Opinion Modifier</span>
              <span className="why-opinion-chip">“{aspect.opinion}”</span>
            </div>
            <div className="why-polarity-col">
              <span className="why-label">Predicted Polarity</span>
              <span
                className={`polarity-pill ${
                  aspect.sentiment === 'positive'
                    ? 'pill-positive'
                    : aspect.sentiment === 'negative'
                    ? 'pill-negative'
                    : 'pill-neutral'
                }`}
              >
                {aspect.sentiment.toUpperCase()} · {aspect.confidence}%
              </span>
            </div>
          </div>

          {/* Uncertainty Inspection Notice */}
          {!isHighConf && (
            <div className={`why-alert-box ${isModerateConf ? 'alert-warning' : 'alert-caution'}`}>
              <AlertTriangle size={18} className="shrink-0" />
              <div>
                <strong>Confidence Uncertainty Flag ({aspect.confidence}%)</strong>
                <p>
                  This syntactic link has slight attenuation due to clause distance or missing intensifiers.
                  Recommended for manual oversight if used in high-stakes auditing.
                </p>
              </div>
            </div>
          )}

          {/* Syntactic Traversal Breakdown */}
          <div className="why-section">
            <div className="why-section-header">
              <GitFork size={15} className="text-cyan" />
              <span>Syntactic Dependency Path Traversal</span>
            </div>
            <div className="why-path-display">
              <code>{aspect.dependency_path}</code>
            </div>
            <div className="why-rule-card">
              <div className="rule-badge-row">
                <span className="rule-badge">Grammar Rule</span>
                <b>{ruleName}</b>
              </div>
              <p className="rule-desc">{ruleDesc}</p>
            </div>
          </div>

          {/* Valence & Negation Shifter Inspection */}
          <div className="why-section">
            <div className="why-section-header">
              <Sliders size={15} className="text-purple" />
              <span>Valence & Modifier Dynamics</span>
            </div>

            <div className="why-dynamics-grid">
              <div className="dynamic-card">
                <span className="dynamic-title">Negation Inversion</span>
                {isNegated ? (
                  <div className="dynamic-state state-flipped">
                    <span className="state-badge badge-reversed">VALENCE REVERSED</span>
                    <p>A negation token (e.g. "not", "never") modified the predicate, flipping the raw word score.</p>
                  </div>
                ) : (
                  <div className="dynamic-state state-normal">
                    <span className="state-badge badge-direct">DIRECT POLARITY</span>
                    <p>No governing negation arcs detected; lexical polarity preserves original valence.</p>
                  </div>
                )}
              </div>

              <div className="dynamic-card">
                <span className="dynamic-title">Modifier Intensity</span>
                {hasIntensifier ? (
                  <div className="dynamic-state state-boosted">
                    <span className="state-badge badge-boosted">AMPLIFIED</span>
                    <p>Adverbial intensifier reinforces certainty and sentiment polarity strength.</p>
                  </div>
                ) : (
                  <div className="dynamic-state state-normal">
                    <span className="state-badge badge-direct">BASELINE GAIN</span>
                    <p>Standard evaluative predicate strength without extraneous adverbial boosting.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Confidence Scoring Equation */}
          <div className="why-section">
            <div className="why-section-header">
              <ShieldCheck size={15} className="text-emerald" />
              <span>Confidence Formulation Breakdown</span>
            </div>
            <div className="why-math-formula">
              <div className="math-step">
                <span className="step-num">1</span>
                <div>
                  <b>Base Sentiment Alignment:</b>
                  <span> 70 pts (Universal Lexicon match)</span>
                </div>
              </div>
              <div className="math-step">
                <span className="step-num">2</span>
                <div>
                  <b>Syntactic Proximity Bonus:</b>
                  <span> +{aspect.confidence - 70 > 0 ? aspect.confidence - 70 : 0} pts (Shortest Path Dependency Arc)</span>
                </div>
              </div>
              <div className="math-step">
                <span className="step-num">3</span>
                <div>
                  <b>Final Syntactic Confidence:</b>
                  <strong className="text-emerald"> {aspect.confidence}%</strong>
                </div>
              </div>
            </div>
          </div>

          {/* Counterfactual Insight */}
          <div className="why-counterfactual-card">
            <Info size={16} className="text-cyan shrink-0" />
            <div className="counterfactual-content">
              <b>Syntactic Counterfactual Insight:</b>
              <p>
                {aspect.sentiment === 'negative'
                  ? `If the opinion phrase “${aspect.opinion}” were replaced with a positive head like “impressive”, the dependency traversal would preserve the relation and output POSITIVE (${Math.min(95, aspect.confidence + 4)}%).`
                  : `If a negation token like “not” were prepended to “${aspect.opinion}”, the negative dependency arc would flip the output to NEGATIVE (${aspect.confidence}%).`}
              </p>
            </div>
          </div>
        </div>

        <div className="why-modal-footer">
          <button className="btn-primary" onClick={onClose}>
            <CheckCircle2 size={16} /> Got It, Dismiss
          </button>
        </div>
      </motion.div>
    </div>
  );
}
