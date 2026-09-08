import { SETORES, STATUS_LIST, STATUS_CLASS } from "./constants.js";
import { escapeHtml, formatDateBR, debounce } from "./utils.js";
import { openDetailModal } from "./modal.js";

let mounted = false;
const localState = { page: 1, pageSize: 10 };
let els = {};
let ctxRef = null;

export function renderMinhas(ctx) {
  ctxRef = ctx;
  if (!mounted) {
    mount();
    mounted = true;
  }
  localState.page = 1;
  applyFilters();
}

function mount() {
  els = {
    busca: document.getElementById("m-busca"),
    periodo: document.getElementById("m-periodo"),
    setor: document.getElementById("m-setor"),
    status: document.getElementById("m-status"),
    tbody: document.getElementById("m-tbody"),
    empty: document.getElementById("m-empty"),
    count: document.getElementById("m-count"),
    pagination: document.getElementById("m-pagination"),
    btnNovo: document.getElementById("btn-novo-de-minhas"),
  };

  for (const s of SETORES) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    els.setor.appendChild(opt);
  }
  for (const s of STATUS_LIST) {
    const opt = document.createElement("option");
    opt.value = s;
    opt.textContent = s;
    els.status.appendChild(opt);
  }

  const onFilterChange = () => {
    localState.page = 1;
    applyFilters();
  };
  els.busca.addEventListener("input", debounce(onFilterChange, 220));
  els.periodo.addEventListener("change", onFilterChange);
  els.setor.addEventListener("change", onFilterChange);
  els.status.addEventListener("change", onFilterChange);
  els.btnNovo.addEventListener("click", () => window.dispatchEvent(new CustomEvent("lajeadense:switch-view", { detail: "registrar" })));
}

function withinPeriod(dataISO, days) {
  if (days === "all") return true;
  if (!dataISO) return true;
  const then = new Date(dataISO + "T00:00:00");
  const now = new Date();
  const diffDays = (now - then) / 86400000;
  return diffDays <= Number(days);
}

function applyFilters() {
  const nomeAtual = (ctxRef.identity.nome || "").trim().toLowerCase();
  const q = els.busca.value.trim().toLowerCase();
  const periodo = els.periodo.value;
  const setor = els.setor.value;
  const status = els.status.value;

  let rows = (ctxRef.registros || []).filter((r) => (r.responsavel || "").trim().toLowerCase() === nomeAtual);

  rows = rows.filter((r) => {
    if (setor && r.setor !== setor) return false;
    if (status && r.status !== status) return false;
    if (!withinPeriod(r.data, periodo)) return false;
    if (q) {
      const hay = `${r.id} ${r.descricao} ${r.cliente} ${r.causa}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  rows.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));

  renderTable(rows);
}

function renderTable(rows) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / localState.pageSize));
  if (localState.page > totalPages) localState.page = totalPages;
  const start = (localState.page - 1) * localState.pageSize;
  const pageRows = rows.slice(start, start + localState.pageSize);

  els.empty.hidden = total > 0;
  els.tbody.innerHTML = pageRows
    .map(
      (r) => `
    <tr data-id="${escapeHtml(r.id)}">
      <td><strong>${escapeHtml(r.id)}</strong></td>
      <td class="cell-muted">${formatDateBR(r.data)}</td>
      <td>${escapeHtml(r.causa)}</td>
      <td class="wrap">${escapeHtml(truncate(r.descricao, 70))}</td>
      <td>${escapeHtml(r.setor)}</td>
      <td class="cell-muted">${escapeHtml(r.local || "-")}</td>
      <td class="cell-muted">${escapeHtml(r.cliente || "-")}</td>
      <td><span class="badge ${STATUS_CLASS[r.status] || "badge-neutral"}"><span class="dot"></span>${escapeHtml(r.status || "-")}</span></td>
    </tr>`
    )
    .join("");

  els.tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const reg = pageRows.find((r) => r.id === tr.dataset.id);
      if (reg) openDetailModal(reg);
    });
  });

  const from = total === 0 ? 0 : start + 1;
  const to = Math.min(start + localState.pageSize, total);
  els.count.textContent = `Mostrando ${from} a ${to} de ${total} registros`;

  renderPagination(totalPages);
}

function renderPagination(totalPages) {
  els.pagination.innerHTML = "";
  const mk = (label, page, opts = {}) => {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (opts.active) btn.classList.add("is-active");
    if (opts.disabled) btn.disabled = true;
    btn.addEventListener("click", () => {
      localState.page = page;
      applyFilters();
    });
    return btn;
  };

  els.pagination.appendChild(mk("‹", Math.max(1, localState.page - 1), { disabled: localState.page === 1 }));
  const maxButtons = 5;
  let startPage = Math.max(1, localState.page - 2);
  const endPage = Math.min(totalPages, startPage + maxButtons - 1);
  startPage = Math.max(1, endPage - maxButtons + 1);
  for (let p = startPage; p <= endPage; p++) {
    els.pagination.appendChild(mk(String(p), p, { active: p === localState.page }));
  }
  els.pagination.appendChild(mk("›", Math.min(totalPages, localState.page + 1), { disabled: localState.page === totalPages }));
}

function truncate(str, n) {
  if (!str) return "-";
  return str.length > n ? str.slice(0, n - 1) + "…" : str;
}
