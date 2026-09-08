// Funções utilitárias compartilhadas entre as telas.

export function escapeHtml(str) {
  if (str === null || str === undefined) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDateBR(isoDate) {
  if (!isoDate) return "-";
  const [y, m, d] = String(isoDate).split("-");
  if (!y || !m || !d) return isoDate;
  return `${d}/${m}/${y}`;
}

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function nowHM() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function debounce(fn, wait = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

export function initials(name) {
  if (!name) return "?";
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function daysAgoLabel(isoDate) {
  if (!isoDate) return "";
  const then = new Date(isoDate + "T00:00:00");
  const now = new Date();
  const diff = Math.floor((now - then) / 86400000);
  if (diff <= 0) return "hoje";
  if (diff === 1) return "ontem";
  return `há ${diff} dias`;
}

let toastStack = null;
function getToastStack() {
  if (toastStack && document.body.contains(toastStack)) return toastStack;
  toastStack = document.querySelector(".toast-stack");
  if (!toastStack) {
    toastStack = document.createElement("div");
    toastStack.className = "toast-stack";
    document.body.appendChild(toastStack);
  }
  return toastStack;
}

const ICONS = {
  success:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M20 6 9 17l-5-5"/></svg>',
  error:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
  info:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="9"/><path d="M12 8h.01M12 11v5"/></svg>',
};

export function showToast(message, type = "info", timeout = 4200) {
  const stack = getToastStack();
  const el = document.createElement("div");
  el.className = `toast ${type === "error" ? "is-error" : type === "success" ? "is-success" : ""}`;
  el.innerHTML = `${ICONS[type] || ICONS.info}<span>${escapeHtml(message)}</span>`;
  stack.appendChild(el);
  setTimeout(() => {
    el.style.transition = "opacity .2s ease";
    el.style.opacity = "0";
    setTimeout(() => el.remove(), 200);
  }, timeout);
}
