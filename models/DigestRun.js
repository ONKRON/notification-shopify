const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const DigestRun = sequelize.define('digest_runs', {
  sent_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  dialog_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  summary: {
    type: DataTypes.JSONB,
    allowNull: false
  }
}, {
  timestamps: false
});

module.exports = DigestRun;
