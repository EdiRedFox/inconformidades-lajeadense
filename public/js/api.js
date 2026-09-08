// Camada de acesso à API (/api/registros), que por sua vez fala com o
// Google Sheets (e Google Drive, para as fotos) através de uma Service Account.

async function handle(res) {
  let body = null;
  try {
    body = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  if (!res.ok) {
    const msg = (body && body.error) || `Erro ${res.status} ao falar com o servidor.`;
    throw new Error(msg);
  }
  return body;
}

export async function fetchRegistros() {
  const res = await fetch("/api/registros", { method: "GET" });
  const data = await handle(res);
  return (data && data.registros) || [];
}

export async function createRegistro(payload) {
  const res = await fetch("/api/registros", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return handle(res);
}

export async function updateRegistroStatus(id, status) {
  const res = await fetch(`/api/registros?id=${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  return handle(res);
}
