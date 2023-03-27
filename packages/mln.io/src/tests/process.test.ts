/**
 * @fileoverview Process connection tests.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { config } from "dotenv";
import {
  setLogsBuffer,
  setLogLevel,
  LogLevel,
} from "@imazzine/mln.ts";
import {
  Root,
  setTenant,
  setToken,
  setUrl,
  getProcess,
  IProcess,
} from "../index";
import { bearer, TestBuffer } from "./_mocks";
import { postRequest, readData } from "./_helpers";

config();
// setLogLevel(LogLevel.ERROR);
setLogsBuffer(new TestBuffer());

describe("Process", () => {
  let router: Root;
  let token: string;
  let port: number;
  let process: IProcess;

  beforeAll(async () => {
    router = new Root();
    port = await router.start();
    const response = await postRequest(
      port,
      "/session/common",
      bearer,
      {
        res: ["resource_1", "resource_2"],
        usr: { name: "username", role: "userrole" },
      },
    );
    token = (await readData(response)).toString();
  });

  afterAll(() => {
    router.destructor();
  });

  describe("connection", () => {
    it("must be opened if ", async () => {
      setUrl("ws://localhost:8080/session");
      setTenant("common");
      setToken(token);
      process = getProcess();
      return new Promise((resolve, reject) => {
        process.listen("process::opened", (event) => {
          // resolve(event);
        });
        process.listen("process::connected", (event) => {
          process.destructor();
          resolve(event);
        });
        process.listen("process::error", (event) => {
          reject(event);
        });
      });
    });
  });
});
