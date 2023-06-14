import { cpus } from "os";
import cluster from "cluster";
import config from "config";

import logger from "@services/logger";
import server from "./server";
import { ConfigEnv } from "@definitions/interfaces/config";

const numCPUs = cpus().length;

const { isProduction } = config.get<ConfigEnv>("env");

if (cluster.isPrimary && isProduction) {
  logger.info(`Master ${process.pid} is running `);

  // Fork workers.
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  cluster.on("exit", (worker) => {
    logger.info(`worker ${worker.process.pid} died`);
  });
} else {
  server();
}

export default {};
