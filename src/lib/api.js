// src/lib/api.js
// Central place for backend connectivity + shared helpers.
// Every field/name here is deliberately kept 1:1 with the FastAPI backend
// (schema.py / schemachat.py / routes/*.py) so the two stay compatible.

// Override with a .env file (VITE_BACKEND_URL=http://your-ip:8000) if needed.
export const BACKEND_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_BACKEND_URL) ||
  'http://10.42.0.1:8000';

export const WS_BASE_URL = BACKEND_BASE_URL.replace(/^http/, 'ws');

// ---------------------------------------------------------------------------
// JWT helpers
// ---------------------------------------------------------------------------
export const decodeJwtToken = (token) => {
  try {
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    console.error('Failed to decode JWT:', e);
    return null;
  }
};

export const isTokenExpired = (decoded) => {
  if (!decoded || !decoded.exp) return true;
  return Date.now() >= decoded.exp * 1000;
};

// ---------------------------------------------------------------------------
// REST helper (retries + normalizes FastAPI error payloads)
// ---------------------------------------------------------------------------
export const sendRequest = async (url, options = {}) => {
  let attempts = 0;
  const maxAttempts = 3;
  const baseDelay = 800;

  while (attempts < maxAttempts) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      const data =
        text && (text.startsWith('{') || text.startsWith('['))
          ? JSON.parse(text)
          : { raw_response: text };

      if (!response.ok) {
        throw new Error(data.detail || data.msg || data.raw_response || `HTTP ${response.status}`);
      }
      return data;
    } catch (error) {
      const isLast = attempts === maxAttempts - 1;
      const isHttpError = error.message && (error.message.startsWith('HTTP') || error.message.length < 200);
      if (isLast) {
        if (isHttpError) throw error;
        throw new Error(`Could not reach the server at ${url}. Is the backend running and reachable?`);
      }
      await new Promise((r) => setTimeout(r, baseDelay * 2 ** attempts));
      attempts++;
    }
  }
};

export const authedFetch = (token, path, options = {}) =>
  sendRequest(`${BACKEND_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

// ---------------------------------------------------------------------------
// Permission bits — mirrors chats.py `has_perm(bits, n) = bits & (1 << (n-1))`
// ---------------------------------------------------------------------------
export const PERMISSION_BITS = [
  { bit: 1, value: 1, key: 'member', label: 'Channel Member', description: 'Visible as part of this channel' },
  { bit: 2, value: 2, key: 'read', label: 'Read Messages', description: 'Can load & view channel messages' },
  { bit: 3, value: 4, key: 'send', label: 'Send Messages', description: 'Can post new messages' },
  { bit: 4, value: 8, key: 'deleteOwn', label: 'Delete Own Messages', description: 'Can delete their own messages' },
  { bit: 7, value: 64, key: 'viewDeleted', label: 'View Deleted Content', description: 'Sees real text of deleted messages' },
  { bit: 8, value: 128, key: 'editHistory', label: 'View Edit History', description: 'Sees the full edit chain of a message' },
  { bit: 9, value: 256, key: 'moderate', label: 'Delete Others\u2019 Messages', description: 'Moderator-level delete rights' },
];

export const PERMISSION_PRESETS = {
  member: { label: 'Member (read + send)', value: 1 | 2 | 4 },
  readOnly: { label: 'Read only', value: 1 | 2 },
  moderator: { label: 'Moderator (full control)', value: 1 | 2 | 4 | 8 | 64 | 128 | 256 },
};

export const hasPerm = (bits, n) => Boolean((bits || 0) & (1 << (n - 1)));
export const canRead = (bits) => hasPerm(bits, 2);
export const canSend = (bits) => hasPerm(bits, 3);
export const canDeleteOwn = (bits) => hasPerm(bits, 4);
export const canViewDeleted = (bits) => hasPerm(bits, 7);
export const canViewEditHistory = (bits) => hasPerm(bits, 8);
export const canModerate = (bits) => hasPerm(bits, 9);

// ---------------------------------------------------------------------------
// Misc formatting helpers
// ---------------------------------------------------------------------------
export const initialsOf = (name = '') =>
  (name || '?').trim().slice(0, 2).toUpperCase() || '?';

export const formatTime = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatDay = (ts) => {
  const d = ts ? new Date(ts) : new Date();
  if (isNaN(d.getTime())) return '';
  const today = new Date();
  const isToday = d.toDateString() === today.toDateString();
  const yest = new Date(today);
  yest.setDate(yest.getDate() - 1);
  const isYesterday = d.toDateString() === yest.toDateString();
  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
};
