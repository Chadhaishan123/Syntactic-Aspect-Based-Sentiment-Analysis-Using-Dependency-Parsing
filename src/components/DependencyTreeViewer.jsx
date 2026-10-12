import React, { useState, useMemo } from 'react';
import { Eye, Info, Sparkles, Zap, HelpCircle } from 'lucide-react';

export default function DependencyTreeViewer({
  tokens = [],
  arcs = [],
  aspects = [],
  activeAspectId = null,
  onSelectAspect = () => {},
}) {
  const [hoveredToken, setHoveredToken] = useState(null);
  const [highlightPathsOnly, setHighlightPathsOnly] = useState(false);
  const [showPos, setShowPos] = useState(true);

  // Find active aspect details
  const activeAspect = useMemo(
    () => aspects.find((a) => a.id === activeAspectId),
    [aspects, activeAspectId]
  );

  // Active path token set and arc set
  const activePathTokens = useMemo(() => {
    if (!activeAspect) return new Set();
    return new Set(activeAspect.shortest_path_nodes || []);
  }, [activeAspect]);

  const activeAspectTokens = useMemo(() => {
    if (!activeAspect) return new Set();
    return new Set(activeAspect.aspect_token_ids || []);
  }, [activeAspect]);

  const activeOpinionTokens = useMemo(() => {
    if (!activeAspect) return new Set();
    return new Set(activeAspect.opinion_token_ids || []);
  }, [activeAspect]);

  // Dimensions & layout calculations
  const TOKEN_WIDTH = 84;
  const START_X = 50;
  const BASE_Y = 180;
  const totalWidth = Math.max(860, tokens.length * TOKEN_WIDTH + 100);

  // Calculate coordinates for each token
  const tokenCoords = useMemo(() => {
    const coords = {};
    tokens.forEach((t, i) => {
      coords[t.id] = {
        x: START_X + i * TOKEN_WIDTH,
        y: BASE_Y,
      };
    });
    return coords;
  }, [tokens]);

  // Color mapping for POS tags
  const posColors = {
    NOUN: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
    PROPN: { bg: 'rgba(56, 189, 248, 0.15)', text: '#38bdf8', border: 'rgba(56, 189, 248, 0.4)' },
    ADJ: { bg: 'rgba(52, 211, 153, 0.15)', text: '#34d399', border: 'rgba(52, 211, 153, 0.4)' },
    VERB: { bg: 'rgba(167, 139, 250, 0.15)', text: '#a78bfa', border: 'rgba(167, 139, 250, 0.4)' },
    ADV: { bg: 'rgba(251, 191, 36, 0.15)', text: '#fbbf24', border: 'rgba(251, 191, 36, 0.4)' },
    DET: { bg: 'rgba(156, 163, 175, 0.15)', text: '#9ca3af', border: 'rgba(156, 163, 175, 0.3)' },
    CCONJ: { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },
    SCONJ: { bg: 'rgba(244, 114, 182, 0.15)', text: '#f472b6', border: 'rgba(244, 114, 182, 0.3)' },
    PUNCT: { bg: 'rgba(107, 114, 128, 0.1)', text: '#6b7280', border: 'rgba(107, 114, 128, 0.2)' },
  };

  const defaultPosColor = { bg: 'rgba(148, 163, 184, 0.15)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' };

  if (!tokens || tokens.length === 0) {
    return (
      <div className="empty-tree-state">
        <Sparkles size={28} className="empty-icon" />
        <p>Type feedback above to generate a real-time Universal Dependency tree.</p>
      </div>
    );
  }

  return (
    <div className="dependency-viewer-container">
      <div className="tree-toolbar">
        <div className="toolbar-left">
          <span className="live-tag">
            <Zap size={14} className="pulse-fast" /> Universal Dependency Parse (spaCy)
          </span>
          <span className="token-count-tag">{tokens.length} tokens · {arcs.length} syntactic arcs</span>
        </div>
        <div className="toolbar-controls">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={showPos}
              onChange={(e) => setShowPos(e.target.checked)}
            />
            <span>POS Badges</span>
          </label>
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={highlightPathsOnly}
              onChange={(e) => setHighlightPathsOnly(e.target.checked)}
            />
            <span>Highlight Paths Only</span>
          </label>
        </div>
      </div>

      {/* SVG Dependency Canvas */}
      <div className="tree-scroll-wrapper">
        <svg
          className="dependency-svg"
          width={totalWidth}
          height={BASE_Y + 90}
          viewBox={`0 0 ${totalWidth} ${BASE_Y + 90}`}
        >
          <defs>
            <marker
              id="arrow-regular"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#64748b" />
            </marker>
            <marker
              id="arrow-highlight"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#a855f7" />
            </marker>
            <marker
              id="arrow-aspect"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="7"
              markerHeight="7"
              orient="auto-start-reverse"
            >
              <path d="M 0 1 L 10 5 L 0 9 z" fill="#38bdf8" />
            </marker>
            <linearGradient id="highlight-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>
          </defs>

          {/* Render Dependency Arcs */}
          {arcs.map((arc) => {
            const startCoord = tokenCoords[arc.start];
            const endCoord = tokenCoords[arc.end];
            if (!startCoord || !endCoord) return null;

            const x1 = startCoord.x;
            const x2 = endCoord.x;
            const distance = Math.abs(arc.start - arc.end);

            // Calculate arch height proportional to word distance
            const arcHeight = Math.min(145, 32 + distance * 20);
            const peakY = BASE_Y - arcHeight;
            const midX = (x1 + x2) / 2;

            // Check if this arc belongs to the active aspect shortest path
            const isInActivePath =
              activeAspect &&
              activePathTokens.has(arc.start) &&
              activePathTokens.has(arc.end);

            const isDimmed = highlightPathsOnly && !isInActivePath && !arc.is_aspect_path;

            // SVG Path
            const pathData = `M ${x1} ${BASE_Y - 26} C ${x1} ${peakY}, ${x2} ${peakY}, ${x2} ${BASE_Y - 26}`;

            return (
              <g
                key={arc.id}
                className={`dependency-arc ${isInActivePath ? 'arc-active' : ''} ${
                  isDimmed ? 'arc-dimmed' : ''
                }`}
              >
                {/* Arc stroke line */}
                <path
                  d={pathData}
                  fill="none"
                  stroke={
                    isInActivePath
                      ? 'url(#highlight-grad)'
                      : arc.is_aspect_path
                      ? '#a855f7'
                      : 'rgba(100, 116, 139, 0.45)'
                  }
                  strokeWidth={isInActivePath ? 3 : arc.is_aspect_path ? 2.2 : 1.4}
                  strokeDasharray={arc.label === 'punct' ? '3 3' : 'none'}
                  markerEnd={
                    isInActivePath
                      ? 'url(#arrow-highlight)'
                      : arc.is_aspect_path
                      ? 'url(#arrow-aspect)'
                      : 'url(#arrow-regular)'
                  }
                />

                {/* Arc relation tag pill */}
                <g transform={`translate(${midX}, ${peakY})`}>
                  <rect
                    x="-24"
                    y="-12"
                    width="48"
                    height="18"
                    rx="9"
                    fill={isInActivePath ? '#2e1065' : '#1e2235'}
                    stroke={
                      isInActivePath
                        ? '#c084fc'
                        : arc.is_aspect_path
                        ? '#818cf8'
                        : 'rgba(148, 163, 184, 0.25)'
                    }
                    strokeWidth={isInActivePath ? 1.5 : 1}
                  />
                  <text
                    x="0"
                    y="1"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isInActivePath ? '#f3e8ff' : '#cbd5e1'}
                    fontSize="9"
                    fontFamily="DM Mono, monospace"
                    fontWeight="600"
                  >
                    {arc.label}
                  </text>
                </g>
              </g>
            );
          })}

          {/* Render Tokens */}
          {tokens.map((token) => {
            const coord = tokenCoords[token.id];
            if (!coord) return null;

            const isAspectTarget = activeAspectTokens.has(token.id) || token.is_aspect;
            const isOpinionTarget = activeOpinionTokens.has(token.id) || token.is_opinion;
            const isInPath = activePathTokens.has(token.id);
            const isHovered = hoveredToken?.id === token.id;

            const posStyle = posColors[token.pos] || defaultPosColor;

            return (
              <g
                key={`tok-${token.id}`}
                transform={`translate(${coord.x}, ${coord.y})`}
                className={`token-node ${isHovered ? 'node-hovered' : ''}`}
                onMouseEnter={() => setHoveredToken(token)}
                onMouseLeave={() => setHoveredToken(null)}
              >
                {/* Node highlight ring if part of aspect or opinion */}
                {(isAspectTarget || isOpinionTarget || isInPath) && (
                  <circle
                    cx="0"
                    cy="-22"
                    r="18"
                    fill={
                      isAspectTarget
                        ? 'rgba(56, 189, 248, 0.2)'
                        : isOpinionTarget
                        ? 'rgba(244, 63, 94, 0.2)'
                        : 'rgba(168, 85, 247, 0.15)'
                    }
                    stroke={
                      isAspectTarget
                        ? '#38bdf8'
                        : isOpinionTarget
                        ? '#f43f5e'
                        : '#c084fc'
                    }
                    strokeWidth="1.5"
                    className="pulse-node"
                  />
                )}

                {/* Vertical attachment tick */}
                <line x1="0" y1="-26" x2="0" y2="-12" stroke="#475569" strokeWidth="1.5" />

                {/* Token Text */}
                <text
                  x="0"
                  y="4"
                  textAnchor="middle"
                  fill={
                    isAspectTarget
                      ? '#38bdf8'
                      : isOpinionTarget
                      ? '#f43f5e'
                      : token.is_negation
                      ? '#fb7185'
                      : '#f1f5f9'
                  }
                  fontSize="13"
                  fontWeight={isAspectTarget || isOpinionTarget ? '700' : '500'}
                  fontFamily="Manrope, sans-serif"
                >
                  {token.text}
                </text>

                {/* Token Lemma (subtext) */}
                <text
                  x="0"
                  y="20"
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="9"
                  fontFamily="DM Mono, monospace"
                >
                  {token.lemma.toLowerCase() !== token.text.toLowerCase() ? token.lemma : ''}
                </text>

                {/* POS Tag Badge */}
                {showPos && (
                  <g transform="translate(0, 36)">
                    <rect
                      x="-20"
                      y="-8"
                      width="40"
                      height="16"
                      rx="4"
                      fill={posStyle.bg}
                      stroke={posStyle.border}
                      strokeWidth="1"
                    />
                    <text
                      x="0"
                      y="1"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={posStyle.text}
                      fontSize="8.5"
                      fontFamily="DM Mono, monospace"
                      fontWeight="700"
                    >
                      {token.pos}
                    </text>
                  </g>
                )}

                {/* Dependency Tag beneath POS */}
                <text
                  x="0"
                  y={showPos ? 58 : 34}
                  textAnchor="middle"
                  fill="#64748b"
                  fontSize="8"
                  fontFamily="DM Mono, monospace"
                >
                  dep: {token.dep}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Token Inspector Detail Card on Hover */}
      {hoveredToken && (
        <div className="token-inspector-card">
          <div className="inspector-header">
            <b>{hoveredToken.text}</b>
            <span className="inspector-pos" style={{ color: (posColors[hoveredToken.pos] || defaultPosColor).text }}>
              {hoveredToken.pos} ({hoveredToken.tag})
            </span>
          </div>
          <div className="inspector-body">
            <span>Lemma: <code>{hoveredToken.lemma}</code></span>
            <span>Relation: <code>{hoveredToken.dep}</code></span>
            <span>Head ID: <code>#{hoveredToken.head_id} ({tokens.find(t => t.id === hoveredToken.head_id)?.text || 'ROOT'})</code></span>
            {hoveredToken.is_negation && <span className="negation-badge">⚠️ Negation Shifter</span>}
            {hoveredToken.is_aspect && <span className="aspect-badge">🏷️ Aspect Target</span>}
            {hoveredToken.is_opinion && <span className="opinion-badge">💡 Opinion Modifier</span>}
          </div>
        </div>
      )}

      {/* Legend & Syntactic Shortest Path Bar */}
      <div className="tree-footer">
        <div className="legend-items">
          <span className="legend-item"><i className="legend-dot aspect-dot" /> Aspect Node</span>
          <span className="legend-item"><i className="legend-dot opinion-dot" /> Opinion Node</span>
          <span className="legend-item"><i className="legend-dot path-dot" /> Shortest Dependency Path</span>
          <span className="legend-item"><i className="legend-dot neg-dot" /> Negation Inversion</span>
        </div>
        {activeAspect && (
          <div className="active-path-display">
            <span className="path-label">Syntactic Traversal:</span>
            <code>{activeAspect.dependency_path}</code>
          </div>
        )}
      </div>
    </div>
  );
}
