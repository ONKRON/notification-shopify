const migration = require("../migrations/20260804000000-create-notifications");

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
