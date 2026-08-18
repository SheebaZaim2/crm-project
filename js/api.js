const API_BASE = (window.API_BASE || "http://localhost:3000").replace(/\/$/, "");

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(body.message || `Request failed (${response.status})`);
  }

  return body;
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