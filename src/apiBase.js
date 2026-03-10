// Central place to control API base path.
// In dev, Vite proxies /api/* -> http://localhost/form-builder-api/*
// In prod, you can set VITE_API_BASE to your server path (e.g. "/form-builder-api").
export const API_BASE = import.meta.env.VITE_API_BASE ?? '/api';

export function apiUrl(path) {
  if (!path) return API_BASE;
  return path.startsWith('/') ? `${API_BASE}${path}` : `${API_BASE}/${path}`;
}

