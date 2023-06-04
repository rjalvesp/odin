const path = require("path"),
  { config } = require("dotenv");

config({
  allowEmptyValues: true,
  example: path.resolve(process.cwd(), ".env.example"),
  path: path.resolve(process.cwd(), ".env"),
});

module.exports = {
  defaultEnv: "dev",
  "sql-file": true,
  dev: { ENV: "CORE_DB_CONNECTION_STRING" },
};
