const crypto = require("crypto");

function secureEqual(actual, expected) {
  const actualBuffer = Buffer.from(String(actual || ""));
  const expectedBuffer = Buffer.from(String(expected || ""));

  return (
    actualBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(actualBuffer, expectedBuffer)
  );
}

function parseBasicAuth(header) {
  if (!header || !header.startsWith("Basic ")) return null;

  try {
    const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
    const separatorIndex = decoded.indexOf(":");
    if (separatorIndex === -1) return null;

    return {
      username: decoded.slice(0, separatorIndex),
      password: decoded.slice(separatorIndex + 1),
    };
  } catch {
    return null;
  }
}

function requireManagerAuth(req, res, next) {
  const expectedUsername = process.env.MANAGER_DASHBOARD_USER;
  const expectedPassword = process.env.MANAGER_DASHBOARD_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return res.status(503).send("Manager dashboard credentials are not configured");
  }

  const credentials = parseBasicAuth(req.headers.authorization);
  const authenticated =
    credentials &&
    secureEqual(credentials.username, expectedUsername) &&
    secureEqual(credentials.password, expectedPassword);

  if (!authenticated) {
    res.setHeader("WWW-Authenticate", 'Basic realm="Product subscriptions"');
    return res.status(401).send("Authentication required");
  }

  next();
}

module.exports = { parseBasicAuth, requireManagerAuth };
