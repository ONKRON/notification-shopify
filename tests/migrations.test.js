const migration = require("../migrations/20260804000000-create-notifications");
const swappedSubscriptionMigration = require(
  "../migrations/20260804160000-fix-swapped-matthias-subscription",
);
const anomalyCleanupMigration = require(
  "../migrations/20260804170000-clean-notification-anomalies",
);

const Sequelize = {
  INTEGER: "INTEGER",
  STRING: "STRING",
  BOOLEAN: "BOOLEAN",
  DATE: "DATE",
  TEXT: "TEXT",
};

test("creates the complete notifications table for a clean database", async () => {
  const queryInterface = {
    showAllTables: jest.fn().mockResolvedValue([]),
    createTable: jest.fn().mockResolvedValue(undefined),
  };

  await migration.up(queryInterface, Sequelize);

  expect(queryInterface.createTable).toHaveBeenCalledWith(
    "notifications",
    expect.objectContaining({
      email: { type: "STRING", allowNull: false },
      notification_attempts: expect.objectContaining({ defaultValue: 0 }),
      manager_notification_status: expect.objectContaining({
        defaultValue: "not_required",
      }),
    }),
  );
});

test("adds only missing delivery columns to an existing table", async () => {
  const queryInterface = {
    showAllTables: jest.fn().mockResolvedValue(["notifications"]),
    describeTable: jest.fn().mockResolvedValue({
      id: {},
      notification_sent_at: {},
    }),
    bulkUpdate: jest.fn().mockResolvedValue(undefined),
    changeColumn: jest.fn().mockResolvedValue(undefined),
    addColumn: jest.fn().mockResolvedValue(undefined),
  };

  await migration.up(queryInterface, Sequelize);

  expect(queryInterface.addColumn).not.toHaveBeenCalledWith(
    "notifications",
    "notification_sent_at",
    expect.anything(),
  );
  expect(queryInterface.addColumn).toHaveBeenCalledWith(
    "notifications",
    "manager_notification_status",
    expect.objectContaining({ defaultValue: "not_required" }),
  );
  expect(queryInterface.changeColumn).toHaveBeenCalledWith(
    "notifications",
    "notification_sent",
    expect.objectContaining({ allowNull: false, defaultValue: false }),
  );
});

test("corrects the swapped name and email only for the matching subscription", async () => {
  const queryInterface = {
    bulkUpdate: jest.fn().mockResolvedValue(undefined),
  };

  await swappedSubscriptionMigration.up(queryInterface);

  expect(queryInterface.bulkUpdate).toHaveBeenCalledWith(
    "notifications",
    {
      nickname: "schwarz TS2210",
      email: "matthias.michalk@gmx.de",
    },
    {
      sku: "TS2210-B",
      country: "DE",
      nickname: "matthias.michalk@gmx.de",
      email: "schwarz TS2210",
    },
  );
});

test("reverts the corrected subscription values", async () => {
  const queryInterface = {
    bulkUpdate: jest.fn().mockResolvedValue(undefined),
  };

  await swappedSubscriptionMigration.down(queryInterface);

  expect(queryInterface.bulkUpdate).toHaveBeenCalledWith(
    "notifications",
    {
      nickname: "matthias.michalk@gmx.de",
      email: "schwarz TS2210",
    },
    {
      sku: "TS2210-B",
      country: "DE",
      nickname: "schwarz TS2210",
      email: "matthias.michalk@gmx.de",
    },
  );
});

test("cleans notification anomalies inside one transaction", async () => {
  const transaction = { id: "cleanup-transaction" };
  const query = jest.fn().mockResolvedValue(undefined);
  const queryInterface = {
    sequelize: {
      query,
      transaction: jest.fn(async (callback) => callback(transaction)),
    },
  };

  await anomalyCleanupMigration.up(queryInterface);

  expect(queryInterface.sequelize.transaction).toHaveBeenCalledTimes(1);
  expect(query).toHaveBeenCalledTimes(4);
  expect(query.mock.calls[0][0]).toContain("BTRIM(nickname)");
  expect(query.mock.calls[1][1]).toEqual({
    replacements: { ids: [142, 225, 255, 461] },
    transaction,
  });
  expect(query.mock.calls[2][1]).toEqual({
    replacements: { ids: [423, 434, 588] },
    transaction,
  });
  expect(query.mock.calls[3][1]).toEqual({
    replacements: { ids: [582] },
    transaction,
  });
});

test("reverts deactivation and neutral nicknames", async () => {
  const transaction = { id: "cleanup-down-transaction" };
  const query = jest.fn().mockResolvedValue(undefined);
  const queryInterface = {
    sequelize: {
      query,
      transaction: jest.fn(async (callback) => callback(transaction)),
    },
  };

  await anomalyCleanupMigration.down(queryInterface);

  expect(query).toHaveBeenCalledTimes(3);
  expect(query.mock.calls[0][0]).toContain("notification_sent = false");
  expect(query.mock.calls[1][0]).toContain("nickname = email");
  expect(query.mock.calls[2][0]).toContain("nickname = email");
});
