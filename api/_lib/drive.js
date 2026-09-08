const { google } = require("googleapis");
const { Readable } = require("stream");
const { getAuth } = require("./googleAuth");

// Envia a foto (recebida do navegador como data URL base64, já comprimida
// no cliente) para uma pasta do Google Drive e retorna um link público de
// visualização para ser salvo na planilha.
//
// Se GOOGLE_DRIVE_FOLDER_ID não estiver configurado, retorna string vazia
// e o registro é salvo normalmente, apenas sem foto.
async function uploadPhoto(dataUrl, filename) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId || !dataUrl) return "";

  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return "";

  const mimeType = match[1];
  const buffer = Buffer.from(match[2], "base64");

  // Limite de segurança: evita gravar arquivos absurdamente grandes mesmo
  // que a compressão no cliente falhe por algum motivo.
  const MAX_BYTES = 8 * 1024 * 1024; // 8MB
  if (buffer.length > MAX_BYTES) {
    throw new Error("Imagem muito grande para envio.");
  }

  const auth = getAuth();
  const drive = google.drive({ version: "v3", auth });

  const created = await drive.files.create({
    requestBody: { name: filename, parents: [folderId] },
    media: { mimeType, body: Readable.from(buffer) },
    fields: "id",
  });

  const fileId = created.data.id;

  // Torna o arquivo visível via link (sem exigir login Google) para que a
  // foto apareça na tela de detalhes do sistema.
  await drive.permissions.create({
    fileId,
    requestBody: { role: "reader", type: "anyone" },
  });

  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

module.exports = { uploadPhoto };
