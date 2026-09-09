const sheetsLib = require("./_lib/sheets");
const { getBearerToken, verifyToken } = require("./admin-auth");

module.exports = async (req, res) => {
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  if (!verifyToken(getBearerToken(req))) {
    res.status(401).json({ error: "Sessão administrativa inválida ou expirada." });
    return;
  }

  try {
    const registros = await sheetsLib.readAll();
    registros.sort((a, b) => (b.criadoEm || b.data || "").localeCompare(a.criadoEm || a.data || ""));
    res.status(200).json({ registros });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message || "Não foi possível carregar os registros." });
  }
};
