function isSubscribedVariantAvailable(product, subscribedSku) {
  if (!product || !Array.isArray(product.variants)) {
    return false;
  }

  const normalizedSku = String(subscribedSku || "").trim();

  return product.variants.some(
    (variant) =>
      String(variant.sku || "").trim() === normalizedSku &&
      Number(variant.inventory_quantity) > 0,
  );
}

module.exports = { isSubscribedVariantAvailable };
