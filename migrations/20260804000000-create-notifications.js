const deliveryColumns = {
  notification_sent_at: {
    type: "DATE",
    allowNull: true,
  },
  notification_attempts: {
    type: "INTEGER",
    allowNull: false,
    defaultValue: 0,
  },
  notification_last_error: {
    type: "TEXT",
    allowNull: true,
  },
  manager_notification_status: {
    type: "STRING",
    allowNull: false,
    defaultValue: "not_required",
  },
  manager_notification_sent_at: {
    type: "DATE",
    allowNull: true,
  },
  manager_notification_attempts: {
    type: "INTEGER",
    allowNull: false,
    defaultValue: 0,
  },
  manager_notification_last_error: {
    type: "TEXT",
    allowNull: true,
  },
};

function resolveDataType(Sequelize, definition) {
  return {
    ...definition,
    type: Sequelize[definition.type],
  };
}

async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === "string") return table === tableName;
    return table.tableName === tableName || table.name === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (!(await tableExists(queryInterface, "notifications"))) {
      await queryInterface.createTable("notifications", {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
          allowNull: false,
        },
        nickname: { type: Sequelize.STRING, allowNull: false },
        email: { type: Sequelize.STRING, allowNull: false },
        sku: { type: Sequelize.STRING, allowNull: false },
        inventory_id: { type: Sequelize.STRING, allowNull: false },
        country: { type: Sequelize.STRING, allowNull: false },
        notification_sent: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        ...Object.fromEntries(
          Object.entries(deliveryColumns).map(([name, definition]) => [
            name,
            resolveDataType(Sequelize, definition),
          ]),
        ),
        createdAt: { type: Sequelize.DATE, allowNull: false },
        updatedAt: { type: Sequelize.DATE, allowNull: false },
      });
      return;
    }

    const existingColumns = await queryInterface.describeTable("notifications");
    await queryInterface.bulkUpdate(
      "notifications",
      { notification_sent: false },
      { notification_sent: null },
    );
    await queryInterface.changeColumn("notifications", "notification_sent", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    });

    for (const [name, definition] of Object.entries(deliveryColumns)) {
      if (!existingColumns[name]) {
        await queryInterface.addColumn(
          "notifications",
          name,
          resolveDataType(Sequelize, definition),
        );
      }
    }
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "notifications"))) return;

    const existingColumns = await queryInterface.describeTable("notifications");
    for (const name of Object.keys(deliveryColumns).reverse()) {
      if (existingColumns[name]) {
        await queryInterface.removeColumn("notifications", name);
      }
    }
  },
};
