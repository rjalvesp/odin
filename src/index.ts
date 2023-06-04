import { StatusCodes } from "http-status-codes";
import createError from "http-errors";
import express from "express";
import helmet from "helmet";

import routes from "@api/index";

const app = express();

app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(handleApiError);
app.get("/", (_req, res) => res.status(StatusCodes.OK).json({ alive: true }));
app.get("/health", (_req, res) =>
  res.status(StatusCodes.OK).json({ maindb: true, logdb: true, queuedb: true }),
);
app.use("/api", routes);

// Catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

export default app;
