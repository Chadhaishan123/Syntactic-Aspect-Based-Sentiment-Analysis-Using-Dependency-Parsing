import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Sparkles,
  Activity,
  Layers,
  BarChart3,
  BookOpen,
  Clock,
  Radio,
  X,
  Cpu,
  GitFork,
  Swords,
  FlaskConical,
  MessageSquare,
  ShieldAlert,
  Flame,
  Scale,
} from 'lucide-react';
import { useRealtime } from '../context/RealtimeContext';

const NAV_ITEMS = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/mining', label: 'Review Mining & Dealbreakers', icon: Flame, badge: 'HOT' },
  { to: '/compare', label: 'Battleground Duel', icon: Swords, badge: 'VS' },
  { to: '/simulator', label: 'What-If Grammar Simulator', icon: FlaskConical, badge: 'LAB' },
  { to: '/aspect-qa', label: 'Aspect-QA Engine', icon: MessageSquare, badge: 'AI' },
  { to: '/sarcasm', label: 'Sarcasm Shield', icon: ShieldAlert, badge: 'FILTER' },
  { to: '/analyze', label: 'Dependency Studio', icon: Sparkles },
  { to: '/live', label: 'Live Review Feed', icon: Activity, badge: 'LIVE' },
  { to: '/lab', label: 'Syntax Impact Lab', icon: Scale, badge: 'BENCH' },
];

export default function Sidebar({ isOpen, onClose }) {
  const { connected, latency, activeClients } = useRealtime();

  return (
    <aside className={`sidebar-container ${isOpen ? 'sidebar-open' : ''}`}>
      {/* Brand Logo */}
      <div className="brand-header">
        <div className="brand-icon-wrapper">
          <GitFork size={20} className="brand-icon" />
        </div>
        <div className="brand-text">
          <h2>Syntax<span>Sense</span></h2>
          <small>Universal Dependency ABSA</small>
        </div>
        {isOpen && (
          <button className="mobile-close-btn" onClick={onClose} aria-label="Close menu">
            <X size={18} />
          </button>
        )}
      </div>

      {/* Real-time Status Banner */}
      <div className="realtime-status-card">
        <div className="status-row">
          <span className={`status-dot ${connected ? 'dot-active' : 'dot-offline'}`} />
          <span className="status-text">{connected ? 'Live WS Connected' : 'Connecting WS...'}</span>
        </div>
        <div className="status-metrics">
          <span>⚡ {latency}ms latency</span>
          <span>👥 {activeClients} client{activeClients > 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="nav-links">
        <span className="nav-section-title">ENGINE NAVIGATION</span>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={onClose}
              className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
            >
              <Icon size={18} className="nav-item-icon" />
              <span className="nav-item-label">{item.label}</span>
              {item.badge && <span className="nav-item-badge">{item.badge}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Info */}
      <div className="sidebar-footer">
        <div className="engine-chip">
          <Cpu size={14} />
          <span>spaCy en_core_web_sm (UD 2.0)</span>
        </div>
        <div className="workspace-chip">
          <span>FastAPI 2.0 + WebSockets</span>
        </div>
      </div>
    </aside>
  );
}
