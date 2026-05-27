/**
 * api.js - Camada de integração com o backend AIDoc (Render)
 */

const API_BASE = 'https://aidoc-4li5.onrender.com';

// ─── Token helpers ────────────────────────────────────────────────────────────

function getToken() {
    return localStorage.getItem('aidoc.token');
}

function setSession(data) {
    if (data.access_token) localStorage.setItem('aidoc.token', data.access_token);
    if (data.user) localStorage.setItem('aidoc.user', JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem('aidoc.token');
    localStorage.removeItem('aidoc.user');
}

function getStoredUser() {
    try { return JSON.parse(localStorage.getItem('aidoc.user')); } catch { return null; }
}

function isLoggedIn() {
    return !!getToken();
}

// ─── HTTP helper ──────────────────────────────────────────────────────────────

async function apiRequest(path, options = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', 'Accept': 'application/json', ...(options.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Erro ${res.status}`);
    }

    return res.json();
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

async function apiSignup(email, senha, nome) {
    const data = await apiRequest('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, senha, nome }),
    });
    setSession(data);
    return data;
}

async function apiLogin(email, senha) {
    const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, senha }),
    });
    setSession(data);
    return data;
}

function apiLogout() {
    clearSession();
}

// ─── Análise ──────────────────────────────────────────────────────────────────

async function analyzeExamText(payload) {
    return apiRequest('/analisar-texto', {
        method: 'POST',
        body: JSON.stringify(payload),
    });
}

async function analyzeExamFile(formData) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_BASE}/analisar`, { method: 'POST', headers, body: formData });
    if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }));
        throw new Error(err.detail || `Erro ${res.status}`);
    }
    return res.json();
}

async function apiChat(pergunta, contexto_exame, historico = []) {
    return apiRequest('/chat', {
        method: 'POST',
        body: JSON.stringify({ pergunta, contexto_exame, historico }),
    });
}

async function apiRecentExams(limit = 10) {
    return apiRequest(`/exames/recentes?limit=${limit}`);
}
