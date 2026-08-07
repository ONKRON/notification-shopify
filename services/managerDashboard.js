const axios = require("axios");
const { fn, col, Op } = require("sequelize");
const Subscription = require("../models/Subscription");
const { getShopifyConfig } = require("../config/shopify");

const productCache = new Map();
const DEFAULT_CACHE_TTL_MS = 15 * 60 * 1000;
const FAILED_CACHE_TTL_MS = 60 * 1000;
const SHOPIFY_CONCURRENCY = 4;

function getCacheTtl() {
  const configured = Number.parseInt(
    process.env.MANAGER_DASHBOARD_CACHE_TTL_MS,
    10,
  );
  return configured > 0 ? configured : DEFAULT_CACHE_TTL_MS;
}

function clearProductCatalogCache() {
  productCache.clear();
}

function fallbackProduct(product, error) {
  return {
    ...product,
    title: product.skus[0]
      ? `SKU ${product.skus[0].sku}`
      : `Product ${product.productId}`,
    imageUrl: null,
    productUrl: null,
    catalogStatus: "unavailable",
    catalogError: error ? error.message : "Shopify configuration is unavailable",
  };
}

async function fetchProductDetails(product) {
  const cacheKey = `${product.country}:${product.productId}`;
  const cached = productCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return { ...product, ...cached.details };
  }

  const shopifyConfig = getShopifyConfig(product.country);
  if (!shopifyConfig?.shopifyStore || !shopifyConfig?.shopifyAccessToken) {
    const details = fallbackProduct(product);
    productCache.set(cacheKey, {
      details,
      expiresAt: Date.now() + FAILED_CACHE_TTL_MS,
    });
    return details;
  }

  try {
    const response = await axios.get(
      `https://${shopifyConfig.shopifyStore}/admin/api/${shopifyConfig.shopifyApiVersion}/products/${product.productId}.json`,
      {
        headers: {
          "X-Shopify-Access-Token": shopifyConfig.shopifyAccessToken,
        },
        timeout: 5000,
      },
    );
    const shopifyProduct = response.data?.product;
    if (!shopifyProduct) throw new Error("Product was not returned by Shopify");

    const details = {
      title: shopifyProduct.title || `Product ${product.productId}`,
      imageUrl:
        shopifyProduct.image?.src || shopifyProduct.images?.[0]?.src || null,
      productUrl:
        shopifyConfig.shopifyPublicUrl && shopifyProduct.handle
          ? `${shopifyConfig.shopifyPublicUrl}/products/${encodeURIComponent(shopifyProduct.handle)}`
          : null,
      catalogStatus: "available",
      catalogError: null,
    };
    productCache.set(cacheKey, {
      details,
      expiresAt: Date.now() + getCacheTtl(),
    });
    return { ...product, ...details };
  } catch (error) {
    console.error("Failed to load Shopify product for dashboard", {
      country: product.country,
      productId: product.productId,
      error: error.message,
    });
    const details = fallbackProduct(product, error);
    productCache.set(cacheKey, {
      details,
      expiresAt: Date.now() + FAILED_CACHE_TTL_MS,
    });
    return details;
  }
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex;
      nextIndex += 1;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

function groupSubscriptionRows(rows) {
  const productsByKey = new Map();

  for (const row of rows) {
    const country = String(row.country || "").toUpperCase();
    const productId = String(row.inventory_id || "");
    const key = `${country}:${productId}`;
    let product = productsByKey.get(key);

    if (!product) {
      product = {
        country,
        productId,
        totalSubscriptions: 0,
        skus: [],
      };
      productsByKey.set(key, product);
    }

    const count = Number(row.subscription_count || 0);
    product.totalSubscriptions += count;
    product.skus.push({ sku: row.sku, subscriptions: count });
  }

  return [...productsByKey.values()];
}

