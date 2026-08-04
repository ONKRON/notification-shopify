const { parseBasicAuth, requireManagerAuth } = require("./managerAuth");

const originalUser = process.env.MANAGER_DASHBOARD_USER;
const originalPassword = process.env.MANAGER_DASHBOARD_PASSWORD;

afterEach(() => {
  if (originalUser === undefined) delete process.env.MANAGER_DASHBOARD_USER;
  else process.env.MANAGER_DASHBOARD_USER = originalUser;
  if (originalPassword === undefined) delete process.env.MANAGER_DASHBOARD_PASSWORD;
  else process.env.MANAGER_DASHBOARD_PASSWORD = originalPassword;
});

test("parses Basic Auth credentials containing colons in the password", () => {
  const header = `Basic ${Buffer.from("manager:secret:value").toString("base64")}`;
  expect(parseBasicAuth(header)).toEqual({
    username: "manager",
    password: "secret:value",
  });
});

test("allows only configured manager credentials", () => {
  process.env.MANAGER_DASHBOARD_USER = "manager";
  process.env.MANAGER_DASHBOARD_PASSWORD = "secret";
  const req = {
    headers: {
      authorization: `Basic ${Buffer.from("manager:secret").toString("base64")}`,
    },
  };
  const res = {
    status: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
  };
  const next = jest.fn();

  requireManagerAuth(req, res, next);

  expect(next).toHaveBeenCalledTimes(1);
  expect(res.status).not.toHaveBeenCalled();
});
