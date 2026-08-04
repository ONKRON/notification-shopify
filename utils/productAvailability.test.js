const {
  isSubscribedVariantAvailable,
} = require("./productAvailability");

test("returns true only when the subscribed SKU is in stock", () => {
  const product = {
    variants: [
      { sku: "TS2811-W", inventory_quantity: 10 },
      { sku: "TS2811-B", inventory_quantity: 2 },
    ],
  };

  expect(isSubscribedVariantAvailable(product, "TS2811-B")).toBe(true);
});

test("does not use availability of another product variant", () => {
  const product = {
    variants: [
      { sku: "TS2811-W", inventory_quantity: 10 },
      { sku: "TS2811-B", inventory_quantity: 0 },
    ],
  };

  expect(isSubscribedVariantAvailable(product, "TS2811-B")).toBe(false);
});

test("handles a missing product or variants", () => {
  expect(isSubscribedVariantAvailable(null, "TS2811-B")).toBe(false);
  expect(isSubscribedVariantAvailable({}, "TS2811-B")).toBe(false);
});
