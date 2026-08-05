const request = require("supertest");
const { Op } = require("sequelize");

const mockFindOne = jest.fn();
const mockFindAll = jest.fn();
const mockSubscriptionInstances = [];
const mockGmailSend = jest.fn();
const mockOAuthClient = {
  setCredentials: jest.fn(),
  getAccessToken: jest.fn().mockResolvedValue({ token: "gmail-token" }),
};
const mockDeliverManagerNotification = jest.fn();

jest.mock("./config/database", () => ({
  authenticate: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
}));

jest.mock("./models/Subscription", () =>
  class MockSubscription {
    static findOne(...args) {
      return mockFindOne(...args);
    }

    static findAll(...args) {
      return mockFindAll(...args);
    }

    constructor(values) {
      Object.assign(this, values, { id: 123 });
      this.save = jest.fn().mockResolvedValue(this);
      this.update = jest.fn().mockResolvedValue(this);
      mockSubscriptionInstances.push(this);
    }
  },
);

jest.mock("./models/CronRun", () =>
  class MockCronRun {
    static findAll() {
      return Promise.resolve([]);
    }

    static create() {
      return Promise.resolve({});
    }
  },
);

jest.mock("./models/DigestRun", () =>
  class MockDigestRun {
    static findOne() {
      return Promise.resolve(null);
    }

    static create() {
      return Promise.resolve({});
    }
  },
);

jest.mock("googleapis", () => ({
  google: {
    auth: {
      OAuth2: jest.fn(function OAuth2() {
        return mockOAuthClient;
      }),
    },
    gmail: jest.fn(() => ({
      users: { messages: { send: mockGmailSend } },
    })),
  },
}));

jest.mock("./services/bitrix", () => ({
  deliverProductSubscriptionNotification: (...args) =>
    mockDeliverManagerNotification(...args),
}));

const { app } = require("./index");

beforeEach(() => {
  mockFindOne.mockReset().mockResolvedValue(null);
  mockFindAll.mockReset().mockResolvedValue([]);
  mockGmailSend.mockReset().mockResolvedValue({ data: { id: "gmail-id" } });
  mockDeliverManagerNotification.mockReset().mockResolvedValue(456);
  mockSubscriptionInstances.length = 0;
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
});

test("creates a DE subscription without a nickname and sends both notifications", async () => {
  const response = await request(app).post("/send-notification").send({
    email: "customer@example.com",
    sku: "TS2811-B",
    inventory_id: "123456",
    country: "DE",
  });

  expect(response.status).toBe(200);
  expect(mockFindOne).toHaveBeenCalledWith({
    where: {
      email: "customer@example.com",
      sku: "TS2811-B",
      country: "DE",
      notification_sent: false,
    },
  });
  expect(mockSubscriptionInstances[0]).toEqual(
    expect.objectContaining({
      nickname: "Kunde",
      manager_notification_status: "pending",
    }),
  );
  expect(mockDeliverManagerNotification).toHaveBeenCalledWith(
    mockSubscriptionInstances[0],
    "de-store.myshopify.com",
  );
  expect(mockGmailSend).toHaveBeenCalledTimes(1);
});

test("rejects an unsupported country before writing to the database", async () => {
  const response = await request(app).post("/send-notification").send({
    email: "customer@example.com",
    sku: "TS2811-B",
    nickname: "Customer",
    inventory_id: "123456",
    country: "CA",
  });

  expect(response.status).toBe(400);
  expect(mockFindOne).not.toHaveBeenCalled();
});

test("serves the manager dashboard without authentication", async () => {
  const response = await request(app).get("/manager/subscriptions");

  expect(response.status).toBe(200);
  expect(response.text).toContain("Подписки на товары");
  expect(response.text).toContain(
    "https://cdn.shopify.com/s/files/1/2223/8189/files/favicon_landing.png",
  );
});

test("serves the Vue manager assets without authentication", async () => {
  const appAsset = await request(app).get("/manager/assets/app.js");
  const vueAsset = await request(app).get("/manager/vue.js");
  const logoAsset = await request(app).get("/manager/assets/onkron-logo.svg");

  expect(appAsset.status).toBe(200);
  expect(appAsset.text).toContain("createApp");
  expect(vueAsset.status).toBe(200);
  expect(vueAsset.text).toContain("Vue");
  expect(logoAsset.status).toBe(200);
  expect(logoAsset.headers["content-type"]).toContain("image/svg+xml");
});

test("returns aggregated manager dashboard data", async () => {
  const response = await request(app).get("/api/manager/subscriptions");

  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({ countries: [], products: [], totalSubscriptions: 0 }),
  );
});

test("returns subscriber details for a SKU without authentication", async () => {
  const response = await request(app).get(
    "/api/manager/subscription-details?sku=TS2811-B&country=DE",
  );

  expect(response.status).toBe(200);
  expect(response.body).toEqual({
    sku: "TS2811-B",
    totalSubscriptions: 0,
    sites: [],
  });
});

test("accepts several countries for subscriber details", async () => {
  const response = await request(app).get(
    "/api/manager/subscription-details?sku=TS2811-B&countries=ES,IT",
  );

  expect(response.status).toBe(200);
  const where = mockFindAll.mock.calls[0][0].where;
  expect(where.country[Op.in]).toEqual(["ES", "IT"]);
});
