import { SETORES, CAUSAS } from "./constants.js";
import { todayISO, nowHM, showToast } from "./utils.js";
import { createRegistro } from "./api.js";
import { clearIdentity } from "./session.js";

let mounted = false;
let currentPhotos = [];

export function renderRegistrar(ctx) {
  if (mounted) return;
  mounted = true;
  mount(ctx);
}

function mount(ctx) {
  const els = {
    form: document.getElementById("registrar-form"),
    formWrap: document.getElementById("registrar-form-wrap"),
    confirmWrap: document.getElementById("confirm-wrap"),
    responsavel: document.getElementById("r-responsavel"),
    setor: document.getElementById("r-setor"),
    data: document.getElementById("r-data"),
    hora: document.getElementById("r-hora"),
    local: document.getElementById("r-local"),
    causa: document.getElementById("r-causa"),
    causaOutroField: document.getElementById("field-r-causa-outro"),
    causaOutro: document.getElementById("r-causa-outro"),
    descricao: document.getElementById("r-descricao"),
    cliente: document.getElementById("r-cliente"),
    pedido: document.getElementById("r-pedido"),
    foto: document.getElementById("r-foto"),
    photoDrop: document.getElementById("photo-drop"),
    photoPreviewList: document.getElementById("photo-preview-list"),
    observacao: document.getElementById("r-observacao"),
    btnRegistrar: document.getElementById("btn-registrar"),
    confirmIdValue: document.getElementById("confirm-id-value"),
    confirmCopy: document.getElementById("confirm-copy"),
    btnOutra: document.getElementById("btn-registrar-outra"),
    btnVoltar: document.getElementById("btn-voltar-inicio"),
  };

  // Popular selects
  for (const setor of SETORES) {
    const opt = document.createElement("option");
    opt.value = setor;
    opt.textContent = setor;
    if (setor === ctx.identity.setor) opt.selected = true;
    els.setor.appendChild(opt);
  }
  for (const causa of CAUSAS) {
    const opt = document.createElement("option");
    opt.value = causa;
    opt.textContent = causa;
    els.causa.appendChild(opt);
  }

  function resetForm() {
    els.responsavel.value = ctx.identity.nome;
    els.setor.value = ctx.identity.setor;
    els.data.value = todayISO();
    els.hora.value = nowHM();
    els.local.value = "";
    els.causa.value = "";
    els.causaOutro.value = "";
    els.causaOutroField.hidden = true;
    els.descricao.value = "";
    els.cliente.value = "";
    els.pedido.value = "";
    els.observacao.value = "";
    els.foto.value = "";
    currentPhotos = [];
    renderPhotoPreviews(els);
    document.querySelectorAll("#registrar-form .field").forEach((f) => f.classList.remove("has-error"));
  }
  resetForm();

  els.causa.addEventListener("change", () => {
    const isOutro = els.causa.value === "Outro";
    els.causaOutroField.hidden = !isOutro;
    if (isOutro) els.causaOutro.focus();
  });

  // ---- Foto: seleção + drag&drop + compressão client-side ----
  function handleFiles(files) {
    const selected = Array.from(files || []).filter((file) => file.type.startsWith("image/"));
    if (selected.length !== Array.from(files || []).length) showToast("Arquivos que não são imagens foram ignorados.", "error");
    Promise.all(selected.map((file) => compressImage(file, 1280, 0.72).then(({ dataUrl, sizeKB }) => ({ dataUrl, sizeKB, name: file.name }))))
      .then((photos) => { currentPhotos.push(...photos); renderPhotoPreviews(els); })
      .catch(() => showToast("Não foi possível processar uma das imagens.", "error"));
  }

  els.foto.addEventListener("change", () => handleFiles(els.foto.files));
  els.photoDrop.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.photoDrop.style.borderColor = "var(--red)";
  });
  els.photoDrop.addEventListener("dragleave", () => {
    els.photoDrop.style.borderColor = "";
  });
  els.photoDrop.addEventListener("drop", (e) => {
    e.preventDefault();
    els.photoDrop.style.borderColor = "";
    handleFiles(e.dataTransfer.files);
  });

  // ---- Submit ----
  els.form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const errors = validate(els);
    document.querySelectorAll("#registrar-form .field").forEach((f) => f.classList.remove("has-error"));
    if (errors.length) {
      errors.forEach((id) => document.getElementById(id)?.classList.add("has-error"));
      showToast("Verifique os campos destacados.", "error");
      return;
    }

    const causaFinal = els.causa.value === "Outro" ? els.causaOutro.value.trim() : els.causa.value;

    const payload = {
      responsavel: ctx.identity.nome,
      setor: els.setor.value,
      data: els.data.value,
      hora: els.hora.value,
      local: els.local.value.trim(),
      causa: causaFinal,
      descricao: els.descricao.value.trim(),
      cliente: els.cliente.value.trim(),
      pedido: els.pedido.value.trim(),
      observacao: els.observacao.value.trim(),
      fotosBase64: currentPhotos.map((photo) => photo.dataUrl),
    };

    els.btnRegistrar.disabled = true;
    const originalLabel = els.btnRegistrar.querySelector(".btn-label").textContent;
    els.btnRegistrar.querySelector(".btn-label").textContent = "Registrando...";

    try {
      const result = await createRegistro(payload);
      els.confirmIdValue.textContent = result.id || "—";
      els.formWrap.hidden = true;
      els.confirmWrap.hidden = false;
      resetForm();
      window.dispatchEvent(new Event("lajeadense:reload"));
    } catch (err) {
      console.error(err);
      showToast(err.message || "Não foi possível salvar o registro.", "error");
    } finally {
      els.btnRegistrar.disabled = false;
      els.btnRegistrar.querySelector(".btn-label").textContent = originalLabel;
    }
  });

  els.confirmCopy.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(els.confirmIdValue.textContent);
      showToast("Número copiado.", "success", 2000);
    } catch {
      /* clipboard indisponível */
    }
  });

  els.btnOutra.addEventListener("click", () => {
    els.confirmWrap.hidden = true;
    els.formWrap.hidden = false;
  });

  els.btnVoltar.addEventListener("click", () => {
    clearIdentity();
    window.location.href = "index.html";
  });
}

