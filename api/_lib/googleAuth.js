const { google } = require("googleapis");

// Cria o cliente de autenticação (Service Account) usado tanto para o
// Google Sheets (armazenar os registros) quanto para o Google Drive
// (armazenar as fotos anexadas, quando configurado).
//
// Escopo "drive.file": a Service Account só acessa arquivos que ela mesma
// criou — não tem acesso ao Drive inteiro. É o escopo mínimo necessário
// para o upload de fotos funcionar.
function getAuth() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !rawKey) {
    throw new Error(
      "Credenciais do Google não configuradas. Defina GOOGLE_SERVICE_ACCOUNT_EMAIL e GOOGLE_PRIVATE_KEY nas variáveis de ambiente (veja o README)."
    );
  }

  // Na Vercel, quebras de linha da chave privada costumam vir escapadas
  // como "\n" literal — aqui elas são convertidas de volta para quebras reais.
  const key = rawKey.replace(/\\n/g, "\n");

  return new google.auth.JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets", "https://www.googleapis.com/auth/drive.file"],
  });
}

module.exports = { getAuth };
