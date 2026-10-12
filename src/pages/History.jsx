import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Search,
  Filter,
  Download,
  Trash2,
  ExternalLink,
  Tag,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';

export default function History() {
  const { analyses, deleteAnalysis, clearHistory } = useRealtime();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSentiment, setFilterSentiment] = useState('all');

  const filtered = analyses.filter((item) => {
    const matchesSearch =
      item.text.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.source.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.aspects.some((a) => a.term.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterSentiment === 'positive') return item.sentiment_score >= 60;
    if (filterSentiment === 'negative') return item.sentiment_score <= 45;
    if (filterSentiment === 'neutral')
      return item.sentiment_score > 45 && item.sentiment_score < 60;

    return true;
  });

  const exportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(analyses, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `syntaxsense_history_${Date.now()}.json`);
    dlAnchor.click();
  };

  const exportCSV = () => {
    if (!analyses.length) return;
    const rows = [['ID', 'Timestamp', 'Source', 'Text', 'Overall Score', 'Aspects']];
    analyses.forEach((a) => {
      const aspStr = a.aspects
        .map((asp) => `${asp.term} (${asp.opinion}, ${asp.sentiment})`)
        .join('; ');
      rows.push([
        a.id,
        a.created_at,
        a.source,
        `"${a.text.replace(/"/g, '""')}"`,
        a.sentiment_score,
        `"${aspStr}"`,
      ]);
    });
    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', encodeURI(csvContent));
    dlAnchor.setAttribute('download', `syntaxsense_history_${Date.now()}.csv`);
    dlAnchor.click();
  };

  return (
    <div className="page-content">
      {/* Search & Actions Deck */}
      <div className="history-control-deck">
        <div className="search-box-wrap">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search by text, aspect (e.g. 'battery', 'display'), or source channel..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="history-deck-actions">
          <div className="filter-pill-group">
            <button
              className={`filter-btn ${filterSentiment === 'all' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('all')}
            >
              All ({analyses.length})
            </button>
            <button
              className={`filter-btn ${filterSentiment === 'positive' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('positive')}
            >
              Positive
            </button>
            <button
              className={`filter-btn ${filterSentiment === 'negative' ? 'filter-btn-active' : ''}`}
              onClick={() => setFilterSentiment('negative')}
            >
              Negative
            </button>
          </div>

          <div className="export-btn-group">
            <button className="btn-secondary btn-sm" onClick={exportCSV} title="Export CSV">
              <Download size={14} /> CSV
            </button>
            <button className="btn-secondary btn-sm" onClick={exportJSON} title="Export JSON">
              <Download size={14} /> JSON
            </button>
            {analyses.length > 0 && (
              <button
                className="btn-danger-sm"
                onClick={() => {
                  if (window.confirm('Clear all recorded analyses?')) clearHistory();
                }}
                title="Clear all"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="panel-card mt-6">
        <div className="panel-header">
          <div>
            <span className="panel-pre-title">PARSED AUDIT TRAIL</span>
            <h3 className="panel-title">{filtered.length} Historical Records</h3>
          </div>
        </div>

        <div className="history-table-container">
          <table className="history-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Channel / Source</th>
                <th>Statement Content</th>
                <th>Extracted Aspects</th>
                <th>Sentiment</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <span className="time-cell">
                        <Clock size={12} />
                        {new Date(item.created_at).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </td>
                    <td>
                      <span className="source-badge">{item.source}</span>
                    </td>
                    <td className="text-col">
                      <p className="statement-preview">{item.text}</p>
                    </td>
                    <td>
                      <div className="aspects-cell-chips">
                        {item.aspects.map((asp) => (
                          <span
                            key={asp.id || asp.term}
                            className={`chip-sentiment ${
                              asp.sentiment === 'positive'
                                ? 'chip-pos'
                                : asp.sentiment === 'negative'
                                ? 'chip-neg'
                                : 'chip-neu'
                            }`}
                          >
                            {asp.term} ({asp.sentiment})
                          </span>
                        ))}
                      </div>
                    </td>
                    <td>
                      <span
                        className={`history-score-pill ${
                          item.sentiment_score >= 60
                            ? 'score-pos'
                            : item.sentiment_score <= 45
                            ? 'score-neg'
                            : 'score-neu'
                        }`}
                      >
                        {item.sentiment_score}/100
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="action-icon-btn btn-view"
                          title="Inspect in Studio"
                          onClick={() => navigate('/analyze')}
                        >
                          <ExternalLink size={14} />
                        </button>
                        <button
                          className="action-icon-btn btn-del"
                          title="Delete Record"
                          onClick={() => deleteAnalysis(item.id)}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-slate">
                    No matching analysis records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
