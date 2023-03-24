/**
 * @fileoverview Tests helpers declaration.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import * as http from "http";

/**
 * POST request helper.
 */
export async function postRequest(
  port: number,
  path: string,
  tkn: string,
  data: unknown,
): Promise<http.IncomingMessage> {
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

/**
 * Returns data from the query.
 */
export async function readData(
  res: http.IncomingMessage,
): Promise<Buffer> {
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
