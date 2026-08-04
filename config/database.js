const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_PUBLIC_URL, {
    dialect: 'postgres',
    protocol: 'postgres', 
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false,
        }
    }
});

module.exports = sequelize;
