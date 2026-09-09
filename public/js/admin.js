const tokenKey = "lajeadense-admin-token";
const userKey = "lajeadense-admin-user";
const loginView = document.getElementById("admin-login-view");
const dashboardView = document.getElementById("admin-dashboard-view");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");
const tbody = document.getElementById("admin-tbody");
const empty = document.getElementById("admin-empty");
const search = document.getElementById("admin-search");
let registros = [];

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
}

function showLoginError(message) {
  loginError.textContent = message;
  loginError.hidden = false;
}

async function login(event) {
  event.preventDefault();
  loginError.hidden = true;
  const button = loginForm.querySelector("button");
  button.disabled = true;
  try {
    const response = await fetch("/api/admin-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user: document.getElementById("admin-user").value.trim(), password: document.getElementById("admin-password").value }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível entrar.");
    sessionStorage.setItem(tokenKey, data.token);
    sessionStorage.setItem(userKey, data.user);
    await showDashboard();
  } catch (error) {
    showLoginError(error.message);
  } finally {
    button.disabled = false;
  }
}

async function showDashboard() {
  loginView.hidden = true;
  dashboardView.hidden = false;
  document.getElementById("admin-session-user").textContent = sessionStorage.getItem(userKey) || "Administrador";
  await loadRecords();
}

async function loadRecords() {
  const response = await fetch("/api/admin-registros", { headers: { Authorization: `Bearer ${sessionStorage.getItem(tokenKey)}` } });
  const data = await response.json();
  if (response.status === 401) {
    logout();
    showLoginError(data.error || "Sessão expirada.");
    return;
  }
  if (!response.ok) throw new Error(data.error || "Não foi possível carregar os registros.");
  registros = data.registros || [];
  render();
}

function render() {
  const term = search.value.trim().toLowerCase();
  const filtered = registros.filter((item) => [item.data, item.hora, item.responsavel, item.causa, item.descricao, item.cliente, item.observacao].join(" ").toLowerCase().includes(term));
  const clients = new Set(registros.map((item) => item.cliente).filter(Boolean));
  const causes = new Set(registros.map((item) => item.causa).filter(Boolean));
  document.getElementById("admin-total").textContent = registros.length;
  document.getElementById("admin-clients").textContent = clients.size;
  document.getElementById("admin-causes").textContent = causes.size;
  document.getElementById("admin-count").textContent = `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`;
  empty.hidden = filtered.length > 0;
  tbody.innerHTML = filtered.map((item) => `<tr><td>${escapeHtml([item.data, item.hora].filter(Boolean).join(" "))}</td><td>${escapeHtml(item.responsavel)}</td><td>${escapeHtml([item.causa, item.descricao].filter(Boolean).join(": "))}</td><td>${escapeHtml(item.cliente)}</td><td>${escapeHtml(item.observacao || "-")}</td></tr>`).join("");
}

function logout() {
  sessionStorage.removeItem(tokenKey);
  sessionStorage.removeItem(userKey);
  dashboardView.hidden = true;
  loginView.hidden = false;
}

loginForm.addEventListener("submit", login);
document.getElementById("admin-refresh").addEventListener("click", () => loadRecords().catch((error) => showLoginError(error.message)));
document.getElementById("admin-logout").addEventListener("click", logout);
search.addEventListener("input", render);
sessionStorage.removeItem(tokenKey);
sessionStorage.removeItem(userKey);
