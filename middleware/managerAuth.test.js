const { managerAuth } = require("./managerAuth");

const AUTH_ENV_NAMES = ["MANAGER_AUTH_USER", "MANAGER_AUTH_PASSWORD"];
const originalEnv = Object.fromEntries(
  AUTH_ENV_NAMES.map((name) => [name, process.env[name]]),
);

function mockRes() {
  return {
    statusCode: null,
    headers: {},
    body: null,
    set(name, value) {
      this.headers[name] = value;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    send(body) {
      this.body = body;
      return this;
    },
  };
}

function basicHeader(user, password) {
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

beforeEach(() => {
  process.env.MANAGER_AUTH_USER = "manager";
  process.env.MANAGER_AUTH_PASSWORD = "hunter2";
});

afterEach(() => {
  for (const name of AUTH_ENV_NAMES) {
    if (originalEnv[name] === undefined) delete process.env[name];
    else process.env[name] = originalEnv[name];
  }
});

test("calls next() when credentials match", () => {
  const req = { headers: { authorization: basicHeader("manager", "hunter2") } };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.statusCode).toBeNull();
});

test("rejects with 401 and a WWW-Authenticate header when no credentials are sent", () => {
  const req = { headers: {} };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(401);
  expect(res.headers["WWW-Authenticate"]).toContain("Basic");
});

test("rejects a wrong password", () => {
  const req = { headers: { authorization: basicHeader("manager", "wrong") } };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(401);
});

test("rejects a wrong username", () => {
  const req = { headers: { authorization: basicHeader("someone-else", "hunter2") } };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(401);
});

test("fails closed with 503 when auth is not configured on the server", () => {
  delete process.env.MANAGER_AUTH_USER;
  delete process.env.MANAGER_AUTH_PASSWORD;
  const req = { headers: { authorization: basicHeader("manager", "hunter2") } };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(503);
});

test("rejects a non-Basic scheme", () => {
  const req = { headers: { authorization: "Bearer sometoken" } };
  const res = mockRes();
  const next = jest.fn();

  managerAuth(req, res, next);

  expect(next).not.toHaveBeenCalled();
  expect(res.statusCode).toBe(401);
});
