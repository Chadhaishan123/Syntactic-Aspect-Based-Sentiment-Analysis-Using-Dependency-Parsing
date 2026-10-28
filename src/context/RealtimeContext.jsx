import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { API_BASE, getWsUrl } from '../apiConfig';

const RealtimeContext = createContext(null);

export function RealtimeProvider({ children }) {
  const [analyses, setAnalyses] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(null); // WebSocket round-trip (ms), measured
  const [activeClients, setActiveClients] = useState(1);
  const [streamingActive, setStreamingActive] = useState(true);
  const [sources, setSources] = useState([]);
  const [pollInterval, setPollInterval] = useState(null);
  const [lastEvent, setLastEvent] = useState(null);
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  // Fetch initial state via REST
  const fetchInitialState = useCallback(async () => {
    try {
      const [resAnalyses, resHealth, resAlerts] = await Promise.all([
        fetch(`${API_BASE}/api/analyses?limit=60`),
        fetch(`${API_BASE}/api/health`),
        fetch(`${API_BASE}/api/alerts/active`).catch(() => null)
      ]);
      if (resAnalyses.ok) {
        const data = await resAnalyses.json();
        setAnalyses(data);
      }
      if (resHealth.ok) {
        const health = await resHealth.json();
        setStreamingActive(health.realtime_streaming ?? true);
        setSources(health.sources || []);
        setPollInterval(health.poll_interval_seconds ?? null);
      }
      if (resAlerts && resAlerts.ok) {
        const alertsData = await resAlerts.json();
        if (alertsData.alerts) {
          setAlerts(alertsData.alerts);
        }
      }
    } catch (err) {
      console.warn('Initial fetch error:', err);
    }
  }, []);

  // Setup WebSocket connection
  useEffect(() => {
    fetchInitialState();

    let isMounted = true;
    const wsUrl = getWsUrl();

    function connect() {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!isMounted) return;
        setConnected(true);
        // Start latency ping
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            const start = performance.now();
            ws.send(JSON.stringify({ type: 'PING' }));
            ws._lastPingTime = start;
          }
        }, 5000);
      };

      ws.onmessage = (event) => {
        if (!isMounted) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'PONG') {
            if (ws._lastPingTime) {
              const roundTrip = Math.round(performance.now() - ws._lastPingTime);
              setLatency(roundTrip);
            }
          } else if (msg.type === 'INIT_STATE') {
            if (msg.data && msg.data.length) {
              setAnalyses((prev) => {
                const map = new Map();
                [...msg.data, ...prev].forEach((item) => map.set(item.id, item));
                return Array.from(map.values());
              });
            }
            if (msg.client_count) setActiveClients(msg.client_count);
            if (msg.sources) setSources(msg.sources);
            if (typeof msg.ingestion_active === 'boolean') setStreamingActive(msg.ingestion_active);
            if (msg.active_alerts && msg.active_alerts.length) {
              setAlerts(msg.active_alerts);
            }
          } else if (msg.type === 'SMART_ALERT') {
            const newAlert = msg.data;
            setAlerts((prev) => [newAlert, ...prev.filter((a) => a.id !== newAlert.id)].slice(0, 40));
          } else if (msg.type === 'SOURCE_STATUS') {
            setSources(msg.data || []);
          } else if (msg.type === 'INGESTION_STATE') {
            setStreamingActive(msg.active);
          } else if (msg.type === 'CLIENT_COUNT') {
            setActiveClients(msg.count);
          } else if (msg.type === 'NEW_ANALYSIS') {
            const item = msg.data;
            setLastEvent(item);
            setAnalyses((prev) => {
              if (prev.some((x) => x.id === item.id)) return prev;
              return [item, ...prev].slice(0, 150);
            });
          } else if (msg.type === 'RECORD_DELETED') {
            setAnalyses((prev) => prev.filter((x) => x.id !== msg.id));
          } else if (msg.type === 'HISTORY_CLEARED') {
            setAnalyses([]);
          }
        } catch (e) {
          console.error('WS parse error:', e);
        }
      };

      ws.onclose = () => {
        if (!isMounted) return;
        setConnected(false);
        clearInterval(pingIntervalRef.current);
        // Reconnect after 3s
        setTimeout(connect, 3000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      isMounted = false;
      clearInterval(pingIntervalRef.current);
      if (wsRef.current) wsRef.current.close();
    };
  }, [fetchInitialState]);

  // Actions
  const analyzeText = async (text, source = 'Manual Studio') => {
    const res = await fetch(`${API_BASE}/api/analyze`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    });
    if (!res.ok) {
      throw new Error(`Failed to analyze: ${res.statusText}`);
    }
    const data = await res.json();
    return data;
  };

  // Parse only (not saved, not broadcast) — for live-typing previews.
  const parseText = async (text, source = 'Live Preview') => {
    const res = await fetch(`${API_BASE}/api/parse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    });
    if (!res.ok) throw new Error(`Failed to parse: ${res.statusText}`);
    return await res.json();
  };

  const batchAnalyze = async (texts, source = 'Batch Inspector') => {
    const res = await fetch(`${API_BASE}/api/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texts, source }),
    });
    if (!res.ok) {
      throw new Error(`Batch analysis failed: ${res.statusText}`);
    }
    return await res.json();
  };

  const injectReview = async (text, source = 'Real-Time Ingestion') => {
    const res = await fetch(`${API_BASE}/api/stream/inject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, source }),
    });
    return await res.json();
  };

  const toggleStreaming = async (active) => {
    const res = await fetch(`${API_BASE}/api/stream/toggle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(active !== undefined ? { active } : {}),
    });
    if (res.ok) {
      const data = await res.json();
      setStreamingActive(data.streaming);
    }
  };

  const deleteAnalysis = async (id) => {
    await fetch(`${API_BASE}/api/analyses/${id}`, { method: 'DELETE' });
    setAnalyses((prev) => prev.filter((x) => x.id !== id));
  };

  const clearHistory = async () => {
    await fetch(`${API_BASE}/api/analyses`, { method: 'DELETE' });
    setAnalyses([]);
  };

  const acknowledgeAlert = async (id) => {
    try {
      await fetch(`${API_BASE}/api/alerts/acknowledge/${id}`, { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
  };

  const clearAlerts = async () => {
    try {
      await fetch(`${API_BASE}/api/alerts/clear`, { method: 'POST' });
    } catch (e) {
      console.warn(e);
    }
    setAlerts([]);
  };

  const unreadAlertsCount = alerts.filter((a) => !a.acknowledged).length;

  // Live aggregated analytics derived in real time
  const totalAnalyzed = analyses.length;
  const allAspects = analyses.flatMap((a) => a.aspects || []);
  const positiveAspects = allAspects.filter((a) => a.sentiment === 'positive').length;
  const negativeAspects = allAspects.filter((a) => a.sentiment === 'negative').length;
  const neutralAspects = allAspects.filter((a) => a.sentiment === 'neutral').length;
  const avgSentiment = analyses.length
    ? Math.round(analyses.reduce((acc, a) => acc + a.sentiment_score, 0) / analyses.length)
    : null;
  const timed = analyses.filter((a) => typeof a.latency_ms === 'number' && a.latency_ms > 0);
  const avgParseMs = timed.length
    ? Math.round((timed.reduce((acc, a) => acc + a.latency_ms, 0) / timed.length) * 10) / 10
    : null;
  const liveCount = analyses.filter((a) => a.origin === 'live').length;

  const aspectCounts = {};
  allAspects.forEach((a) => {
    aspectCounts[a.term] = (aspectCounts[a.term] || 0) + 1;
  });
  const topAspects = Object.entries(aspectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  return (
    <RealtimeContext.Provider
      value={{
        analyses,
        alerts,
        unreadAlertsCount,
        acknowledgeAlert,
        clearAlerts,
        connected,
        latency,
        activeClients,
        streamingActive,
        sources,
        pollInterval,
        lastEvent,
        analyzeText,
        parseText,
        batchAnalyze,
        injectReview,
        toggleStreaming,
        deleteAnalysis,
        clearHistory,
        stats: {
          totalAnalyzed,
          aspectsExtracted: allAspects.length,
          avgSentiment,
          avgParseMs,
          liveCount,
          positiveAspects,
          negativeAspects,
          neutralAspects,
          topAspects,
        },
      }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) {
    throw new Error('useRealtime must be used within RealtimeProvider');
  }
  return context;
}
