import { SETORES, STATUS_CLASS } from "./constants.js";
import { escapeHtml, formatDateBR } from "./utils.js";
import { openDetailModal } from "./modal.js";

const SETOR_COLORS = ["#d11b24", "#0f2536", "#2f80ed", "#e0a324", "#1e9e5a", "#8b929c", "#7a1620", "#16324a", "#e8712a"];

let charts = { setor: null };
let showAllRecent = false;
let ctxRef = null;

export function renderPainel(ctx) {
  ctxRef = ctx;
  const rows = ctx.registros || [];
  ensureCenterLabels();
  renderKpis(rows);
  renderCausas(rows);
  renderSetorChart(rows);
  renderRecentTable(rows);
  wireVerTodas();
}

function ensureCenterLabels() {
  const setorWrap = document.querySelector("#chart-setor").closest(".chart-canvas-wrap");
  if (setorWrap && !setorWrap.querySelector(".donut-center")) {
    setorWrap.insertAdjacentHTML("beforeend", `<div class="donut-center" id="setor-center"><div class="num">0</div><div class="cap">Total</div></div>`);
  }
}

function renderKpis(rows) {
  const total = rows.length;
  const abertas = rows.filter((r) => r.status === "Aberta").length;
  const resolvidas = rows.filter((r) => r.status === "Resolvida").length;
  document.getElementById("kpi-total").textContent = total;
  document.getElementById("kpi-abertas").textContent = abertas;
  document.getElementById("kpi-resolvidas").textContent = resolvidas;
}

function renderCausas(rows) {
  const counts = {};
  rows.forEach((r) => {
    const c = r.causa || "Outro";
    counts[c] = (counts[c] || 0) + 1;
  });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8);
  const max = sorted.length ? sorted[0][1] : 1;
  const wrap = document.getElementById("chart-causas");
  if (!sorted.length) {
    wrap.innerHTML = `<div class="text-muted" style="font-size:13px;padding:12px 0;">Nenhum registro ainda.</div>`;
    return;
  }
  wrap.innerHTML = sorted
    .map(
      ([label, count]) => `
    <div class="row">
      <div class="label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
      <div class="track"><div class="fill" style="width:${Math.round((count / max) * 100)}%"></div></div>
      <div class="val">${count}</div>
    </div>`
    )
    .join("");
}

function renderSetorChart(rows) {
  const counts = {};
  SETORES.forEach((s) => (counts[s] = 0));
  rows.forEach((r) => {
    counts[r.setor] = (counts[r.setor] || 0) + 1;
  });
  const entries = Object.entries(counts).filter(([, v]) => v > 0);
  const total = rows.length;

  document.getElementById("chart-setor-total").textContent = `${total} total`;
  const centerNum = document.querySelector("#setor-center .num");
  if (centerNum) centerNum.textContent = total;

  const canvas = document.getElementById("chart-setor");
  if (charts.setor) charts.setor.destroy();

  if (!entries.length) {
    document.getElementById("chart-setor-legend").innerHTML = `<span class="text-muted" style="font-size:12.5px;">Sem dados ainda.</span>`;
    return;
  }

  const labels = entries.map(([k]) => k);
  const data = entries.map(([, v]) => v);
  const colors = labels.map((_, i) => SETOR_COLORS[i % SETOR_COLORS.length]);

  charts.setor = new Chart(canvas, {
    type: "doughnut",
    data: { labels, datasets: [{ data, backgroundColor: colors, borderWidth: 2, borderColor: "#fff" }] },
    options: {
      cutout: "68%",
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      maintainAspectRatio: false,
    },
  });

  document.getElementById("chart-setor-legend").innerHTML = labels
    .map(
      (label, i) =>
        `<span class="item"><span class="swatch" style="background:${colors[i]}"></span>${escapeHtml(label)} <strong>${data[i]}</strong></span>`
    )
    .join("");
}

function renderRecentTable(rows) {
  const sorted = [...rows].sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
  const limit = showAllRecent ? 50 : 8;
  const recent = sorted.slice(0, limit);
  const tbody = document.getElementById("p-tbody");

  if (!recent.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Nenhuma inconformidade registrada ainda.</td></tr>`;
    return;
  }

  tbody.innerHTML = recent
    .map(
      (r) => `
    <tr data-id="${escapeHtml(r.id)}">
      <td><strong>${escapeHtml(r.id)}</strong></td>
      <td class="cell-muted">${formatDateBR(r.data)}</td>
      <td>${escapeHtml(r.causa)}</td>
      <td>${escapeHtml(r.setor)}</td>
      <td class="cell-muted">${escapeHtml(r.local || "-")}</td>
      <td class="cell-muted">${escapeHtml(r.cliente || "-")}</td>
      <td><span class="badge ${STATUS_CLASS[r.status] || "badge-neutral"}"><span class="dot"></span>${escapeHtml(r.status || "-")}</span></td>
    </tr>`
    )
    .join("");

  tbody.querySelectorAll("tr[data-id]").forEach((tr) => {
    tr.addEventListener("click", () => {
      const reg = recent.find((r) => r.id === tr.dataset.id);
      if (reg) openDetailModal(reg);
    });
  });
}

function wireVerTodas() {
  const btn = document.getElementById("btn-ver-todas");
  if (!btn || btn.dataset.wired) return;
  btn.dataset.wired = "1";
  btn.addEventListener("click", () => {
    showAllRecent = !showAllRecent;
    btn.textContent = showAllRecent ? "Ver menos ↑" : "Ver todas →";
    if (ctxRef) renderRecentTable(ctxRef.registros || []);
  });
}
