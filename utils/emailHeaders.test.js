const { encodeSubject } = require("./emailHeaders");

test("encodes Turkish email subjects as UTF-8 MIME words", () => {
  expect(encodeSubject("Ürün stok bildirimi")).toBe(
    `=?UTF-8?B?${Buffer.from("Ürün stok bildirimi").toString("base64")}?=`,
  );
});

test("keeps ASCII subjects unchanged and removes line breaks", () => {
  expect(encodeSubject("Product Notification")).toBe("Product Notification");
  expect(encodeSubject("Hello\r\nInjected")).toBe("Hello Injected");
});

test("folds long Unicode subjects into valid sized MIME words", () => {
  const encoded = encodeSubject("Ürün ".repeat(20));
  const words = encoded.split("\r\n ");
  expect(words.length).toBeGreaterThan(1);
  expect(words.every((word) => word.length <= 75)).toBe(true);
  expect(words.map((word) => Buffer.from(word.slice(10, -2), "base64").toString("utf8")).join(""))
    .toBe("Ürün ".repeat(20).trim());
});
