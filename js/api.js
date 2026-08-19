const API_BASE = (window.API_BASE || "http://localhost:3000").replace(/\/$/, "");
const TOKEN_KEY = "divinenet_crm_token";
const USER_KEY = "divinenet_crm_user";

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function getSessionUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch (error) {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function apiRequest(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...options.headers };
  const token = getToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });

  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    clearSession();
    throw new Error(body.message || "Authentication required");
  }

  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  return body;
}

function apiLogin(email, password) {
  return apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
}

function apiGet(path) {
  return apiRequest(path);
}

function apiPost(path, data) {
  return apiRequest(path, { method: "POST", body: JSON.stringify(data) });
}

function apiPut(path, data) {
  return apiRequest(path, { method: "PUT", body: JSON.stringify(data) });
}

function apiDelete(path) {
  return apiRequest(path, { method: "DELETE" });
}