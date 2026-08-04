const migration = require("../migrations/20260804000000-create-notifications");
const swappedSubscriptionMigration = require(
  "../migrations/20260804160000-fix-swapped-matthias-subscription",
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
