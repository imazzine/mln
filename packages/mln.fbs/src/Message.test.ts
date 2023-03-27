/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import { getUid } from "@imazzine/mln.ts";
import { Message, Type, Method } from "./index";

describe("Schema", () => {
  describe("Message", () => {
    const uid = getUid();
    const pipe = {
      source: {
        node: getUid(),
        process: getUid(),
        router: getUid(),
      },
      target: {
        node: getUid(),
        process: getUid(),
        router: getUid(),
      },
    };
    let msg: Message;
    let buf: Message;
    it("must be constructible from the JS object", () => {
      msg = new Message({
        type: Type.Handshake,
        method: Method.Request,
        pipe: pipe,
        body: uid,
      });
      console.log(msg.uid);
      console.log(msg.type);
      console.log(msg.method);
      console.log(msg.pipe);
      console.log(msg.body);

      buf = new Message(msg.buffer);
      console.log(buf.uid);
      console.log(buf.type);
      console.log(buf.method);
      console.log(buf.pipe);
      console.log(buf.body);
    });
  });
});
