/**
 * @fileoverview Authorization tests.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { config } from "dotenv";
import { WebSocket } from "@imazzine/mln.ws";
import { setLogsBuffer } from "@imazzine/mln.ts";
import { bearer, TestBuffer } from "./_mocks";
import { postRequest, readData } from "./_helpers";
import { Env, Root } from "../index";

config();
setLogsBuffer(new TestBuffer());

describe("Authorization", () => {
  let router: Root;
  let token: string;
  let port: number;

  beforeAll(async () => {
    router = new Root();
    port = await router.start();
  });

  afterAll(async () => {
    router.destructor();
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(undefined);
      }, 1000);
    });
  });

  describe("External Port", () => {
    it("must listen for a valid TCP port", () => {
      expect(port).toEqual(router.external.tcp);
      expect(router.external.tcp).toEqual(Env.EXT_PORT);
    });

    it("must accept the valid session POST request", async () => {
      const response = await postRequest(
        port,
        "/session/common",
        bearer,
        {
          res: ["resource_1", "resource_2"],
          usr: { name: "username", role: "userrole" },
        },
      );
      const data = await readData(response);
      token = data.toString();

      expect(response).toBeDefined();
      expect(response.statusCode).toBe(200);
      expect(response.statusMessage).toBe("OK");
      expect(data.toString().length).toBeGreaterThan(0);
    });

    it(
      "must reject the session POST request if a token value " +
        "is valid, but the 'sub' claim is not a 'session::bearer'",
      async () => {
        const response = await postRequest(
          port,
          "/session/common",
          `${token}`,
          {
            res: ["resource_1", "resource_2"],
            usr: { name: "username", role: "userrole" },
          },
        );
        const data = await readData(response);

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(403);
        expect(response.statusMessage).toBe("Forbidden");
        expect(data.toString()).toBe("invalid bearer");
      },
    );

    it(
      "must reject the session POST request if a tenant name " +
        "is invalid",
      async () => {
        const response = await postRequest(
          port,
          "/session/common1",
          bearer,
          {
            res: ["resource_1", "resource_2"],
            usr: { name: "username", role: "userrole" },
          },
        );
        const data = await readData(response);

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(403);
        expect(response.statusMessage).toBe("Forbidden");
        expect(data.toString()).toBe(
          "no such tenant or key file is missing",
        );
      },
    );

    it(
      "must reject the session POST request if a token value " +
        "is invalid",
      async () => {
        const response = await postRequest(
          port,
          "/session/common",
          `${bearer}1`,
          {
            res: ["resource_1", "resource_2"],
            usr: { name: "username", role: "userrole" },
          },
        );
        const data = await readData(response);

        expect(response).toBeDefined();
        expect(response.statusCode).toBe(403);
        expect(response.statusMessage).toBe("Forbidden");
        expect(data.toString()).toBe("decryption operation failed");
      },
    );

    it(
      "must open a WebSocket connection if a token value " +
        "is valid",
      async () => {
        const opened = await new Promise((resolve, reject) => {
          const ws = new WebSocket(
            `ws://localhost:${port}/session/common/${token}`,
            {
              perMessageDeflate: false,
            },
          );

          ws.on("open", () => {
            ws.close();
          });

          ws.on("close", () => {
            resolve(true);
          });

          ws.on("error", (err) => {
            reject(err);
          });
        });
        expect(opened).toBeTruthy();
      },
    );

    it(
      "must reject a WebSocket connection if a token value " +
        "is invalid",
      async () => {
        const error = await new Promise(
          (resolve: (v: Error) => void, reject) => {
            const ws = new WebSocket(
              `ws://localhost:${port}/session/common/${token}1`,
              {
                perMessageDeflate: false,
              },
            );

            ws.on("open", () => {
              ws.close();
            });

            ws.on("close", () => {
              reject(new Error("Connection was unexpectedly opened"));
            });

            ws.on("error", (err) => {
              resolve(err);
            });
          },
        );
        expect(error).toBeDefined();
        expect(error.name).toBe("Error");
        expect(error.message).toBe("Unexpected server response: 403");
      },
    );

    it(
      "must reject a WebSocket connection if a token value " +
        "is valid and doesn't contain required claims",
      async () => {
        const error = await new Promise(
          (resolve: (v: Error) => void, reject) => {
            const ws = new WebSocket(
              `ws://localhost:${port}/session/common/${bearer}`,
              {
                perMessageDeflate: false,
              },
            );

            ws.on("open", () => {
              ws.close();
            });

            ws.on("close", () => {
              reject(new Error("Connection was unexpectedly opened"));
            });

            ws.on("error", (err) => {
              resolve(err);
            });
          },
        );
        expect(error).toBeDefined();
        expect(error.name).toBe("Error");
        expect(error.message).toBe("Unexpected server response: 403");
      },
    );
  });
});
