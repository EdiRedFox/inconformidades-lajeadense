const sheetsLib = require("./_lib/sheets");
const { getBearerToken, verifyToken } = require("./admin-auth");

module.exports = async (req, res) => {
  if (req.method !== "GET" && req.method !== "PATCH") {
    res.setHeader("Allow", "GET, PATCH");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  if (!verifyToken(getBearerToken(req))) {
    res.status(401).json({ error: "Sessão administrativa inválida ou expirada." });
    return;
  }

  try {
    if (req.method === "PATCH") {
      const id = req.query.id;
      const status = req.body?.status;
      if (!id || !status) {
        res.status(400).json({ error: "Informe o registro e o novo status." });
        return;
      }
      await sheetsLib.updateStatus(String(id), String(status));
      res.status(200).json({ ok: true });
      return;
    }
    const registros = await sheetsLib.readAll();
    registros.sort((a, b) => (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""));
    res.status(200).json({ registros });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Não foi possível carregar os registros." });
  }
};
