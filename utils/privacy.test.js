const { maskEmail } = require("./privacy");

test("masks the local part while keeping the email domain useful for logs", () => {
  expect(maskEmail("customer@example.com")).toBe("cu***@example.com");
  expect(maskEmail("invalid-email")).toBe("***");
});
