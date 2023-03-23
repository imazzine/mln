import { WebSocket } from "@imazzine/mln.ws";
import { destruct, Node } from "@imazzine/mln.ts";
import { getUrl, getProtocol } from "../helpers/getUrl";

const _ws = Symbol("_ws");

class Process extends Node {
  private [_ws]: null | WebSocket = null;

  public constructor() {
    super();
    this[_ws] = new WebSocket(getUrl(), getProtocol(), {
      perMessageDeflate: false,
    });
  }

  protected [destruct](): void {
    if (this[_ws]) {
      this[_ws].close();
      this[_ws] = null;
    }
    super[destruct]();
  }
}

let process: null | Process = null;

export function getProcess(): Process {
  if (!process) {
    process = new Process();
  }
  return process;
}
