const subscriptionIdentity = {
  sku: "TS2210-B",
  country: "DE",
};

const incorrectValues = {
  nickname: "matthias.michalk@gmx.de",
  email: "schwarz TS2210",
};

const correctedValues = {
  nickname: "schwarz TS2210",
  email: "matthias.michalk@gmx.de",
};

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkUpdate(
      "notifications",
      correctedValues,
      { ...subscriptionIdentity, ...incorrectValues },
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkUpdate(
      "notifications",
      incorrectValues,
      { ...subscriptionIdentity, ...correctedValues },
    );
  },
};
