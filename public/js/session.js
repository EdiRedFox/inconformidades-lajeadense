// Sessão simples baseada em localStorage: guarda quem está preenchendo os
// registros (nome + setor), definidos na Tela 1. Não é autenticação — é só
// para não pedir o nome de novo a cada registro no mesmo navegador.

const KEY = "lajeadense_identidade";

export function getIdentity() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !data.nome || !data.setor) return null;
    return data;
  } catch {
    return null;
  }
}

export function setIdentity(nome, setor) {
  const data = { nome: nome.trim(), setor, savedAt: new Date().toISOString() };
  localStorage.setItem(KEY, JSON.stringify(data));
  return data;
}

export function clearIdentity() {
  localStorage.removeItem(KEY);
}
