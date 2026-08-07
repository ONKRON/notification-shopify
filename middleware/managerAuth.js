const crypto = require("crypto");

function timingSafeEqualStrings(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

function requireAuth(res) {
  res.set("WWW-Authenticate", 'Basic realm="ONKRON Manager", charset="UTF-8"');
  return res.status(401).send("Authentication required");
}

function managerAuth(req, res, next) {
  const expectedUser = process.env.MANAGER_AUTH_USER;
  const expectedPassword = process.env.MANAGER_AUTH_PASSWORD;

  if (!expectedUser || !expectedPassword) {
    console.error(
      "Manager auth is not configured: set MANAGER_AUTH_USER and MANAGER_AUTH_PASSWORD",
    );
    return res.status(503).send("Manager access is not configured");
  }

  const [scheme, encoded] = String(req.headers.authorization || "").split(" ");
  if (scheme !== "Basic" || !encoded) return requireAuth(res);

  const decoded = Buffer.from(encoded, "base64").toString("utf8");
  const separatorIndex = decoded.indexOf(":");
  if (separatorIndex === -1) return requireAuth(res);

  const user = decoded.slice(0, separatorIndex);
  const password = decoded.slice(separatorIndex + 1);
  const isValid =
    timingSafeEqualStrings(user, expectedUser) &&
    timingSafeEqualStrings(password, expectedPassword);

  if (!isValid) return requireAuth(res);
  return next();
}

module.exports = { managerAuth };
