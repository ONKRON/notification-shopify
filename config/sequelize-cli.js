require("dotenv").config();

const commonConfig = {
  use_env_variable: "DATABASE_PUBLIC_URL",
  dialect: "postgres",
  protocol: "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false,
    },
  },
};

module.exports = {
  development: { ...commonConfig },
  test: { ...commonConfig },
  production: { ...commonConfig },
};
