import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu, Play, Pause, Bell, Plus, CheckCircle, Radio } from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';

const ROUTE_INFO = {
  '/': { title: 'Executive Sentiment Pulse', subtitle: 'Universal Dependency Aspect Analytics & Real-Time Monitoring' },
  '/analyze': { title: 'Syntactic ABSA Studio', subtitle: 'Interactive Universal Dependency Tree & Aspect-Opinion Extraction' },
  '/live': { title: 'Real-Time Intelligence Stream', subtitle: 'Live Review Ingestion, WebSockets Broadcast & Stream Simulation' },
  '/batch': { title: 'Batch Inspector & SemEval Benchmarks', subtitle: 'Multi-Text Processing, File Uploads & Cross-Domain Evaluation' },
  '/insights': { title: 'Aspect Intelligence & Matrix', subtitle: 'Multidimensional Radar Profiling & Polarity Distributions' },
  '/methodology': { title: 'Syntactic Engine Novelty & Theory', subtitle: 'Shortest Dependency Paths, Valence Shifting & Grammar Rules' },
  '/history': { title: 'Audit Trail & Export Hub', subtitle: 'Real-Time Parsed Archives, Query Filters & Export Options' },
};

export default function Header({ onOpenMobileMenu }) {
  const location = useLocation();
  const { streamingActive, toggleStreaming, lastEvent, connected, latency } = useRealtime();
  const [showInjectModal, setShowInjectModal] = useState(false);
  const [injectText, setInjectText] = useState('');
  const [injectSource, setInjectSource] = useState('Live Broadcaster');
  const [injecting, setInjecting] = useState(false);
  const { injectReview } = useRealtime();

  const current = ROUTE_INFO[location.pathname] || {
    title: 'SyntaxSense ABSA',
    subtitle: 'Dependency-Aware Aspect Sentiment Analysis Engine',
  };

  const handleInject = async (e) => {
    e.preventDefault();
    if (!injectText.trim()) return;
    setInjecting(true);
    try {
      await injectReview(injectText.trim(), injectSource);
      setInjectText('');
      setShowInjectModal(false);
    } catch (err) {
      console.error(err);
    } finally {
      setInjecting(false);
    }
  };

  return (
    <header className="app-header">
      <div className="header-left">
        <button className="mobile-toggle-btn" onClick={onOpenMobileMenu} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <div>
          <div className="header-pre-title">
            <Radio size={12} className={connected ? 'pulse-fast text-emerald' : 'text-slate'} />
            <span>REAL-TIME SYNTACTIC SENTIMENT PLATFORM</span>
          </div>
          <h1 className="header-title">{current.title}</h1>
        </div>
      </div>

      <div className="header-actions">
        {/* Stream Simulation Toggle */}
        <button
          className={`stream-toggle-btn ${streamingActive ? 'stream-active' : 'stream-paused'}`}
          onClick={() => toggleStreaming()}
          title={streamingActive ? 'Pause automated stream simulation' : 'Resume automated stream simulation'}
        >
          {streamingActive ? <Pause size={14} /> : <Play size={14} />}
          <span>{streamingActive ? 'Simulation Live' : 'Simulation Paused'}</span>
        </button>

        {/* Quick Inject Review Button */}
        <button className="quick-inject-btn" onClick={() => setShowInjectModal(true)}>
          <Plus size={15} />
          <span>Broadcast Review</span>
        </button>

        {/* User / Workspace indicator */}
        <div className="workspace-badge">
          <span className="user-avatar">SS</span>
          <span className="workspace-name">v2.0 Realtime</span>
        </div>
      </div>

      {/* Inject Modal */}
      {showInjectModal && (
        <div className="modal-backdrop" onClick={() => setShowInjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Broadcast Real-Time Review</h3>
              <p>Inject feedback directly into the active WebSocket broadcast stream.</p>
            </div>
            <form onSubmit={handleInject}>
              <div className="form-group">
                <label>Review Content</label>
                <textarea
                  rows={4}
                  required
                  placeholder="e.g., The noise cancellation is breathtaking, but the battery drains too quickly."
                  value={injectText}
                  onChange={(e) => setInjectText(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Source / Channel</label>
                <input
                  type="text"
                  value={injectSource}
                  onChange={(e) => setInjectSource(e.target.value)}
                  placeholder="e.g. Amazon, App Store, X"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowInjectModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={injecting}>
                  {injecting ? 'Broadcasting...' : 'Broadcast to Stream'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </header>
  );
}
