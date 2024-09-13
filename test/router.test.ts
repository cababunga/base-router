import assert from "assert/strict";

import router from "../src/router";
import { IncomingMessage, ServerResponse } from "http";

describe("Router", () => {
  describe("middleware", () => {
    it("should execute middleware", async () => {
      const app = router();
      const middleware = (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("middle", "ware");
      };
      const handler = (_req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("get", "handler");
        res.end();
      };
      app.add("GET", "/asd", middleware);
      app.add("GET", "/asd/123", handler);
      const req: any = {
        method: "GET",
        url: "/asd/123",
      };
      const res: any = {
        headers: {} as { [k: string]: string },
        writableEnded: false,
        setHeader: function (k: string, v: string | number | readonly string[]): ServerResponse<IncomingMessage> {
          this.headers[k] = v;
          return this;
        },
        getHeader: function (k: string) {
          return this.headers[k];
        },
        writeHead: function () {
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
      assert.equal(res.getHeader("middle"), "ware");
      assert.equal(res.getHeader("get"), "handler");
    });

    it("should execute middleware and handler when added in the same call", async () => {
      const app = router();
      const middleware = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("middle", "ware");
      };
      const handler = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("get", "handler");
        res.end();
      };
      app.add("GET", "/asd/123", middleware, handler);
      const req: any = {
        method: "GET",
        url: "/asd/123",
      };
      const res: any = {
        headers: {} as { [k: string]: string },
        writableEnded: false,
        setHeader: function (k: string, v: string) {
          this.headers[k] = v;
        },
        getHeader: function (k: string) {
          return this.headers[k];
        },
        writeHead: function () {
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
      assert.equal(res.getHeader("middle"), "ware");
      assert.equal(res.getHeader("get"), "handler");
    });

    it("should execute more than one middleware", async () => {
      const app = router();
      const middleware1 = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("first", "middleware1");
      };
      const middleware2 = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("second", "middleware2");
      };
      const handler = (req: IncomingMessage, res: ServerResponse) => {
        res.setHeader("get", "handler");
        res.end();
      };
      app.add("GET", "/asd", middleware1, middleware2);
      app.add("GET", "/asd/123", handler);
      const req: any = {
        method: "GET",
        url: "/asd/123",
      };
      const res: any = {
        headers: {} as { [k: string]: string },
        writableEnded: false,
        setHeader: function (k: string, v: string) {
          this.headers[k] = v;
        },
        getHeader: function (k: string) {
          return this.headers[k];
        },
        writeHead: function () {
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
      assert.equal(res.getHeader("first"), "middleware1");
      assert.equal(res.getHeader("second"), "middleware2");
    });
  });

  describe("URL parameters", () => {
    it("should parse UPL params", async () => {
      const app = router();
      app.get(
        "/api/:version/handler/:id",
        (req: IncomingMessage, res: ServerResponse) => {
          res.end();
        }
      );
      const req: any = {
        method: "GET",
        url: "/api/123/handler/456",
      };
      const res: any = {
        writableEnded: false,
        writeHead: function () {
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
      assert.equal(req.param.version, "123");
      assert.equal(req.param.id, "456");
    });
  });

  describe("query string", () => {
    it("should parse query string on demand", async () => {
      const app = router();
      app.get("/api/handler", (req: IncomingMessage, res: ServerResponse) => {
        res.end();
      });
      const req: any = {
        method: "GET",
        url: "/api/handler?one=two&three=four",
      };
      const res: any = {
        writableEnded: false,
        writeHead: function () {
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
      assert.equal(req.query.one, "two");
      assert.equal(req.query.three, "four");
    });
  });

  describe("router", () => {
    it("should handle exceptions", async () => {
      const app = router();
      app.add("GET", "/asd/123", () => {
        throw new Error("ERROR");
      });
      const req: any = {
        method: "GET",
        url: "/asd/123",
      };
      const res: any = {
        writableEnded: false,
        writeHead: function (code: number, headers: any) {
          assert.equal(code, 500);
          return this;
        },
        end: function () {
          this.writableEnded = true;
        },
      };
      await app.route(req, res);
    });

    it("should return 404 if handler is not found", async () => {
      const app = router();
      app.add("GET", "/asd/123", () => {});
      const req: any = {
        method: "GET",
        url: "/asd/124",
      };
      const res: any = {
        writeHead: function (code: number, headers: any) {
          assert.equal(code, 404);
          return this;
        },
        end: () => {},
      };
      await app.route(req, res);
    });
  });
});
