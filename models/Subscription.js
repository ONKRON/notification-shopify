const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Subscription = sequelize.define('notifications', {
  nickname: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  sku: {
    type: DataTypes.STRING,
    allowNull: false
  },
  inventory_id: {
    type: DataTypes.STRING,
    allowNull: false
  },
  country: {
    type: DataTypes.STRING,
    allowNull: false
  },
  notification_sent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false  // По умолчанию уведомление не отправлено
  },
  notification_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notification_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  notification_last_error: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  manager_notification_status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'not_required',
    validate: {
      isIn: [['not_required', 'pending', 'sent', 'failed']]
    }
  },
  manager_notification_sent_at: {
    type: DataTypes.DATE,
    allowNull: true
  },
  manager_notification_attempts: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0
  },
  manager_notification_last_error: {
    type: DataTypes.TEXT,
    allowNull: true
  }
});

   

module.exports = Subscription;
