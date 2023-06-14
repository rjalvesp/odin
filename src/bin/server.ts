import R from "ramda";
import http from "http";
import config from "config";

import { ConfigServer } from "@definitions/interfaces/config";
import logger from "@services/logger";
import app from "@/index";

const { port } = config.get<ConfigServer>("server");

const onError = (port: string | number | false) => {
  /* istanbul ignore next */
  return (error: any) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string" ? "Pipe " + port : "Port " + port;

    // handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        logger.error(bind + " requires elevated privileges");
        process.exit(1);
        break;
      case "EADDRINUSE":
        logger.error(bind + " is already in use");
        process.exit(1);
        break;
      default:
        throw error;
    }
  };
};

const onListening = (server: http.Server) => {
  return () => {
    const addr = server.address();
    const bind =
      typeof addr === "string"
        ? `pipe ${addr}`
        : `port ${R.prop("port", addr)}`;
    logger.info("Listening on " + bind);
  };
};

const boot = () => {
  console.log("port", port);
  app.set("port", port);

  const server = http
    .createServer(app)
    .listen(port || 3000)
    .on("error", onError(port));
  server.on("listening", onListening(server));

  logger.info(`Worker ${process.pid} started`);

  return server;
};

export default boot;
