const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CronRun = sequelize.define('cron_runs', {
  started_at: {
    type: DataTypes.DATE,
    allowNull: false
  },
  finished_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  subs_checked: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  sent_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  errors_count: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  }
}, {
  timestamps: false
});

module.exports = CronRun;
