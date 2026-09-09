import { STATUS_CLASS, PRIORITY_CLASS } from "./constants.js";
import { escapeHtml, formatDateBR } from "./utils.js";

const overlay = document.getElementById("modal-overlay");
const titleEl = document.getElementById("modal-title");
const subEl = document.getElementById("modal-sub");
const bodyEl = document.getElementById("modal-body");
const footerEl = document.getElementById("modal-footer");
const closeBtn = document.getElementById("modal-close");

function close() {
  overlay.hidden = true;
  bodyEl.innerHTML = "";
  footerEl.innerHTML = "";
}
closeBtn?.addEventListener("click", close);
overlay?.addEventListener("click", (e) => {
  if (e.target === overlay) close();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && overlay && !overlay.hidden) close();
});

function item(label, value) {
  return `<div class="detail-item"><div class="k">${escapeHtml(label)}</div><div class="v">${value}</div></div>`;
}

export function openDetailModal(registro, { onStatusChanged } = {}) {
  titleEl.textContent = registro.id;
  subEl.textContent = `${registro.setor} · ${formatDateBR(registro.data)} ${registro.hora || ""}`;

  const prioBadge = `<span class="badge ${PRIORITY_CLASS[registro.prioridade] || "badge-neutral"}"><span class="dot"></span>${escapeHtml(registro.prioridade || "-")}</span>`;
  const statusBadge = `<span class="badge ${STATUS_CLASS[registro.status] || "badge-neutral"}"><span class="dot"></span>${escapeHtml(registro.status || "-")}</span>`;

  bodyEl.innerHTML = `
    <div class="detail-grid">
      ${item("Responsável", escapeHtml(registro.responsavel))}
      ${item("Setor", escapeHtml(registro.setor))}
      ${item("Local", escapeHtml(registro.local || "-"))}
      ${item("Causa", escapeHtml(registro.causa))}
      ${item("Prioridade", prioBadge)}
      ${item("Status", statusBadge)}
      ${item("Cliente", escapeHtml(registro.cliente || "-"))}
      ${item("Nº Pedido/Orçamento", escapeHtml(registro.pedido || "-"))}
      <div class="detail-item detail-full">
        <div class="k">Descrição</div>
        <div class="v">${escapeHtml(registro.descricao || "-")}</div>
      </div>
      ${
        registro.observacao
          ? `<div class="detail-item detail-full"><div class="k">Observação</div><div class="v">${escapeHtml(registro.observacao)}</div></div>`
          : ""
      }
      ${
        registro.fotoUrl
          ? `<div class="detail-item detail-full"><div class="k">Foto</div><a href="${escapeHtml(registro.fotoUrl)}" target="_blank" rel="noopener"><img class="detail-photo" src="${escapeHtml(registro.fotoUrl)}" alt="Foto da ocorrência" /></a></div>`
          : ""
      }
    </div>
  `;

  footerEl.innerHTML = `<span class="text-muted">Status alterado somente pela administração.</span>`;
  overlay.hidden = false;
}
