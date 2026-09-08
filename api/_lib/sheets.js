const { google } = require("googleapis");
const { getAuth } = require("./googleAuth");
const fs = require("fs").promises;
const path = require("path");

const LOCAL_DATA_FILE = path.join(__dirname, "../../data/registros.json");

// Formato público da planilha (A até E).
const HEADERS = [
  "DataHora",
  "Nome",
  "Inconformidade",
  "Cliente",
  "Observações",
];
const SHEET_RANGE = "A:E";

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
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A1:O` });
  const row = res.data.values && res.data.values[0];
  if (!row || row.join("\u001f") !== HEADERS.join("\u001f")) {
    const oldRows = (res.data.values || []).slice(1).filter((item) => item && item.length);
    const currentHeaders = row || [];
    const isCompactSheet = currentHeaders[0] === "Data" && currentHeaders[1] === "Nome" && currentHeaders[2] === "Inconformidade";
    const migratedRows = oldRows.filter((item) => item[0]).map((item) => {
      if (isCompactSheet) return [item[0] || "", item[1] || "", item[2] || "", item[3] || "", item[4] || ""];
      return [
        [item[3] || item[0] || "", item[4] || ""].filter(Boolean).join(" "),
        item[1] || "",
        [item[6], item[7]].filter(Boolean).join(": ") || item[2] || "",
        item[8] || "",
        item[11] || "",
      ];
    });

    await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${tab}!A:O`, requestBody: {} });
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tab}!A1:E1`,
      valueInputOption: "RAW",
      requestBody: { values: [HEADERS] },
    });
    if (migratedRows.length) {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: `${tab}!A2:E${migratedRows.length + 1}`,
        valueInputOption: "RAW",
        requestBody: { values: migratedRows },
      });
    }
  }
}

function rowToObject(row) {
  const [dataHora, responsavel, inconformidade, cliente, observacao] = row;
  const dataHoraMatch = String(dataHora || "").match(/^(\d{4}-\d{2}-\d{2})(?:[ T](\d{2}:\d{2}))?/);
  const separator = inconformidade ? inconformidade.indexOf(": ") : -1;
  return {
    id: `INC-${new Date().getFullYear()}-${String(row._rowNumber || 0).padStart(5, "0")}`,
    responsavel: responsavel || "",
    setor: "",
    data: dataHoraMatch ? dataHoraMatch[1] : dataHora || "",
    hora: dataHoraMatch?.[2] || "",
    local: "",
    causa: separator >= 0 ? inconformidade.slice(0, separator) : inconformidade || "",
    descricao: separator >= 0 ? inconformidade.slice(separator + 2) : inconformidade || "",
    cliente: cliente || "",
    pedido: "",
    fotoUrl: "",
    observacao: observacao || "",
    prioridade: "",
    status: "Aberta",
    criadoEm: "",
  };
}

function objectToRow(obj) {
  return [
    [obj.data, obj.hora].filter(Boolean).join(" "),
    obj.responsavel,
    [obj.causa, obj.descricao].filter(Boolean).join(": "),
    obj.cliente,
    obj.observacao,
  ];
}

async function readAll() {
  if (isLocalStore()) return readLocal();

  const { spreadsheetId, tab } = getConfig();
  const sheets = getSheetsClient();
  await ensureHeader(sheets, spreadsheetId, tab);
  const res = await sheets.spreadsheets.values.get({ spreadsheetId, range: `${tab}!A2:E` });
  const rows = res.data.values || [];
  return rows.filter((r) => r && r[0]).map((row, index) => rowToObject(Object.assign([...row], { _rowNumber: index + 2 })));
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
    range: `${tab}!${SHEET_RANGE}`,
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

  throw new Error("A planilha configurada possui somente as colunas Data, Nome, Inconformidade, Cliente e Observações; status não é persistido nela.");
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
