const { createToken, getAdmins } = require("./admin-auth");

module.exports = (req, res) => {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    res.status(405).json({ error: "Método não permitido." });
    return;
  }

  const { user, password } = req.body || {};
  const admin = getAdmins().find((item) => item.user === user && item.password === password);
  if (!admin) {
    res.status(401).json({ error: "Login ou senha inválidos." });
    return;
  }

  res.status(200).json({ token: createToken(admin.user), user: admin.user });
};
