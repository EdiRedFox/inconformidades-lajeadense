const { google } = require("googleapis");
const { getAuth } = require("./googleAuth");
const fs = require("fs").promises;
const path = require("path");

const LOCAL_DATA_FILE = path.join(__dirname, "../../data/registros.json");

// Ordem fixa das colunas na planilha (A até O). Se precisar adicionar um
// campo novo no futuro, adicione-o no final da lista para não quebrar as
// planilhas já existentes.
const HEADERS = [
  "Nº da Inconformidade",
  "Responsável",
  "Setor",
  "Data",
  "Hora",
  "Local",
  "Causa da Inconformidade",
  "Descrição",
  "Cliente",
  "Nº Pedido/Orçamento",
  "Foto (link)",
  "Observação",
  "Prioridade",
  "Status",
  "Criado em",
];

const STATUS_COLUMN = "N"; // 14ª coluna = "Status"

function getConfig() {
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;
  const tab = process.env.GOOGLE_SHEET_TAB || "Registros";
  if (!spreadsheetId) {
    throw new Error("GOOGLE_SHEET_ID não configurado nas variáveis de ambiente.");
  }
  return { spreadsheetId, tab };
}

function isLocalStore() {
  return String(process.env.DATA_STORE || "").toLowerCase() === "local";
}

async function readLocal() {
  try {
    const content = await fs.readFile(LOCAL_DATA_FILE, "utf8");
    const registros = JSON.parse(content);
    return Array.isArray(registros) ? registros : [];
  } catch (err) {
    if (err.code !== "ENOENT") throw err;
    return [];
  }
}

async function writeLocal(registros) {
  await fs.mkdir(path.dirname(LOCAL_DATA_FILE), { recursive: true });
  await fs.writeFile(LOCAL_DATA_FILE, `${JSON.stringify(registros, null, 2)}\n`, "utf8");
}

function getSheetsClient() {
  const auth = getAuth();
  return google.sheets({ version: "v4", auth });
}

async function ensureHeader(sheets, spreadsheetId, tab) {
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:O1` });
  const row = res.data.values && res.data.values[0];
  if (!row || row.length === 0 || !row[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1:O1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
  }
}

function rowToObject(row) {
  return {
    id: row[0] || "",
    responsavel: row[1] || "",
    setor: row[2] || "",
    data: row[3] || "",
    hora: row[4] || "",
    local: row[5] || "",
    causa: row[6] || "",
    descricao: row[7] || "",
    cliente: row[8] || "",
    pedido: row[9] || "",
    fotoUrl: row[10] || "",
    observacao: row[11] || "",
    prioridade: row[12] || "",
    status: row[13] || "",
    criadoEm: row[14] || "",
  };
}

function objectToRow(obj) {
  return [
    obj.id,
    obj.responsavel,
    obj.setor,
    obj.data,
    obj.hora,
    obj.local,
    obj.causa,
    obj.descricao,
    obj.cliente,
    obj.pedido,
    obj.fotoUrl,
    obj.observacao,
    obj.prioridade,
    obj.status,
    obj.criadoEm,
  ];
}

async function readAll() {
  if (isLocalStore()) return readLocal();

  const { spreadsheetId, tab } = getConfig();
  const sheets = getSheetsClient();
  await ensureHeader(sheets, spreadsheetId, tab);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A2:O` });
  const rows = res.data.values || [];
  return rows.filter((r) => r && r[0]).map(rowToObject);
}

async function appendRegistro(obj) {
  if (isLocalStore()) {
    const registros = await readLocal();
    registros.push(obj);
    await writeLocal(registros);
    return;
  }

  const { spreadsheetId, tab } = getConfig();
  const sheets = getSheetsClient();
  await ensureHeader(sheets, spreadsheetId, tab);
  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${tab}!A:O`,
    valueInputOption: "RAW",
    insertDataOption: "INSERT_ROWS",
    requestBody: { values: [objectToRow(obj)] },
  });
}

async function updateStatus(id, status) {
  if (isLocalStore()) {
    const registros = await readLocal();
    const registro = registros.find((item) => item.id === id);
    if (!registro) throw new Error(`Registro ${id} não encontrado na base local.`);
    registro.status = status;
    await writeLocal(registros);
    return;
  }

  const { spreadsheetId, tab } = getConfig();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A:A` });
  const col = res.data.values || [];
  const idx = col.findIndex((r) => r[0] === id);
  if (idx === -1) {
    throw new Error(`Registro ${id} não encontrado na planilha.`);
  }
  const rowNumber = idx + 1; // índice do array já corresponde ao número da linha (1-based)
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tab}!${STATUS_COLUMN}${rowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[status]] },
  });
}

function nextId(existingIds) {
  const year = new Date().getFullYear();
  const prefix = `INC-${year}-`;
  let max = 0;
  for (const id of existingIds) {
    if (id && id.startsWith(prefix)) {
      const n = parseInt(id.slice(prefix.length), 10);
      if (!Number.isNaN(n) && n > max) max = n;
    }
  }
  const next = String(max + 1).padStart(5, "0");
  return `${prefix}${next}`;
}

module.exports = { readAll, appendRegistro, updateStatus, nextId, getConfig, getSheetsClient, HEADERS };
