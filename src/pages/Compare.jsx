import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Scale,
  Award,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  XCircle,
  Play,
  RotateCcw,
  ExternalLink,
  Layers,
  ChevronDown,
  ChevronUp,
  Cpu,
  Smartphone,
  Utensils,
  Edit3
} from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell
} from 'recharts';
import { API_BASE } from '../apiConfig';

export default function Compare() {
  const navigate = useNavigate();

  // State
  const [presets, setPresets] = useState([]);
  const [selectedPresetKey, setSelectedPresetKey] = useState('macbook_vs_xps');
  const [nameA, setNameA] = useState('MacBook Air M3');
  const [textsA, setTextsA] = useState('');
  const [nameB, setNameB] = useState('Dell XPS 13');
  const [textsB, setTextsB] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [activeCategoryFilter, setActiveCategoryFilter] = useState('all');

  // Load presets on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/compare/presets`)
      .then((r) => r.json())
      .then((data) => {
        if (data.presets && data.presets.length > 0) {
          setPresets(data.presets);
          loadPreset(data.presets[0].preset_data);
        }
      })
      .catch((err) => console.warn('Failed to load presets:', err));
  }, []);

  const loadPreset = (presetData) => {
    setNameA(presetData.name_a);
    setTextsA(presetData.texts_a.join('\n'));
    setNameB(presetData.name_b);
    setTextsB(presetData.texts_b.join('\n'));
    setComparisonResult(null);
  };

  const handleSelectPreset = (key) => {
    setSelectedPresetKey(key);
    const found = presets.find((p) => p.key === key);
    if (found && found.preset_data) {
      loadPreset(found.preset_data);
    }
  };

  const handleRunComparison = async () => {
    const listA = textsA.split('\n').map((s) => s.trim()).filter(Boolean);
    const listB = textsB.split('\n').map((s) => s.trim()).filter(Boolean);

    if (listA.length === 0 || listB.length === 0) {
      alert('Please provide at least one review sentence for each product.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name_a: nameA.trim() || 'Product A',
          texts_a: listA,
          name_b: nameB.trim() || 'Product B',
          texts_b: listB
        })
      });
      if (res.ok) {
        const data = await res.json();
        setComparisonResult(data);
      } else {
        alert('Comparison request failed. Please check backend status.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error connecting to backend comparison engine.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle row expansion for evidence quotes
  const toggleRow = (cat) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  };

  const filteredAspects = comparisonResult
    ? comparisonResult.aspect_comparisons.filter((item) => {
        if (activeCategoryFilter === 'winner_a') return item.winner === 'a';
        if (activeCategoryFilter === 'winner_b') return item.winner === 'b';
        if (activeCategoryFilter === 'tie') return item.winner === 'tie';
        return true;
      })
    : [];

  return (
    <div className="page-content compare-page">
      {/* Hero Header */}
      <section className="compare-hero">
        <div className="hero-pill">
          <Scale size={14} className="text-cyan" />
          <span>COMPETITIVE INTELLIGENCE & BENCHMARKING</span>
        </div>
        <h2 className="compare-title">
          Comparative <em>Product Aspect Benchmark</em>
        </h2>
        <p className="compare-sub">
          Syntactically contrasts customer sentiment across competing products. Automatically aligns shared
          aspect dimensions, measures lead margins, and isolates feature-by-feature advantages.
        </p>

        {/* Preset Selector Buttons */}
        <div className="preset-selector-row mt-4">
          <span className="preset-label">Benchmark Presets:</span>
          {presets.map((p) => (
            <button
              key={p.key}
              className={`preset-btn ${selectedPresetKey === p.key ? 'active' : ''}`}
              onClick={() => handleSelectPreset(p.key)}
            >
              {p.domain.includes('Laptop') ? <Cpu size={14} /> : p.domain.includes('Phone') ? <Smartphone size={14} /> : <Utensils size={14} />}
              <span>{p.title}</span>
            </button>
          ))}
          <button
            className={`preset-btn ${selectedPresetKey === 'custom' ? 'active' : ''}`}
            onClick={() => {
              setSelectedPresetKey('custom');
              setNameA('Custom Entity A');
              setTextsA('');
              setNameB('Custom Entity B');
              setTextsB('');
              setComparisonResult(null);
            }}
          >
            <Edit3 size={14} />
            <span>Custom Benchmark</span>
          </button>
        </div>
      </section>

      {/* Dual Input Panels */}
      <section className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">DATA INGESTION</span>
            <h3 className="panel-title">Review Corpus Input</h3>
          </div>
          <button
            className="btn-primary"
            onClick={handleRunComparison}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            {loading ? <span className="spinner-border" /> : <Scale size={16} />}
            <span>{loading ? 'Synthesizing Trees...' : 'Run Comparative Analysis'}</span>
          </button>
        </div>

        <div className="two-column-grid compare-inputs-grid">
          {/* Product A Card */}
          <div className="compare-input-card card-product-a">
            <div className="product-card-header">
              <span className="product-badge badge-a">ENTITY A (CYAN)</span>
              <input
                type="text"
                className="product-name-input"
                value={nameA}
                onChange={(e) => setNameA(e.target.value)}
                placeholder="Product A Name"
              />
            </div>
            <label className="input-label">Customer Reviews (One sentence per line):</label>
            <textarea
              className="compare-textarea"
              rows={8}
              value={textsA}
              onChange={(e) => setTextsA(e.target.value)}
              placeholder="Paste customer reviews for Product A..."
            />
            <div className="input-footer">
              <small>{textsA.split('\n').filter((x) => x.trim()).length} reviews queued</small>
            </div>
          </div>

          {/* Product B Card */}
          <div className="compare-input-card card-product-b">
            <div className="product-card-header">
              <span className="product-badge badge-b">ENTITY B (PURPLE)</span>
              <input
                type="text"
                className="product-name-input"
                value={nameB}
                onChange={(e) => setNameB(e.target.value)}
                placeholder="Product B Name"
              />
            </div>
            <label className="input-label">Customer Reviews (One sentence per line):</label>
            <textarea
              className="compare-textarea"
              rows={8}
              value={textsB}
              onChange={(e) => setTextsB(e.target.value)}
              placeholder="Paste customer reviews for Product B..."
            />
            <div className="input-footer">
              <small>{textsB.split('\n').filter((x) => x.trim()).length} reviews queued</small>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Results Section */}
      {comparisonResult && (
        <>
          {/* Verdict Banner */}
          <section className="panel-card mt-6 verdict-banner">
            <div className="verdict-header">
              <div className="verdict-winner-badge">
                <Award size={20} className="text-amber" />
                <span>OVERALL VERDICT</span>
              </div>
              <h3 className="verdict-title">
                {comparisonResult.winner === 'a' ? (
                  <>
                    <strong className="text-cyan">{comparisonResult.name_a}</strong> Leads by{' '}
                    <span className="lead-tag">+{comparisonResult.lead_margin}%</span>
                  </>
                ) : comparisonResult.winner === 'b' ? (
                  <>
                    <strong className="text-purple">{comparisonResult.name_b}</strong> Leads by{' '}
                    <span className="lead-tag">+{comparisonResult.lead_margin}%</span>
                  </>
                ) : (
                  <span>Dead Tie Across Shared Dimensions</span>
                )}
              </h3>
            </div>

            <div className="verdict-stats-row">
              <div className="verdict-score-box box-a">
                <span className="vsb-label">{comparisonResult.name_a} Overall</span>
                <span className="vsb-val text-cyan">{comparisonResult.overall_score_a}%</span>
                <small>{comparisonResult.total_aspects_a} aspects in {comparisonResult.total_reviews_a} reviews</small>
                {comparisonResult.strengths_a.length > 0 && (
                  <div className="strengths-tags">
                    {comparisonResult.strengths_a.map((s) => (
                      <span key={s} className="strength-pill pill-a">★ {s}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="vs-divider">
                <span>VS</span>
              </div>

              <div className="verdict-score-box box-b">
                <span className="vsb-label">{comparisonResult.name_b} Overall</span>
                <span className="vsb-val text-purple">{comparisonResult.overall_score_b}%</span>
                <small>{comparisonResult.total_aspects_b} aspects in {comparisonResult.total_reviews_b} reviews</small>
                {comparisonResult.strengths_b.length > 0 && (
                  <div className="strengths-tags">
                    {comparisonResult.strengths_b.map((s) => (
                      <span key={s} className="strength-pill pill-b">★ {s}</span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Visual Charts: Radar & Differential Bar */}
          <div className="two-column-grid mt-6">
            {/* Multi-Dimensional Dual Radar */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">DIMENSIONAL PROFILING</span>
                  <h4 className="panel-title">Shared Aspect Radar</h4>
                </div>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={comparisonResult.radar_data}>
                    <PolarGrid stroke="#334155" />
                    <PolarAngleAxis dataKey="category" stroke="#94a3b8" tick={{ fill: '#cbd5e1', fontSize: 11 }} />
                    <PolarRadiusAxis domain={[0, 100]} stroke="#475569" />
                    <Radar
                      name={comparisonResult.name_a}
                      dataKey={comparisonResult.name_a}
                      stroke="#38bdf8"
                      fill="#38bdf8"
                      fillOpacity={0.35}
                    />
                    <Radar
                      name={comparisonResult.name_b}
                      dataKey={comparisonResult.name_b}
                      stroke="#c084fc"
                      fill="#c084fc"
                      fillOpacity={0.35}
                    />
                    <Legend />
                    <Tooltip contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 8 }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Differential Delta Bar Chart */}
            <div className="panel-card">
              <div className="panel-header">
                <div>
                  <span className="panel-pre-title">NET DIFFERENTIAL (Δ)</span>
                  <h4 className="panel-title">Aspect Margin Advantage</h4>
                </div>
                <small style={{ color: 'var(--text-dim)' }}>Positive = {comparisonResult.name_a} · Negative = {comparisonResult.name_b}</small>
              </div>
              <div style={{ height: 320 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonResult.radar_data} layout="vertical">
                    <XAxis type="number" domain={[-100, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} />
                    <YAxis type="category" dataKey="category" stroke="#94a3b8" width={110} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val) => [
                        `${val > 0 ? `+${val}% for ${comparisonResult.name_a}` : `${Math.abs(val)}% for ${comparisonResult.name_b}`}`,
                        'Net Advantage'
                      ]}
                      contentStyle={{ background: '#0f172a', borderColor: '#334155', borderRadius: 8 }}
                    />
                    <Bar dataKey="delta" radius={[4, 4, 4, 4]}>
                      {comparisonResult.radar_data.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.delta >= 0 ? '#38bdf8' : '#c084fc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Detailed Aspect-by-Aspect Scorecard & Evidence */}
          <section className="panel-card mt-6">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">SYNTACTIC AUDIT TRAIL</span>
                <h3 className="panel-title">Feature-by-Feature Differential Matrix</h3>
              </div>
              <div className="filter-pill-group">
                <button
                  className={`filter-pill ${activeCategoryFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter('all')}
                >
                  All ({comparisonResult.aspect_comparisons.length})
                </button>
                <button
                  className={`filter-pill ${activeCategoryFilter === 'winner_a' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter('winner_a')}
                >
                  {comparisonResult.name_a} Wins
                </button>
                <button
                  className={`filter-pill ${activeCategoryFilter === 'winner_b' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter('winner_b')}
                >
                  {comparisonResult.name_b} Wins
                </button>
                <button
                  className={`filter-pill ${activeCategoryFilter === 'tie' ? 'active' : ''}`}
                  onClick={() => setActiveCategoryFilter('tie')}
                >
                  Ties
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="differential-matrix-table">
                <thead>
                  <tr>
                    <th>Aspect Dimension</th>
                    <th>{comparisonResult.name_a} Score</th>
                    <th>{comparisonResult.name_b} Score</th>
                    <th>Advantage Winner</th>
                    <th>Differential</th>
                    <th>Syntactic Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAspects.map((item) => {
                    const isExpanded = expandedRows.has(item.category);
                    return (
                      <React.Fragment key={item.category}>
                        <tr className="matrix-row" onClick={() => toggleRow(item.category)} style={{ cursor: 'pointer' }}>
                          <td>
                            <strong>{item.category}</strong>
                            <div style={{ fontSize: '11px', color: 'var(--text-dim)' }}>
                              {item.mentions_a} vs. {item.mentions_b} mentions
                            </div>
                          </td>
                          <td>
                            <div className="score-meter-wrap">
                              <span className="score-val text-cyan">{item.score_a}%</span>
                              <div className="meter-bar">
                                <div className="meter-fill fill-cyan" style={{ width: `${item.score_a}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            <div className="score-meter-wrap">
                              <span className="score-val text-purple">{item.score_b}%</span>
                              <div className="meter-bar">
                                <div className="meter-fill fill-purple" style={{ width: `${item.score_b}%` }} />
                              </div>
                            </div>
                          </td>
                          <td>
                            {item.winner === 'a' ? (
                              <span className="winner-tag tag-a">
                                <CheckCircle2 size={12} /> {comparisonResult.name_a}
                              </span>
                            ) : item.winner === 'b' ? (
                              <span className="winner-tag tag-b">
                                <CheckCircle2 size={12} /> {comparisonResult.name_b}
                              </span>
                            ) : (
                              <span className="winner-tag tag-tie">
                                <Minus size={12} /> Tie / Parity
                              </span>
                            )}
                          </td>
                          <td>
                            <span className={`delta-val ${item.delta > 0 ? 'text-cyan' : item.delta < 0 ? 'text-purple' : 'text-dim'}`}>
                              {item.delta > 0 ? `+${item.delta}%` : `${item.delta}%`}
                            </span>
                          </td>
                          <td>
                            <button className="btn-icon-subtle">
                              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Evidence Quote Row */}
                        {isExpanded && (
                          <tr className="evidence-expanded-row">
                            <td colSpan={6}>
                              <div className="evidence-container">
                                <div className="evidence-col col-a">
                                  <span className="evidence-header text-cyan">
                                    {comparisonResult.name_a} Grammatical Evidence:
                                  </span>
                                  {item.sample_quote_a ? (
                                    <>
                                      <p className="evidence-quote">“{item.sample_quote_a}”</p>
                                      {item.dependency_path_a && (
                                        <div className="evidence-path">
                                          <code>{item.dependency_path_a}</code>
                                        </div>
                                      )}
                                      <button
                                        className="btn-tiny-studio"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate('/studio', { state: { text: item.sample_quote_a } });
                                        }}
                                      >
                                        <ExternalLink size={12} /> Inspect Tree in Studio
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-dim">No direct mentions found in Entity A corpus.</span>
                                  )}
                                </div>

                                <div className="evidence-col col-b">
                                  <span className="evidence-header text-purple">
                                    {comparisonResult.name_b} Grammatical Evidence:
                                  </span>
                                  {item.sample_quote_b ? (
                                    <>
                                      <p className="evidence-quote">“{item.sample_quote_b}”</p>
                                      {item.dependency_path_b && (
                                        <div className="evidence-path">
                                          <code>{item.dependency_path_b}</code>
                                        </div>
                                      )}
                                      <button
                                        className="btn-tiny-studio"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          navigate('/studio', { state: { text: item.sample_quote_b } });
                                        }}
                                      >
                                        <ExternalLink size={12} /> Inspect Tree in Studio
                                      </button>
                                    </>
                                  ) : (
                                    <span className="text-dim">No direct mentions found in Entity B corpus.</span>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
