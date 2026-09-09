const tokenKey = "lajeadense-admin-token";
const userKey = "lajeadense-admin-user";
const loginView = document.getElementById("admin-login-view");
const dashboardView = document.getElementById("admin-dashboard-view");
const loginForm = document.getElementById("admin-login-form");
const loginError = document.getElementById("admin-login-error");
const tbody = document.getElementById("admin-tbody");
const empty = document.getElementById("admin-empty");
const search = document.getElementById("admin-search");
const dateFrom = document.getElementById("admin-date-from");
const dateTo = document.getElementById("admin-date-to");
const nameFilter = document.getElementById("admin-name-filter");
const clientFilter = document.getElementById("admin-client-filter");
const statusFilter = document.getElementById("admin-status-filter");
let registros = [];
const STATUS_LIST = ["Aberta", "Pendente", "Em análise", "Em tratamento", "Resolvido", "Resolvida"];
let statusChart = null;

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
  statusFilter.innerHTML = '<option value="">Todos</option>' + [...new Set(registros.map((item) => item.status || "Pendente"))].sort().map((status) => `<option value="${escapeHtml(status)}">${escapeHtml(status)}</option>`).join("");
  render();
}

function render() {
  const term = search.value.trim().toLowerCase();
  const nameTerm = nameFilter.value.trim().toLowerCase();
  const clientTerm = clientFilter.value.trim().toLowerCase();
  const from = dateFrom.value;
  const to = dateTo.value;
  const selectedStatus = statusFilter.value;
  const filtered = registros.filter((item) => {
    const data = item.data || "";
    const searchable = [item.causa, item.descricao, item.observacao].join(" ").toLowerCase();
    return (!term || searchable.includes(term)) && (!nameTerm || (item.responsavel || "").toLowerCase().includes(nameTerm)) && (!clientTerm || (item.cliente || "").toLowerCase().includes(clientTerm)) && (!from || data >= from) && (!to || data <= to) && (!selectedStatus || (item.status || "Pendente") === selectedStatus);
  });
  const clients = new Set(filtered.map((item) => item.cliente).filter(Boolean));
  const open = filtered.filter((item) => !["Resolvido", "Resolvida"].includes(item.status)).length;
  const resolved = filtered.filter((item) => ["Resolvido", "Resolvida"].includes(item.status)).length;
  document.getElementById("admin-total").textContent = filtered.length;
  document.getElementById("admin-open").textContent = open;
  document.getElementById("admin-resolved").textContent = resolved;
  document.getElementById("admin-clients").textContent = clients.size;
  document.getElementById("admin-count").textContent = `${filtered.length} registro${filtered.length === 1 ? "" : "s"}`;
  empty.hidden = filtered.length > 0;
  tbody.innerHTML = filtered.map((item) => `<tr><td><strong>${escapeHtml(item.id || "-")}</strong></td><td>${escapeHtml([item.data, item.hora].filter(Boolean).join(" "))}</td><td>${escapeHtml(item.responsavel)}</td><td>${escapeHtml([item.causa, item.descricao].filter(Boolean).join(": "))}</td><td>${escapeHtml(item.cliente)}</td><td>${escapeHtml(item.observacao || "-")}</td><td><select class="admin-status" data-id="${escapeHtml(item.id)}">${STATUS_LIST.map((status) => `<option value="${status}" ${status === (item.status || "Pendente") ? "selected" : ""}>${status}</option>`).join("")}</select></td></tr>`).join("");
  tbody.querySelectorAll(".admin-status").forEach((select) => select.addEventListener("change", () => updateStatus(select)));
  renderIndicators(filtered);
}

function renderIndicators(source = registros) {
  const counts = {};
  source.forEach((item) => { const key = item.causa || "Outro"; counts[key] = (counts[key] || 0) + 1; });
  const causes = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = causes[0]?.[1] || 1;
  document.getElementById("admin-causes-chart").innerHTML = causes.length ? causes.map(([label, count]) => `<div class="admin-bar-row"><span title="${escapeHtml(label)}">${escapeHtml(label)}</span><i><b style="width:${Math.round((count / max) * 100)}%"></b></i><strong>${count}</strong></div>`).join("") : '<span class="admin-muted">Nenhum registro ainda.</span>';

  const statusCounts = {};
  source.forEach((item) => { const key = item.status || "Pendente"; statusCounts[key] = (statusCounts[key] || 0) + 1; });
  const labels = Object.keys(statusCounts);
  const data = labels.map((label) => statusCounts[label]);
  const colors = ["#2f80ed", "#e0a324", "#e8712a", "#1e9e5a", "#d11b24", "#8b929c"];
  if (statusChart) statusChart.destroy();
  statusChart = new Chart(document.getElementById("admin-status-chart"), { type: "doughnut", data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] }, options: { cutout: "65%", plugins: { legend: { display: false } }, maintainAspectRatio: false } });
  document.getElementById("admin-status-legend").innerHTML = labels.map((label, index) => `<span><i style="background:${colors[index]}"></i>${escapeHtml(label)} <strong>${data[index]}</strong></span>`).join("");
}

async function updateStatus(select) {
  const previous = registros.find((item) => item.id === select.dataset.id)?.status || "Pendente";
  select.disabled = true;
  try {
    const response = await fetch(`/api/admin-registros?id=${encodeURIComponent(select.dataset.id)}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${sessionStorage.getItem(tokenKey)}` }, body: JSON.stringify({ status: select.value }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Não foi possível atualizar o status.");
    const item = registros.find((record) => record.id === select.dataset.id);
    if (item) item.status = select.value;
  } catch (error) {
    select.value = previous;
    alert(error.message);
  } finally {
    select.disabled = false;
  }
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
[search, dateFrom, dateTo, nameFilter, clientFilter, statusFilter].forEach((control) => control.addEventListener("input", render));
document.getElementById("admin-clear-filters").addEventListener("click", () => { [search, dateFrom, dateTo, nameFilter, clientFilter, statusFilter].forEach((control) => { control.value = ""; }); render(); });
sessionStorage.removeItem(tokenKey);
sessionStorage.removeItem(userKey);
