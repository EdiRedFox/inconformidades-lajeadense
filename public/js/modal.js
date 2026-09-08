import { STATUS_LIST, STATUS_CLASS, PRIORITY_CLASS } from "./constants.js";
import { escapeHtml, formatDateBR, showToast } from "./utils.js";
import { updateRegistroStatus } from "./api.js";

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

  const selectId = "modal-status-select";
  footerEl.innerHTML = `
    <div class="field" style="margin:0;min-width:190px;">
      <label for="${selectId}">Atualizar status</label>
      <select class="input" id="${selectId}">
        ${STATUS_LIST.map((s) => `<option value="${s}" ${s === registro.status ? "selected" : ""}>${s}</option>`).join("")}
      </select>
    </div>
    <button class="btn btn-primary btn-sm" id="modal-save-status">Salvar</button>
  `;

  document.getElementById("modal-save-status").addEventListener("click", async (e) => {
    const btn = e.currentTarget;
    const newStatus = document.getElementById(selectId).value;
    if (newStatus === registro.status) {
      close();
      return;
    }
    btn.disabled = true;
    btn.textContent = "Salvando...";
    try {
      await updateRegistroStatus(registro.id, newStatus);
      showToast(`Status de ${registro.id} atualizado para "${newStatus}".`, "success");
      registro.status = newStatus;
      close();
      onStatusChanged?.();
      window.dispatchEvent(new Event("lajeadense:reload"));
    } catch (err) {
      showToast(err.message || "Não foi possível atualizar o status.", "error");
      btn.disabled = false;
      btn.textContent = "Salvar";
    }
  });

  overlay.hidden = false;
}
