const axios = require('axios');
const { getShopifyConfig } = require('../config/shopify');
const { isSubscribedVariantAvailable } = require('./productAvailability');
const { resolveShopifyAccessToken } = require('../services/shopifyAccessToken');

async function checkProductAvailability(subscriptions, sendNotification, getShopifyConfig) {
  try {
    const requests = subscriptions.map(async (subscription) => {
      const shopifyConfig = getShopifyConfig(subscription.country, subscription);
      if (!shopifyConfig) {
        console.log(`No Shopify credentials configured for country: ${subscription.country}`);
        return;
      }

      const { shopifyStore, shopifyApiVersion } = shopifyConfig;

      try {
        const shopifyAccessToken = await resolveShopifyAccessToken(shopifyConfig);
        const response = await axios.get(`https://${shopifyStore}/admin/api/${shopifyApiVersion || '2025-10'}/products/${subscription.inventory_id}.json`, {
          headers: { 'X-Shopify-Access-Token': shopifyAccessToken },
        });

        const product = response.data.product;
        if (product) {
          if (isSubscribedVariantAvailable(product, subscription.sku)) {
            await sendNotification(subscription.email, shopifyConfig);
          }
        }
      } catch (error) {
        console.error(`Error fetching product for subscription ${subscription.inventory_id}:`, error.message);
      }
    });

    await Promise.all(requests);
  } catch (error) {
    console.error('Error fetching subscriptions:', error.message);
  }
}

module.exports = {
    getShopifyConfig,
    checkProductAvailability,
  };
