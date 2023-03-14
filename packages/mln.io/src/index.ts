/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Package export.
 *
 * [[include:README.md]]
 */

// import { IoRoot } from "./IoRoot";
// import { IoWorker } from "./IoWorker";
// import { IoNode } from "./IoNode";

// export { IoRoot, IoWorker, IoNode };

import { Worker } from "./worker/Worker";
import { WorkerMessage } from "./worker/messages";
import { Mode, Type } from "./.fbs/index_generated";

const message1 = new WorkerMessage({
  mode: Mode.Msg,
  type: Type.Sync,
  source: "00000000-0000-0000-0000-000000000000",
  target: "00000000-0000-0000-0000-000000000000",
  scope: {
    resources: ["A", "B", "C"],
  },
});
const message2 = new WorkerMessage(message1.serialize());

console.log(message1.mode, message2.mode);
console.log(message1.type, message2.type);
console.log(message1.source, message2.source);
console.log(message1.target, message2.target);
console.log(message1.scope, message2.scope);

const message3 = new WorkerMessage({
  mode: Mode.Msg,
  type: Type.Rate,
  source: "00000000-0000-0000-0000-000000000000",
  target: "00000000-0000-0000-0000-000000000000",
  scope: {
    worker: "00000000-0000-0000-0000-000000000000",
    resource: "A",
    rating: 100,
  },
});
const message4 = new WorkerMessage(message3.serialize());

console.log(message3.mode, message4.mode);
console.log(message3.type, message4.type);
console.log(message3.source, message4.source);
console.log(message3.target, message4.target);
console.log(message3.scope, message4.scope);

const message5 = new WorkerMessage({
  mode: Mode.Msg,
  type: Type.Content,
  source: "00000000-0000-0000-0000-000000000000",
  target: "00000000-0000-0000-0000-000000000000",
  scope: {
    resource: "A",
    data: new Uint8Array([1, 2, 3]),
  },
});
const message6 = new WorkerMessage(message5.serialize());

console.log(message5.mode, message6.mode);
console.log(message5.type, message6.type);
console.log(message5.source, message6.source);
console.log(message5.target, message6.target);
console.log(message5.scope, message6.scope);

const message7 = new WorkerMessage({
  mode: Mode.Msg,
  type: Type.Stream,
  source: "00000000-0000-0000-0000-000000000000",
  target: "00000000-0000-0000-0000-000000000000",
  scope: null,
});
const message8 = new WorkerMessage(message7.serialize());

console.log(message7.mode, message8.mode);
console.log(message7.type, message8.type);
console.log(message7.source, message8.source);
console.log(message7.target, message8.target);
console.log(message7.scope, message8.scope);

const message9 = new WorkerMessage({
  mode: Mode.Msg,
  type: Type.Unstream,
  source: "00000000-0000-0000-0000-000000000000",
  target: "00000000-0000-0000-0000-000000000000",
  scope: null,
});
const message0 = new WorkerMessage(message9.serialize());

console.log(message9.mode, message0.mode);
console.log(message9.type, message0.type);
console.log(message9.source, message0.source);
console.log(message9.target, message0.target);
console.log(message9.scope, message0.scope);

console.log(message1.serialize());

const worker = new Worker();
worker.listen("ready", (evt) => {
  const worker = <Worker>evt.source;
  worker.ping();
  setInterval(() => {
    worker.ping();
    // worker.send(worker.uid, new Uint8Array([1, 2, 3]));
  }, 2000);
});

// worker.listen("message", (evt) => {
//   setTimeout(() => {
//     worker.send(worker.uid, new Uint8Array([1, 2, 3]));
//   }, 5000);
// });
