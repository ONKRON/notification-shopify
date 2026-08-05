async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === "string") return table === tableName;
    return table.tableName === tableName || table.name === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, "cron_runs")) return;

    await queryInterface.createTable("cron_runs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      started_at: { type: Sequelize.DATE, allowNull: false },
      finished_at: { type: Sequelize.DATE, allowNull: true },
      subs_checked: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      sent_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      errors_count: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
    });
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "cron_runs"))) return;
    await queryInterface.dropTable("cron_runs");
  },
};
