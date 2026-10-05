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

const MANAGER_AUTH_HEADER = `Basic ${Buffer.from("manager:hunter2").toString("base64")}`;

beforeEach(() => {
  mockFindOne.mockReset().mockResolvedValue(null);
  mockFindAll.mockReset().mockResolvedValue([]);
  mockGmailSend.mockReset().mockResolvedValue({ data: { id: "gmail-id" } });
  mockDeliverManagerNotification.mockReset().mockResolvedValue(456);
  mockSubscriptionInstances.length = 0;
  process.env.SHOPIFY_DE_STORE = "de-store.myshopify.com";
  process.env.SHOPIFY_TR_STORE = "tr-store.myshopify.com";
  process.env.MANAGER_AUTH_USER = "manager";
  process.env.MANAGER_AUTH_PASSWORD = "hunter2";
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

test("creates a TR subscription and sends both notifications", async () => {
  const response = await request(app).post("/send-notification").send({
    email: "musteri@example.com",
    sku: "TS1881",
    nickname: "Ahmet",
    inventory_id: "987654",
    country: "tr",
  });

  expect(response.status).toBe(200);
  expect(mockFindOne).toHaveBeenCalledWith({
    where: {
      email: "musteri@example.com",
      sku: "TS1881",
      country: "TR",
      notification_sent: false,
    },
  });
  expect(mockSubscriptionInstances[0]).toEqual(
    expect.objectContaining({
      country: "TR",
      nickname: "Ahmet",
      manager_notification_status: "pending",
    }),
  );
  expect(mockDeliverManagerNotification).toHaveBeenCalledWith(
    mockSubscriptionInstances[0],
    "tr-store.myshopify.com",
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

test("serves the subscriptions dashboard without credentials", async () => {
  const page = await request(app).get("/manager/subscriptions");
  const api = await request(app).get("/api/manager/subscriptions");
  const analytics = await request(app).get("/manager/analytics");

  expect(page.status).toBe(200);
  expect(api.status).toBe(200);
  expect(analytics.status).toBe(200);
});

test("protects only the subscription history module", async () => {
  const historyPage = await request(app).get("/manager/history");
  const historyApi = await request(app).get("/manager/history/data");
  const historyCsv = await request(app).get("/manager/history/export.csv");

  expect(historyPage.status).toBe(401);
  expect(historyPage.headers["www-authenticate"]).toContain("Basic");
  expect(historyApi.status).toBe(401);
  expect(historyCsv.status).toBe(401);
});

test("rejects a wrong password for the subscription history", async () => {
  const wrongHeader = `Basic ${Buffer.from("manager:wrong").toString("base64")}`;
  const response = await request(app)
    .get("/manager/history")
    .set("Authorization", wrongHeader);

  expect(response.status).toBe(401);
});

test("serves the subscription history with valid credentials", async () => {
  const response = await request(app)
    .get("/manager/history")
    .set("Authorization", MANAGER_AUTH_HEADER);

  expect(response.status).toBe(200);
  expect(response.text).toContain("История подписок");
  expect(response.text).toContain(
    "https://cdn.shopify.com/s/files/1/2223/8189/files/favicon_landing.png",
  );
});

test("serves the Vue manager assets without credentials", async () => {
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

test("returns aggregated manager dashboard data without credentials", async () => {
  const response = await request(app).get("/api/manager/subscriptions");

  expect(response.status).toBe(200);
  expect(response.body).toEqual(
    expect.objectContaining({ countries: [], products: [], totalSubscriptions: 0 }),
  );
});

test("returns subscriber details for a SKU without credentials", async () => {
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
