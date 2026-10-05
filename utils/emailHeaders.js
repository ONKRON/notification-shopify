function encodeSubject(subject) {
  const value = String(subject || "").replace(/[\r\n]+/g, " ").trim();
  if (/^[\x20-\x7E]*$/.test(value)) return value;

  const parts = [];
  let current = "";
  for (const character of value) {
    if (current && Buffer.byteLength(current + character, "utf8") > 45) {
      parts.push(current);
      current = "";
    }
    current += character;
  }
  if (current) parts.push(current);

  return parts
    .map((part) => `=?UTF-8?B?${Buffer.from(part, "utf8").toString("base64")}?=`)
    .join("\r\n ");
}

module.exports = { encodeSubject };
