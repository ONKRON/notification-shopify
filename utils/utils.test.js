const axios = require('axios') ; // Импортируем axios

const { getShopifyConfig, checkProductAvailability } = require('./utils');
jest.setTimeout(10000); // increase timeout to 10 seconds
jest.mock('axios'); // Мокаем axios
describe('getShopifyConfig', () => {
  it('should return correct config for US', () => {
    process.env.SHOPIFY_US_STORE = 'standmounts.myshopify.com';
    const subscription = { country: 'US' };
    const config = getShopifyConfig('US', subscription);
    expect(config).toEqual({
      country: 'US',
      shopifyStore: process.env.SHOPIFY_US_STORE,
      shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
      shopifyApiVersion: '2025-10',
    });
  });

  it('should return null for unsupported country', () => {
    const subscription = { country: 'CN' };
    const config = getShopifyConfig('CN', subscription);
    expect(config).toBeNull();
  });
});

describe('checkProductAvailability', () => {
  it('should call sendNotification for available products', async () => {
    const mockSubscriptions = [
      { email: 'sparkygino@gmail.com', sku: 'TS2811-B', name: 'Marko Rauer', inventory_id: '1325044596824', country: 'US' },
    ];
  
    const mockSendNotification = jest.fn();
    
    const mockGetShopifyConfig = jest.fn(() => ({
      shopifyStore: process.env.SHOPIFY_US_STORE,
      shopifyAccessToken: process.env.SHOPIFY_US_ACCESS_TOKEN,
      subject: 'Product Notification',
      text: 'Your product is now available.',
      html: '<p>Your product is now available.</p>',
    }));
  
    // Мокаем axios.get
    axios.get = jest.fn(() =>
      Promise.resolve({
        data: {
          product: {
            variants: [{ sku: 'TS2811-B', inventory_quantity: 10 }],
          },
        },
      })
    );
  
    // Выполняем проверку доступности
    await checkProductAvailability(mockSubscriptions, mockSendNotification, mockGetShopifyConfig);
  
    // Проверяем, что sendNotification был вызван с правильными параметрами
    expect(mockSendNotification).toHaveBeenCalledWith(
      'sparkygino@gmail.com',
      expect.objectContaining({
        subject: 'Product Notification',
        text: 'Your product is now available.',
        html: '<p>Your product is now available.</p>',
      })
    );
  });

  it('should not call sendNotification if product is not available', async () => {
    const mockSubscriptions = [{
      email: 'sparkygino@gmail.com',
      sku: 'TS2811-B',
     nickname: 'Marko Rauer',
     inventory_id: '4403713474638',
      country: 'FR',
       }];
    const mockSendNotification = jest.fn();
    const mockGetShopifyConfig = jest.fn(() => null);

    await checkProductAvailability(mockSubscriptions, mockSendNotification, mockGetShopifyConfig);

    expect(mockSendNotification).not.toHaveBeenCalled();
  });
});
