function maskEmail(email) {
  const [localPart, domain] = String(email || "").split("@");
  if (!localPart || !domain) return "***";

  return `${localPart.slice(0, 2)}***@${domain}`;
}

module.exports = { maskEmail };
