/**
 * @fileoverview The Gateway tests.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { WebSocket } from "ws";
import * as http from "http";
import { config } from "dotenv";
import {
  setLogsBuffer,
  LogsBuffer,
  syncBufferInternal,
} from "@imazzine/mln.ts";
import { Gateway } from "./Gateway";
import { resolve } from "path";

class TestLogsBuffer extends LogsBuffer {
  protected async [syncBufferInternal](): Promise<void> {
    return Promise.resolve();
  }
}
setLogsBuffer(new TestLogsBuffer());

config();

const bearer =
  // eslint-disable-next-line max-len
  "eyJhbGciOiJSU0EtT0FFUC0yNTYiLCJlbmMiOiJBMjU2R0NNIn0.blOll9vFK9PgYGoeobYIFPPKXTj1Ch8_qt4Tf1ScDUCLC4CU3dK38LidkBP7dWkrAZxiHMh461ED5UGWRTTGnDSRzw85QAhNsqEClMOrs1GB4aYFOg76WivFQ4l6bPQGZQ3hTT-TwTnfyG3mZFsc4Alb0YXNjDO9kue5kUtbFJx6HDdfraVEHeLjahw_DOFwGxqve_pNgTzbRwWW7p4591QtLXJg04nYnlHybruJALnQTUYj7CycDL3PlnOrzHlybNQXhTuCNMxqRzvRvjzOTU371E0N7qBA2uG8KR3caI5jy5aRphE-Tq9KhAueWQNLb11oD-gnbmyU5Z9MN6d1-Sc30AEJ1OX5JvBG1zdGVSvwiTIf9ic4RDrIFuoYM_6Ad1K4R6ct2UTnqEKSOXqOwfSYO25Z-tMJEN_7-mXbX9xrDx8V8y9YhXtFntzV_T9MVLNHqsMxjie-Z_ekdV5lHMSUq4jyuJUo1ET54hMUGvVQ2o9H5g1gmgeE20A3CLW7.sMgQzoXYBEE8l9Fv.H0Eln1LsmsK8m2cJudFgIpuhMTAYe-fP6Jb7IuxswxBp-f0JD4iu4DXeeDW4oi7LF1eOhn3eSBpiBSvqeRhZmQd_zlTzXbHtpiymPnhzyI60JawcEijiKYLl8w.CjUmHxzw5yv7srzPqODdPA";

async function postRequest(
  port: number,
  path: string,
  tkn: string,
  data: unknown,
) {
  return await new Promise(
    (resolve: (res: http.IncomingMessage) => void, reject) => {
      const options = {
        hostname: "localhost",
        port: port,
        path: path,
        method: "POST",
        headers: {
          authorization: `Bearer ${tkn}`,
          "Content-Length": Buffer.byteLength(JSON.stringify(data)),
        },
      };
      const req = http.request(options, (res) => {
        resolve(res);
      });
      req.on("error", (e) => {
        reject(`Problem with request: ${e.message}.`);
      });
      req.write(JSON.stringify(data));
      req.end();
    },
  );
}

async function readData(res: http.IncomingMessage): Promise<Buffer> {
  return new Promise((resolve) => {
    let buffer = Buffer.from([]);
    res.on("data", (chunk: Buffer) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
    });
    res.on("end", () => {
      resolve(buffer);
    });
  });
}

describe("Gateway", () => {
  let gateway: Gateway;
  let token: string;
  let port: number;

  beforeAll(async () => {
    gateway = new Gateway();
    port = await gateway.start();
  });

  afterAll(async () => {
    gateway.destructor();
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve(undefined);
      }, 1000);
    });
  });
  describe("External Port", () => {
    it("must process the valid session POST request", async () => {
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
