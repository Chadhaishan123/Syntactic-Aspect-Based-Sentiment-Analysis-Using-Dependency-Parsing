/**
 * Dynamic API and WebSocket configuration for local dev and cloud deployment (e.g. Vercel + Render).
 *
 * In local development, API_BASE is empty so requests route through the Vite proxy (/api and /ws).
 * In production (e.g. Vercel), set VITE_API_URL and VITE_WS_URL to point to your backend.
 */
export const API_BASE = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

export function getWsUrl() {
  const configuredWs = import.meta.env.VITE_WS_URL;
  if (configuredWs) {
    const clean = configuredWs.replace(/\/+$/, '');
    return clean.endsWith('/ws/live') ? clean : `${clean}/ws/live`;
  }
  // Fallback to current host (works through local Vite proxy or same-domain deployment)
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}/ws/live`;
}
