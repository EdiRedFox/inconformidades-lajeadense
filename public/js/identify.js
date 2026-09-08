import { SETORES } from "./constants.js";
import { getIdentity, setIdentity } from "./session.js";

// Se a pessoa já se identificou neste navegador, pula direto para o app.
const existing = getIdentity();
if (existing) {
  window.location.replace("app.html");
}

const select = document.getElementById("setor");
for (const setor of SETORES) {
  const opt = document.createElement("option");
  opt.value = setor;
  opt.textContent = setor;
  select.appendChild(opt);
}

const form = document.getElementById("identify-form");
const nomeField = document.getElementById("field-nome");
const setorField = document.getElementById("field-setor");
const btn = document.getElementById("btn-continuar");

form.addEventListener("submit", (e) => {
  e.preventDefault();
  const nome = document.getElementById("nome").value.trim();
  const setor = document.getElementById("setor").value;

  nomeField.classList.toggle("has-error", nome.length < 2);
  setorField.classList.toggle("has-error", !setor);
  if (nome.length < 2 || !setor) return;

  btn.disabled = true;
  setIdentity(nome, setor);
  window.location.href = "app.html";
});
