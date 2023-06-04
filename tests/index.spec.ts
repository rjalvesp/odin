import request from "supertest";
import server from "@/bin/server";
import { Server } from "http";
import { StatusCodes } from "http-status-codes";

describe("index", () => {
  const error =
    "TypeError [ERR_INVALID_ARG_VALUE]: The argument 'options' is invalid. Received { port: false }";
  describe("routes", () => {
    let app: Server;
    let env: NodeJS.ProcessEnv;
    beforeEach(() => {
      jest.resetModules();
      env = process.env;
      app = server();
    });
    afterEach(() => {
      process.env = env;
      app?.close();
    });
    test("/", async () => {
      const resHome = await request(app).get("/");
      expect(resHome.statusCode).toEqual(StatusCodes.OK);
    });
    test("health", async () => {
      const resHealth = await request(app).get("/health");
      expect(resHealth.statusCode).toEqual(StatusCodes.OK);
    });
    test("foo", async () => {
      const resNotFound = await request(app).get("/foo");
      expect(resNotFound.statusCode).toEqual(StatusCodes.NOT_FOUND);
    });
  });
  describe("port:negative", () => {
    let app: Server;
    let env: NodeJS.ProcessEnv;
    beforeEach(() => {
      jest.resetModules();
      env = process.env;
      process.env.NODE_PORT = "-1";
      app = server();
    });
    afterEach(() => {
      process.env = env;
      app?.close();
    });
    test("-1", async () => {
      try {
        await request(app).get("/");
      } catch (e: any) {
        console.log(e);
        expect(e.message).toBe(error);
      }
    });
  });
  describe("port:non-int-string", () => {
    let app: Server;
    let env: NodeJS.ProcessEnv;
    beforeEach(() => {
      jest.resetModules();
      env = process.env;
      process.env.NODE_PORT = "foo";
      app = server();
    });
    afterEach(() => {
      process.env = env;
      app?.close();
    });
    test("foo", async () => {
      try {
        await request(app).get("/");
      } catch (e: any) {
        console.log(e);
        expect(e.message).toBe("connect ECONNREFUSED 127.0.0.1:80");
      }
    });
  });
});
