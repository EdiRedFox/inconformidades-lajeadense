import { getIdentity, clearIdentity } from "./session.js";
import { initials, showToast } from "./utils.js";
import { fetchRegistros } from "./api.js";
import { renderRegistrar } from "./view-registrar.js";
import { renderMinhas } from "./view-minhas.js";
import { renderPainel } from "./view-painel.js";

const identity = getIdentity();
if (!identity) {
  window.location.replace("index.html");
}

const NAV_ITEMS = [
  {
    key: "registrar",
    label: "Registrar",
    title: "Registrar Inconformidade",
    sub: "Preencha os dados abaixo para registrar uma nova ocorrência.",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>',
  },
  {
    key: "minhas",
    label: "Minhas Inconformidades",
    title: "Minhas Inconformidades",
    sub: "Ocorrências registradas por você.",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"/></svg>',
  },
  {
    key: "painel",
    label: "Painel",
    title: "Painel de Inconformidades",
    sub: "Indicadores gerais de qualidade da Lajeadense Vidros.",
    icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  },
];

const state = {
  view: "registrar",
  registros: [],
  loading: false,
};

const sidebarNav = document.getElementById("sidebar-nav");
const mobileNav = document.getElementById("mobile-nav");
const viewTitle = document.getElementById("view-title");
const viewSub = document.getElementById("view-sub");
const THEME_KEY = "lajeadense-theme";

function themeIcon(theme) {
  return theme === "dark"
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/></svg><span>Claro</span>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/></svg><span>Escuro</span>';
}

function setTheme(theme) {
  const activeTheme = theme === "dark" ? "dark" : "light";
  document.body.dataset.theme = activeTheme;
  localStorage.setItem(THEME_KEY, activeTheme);
  const nextTheme = activeTheme === "dark" ? "light" : "dark";
  document.querySelectorAll(".theme-toggle").forEach((button) => {
    button.innerHTML = themeIcon(activeTheme);
    button.title = nextTheme === "dark" ? "Ativar tema escuro" : "Ativar tema claro";
    button.setAttribute("aria-label", nextTheme === "dark" ? "Ativar tema escuro" : "Ativar tema claro");
  });
}

function toggleTheme() {
  setTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
}

function buildNav(container) {
  container.innerHTML = "";
  for (const item of NAV_ITEMS) {
    const btn = document.createElement("button");
    btn.className = "nav-item";
    btn.dataset.view = item.key;
    btn.innerHTML = `${item.icon}<span>${item.label}</span>`;
    btn.addEventListener("click", () => switchView(item.key));
    container.appendChild(btn);
  }
}
buildNav(sidebarNav);
buildNav(mobileNav);

function setActiveNav() {
  document.querySelectorAll(".nav-item[data-view]").forEach((el) => {
    el.classList.toggle("is-active", el.dataset.view === state.view);
  });
}

function switchView(key) {
  state.view = key;
  document.querySelectorAll(".view").forEach((el) => {
    el.hidden = el.id !== `view-${key}`;
  });
  const meta = NAV_ITEMS.find((n) => n.key === key);
  if (meta) {
    viewTitle.textContent = meta.title;
    viewSub.textContent = meta.sub;
  }
  setActiveNav();
  renderCurrentView();
}

function renderCurrentView() {
  const ctx = { identity, registros: state.registros, switchView, reload };
  if (state.view === "registrar") renderRegistrar(ctx);
  if (state.view === "minhas") renderMinhas(ctx);
  if (state.view === "painel") renderPainel(ctx);
}

async function reload({ silent } = {}) {
  state.loading = true;
  const btn = document.getElementById("btn-refresh");
  if (btn && !silent) {
    btn.disabled = true;
    btn.querySelector("span")?.remove();
  }
  try {
    state.registros = await fetchRegistros();
    renderCurrentView();
  } catch (err) {
    console.error(err);
    showToast(err.message || "Não foi possível carregar os registros.", "error");
  } finally {
    state.loading = false;
    if (btn) btn.disabled = false;
  }
}

function renderUser() {
  document.getElementById("user-avatar").textContent = initials(identity.nome);
  document.getElementById("user-name").textContent = identity.nome;
  document.getElementById("user-role").textContent = identity.setor;
}

function logout() {
  clearIdentity();
  window.location.href = "index.html";
}

document.getElementById("btn-sair")?.addEventListener("click", logout);
document.getElementById("btn-sair-mobile")?.addEventListener("click", logout);
document.getElementById("btn-refresh")?.addEventListener("click", () => reload());
document.querySelectorAll(".theme-toggle").forEach((button) => button.addEventListener("click", toggleTheme));

// Permite que outras views (ex.: tela de confirmação) troquem de aba.
window.addEventListener("lajeadense:switch-view", (e) => switchView(e.detail));
window.addEventListener("lajeadense:reload", () => reload({ silent: true }));

renderUser();
setTheme(localStorage.getItem(THEME_KEY) || "light");
switchView("registrar");
reload({ silent: true });
