const sheetsLib = require("./_lib/sheets");
const { uploadPhoto } = require("./_lib/drive");

const REQUIRED_FIELDS = ["responsavel", "setor", "data", "hora", "local", "causa", "descricao", "cliente"];

module.exports = async (req, res) => {
  try {
    if (req.method === "GET") {
      const registros = await sheetsLib.readAll();
      registros.sort((a, b) => (b.criadoEm || "").localeCompare(a.criadoEm || ""));
      res.status(200).json({ registros });
      return;
    }

    if (req.method === "POST") {
      const body = req.body || {};
      const missing = REQUIRED_FIELDS.filter((k) => !body[k] || !String(body[k]).trim());
      if (missing.length) {
        res.status(400).json({ error: `Campos obrigatórios ausentes: ${missing.join(", ")}` });
        return;
      }

      const existentes = await sheetsLib.readAll();
      const id = sheetsLib.nextId(existentes.map((r) => r.id));

      const fotoUrls = [];
      const fotosBase64 = Array.isArray(body.fotosBase64) ? body.fotosBase64 : body.fotoBase64 ? [body.fotoBase64] : [];
      for (const [index, fotoBase64] of fotosBase64.entries()) {
        try {
          const url = await uploadPhoto(fotoBase64, `${id}-${index + 1}.jpg`);
          if (url) fotoUrls.push(url);
        } catch (err) {
          console.error("Falha ao enviar foto para o Drive:", err.message);
        }
      }
      const anexos = fotoUrls.length ? `Anexos:\n${fotoUrls.join("\n")}` : "";

      const registro = {
        id,
        responsavel: String(body.responsavel).trim(),
        setor: String(body.setor).trim(),
        data: String(body.data).trim(),
        hora: String(body.hora).trim(),
        local: String(body.local).trim(),
        causa: String(body.causa).trim(),
        descricao: String(body.descricao).trim(),
        cliente: body.cliente ? String(body.cliente).trim() : "",
        pedido: body.pedido ? String(body.pedido).trim() : "",
        fotoUrl: fotoUrls[0] || "",
        fotoUrls,
        observacao: [body.observacao ? String(body.observacao).trim() : "", anexos].filter(Boolean).join("\n\n"),
        prioridade: "",
        status: "Aberta",
        criadoEm: new Date().toISOString(),
      };

      await sheetsLib.appendRegistro(registro);
      res.status(201).json({ ok: true, id, registro });
      return;
    }

    if (req.method === "PATCH") {
      const id = req.query.id;
      const body = req.body || {};
      if (!id) {
        res.status(400).json({ error: "Informe o parâmetro id na URL (?id=INC-2026-00001)." });
        return;
      }
      if (!body.status) {
        res.status(400).json({ error: "Informe o novo status." });
        return;
      }
      await sheetsLib.updateStatus(String(id), String(body.status));
      res.status(200).json({ ok: true });
      return;
    }

    res.setHeader("Allow", "GET, POST, PATCH");
    res.status(405).json({ error: `Método ${req.method} não permitido.` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Erro interno do servidor." });
  }
};
