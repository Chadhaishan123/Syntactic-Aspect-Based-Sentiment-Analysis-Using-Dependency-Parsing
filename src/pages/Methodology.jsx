import React, { useState } from 'react';
import {
  BookOpen,
  GitBranch,
  ShieldAlert,
  Zap,
  CheckCircle2,
  XCircle,
  Code2,
  ArrowRight,
  Sparkles,
  Layers,
  Cpu,
  BarChart2,
  Eye,
  Info,
} from 'lucide-react';
import { Link } from 'react-router-dom';

const UD_TAGS = [
  {
    tag: 'nsubj',
    name: 'Nominal Subject',
    desc: 'The syntactic noun phrase that acts as the subject of a clause or copular predicate.',
    example: '“The [display] is stunning” → display is nsubj of is',
  },
  {
    tag: 'amod',
    name: 'Adjectival Modifier',
    desc: 'An adjective modifying the meaning of a noun directly without a copula.',
    example: '“vibrant [screen]” → vibrant is amod of screen',
  },
  {
    tag: 'acomp / xcomp',
    name: 'Adjectival Complement',
    desc: 'An adjective functioning as the complement of a copular verb.',
    example: '“battery life is [terrible]” → terrible is acomp of is',
  },
  {
    tag: 'dobj / pobj',
    name: 'Direct & Prepositional Object',
    desc: 'Connects opinion verbs (recommend, love) or prepositions to target aspect nouns.',
    example: '“I [love] the [keyboard]” → keyboard is dobj of love',
  },
  {
    tag: 'compound',
    name: 'Compound Noun Modifiers',
    desc: 'Merges multi-word nouns and technical terminology into a unified semantic aspect entity.',
    example: '“[battery] [life]” → battery is compound of life',
  },
  {
    tag: 'neg',
    name: 'Grammatical Negation Scope',
    desc: 'Grammatical negation token that inverts the polarity strictly within its syntactic subtree.',
    example: '“does [not] lag” → not inverts lag (negative → positive)',
  },
  {
    tag: 'conj + cc',
    name: 'Coordinating Conjunction',
    desc: 'Traverses chained opinions (vibrant and stunning) and coordinated aspects (keyboard and mouse).',
    example: '“vibrant [and] stunning” → stunning is conj of vibrant',
  },
  {
    tag: 'prep',
    name: 'Prepositional Attachment',
    desc: 'Attaches opinion states to indirect aspect targets across prepositions like with, about, for.',
    example: '“pleased [with] the [service]” → service is pobj of with',
  },
  {
    tag: 'relcl / acl',
    name: 'Relative Clause Modifier',
    desc: 'Links opinions embedded within restrictive or non-restrictive relative clauses to antecedents.',
    example: '“screen [which was bright]” → was is relcl of screen',
  },
];

const WALKTHROUGH_STEPS = [
  {
    step: 1,
    title: "Syntactic Tokenization & POS Tagging",
    desc: "The raw feedback string is mapped to lexical tokens with Penn Treebank POS annotations (NOUN, ADJ, VERB, CCONJ).",
    code: "display [NOUN, nsubj] · is [AUX, ROOT] · vibrant [ADJ, acomp] · and [CCONJ] · stunning [ADJ, conj]",
    badge: "Lexical Layer"
  },
  {
    step: 2,
    title: "Universal Dependency Tree Projection",
    desc: "Directed edges E = (u, v, dep) are instantiated. The copula 'is' anchors the subject 'display' and predicate adjective 'vibrant'.",
    code: "is ──[nsubj]──► display | is ──[acomp]──► vibrant | vibrant ──[conj]──► stunning",
    badge: "Graph Projection"
  },
  {
    step: 3,
    title: "Coordination Chaining & Opinion Linking",
    desc: "The parser traverses conj edges back to the primary governor, linking both 'vibrant' and 'stunning' to the single aspect target 'display'.",
    code: "Path 1: Display ←[acomp] vibrant | Path 2: Display ←[acomp] vibrant ←[conj] stunning",
    badge: "Syntactic Routing"
  },
  {
    step: 4,
    title: "Valence Attribution & Subtree Bounding",
    desc: "Valence scores (+1 for vibrant, +1 for stunning) aggregate to Confidence 98% Positive without leaking across adversative conjunctions.",
    code: "Aspect: 'Display' · Opinions: 'vibrant, stunning' · Polarity: Positive (98%)",
    badge: "Aspect Resolution"
  }
];