function renderPhotoPreviews(els) {
  els.photoPreviewList.innerHTML = currentPhotos.map((photo, index) => `<div class="photo-preview"><img src="${photo.dataUrl}" alt="Prévia do anexo ${index + 1}" /><div class="meta">${photo.name} · ${photo.sizeKB} KB</div><button type="button" class="icon-btn" data-photo-index="${index}" title="Remover anexo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join("");
  els.photoPreviewList.querySelectorAll("[data-photo-index]").forEach((button) => button.addEventListener("click", () => { currentPhotos.splice(Number(button.dataset.photoIndex), 1); renderPhotoPreviews(els); }));
}

function validate(els) {
  const errors = [];
  if (!els.setor.value) errors.push("r-setor");
  if (!els.local.value.trim()) errors.push("field-r-local");
  if (!els.causa.value || (els.causa.value === "Outro" && !els.causaOutro.value.trim())) {
    errors.push("field-r-causa");
  }
  if (!els.descricao.value.trim()) errors.push("field-r-descricao");
  if (!els.cliente.value.trim()) errors.push("field-r-cliente");
  return errors;
}

function compressImage(file, maxWidth, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onerror = reject;
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const w = Math.round(img.width * scale);
        const h = Math.round(img.height * scale);
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const c = canvas.getContext("2d");
        c.drawImage(img, 0, 0, w, h);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        const sizeKB = Math.round((dataUrl.length * 0.75) / 1024);
        resolve({ dataUrl, sizeKB });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
