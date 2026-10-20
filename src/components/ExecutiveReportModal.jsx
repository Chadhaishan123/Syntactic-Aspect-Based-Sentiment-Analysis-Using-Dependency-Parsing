import React, { useState, useEffect } from 'react';
import {
  FileText,
  Printer,
  Download,
  Share2,
  X,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Award,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { API_BASE } from '../apiConfig';

export default function ExecutiveReportModal({ isOpen, onClose, analyses = [] }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [reportTitle, setReportTitle] = useState('Aspect-Based Sentiment Intelligence Brief');

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    fetch(`${API_BASE}/api/reports/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: reportTitle,
        organization: 'SyntaxSense Universal Dependencies Analytics',
        analyses: analyses.map((a) => ({
          sentiment_score: a.sentiment_score ?? a.score ?? 50,
          text: a.text,
          source: a.source || 'Audit Stream',
          aspects: a.aspects || []
        }))
      })
    })
      .then((r) => r.json())
      .then((data) => setReport(data))
      .catch((err) => console.error('Failed to generate executive report:', err))
      .finally(() => setLoading(false));
  }, [isOpen, analyses]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadMarkdown = () => {
    if (!report || !report.markdown_content) return;
    const blob = new Blob([report.markdown_content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SyntaxSense_Report_${report.report_id}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    if (!report || !report.syntactic_audit_trail) return;
    const headers = ['Target Aspect', 'Polarity', 'Opinion Modifier', 'Dependency Route', 'Confidence', 'Review Snippet', 'Source'];
    const rows = report.syntactic_audit_trail.map((a) => [
      `"${a.aspect}"`,
      `"${a.sentiment}"`,
      `"${a.opinion}"`,
      `"${a.dependency_path}"`,
      a.confidence,
      `"${a.review_snippet.replace(/"/g, '""')}"`,
      `"${a.source}"`
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `SyntaxSense_AuditTrail_${report.report_id}.csv`;
    a.click();
  };

  const handleCopyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="report-modal-backdrop" onClick={onClose}>
      <div className="report-modal-dialog" onClick={(e) => e.stopPropagation()}>
        {/* Top Control Toolbar (Hidden in print) */}
        <div className="report-modal-toolbar no-print">
          <div className="toolbar-left">
            <FileText size={18} className="text-cyan" />
            <span className="toolbar-title">Executive Intelligence Brief</span>
            {report && <span className="report-pill-id">{report.report_id}</span>}
          </div>

          <div className="toolbar-actions">
            <button className="toolbar-btn btn-print" onClick={handlePrint} title="Print / Save to PDF">
              <Printer size={15} />
              <span>Print / PDF</span>
            </button>
            <button className="toolbar-btn" onClick={handleDownloadMarkdown} title="Download Markdown Dossier">
              <Download size={15} />
              <span>Markdown</span>
            </button>
            <button className="toolbar-btn" onClick={handleDownloadCSV} title="Download Audit CSV">
              <Download size={15} />
              <span>CSV</span>
            </button>
            <button className="toolbar-btn" onClick={handleCopyShareLink} title="Copy Shareable Link">
              {copied ? <Check size={15} className="text-emerald" /> : <Share2 size={15} />}
              <span>{copied ? 'Copied Link!' : 'Share Link'}</span>
            </button>
            <button className="toolbar-close-btn" onClick={onClose} aria-label="Close modal">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Printable Executive Dossier Content */}
        <div className="report-printable-document">
          {loading ? (
            <div className="report-loading-state">
              <span className="spinner-border" />
              <p>Synthesizing Executive Sentiment Intelligence & SWOT Breakdown...</p>
            </div>
          ) : report ? (
            <>
              {/* Document Header */}
              <header className="report-doc-header">
                <div className="report-brand-meta">
                  <span className="doc-type-tag">SYNTACTIC ABSA EXECUTIVE INTELLIGENCE DOSSIER</span>
                  <h1 className="report-doc-title">{report.title}</h1>
                  <p className="report-doc-subtitle">
                    Generated on {report.generated_at} · Document ID: <code>{report.report_id}</code> · Universal Dependencies v2.1
                  </p>
                </div>
              </header>

              {/* KPI Scorecard */}
              <section className="report-scorecard-grid">
                <div className="scorecard-box box-health">
                  <span className="scorecard-label">Overall Health Score</span>
                  <div className="scorecard-val-row">
                    <span className="scorecard-number">{report.overall_health_score}%</span>
                    <span className="rating-pill">{report.health_rating}</span>
                  </div>
                  <small>Based on {report.sample_count} parsed review items</small>
                </div>

                <div className="scorecard-box">
                  <span className="scorecard-label">Positive Aspects</span>
                  <span className="scorecard-number text-emerald">
                    {report.positive_aspects.length}
                  </span>
                  <small>Aspects with favorable polarity bias</small>
                </div>

                <div className="scorecard-box">
                  <span className="scorecard-label">Negative Friction</span>
                  <span className="scorecard-number text-ruby">
                    {report.negative_aspects.length}
                  </span>
                  <small>Aspects with critical negative complaints</small>
                </div>

                <div className="scorecard-box">
                  <span className="scorecard-label">Neutral / Parity</span>
                  <span className="scorecard-number text-dim">
                    {report.neutral_aspects.length}
                  </span>
                  <small>Balanced or objective features</small>
                </div>
              </section>

              {/* Executive Summary */}
              <section className="report-section-card mt-6">
                <h3 className="section-heading">1. Executive Overview</h3>
                <p className="executive-summary-text">{report.executive_summary}</p>
              </section>

              {/* Strategic SWOT Grid */}
              <section className="report-section-card mt-6">
                <h3 className="section-heading">2. Strategic SWOT Analysis (Syntactic Aspect Extraction)</h3>
                <div className="swot-quadrant-grid">
                  <div className="swot-card swot-strengths">
                    <div className="swot-card-header">
                      <span className="swot-indicator text-emerald">●</span>
                      <strong>STRENGTHS (Core Positive Drivers)</strong>
                    </div>
                    <ul>
                      {report.swot_summary.Strengths?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="swot-card swot-weaknesses">
                    <div className="swot-card-header">
                      <span className="swot-indicator text-ruby">●</span>
                      <strong>WEAKNESSES (Friction & Pain Points)</strong>
                    </div>
                    <ul>
                      {report.swot_summary.Weaknesses?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="swot-card swot-opportunities">
                    <div className="swot-card-header">
                      <span className="swot-indicator text-cyan">●</span>
                      <strong>OPPORTUNITIES (Market Differentiation)</strong>
                    </div>
                    <ul>
                      {report.swot_summary.Opportunities?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="swot-card swot-threats">
                    <div className="swot-card-header">
                      <span className="swot-indicator text-amber">●</span>
                      <strong>THREATS (Churn & Retention Risks)</strong>
                    </div>
                    <ul>
                      {report.swot_summary.Threats?.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {/* Aspect Inventory Table */}
              <section className="report-section-card mt-6">
                <h3 className="section-heading">3. Aspect Dimension Scorecard</h3>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Aspect Dimension</th>
                        <th>Total Mentions</th>
                        <th>Pos / Neg / Neu</th>
                        <th>Positive Bias</th>
                        <th>Top Modifier Opinions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...report.positive_aspects, ...report.negative_aspects, ...report.neutral_aspects].map((asp, idx) => (
                        <tr key={idx}>
                          <td><strong>{asp.term}</strong></td>
                          <td>{asp.total_mentions}</td>
                          <td>
                            <span className="text-emerald">+{asp.positive_count}</span> /{' '}
                            <span className="text-ruby">-{asp.negative_count}</span> /{' '}
                            <span className="text-dim">={asp.neutral_count}</span>
                          </td>
                          <td>
                            <div className="score-meter-wrap">
                              <span className="score-val">{asp.score_pct}%</span>
                              <div className="meter-bar">
                                <div
                                  className={`meter-fill ${asp.score_pct >= 60 ? 'fill-cyan' : 'fill-purple'}`}
                                  style={{ width: `${asp.score_pct}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td><span className="opinion-tag-list">{asp.top_opinions}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Syntactic Evidence Audit Trail */}
              <section className="report-section-card mt-6">
                <h3 className="section-heading">4. Universal Dependency Audit Trail (Top 10 Evidence Paths)</h3>
                <div className="table-responsive">
                  <table className="report-table">
                    <thead>
                      <tr>
                        <th>Target Aspect</th>
                        <th>Polarity</th>
                        <th>Syntactic Opinion Route</th>
                        <th>Customer Context Snippet</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.syntactic_audit_trail.slice(0, 10).map((audit, i) => (
                        <tr key={i}>
                          <td><strong>{audit.aspect}</strong></td>
                          <td>
                            <span className={`sentiment-badge badge-${audit.sentiment}`}>
                              {audit.sentiment.toUpperCase()}
                            </span>
                          </td>
                          <td>
                            <code className="path-code">{audit.dependency_path}</code>
                          </td>
                          <td>
                            <span className="review-quote-text">“{audit.review_snippet}”</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Document Sign-off Footer */}
              <footer className="report-doc-footer mt-8">
                <div className="footer-line">
                  <span>SyntaxSense Automated Intelligence Briefing System</span>
                  <span>SpaCy en_core_web_sm Universal Dependency Parser</span>
                </div>
              </footer>
            </>
          ) : (
            <div className="report-empty-state">
              <p>Unable to generate report. Please ensure analysis history contains records.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