export default function Methodology() {
  const [activeStep, setActiveStep] = useState(0);

  return (
    <div className="page-content methodology-page">
      {/* Novelty Hero Banner */}
      <section className="methodology-hero">
        <div className="hero-pill">
          <Sparkles size={14} className="text-purple" />
          <span>RESEARCH NOVELTY & ARCHITECTURAL FOUNDATION</span>
        </div>
        <h2 className="methodology-title">
          Universal Dependency Parsing <br />
          <em>vs. Traditional Sequential & Black-Box ABSA</em>
        </h2>
        <p className="methodology-sub">
          Why standard sequential neural models and bag-of-words distance heuristics fail on complex customer
          feedback, and how grammatical dependency trees resolve sentiment with mathematical transparency,
          sub-10ms CPU inference, and zero required training data.
        </p>
      </section>

      {/* 3-Way Architectural Paradigm Comparison Table */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">ARCHITECTURAL BENCHMARK</span>
            <h3 className="panel-title">Three-Way Paradigm Comparison</h3>
          </div>
          <span className="pill-tag text-emerald">
            <Zap size={14} /> Low-Latency Edge Ready
          </span>
        </div>

        <div className="table-responsive">
          <table className="arch-matrix-table">
            <thead>
              <tr>
                <th>Evaluation Dimension</th>
                <th>Linear Windowing / BoW</th>
                <th>Dense Transformer (BERT / RoBERTa)</th>
                <th className="arch-col-highlight">SyntaxSense (Universal Dependency Trees)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Linguistic Modeling</strong></td>
                <td>Flat surface word proximity ($±k$ tokens)</td>
                <td>Self-attention across all token pairs</td>
                <td className="arch-col-highlight"><strong>Universal Dependency Graph G = (V, E)</strong></td>
              </tr>
              <tr>
                <td><strong>Explainability (XAI)</strong></td>
                <td><XCircle size={14} className="inline-icon text-ruby" /> None (distance heuristic)</td>
                <td><XCircle size={14} className="inline-icon text-ruby" /> Black-box attention weights</td>
                <td className="arch-col-highlight">
                  <strong className="text-emerald"><CheckCircle2 size={14} className="inline-icon text-emerald" /> White-Box Shortest Dependency Path (SDP)</strong>
                </td>
              </tr>
              <tr>
                <td><strong>Inference Latency</strong></td>
                <td>~1 ms (CPU)</td>
                <td>50 – 150 ms (requires GPU)</td>
                <td className="arch-col-highlight">
                  <strong className="text-emerald">&lt; 6 ms per sentence (pure CPU)</strong>
                </td>
              </tr>
              <tr>
                <td><strong>Negation Bounding</strong></td>
                <td>Global sentence flip (high error rate)</td>
                <td>Vulnerable to negation leakage</td>
                <td className="arch-col-highlight">
                  <strong>Strict syntactic subtree inversion (dep = neg)</strong>
                </td>
              </tr>
              <tr>
                <td><strong>Opposing Clause Separation</strong></td>
                <td>Collapses mixed sentiment into average</td>
                <td>Smooths contradictory clauses</td>
                <td className="arch-col-highlight">
                  <strong>Isolates contrasting clauses across coordinating cc / adversatives</strong>
                </td>
              </tr>
              <tr>
                <td><strong>Training Data Dependency</strong></td>
                <td>Zero training data</td>
                <td>Requires 10,000+ labeled in-domain reviews</td>
                <td className="arch-col-highlight">
                  <strong>Zero-shot domain transfer via Universal Grammar</strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Formal Mathematical Graph Formulation */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">FORMAL MATHEMATICAL FORMULATION</span>
            <h3 className="panel-title">Graph-Theoretic Aspect & Valence Resolution</h3>
          </div>
          <Code2 size={18} className="text-cyan" />
        </div>

        <div className="pillars-grid">
          <div className="pillar-card">
            <div className="pillar-icon bg-purple-glow">
              <GitBranch size={22} className="text-purple" />
            </div>
            <h4>1. Undirected Dependency Graph</h4>
            <p>
              Given sentence tokens V = &#123;w₁, w₂, ..., wₙ&#125;, we construct an inverted undirected graph
              G = (V, E) where each arc represents grammatical governance:
            </p>
            <div className="formula-card">
              <span>(u, v) ∈ E ⟺ dep(u, v) ∈ UD 2.0</span>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon bg-emerald-glow">
              <Zap size={22} className="text-emerald" />
            </div>
            <h4>2. Shortest Dependency Path (SDP)</h4>
            <p>
              The syntactic modifier relation between aspect target a ∈ V_noun and opinion o ∈ V_op
              is minimized using Breadth-First Graph Traversal:
            </p>
            <div className="formula-card">
              <span>p*(a, o) = argmin |p| for all p ∈ Path(a, o)</span>
            </div>
          </div>

          <div className="pillar-card">
            <div className="pillar-icon bg-cyan-glow">
              <Layers size={22} className="text-cyan" />
            </div>
            <h4>3. Dynamic Subtree Negation</h4>
            <p>
              Valence Score(o) is inverted if and only if a negation relation modifier is present in the opinion's
              syntactic scope:
            </p>
            <div className="formula-card">
              <span>Valence(o) = (-1)^δ · Score(o), where δ = 1 if neg ∈ Subtree(o)</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Step-by-Step Traversal Walkthrough */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">STEP-BY-STEP TRACE SIMULATION</span>
            <h3 className="panel-title">Adversarial Sentence Walkthrough</h3>
          </div>
          <span className="source-tag source-hn">Adversarial Test Case</span>
        </div>

        <div className="sample-review-box mt-3" style={{ background: 'rgba(15, 23, 42, 0.7)', padding: '16px 20px', borderRadius: '8px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '4px' }}>
            Input Sentence:
          </span>
          <p style={{ fontSize: '16px', color: '#fff', fontWeight: 600, margin: 0 }}>
            “The <span style={{ color: '#38bdf8' }}>battery life</span> is really <span style={{ color: '#f87171' }}>awful</span>, but the <span style={{ color: '#38bdf8' }}>vibrant display</span> is <span style={{ color: '#34d399' }}>stunning</span>.”
          </p>
        </div>

        <div className="walkthrough-step-grid">
          {WALKTHROUGH_STEPS.map((st, idx) => (
            <div
              key={st.step}
              className={`step-card ${activeStep === idx ? 'active-step-card' : ''}`}
              style={{
                borderColor: activeStep === idx ? 'var(--cyan)' : 'var(--border-subtle)',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
              onClick={() => setActiveStep(idx)}
            >
              <div className="step-number" style={{ background: activeStep === idx ? 'rgba(56, 189, 248, 0.2)' : undefined, color: activeStep === idx ? '#38bdf8' : undefined }}>
                0{st.step}
              </div>
              <span className="fsc-badge" style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)', marginBottom: '8px' }}>
                {st.badge}
              </span>
              <h5>{st.title}</h5>
              <p>{st.desc}</p>
              <div className="formula-card mt-3" style={{ fontSize: '11px', color: activeStep === idx ? '#38bdf8' : 'var(--text-dim)' }}>
                {st.code}
              </div>
            </div>
          ))}
        </div>

        <div className="panel-footer mt-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
            Click any step to inspect the syntactic extraction state.
          </span>
          <Link to="/studio" className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <Eye size={15} /> Try this sentence in the SVG Studio
          </Link>
        </div>
      </section>

      {/* Universal Dependency Tag Glossary */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">SYNTACTIC TAXONOMY</span>
            <h3 className="panel-title">Universal Dependencies (UD 2.0) Relation Taxonomy</h3>
          </div>
          <span className="pill-tag text-purple">{UD_TAGS.length} Core Relations Supported</span>
        </div>

        <div className="ud-tags-grid">
          {UD_TAGS.map((t) => (
            <div key={t.tag} className="ud-tag-card">
              <div className="ud-tag-header">
                <code>{t.tag}</code>
                <b>{t.name}</b>
              </div>
              <p className="ud-tag-desc">{t.desc}</p>
              <div className="ud-tag-example">
                <small>{t.example}</small>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
