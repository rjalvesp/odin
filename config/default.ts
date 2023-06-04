import R from "ramda";
import path from "path";
import dotenv from "dotenv-safe";

dotenv.config({
  allowEmptyValues: true,
  example: path.resolve(process.cwd(), ".env.example"),
  path: path.resolve(process.cwd(), ".env"),
});

const {
  NODE_ENV,
  NODE_PORT,
  CORE_DB_CONNECTION,
  GOOGLE_API_KEY,
  GOOGLE_PRODUCT_KEY,
} = R.propOr({}, "env", process);

const env = {
  name: NODE_ENV,
  isProduction: false,
};

const server = { port: parseInt(NODE_PORT, 10) };

const db = { mainConnectionString: CORE_DB_CONNECTION };

const config = {
  db,
  env,
  server,
};

export default config;

// eslint-disable-next-line no-console
console.log("USING DEFAULT CONFIG");
