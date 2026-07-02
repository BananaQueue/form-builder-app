// Central place to control API base path.
// In dev, Vite proxies /api/* -> Laravel. In production, the built app is
// served by Laravel, so PHP-compatible endpoints live at the same origin root.
export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '' : '/api');

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export function csrfHeaders(headers = {}) {
  return csrfToken
    ? { ...headers, 'X-CSRF-Token': csrfToken }
    : headers;
}

export function apiUrl(path) {
  if (!path) return API_BASE;
  return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

