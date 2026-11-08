const API_BASE = "/api";

let token = () => localStorage.getItem("token");

export function setToken(t) {
  localStorage.setItem("token", t);
}

export function clearToken() {
  localStorage.removeItem("token");
}

export function getToken() {
  return localStorage.getItem("token");
}

async function request(path, opts = {}) {
  const headers = { ...opts.headers };
  if (!(opts.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const t = token();
  if (t) headers.Authorization = `Bearer ${t}`;
  const res = await fetch(API_BASE + path, { ...opts, headers });
  if (res.status === 401) {
    clearToken();
    if (window.location.pathname !== "/login") {
      window.location.replace("/login");
    }
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || `Request failed ${res.status}`);
  return data;
}

export const api = {
  post: (path, body, opts) =>
    request(path, {
      method: "POST",
      ...opts,
      body: typeof body === "string" || body instanceof FormData ? body : JSON.stringify(body),
    }),
  get: (path, opts) => request(path, { method: "GET", ...opts }),
  put: (path, body, opts) =>
    request(path, {
      method: "PUT",
      ...opts,
      body: JSON.stringify(body),
    }),
  del: (path, opts) => request(path, { method: "DELETE", ...opts }),
  setToken,
  clearToken,
  getToken,
};

export function maskEmail(email) {
  if (!email) return null;
  const [local, domain] = email.split("@");
  return `${local.charAt(0)}****@${domain}`;
}

export function maskPhone(phone) {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  return digits.length >= 4 ? `****${digits.slice(-4)}` : "****";
}
