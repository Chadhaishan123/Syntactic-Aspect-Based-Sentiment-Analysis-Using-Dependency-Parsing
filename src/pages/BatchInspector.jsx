import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE } from '../apiConfig';
import {
  Layers,
  Award,
  Play,
  CheckCircle,
  FileText,
  Download,
  Sparkles,
  BarChart2,
  AlertCircle,
  Clock,
  ExternalLink,
  Target,
  Zap,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useRealtime } from '../context/RealtimeContext';

export default function BatchInspector() {
  const { batchAnalyze } = useRealtime();
  const navigate = useNavigate();

  // Mode tab: 'evaluation' or 'custom'
  const [activeTab, setActiveTab] = useState('evaluation');

  // Evaluation states
  const [evalDatasets, setEvalDatasets] = useState([]);
  const [selectedDataset, setSelectedDataset] = useState('semeval14_laptops');
  const [sampleLimit, setSampleLimit] = useState(50);
  const [evalRunning, setEvalRunning] = useState(false);
  const [evalReport, setEvalReport] = useState(null);

  // Custom batch states
  const [customTexts, setCustomTexts] = useState('');
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchResults, setBatchResults] = useState([]);

  // Fetch available gold datasets
  useEffect(() => {
    fetch(`${API_BASE}/api/evaluation/datasets`)
      .then((r) => r.json())
      .then((d) => setEvalDatasets(d.datasets || []))
      .catch((err) => console.error(err));
  }, []);

  // Run official evaluation
  const handleRunEvaluation = async () => {
    setEvalRunning(true);
    setEvalReport(null);
    try {
      const res = await fetch(`${API_BASE}/api/evaluation/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dataset_key: selectedDataset, limit: sampleLimit }),
      });
      if (res.ok) {
        const report = await res.json();
        setEvalReport(report);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEvalRunning(false);
    }
  };

  // Run custom batch
  const handleRunCustom = async () => {
    const lines = customTexts
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 3);
    if (!lines.length) return;
    setBatchRunning(true);
    setBatchResults([]);
    try {
      const res = await batchAnalyze(lines, 'Custom Batch');
      setBatchResults(res.items || []);
    } catch (err) {
      console.error(err);
    } finally {
      setBatchRunning(false);
    }
  };

  const exportBatchCSV = () => {
    if (!batchResults.length) return;
    const rows = [['ID', 'Source', 'Text', 'Score', 'Aspects']];
    batchResults.forEach((r) => {
      const aspString = r.aspects.map((a) => `${a.term} (${a.sentiment})`).join('; ');
      rows.push([r.id, r.source, `"${r.text.replace(/"/g, '""')}"`, r.sentiment_score, `"${aspString}"`]);
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `syntaxsense_batch_${Date.now()}.csv`);
    link.click();
  };

  return (
    <div className="page-content">
      {/* Top Tab Bar */}
      <div className="eval-tab-bar">
        <button
          className={`eval-tab-btn ${activeTab === 'evaluation' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('evaluation')}
        >
          <Award size={16} />
          <span>SemEval-2014 Gold Benchmark Evaluation</span>
        </button>
        <button
          className={`eval-tab-btn ${activeTab === 'custom' ? 'tab-btn-active' : ''}`}
          onClick={() => setActiveTab('custom')}
        >
          <Layers size={16} />
          <span>Custom Multi-Line Batch Processing</span>
        </button>
      </div>

      {activeTab === 'evaluation' ? (
        <>
          {/* Evaluation Setup Card */}
          <div className="panel-card mt-4">
            <div className="panel-header">
              <div>
                <span className="panel-pre-title">ACADEMIC GOLD STANDARDS</span>
                <h3 className="panel-title">SemEval-2014 Task 4 Evaluation Suite</h3>
              </div>
              <span className="panel-badge">Official Test Annotations</span>
            </div>

            <div className="eval-setup-grid">
              {/* Dataset Selector */}
              <div className="eval-option-group">
                <label className="eval-label">Target Evaluation Benchmark:</label>
                <div className="benchmark-options">
                  <label
                    className={`benchmark-option ${
                      selectedDataset === 'semeval14_laptops' ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="ds"
                      checked={selectedDataset === 'semeval14_laptops'}
                      onChange={() => setSelectedDataset('semeval14_laptops')}
                    />
                    <div className="bm-text">
                      <b>SemEval-2014 Task 4 (Laptops Test)</b>
                      <span>800 reviews · 1,033 gold aspect targets · Consumer Hardware</span>
                    </div>
                  </label>

                  <label
                    className={`benchmark-option ${
                      selectedDataset === 'semeval14_restaurants' ? 'active' : ''
                    }`}
                  >
                    <input
                      type="radio"
                      name="ds"
                      checked={selectedDataset === 'semeval14_restaurants'}
                      onChange={() => setSelectedDataset('semeval14_restaurants')}
                    />
                    <div className="bm-text">
                      <b>SemEval-2014 Task 4 (Restaurants Test)</b>
                      <span>800 reviews · 1,328 gold aspect targets · Hospitality & Dining</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Sample Size Selector & Run Button */}
              <div className="eval-controls-group">
                <label className="eval-label">Evaluation Slice Size:</label>
                <div className="sample-size-pills">
                  {[25, 50, 100, 200, 400].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`size-pill ${sampleLimit === num ? 'size-pill-active' : ''}`}
                      onClick={() => setSampleLimit(num)}
                    >
                      {num} sentences
                    </button>
                  ))}
                </div>

                <button
                  className="btn-primary w-full mt-4"
                  disabled={evalRunning}
                  onClick={handleRunEvaluation}
                >
                  <Play size={16} />
                  <span>
                    {evalRunning ? 'Evaluating Universal Dependencies…' : 'Run Gold Evaluation'}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Evaluation Results Report */}
          {evalReport && (
            <div className="eval-results-container mt-6">
              {/* Scorecard KPI Cards */}
              <div className="kpi-grid">
                <div className="kpi-card">
                  <span className="kpi-label">ASPECT EXTRACTION F1 (RELAXED)</span>
                  <h3 className="kpi-value text-cyan">
                    {evalReport.relaxed_match_metrics.f1}%
                  </h3>
                  <span className="kpi-subtext">
                    P: {evalReport.relaxed_match_metrics.precision}% · R: {evalReport.relaxed_match_metrics.recall}%
                  </span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-label">ASPECT EXTRACTION F1 (EXACT)</span>
                  <h3 className="kpi-value text-purple">
                    {evalReport.exact_match_metrics.f1}%
                  </h3>
                  <span className="kpi-subtext">
                    P: {evalReport.exact_match_metrics.precision}% · R: {evalReport.exact_match_metrics.recall}%
                  </span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-label">SENTIMENT ACCURACY (MATCHED)</span>
                  <h3 className="kpi-value text-emerald">
                    {evalReport.sentiment_classification.accuracy}%
                  </h3>
                  <span className="kpi-subtext">
                    {evalReport.sentiment_classification.correct_sentiment} of {evalReport.sentiment_classification.matched_aspects} correct
                  </span>
                </div>

                <div className="kpi-card">
                  <span className="kpi-label">EVALUATION SPEED</span>
                  <h3 className="kpi-value text-amber">
                    {evalReport.sentences_per_second}<small>sents/s</small>
                  </h3>
                  <span className="kpi-subtext">
                    {evalReport.sample_size} sentences in {evalReport.elapsed_seconds}s
                  </span>
                </div>
              </div>

              {/* Confusion Matrix Table */}
              <div className="panel-card mt-6">
                <div className="panel-header">
                  <div>
                    <span className="panel-pre-title">POLARITY CLASSIFICATION CONFUSION MATRIX</span>
                    <h3 className="panel-title">Ground Truth vs Dependency Predicted Polarity</h3>
                  </div>
                </div>

                <div className="matrix-table-wrap">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th>Ground Truth Polarity</th>
                        <th>Pred: Positive</th>
                        <th>Pred: Negative</th>
                        <th>Pred: Neutral</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['positive', 'negative', 'neutral', 'conflict'].map((gold) => {
                        const row = evalReport.sentiment_classification.confusion_matrix[gold] || {};
                        return (
                          <tr key={gold}>
                            <td><b>{gold.toUpperCase()}</b></td>
                            <td className={row.positive ? 'cell-val' : 'cell-zero'}>{row.positive || 0}</td>
                            <td className={row.negative ? 'cell-val' : 'cell-zero'}>{row.negative || 0}</td>
                            <td className={row.neutral ? 'cell-val' : 'cell-zero'}>{row.neutral || 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Sentence-by-Sentence Detailed Comparison */}
              <div className="panel-card mt-6">
                <div className="panel-header">
                  <div>
                    <span className="panel-pre-title">DETAILED PER-SENTENCE INSPECTION</span>
                    <h3 className="panel-title">Gold Aspects vs Syntactic Predictions</h3>
                  </div>
                </div>

                <div className="batch-table-container">
                  <table className="batch-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Review Sentence</th>
                        <th>Gold Aspects (Ground Truth)</th>
                        <th>Predicted Aspects (Dependency Tree)</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evalReport.detailed_results.map((row, idx) => (
                        <tr key={idx}>
                          <td><code>{idx + 1}</code></td>
                          <td className="text-statement">{row.sentence}</td>
                          <td>
                            <div className="aspects-cell-chips">
                              {row.gold_aspects.map((g, g_i) => (
                                <span key={g_i} className="chip-sentiment chip-pos">
                                  ★ {g.term} ({g.polarity})
                                </span>
                              ))}
                            </div>
                          </td>
                          <td>
                            <div className="aspects-cell-chips">
                              {row.predicted_aspects.length ? (
                                row.predicted_aspects.map((p, p_i) => (
                                  <span
                                    key={p_i}
                                    className={`chip-sentiment ${
                                      p.sentiment === 'positive'
                                        ? 'chip-pos'
                                        : p.sentiment === 'negative'
                                        ? 'chip-neg'
                                        : 'chip-neu'
                                    }`}
                                  >
                                    ⚙ {p.term} ← {p.opinion} ({p.sentiment})
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate">None extracted</span>
                              )}
                            </div>
                          </td>
                          <td>
                            <button
                              className="action-icon-btn btn-view"
                              title="Test in Syntactic Studio"
                              onClick={() => {
                                navigate('/analyze');
                              }}
                            >
                              <ExternalLink size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        /* Custom Batch Processing Mode */
        <div className="panel-card mt-4">
          <div className="panel-header">
            <div>
              <span className="panel-pre-title">UNANNOTATED BATCH PROCESSING</span>
              <h3 className="panel-title">Paste Multiple Reviews (1 per line)</h3>
            </div>
            {batchResults.length > 0 && (
              <button className="btn-secondary btn-sm" onClick={exportBatchCSV}>
                <Download size={14} /> Export CSV
              </button>
            )}
          </div>

          <textarea
            className="batch-textarea"
            rows={6}
            value={customTexts}
            onChange={(e) => setCustomTexts(e.target.value)}
            placeholder="Paste multiple customer reviews (one per line)...&#10;The camera is extraordinary, but the battery drains fast.&#10;Customer support was polite and resolved the issue promptly."
          />

          <button
            className="btn-primary mt-4"
            disabled={batchRunning || !customTexts.trim()}
            onClick={handleRunCustom}
          >
            <Sparkles size={16} />
            <span>{batchRunning ? 'Processing Batch…' : 'Process Custom Batch'}</span>
          </button>

          {batchResults.length > 0 && (
            <div className="batch-table-container mt-6">
              <table className="batch-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Sentence</th>
                    <th>Aspects Extracted</th>
                    <th>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {batchResults.map((r, i) => (
                    <tr key={r.id}>
                      <td><code>{i + 1}</code></td>
                      <td className="text-statement">{r.text}</td>
                      <td>
                        <div className="aspects-cell-chips">
                          {r.aspects.map((a) => (
                            <span key={a.id || a.term} className="chip-sentiment chip-pos">
                              {a.term}: {a.opinion} ({a.sentiment})
                            </span>
                          ))}
                        </div>
                      </td>
                      <td><b>{r.sentiment_score}</b></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
