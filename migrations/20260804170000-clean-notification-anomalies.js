const deactivatedSubscriptionIds = [142, 225, 255, 461];
const usNeutralNicknameIds = [423, 434, 588];
const deNeutralNicknameIds = [582];

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET nickname = BTRIM(nickname), "updatedAt" = CURRENT_TIMESTAMP
         WHERE nickname <> BTRIM(nickname)`,
        { transaction },
      );

      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET notification_sent = true, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids) AND notification_sent = false`,
        {
          replacements: { ids: deactivatedSubscriptionIds },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET nickname = 'Customer', "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids) AND nickname = email AND country = 'US'`,
        {
          replacements: { ids: usNeutralNicknameIds },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET nickname = 'Kunde', "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids) AND nickname = email AND country = 'DE'`,
        {
          replacements: { ids: deNeutralNicknameIds },
          transaction,
        },
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET notification_sent = false, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids)
           AND notification_sent = true
           AND notification_sent_at IS NULL`,
        {
          replacements: { ids: deactivatedSubscriptionIds },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET nickname = email, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids) AND nickname = 'Customer' AND country = 'US'`,
        {
          replacements: { ids: usNeutralNicknameIds },
          transaction,
        },
      );

      await queryInterface.sequelize.query(
        `UPDATE notifications
         SET nickname = email, "updatedAt" = CURRENT_TIMESTAMP
         WHERE id IN (:ids) AND nickname = 'Kunde' AND country = 'DE'`,
        {
          replacements: { ids: deNeutralNicknameIds },
          transaction,
        },
      );
    });
  },
};
