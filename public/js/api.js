/* ============================================================
   api.js — Valkyria frontend API client
   Cambiá API_URL al dominio de producción cuando deployés.
   ============================================================ */

const API_URL = (typeof window !== 'undefined' && window.location.hostname === 'localhost')
  ? 'http://localhost:3000'
  : '';

// ── Helpers ──────────────────────────────────────────────────

function getToken() { return localStorage.getItem('vlk-admin-token'); }

async function request(path, options = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || 'API error'), { status: res.status });
  }

  return res.json();
}

// ── Auth ─────────────────────────────────────────────────────

export async function login(email, password) {
  const data = await request('/api/site/auth', { method: 'POST', body: { email, password } });
  localStorage.setItem('vlk-admin-token', data.token);
  localStorage.setItem('vlk-admin-refresh', data.refresh);
  return data;
}

export async function logout() {
  localStorage.removeItem('vlk-admin-token');
  localStorage.removeItem('vlk-admin-refresh');
}

// ── Productos ─────────────────────────────────────────────────

export const getProducts    = (category) => request(`/api/site/products${category && category !== 'todos' ? `?category=${category}` : ''}`);
export const getProduct     = (id)       => request(`/api/site/products/${id}`);
export const createProduct  = (body)     => request('/api/site/products', { method: 'POST', body });
export const updateProduct  = (id, body) => request(`/api/site/products/${id}`, { method: 'PUT', body });
export const deleteProduct  = (id)       => request(`/api/site/products/${id}`, { method: 'DELETE' });

// ── Config ────────────────────────────────────────────────────

export const getConfig    = ()     => request('/api/site/config');
export const updateConfig = (body) => request('/api/site/config', { method: 'PUT', body });

// ── Testimonios ───────────────────────────────────────────────

export const getTestimonials    = ()         => request('/api/site/testimonials');
export const createTestimonial  = (body)     => request('/api/site/testimonials', { method: 'POST', body });
export const updateTestimonial  = (id, body) => request(`/api/site/testimonials/${id}`, { method: 'PUT', body });
export const deleteTestimonial  = (id)       => request(`/api/site/testimonials/${id}`, { method: 'DELETE' });
