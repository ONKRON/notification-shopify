async function tableExists(queryInterface, tableName) {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    if (typeof table === "string") return table === tableName;
    return table.tableName === tableName || table.name === tableName;
  });
}

module.exports = {
  async up(queryInterface, Sequelize) {
    if (await tableExists(queryInterface, "digest_runs")) return;

    await queryInterface.createTable("digest_runs", {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      sent_at: { type: Sequelize.DATE, allowNull: false },
      dialog_id: { type: Sequelize.STRING, allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      summary: { type: Sequelize.JSONB, allowNull: false },
    });
  },

  async down(queryInterface) {
    if (!(await tableExists(queryInterface, "digest_runs"))) return;
    await queryInterface.dropTable("digest_runs");
  },
};
