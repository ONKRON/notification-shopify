jest.mock("axios");

const axios = require("axios");
const { resolveShopifyAccessToken } = require("./shopifyAccessToken");

const config = {
  shopifyStore: "tr-store.myshopify.com",
  shopifyAccessToken: "legacy-token",
  shopifyClientId: "tr-client-id",
  shopifyClientSecret: "tr-client-secret",
};

beforeEach(() => {
  axios.post.mockReset();
});

test("exchanges Turkish client credentials once for concurrent requests", async () => {
  axios.post.mockResolvedValue({
    data: { access_token: "fresh-token", expires_in: 86399 },
  });

  const tokens = await Promise.all([
    resolveShopifyAccessToken(config),
    resolveShopifyAccessToken(config),
  ]);

  expect(tokens).toEqual(["fresh-token", "fresh-token"]);
  expect(axios.post).toHaveBeenCalledTimes(1);
  expect(axios.post).toHaveBeenCalledWith(
    "https://tr-store.myshopify.com/admin/oauth/access_token",
    new URLSearchParams({
      grant_type: "client_credentials",
      client_id: "tr-client-id",
      client_secret: "tr-client-secret",
    }).toString(),
    expect.objectContaining({
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    }),
  );
  expect(await resolveShopifyAccessToken(config)).toBe("fresh-token");
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test("refreshes an expired token and retries after a failed exchange", async () => {
  const shortLived = { ...config, shopifyStore: "short-lived.myshopify.com" };
  const now = jest.spyOn(Date, "now").mockReturnValue(100000);
  axios.post
    .mockRejectedValueOnce(new Error("temporary failure"))
    .mockResolvedValueOnce({ data: { access_token: "first", expires_in: 61 } })
    .mockResolvedValueOnce({ data: { access_token: "second", expires_in: 86399 } });

  try {
    await expect(resolveShopifyAccessToken(shortLived)).rejects.toThrow("temporary failure");
    expect(await resolveShopifyAccessToken(shortLived)).toBe("first");
    expect(await resolveShopifyAccessToken(shortLived)).toBe("first");
    now.mockReturnValue(101001);
    expect(await resolveShopifyAccessToken(shortLived)).toBe("second");
    expect(axios.post).toHaveBeenCalledTimes(3);
  } finally {
    now.mockRestore();
  }
});

test("keeps static tokens for existing stores", async () => {
  expect(await resolveShopifyAccessToken({
    shopifyStore: "de-store.myshopify.com",
    shopifyAccessToken: "de-token",
  })).toBe("de-token");
  expect(axios.post).not.toHaveBeenCalled();
});