function buildCrossCountryProducts(countries) {
  const productsBySku = new Map();

  for (const country of countries) {
    for (const product of country.products) {
      for (const skuItem of product.skus) {
        const sku = String(skuItem.sku || "Без SKU");
        let sharedProduct = productsBySku.get(sku);

        if (!sharedProduct) {
          sharedProduct = {
            sku,
            title: product.title || `SKU ${sku}`,
            imageUrl: product.imageUrl || null,
            totalSubscriptions: 0,
            sites: [],
          };
          productsBySku.set(sku, sharedProduct);
        }

        if (
          product.catalogStatus === "available" &&
          !sharedProduct.sites.some((site) => site.catalogStatus === "available")
        ) {
          sharedProduct.title = product.title || `SKU ${sku}`;
          sharedProduct.imageUrl = product.imageUrl || null;
        }

        sharedProduct.totalSubscriptions += skuItem.subscriptions;
        sharedProduct.sites.push({
          country: country.code,
          subscriptions: skuItem.subscriptions,
          productId: product.productId,
          title: product.title || `SKU ${sku}`,
          imageUrl: product.imageUrl || null,
          productUrl: product.productUrl,
          catalogStatus: product.catalogStatus,
        });
      }
    }
  }

  return [...productsBySku.values()]
    .map((product) => ({
      ...product,
      sites: product.sites.sort((a, b) => a.country.localeCompare(b.country)),
    }))
    .sort((a, b) => b.totalSubscriptions - a.totalSubscriptions);
}

async function getProductSubscriptionDetails(sku, countries) {
  const where = { notification_sent: false, sku };
  const normalizedCountries = (Array.isArray(countries) ? countries : [countries])
    .filter(Boolean)
    .map((country) => String(country).trim().toUpperCase())
    .filter((country, index, items) => country && items.indexOf(country) === index);
  if (normalizedCountries.length === 1) where.country = normalizedCountries[0];
  if (normalizedCountries.length > 1) {
    where.country = { [Op.in]: normalizedCountries };
  }

  const rows = await Subscription.findAll({
    attributes: [
      "id",
      "nickname",
      "email",
      "sku",
      "inventory_id",
      "country",
      "createdAt",
    ],
    where,
    order: [["createdAt", "DESC"]],
    raw: true,
  });
  const groupsBySite = new Map();

  for (const row of rows) {
    const normalizedCountry = String(row.country || "").toUpperCase();
    const productId = String(row.inventory_id || "");
    const key = `${normalizedCountry}:${productId}`;
    let group = groupsBySite.get(key);

    if (!group) {
      group = {
        country: normalizedCountry,
        productId,
        totalSubscriptions: 0,
        skus: [{ sku, subscriptions: 0 }],
        subscribers: [],
      };
      groupsBySite.set(key, group);
    }

    group.totalSubscriptions += 1;
    group.skus[0].subscriptions += 1;
    group.subscribers.push({
      id: row.id,
      nickname: row.nickname,
      email: row.email,
      subscribedAt: row.createdAt,
    });
  }

  const sites = await mapWithConcurrency(
    [...groupsBySite.values()],
    SHOPIFY_CONCURRENCY,
    fetchProductDetails,
  );

  return {
    sku,
    totalSubscriptions: rows.length,
    sites: sites.sort((a, b) => a.country.localeCompare(b.country)),
  };
}

async function getManagerDashboardData() {
  const rows = await Subscription.findAll({
    attributes: [
      "country",
      "inventory_id",
      "sku",
      [fn("COUNT", col("id")), "subscription_count"],
    ],
    where: { notification_sent: false },
    group: ["country", "inventory_id", "sku"],
    raw: true,
  });
  const groupedProducts = groupSubscriptionRows(rows);
  const products = await mapWithConcurrency(
    groupedProducts,
    SHOPIFY_CONCURRENCY,
    fetchProductDetails,
  );
  const countriesByCode = new Map();

  for (const product of products) {
    let country = countriesByCode.get(product.country);
    if (!country) {
      country = {
        code: product.country,
        totalSubscriptions: 0,
        products: [],
      };
      countriesByCode.set(product.country, country);
    }
    country.totalSubscriptions += product.totalSubscriptions;
    country.products.push(product);
  }

  const countries = [...countriesByCode.values()]
    .map((country) => ({
      ...country,
      products: country.products.sort(
        (a, b) => b.totalSubscriptions - a.totalSubscriptions,
      ),
    }))
    .sort((a, b) => a.code.localeCompare(b.code));
  const sharedProducts = buildCrossCountryProducts(countries);

  return {
    countries,
    products: sharedProducts,
    totalSubscriptions: countries.reduce(
      (total, country) => total + country.totalSubscriptions,
      0,
    ),
    generatedAt: new Date().toISOString(),
  };
}

module.exports = {
  buildCrossCountryProducts,
  clearProductCatalogCache,
  fetchProductDetails,
  getManagerDashboardData,
  getProductSubscriptionDetails,
  groupSubscriptionRows,
  mapWithConcurrency,
};
