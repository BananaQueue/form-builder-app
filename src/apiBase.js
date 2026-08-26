// Central place to control API base path.
// In dev, Vite proxies /api/* -> Laravel. In production, the built app is
// served by Laravel, so PHP-compatible endpoints live at the same origin root.
export const API_BASE = import.meta.env.VITE_API_BASE ?? (import.meta.env.PROD ? '' : '/api');

let csrfToken = null;

export function setCsrfToken(token) {
  csrfToken = token || null;
}

export function csrfHeaders(headers = {}) {
  if (!csrfToken) {
    // Every mutating request needs this token; without it the request still
    // goes out (unchanged behavior - callers already handle a failed
    // response) but is guaranteed to come back as a 419 the UI can only
    // show as a generic "failed" message. This was silent until now, which
    // is exactly what let a real bug (the token never being refreshed after
    // logout) go unnoticed. The remaining case this can't fix by itself is
    // a real Laravel session expiring while the tab stays open - by the
    // time that happens the token was valid when set, so this warning
    // won't fire for it; only the server's 419 response reveals that one.
    console.error('csrfHeaders() called with no CSRF token set - the request will be rejected. This usually means the session was never established or was cleared without a fresh /api/session fetch.');
  }
  return csrfToken
    ? { ...headers, 'X-CSRF-Token': csrfToken }
    : headers;
}

export function apiUrl(path) {
  if (!path) return API_BASE;
  return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

