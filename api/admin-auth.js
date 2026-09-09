const crypto = require("crypto");

function getAdmins() {
  return [1, 2]
    .map((index) => ({
      user: process.env[`ADMIN_USER_${index}`],
      password: process.env[`ADMIN_PASSWORD_${index}`],
    }))
    .filter((admin) => admin.user && admin.password);
}

function getSecret() {
  return process.env.ADMIN_SESSION_SECRET || "local-admin-session-secret";
}

function createToken(user) {
  const payload = Buffer.from(JSON.stringify({ user, exp: Date.now() + 8 * 60 * 60 * 1000 })).toString("base64url");
  const signature = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function getBearerToken(req) {
  const header = req.headers.authorization || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

module.exports = { createToken, getAdmins, getBearerToken, verifyToken };
