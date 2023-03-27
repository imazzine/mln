import { WebSocket } from "@imazzine/mln.ws";
import { destruct, Node } from "@imazzine/mln.ts";
import { Message, Type, Method } from "@imazzine/mln.fbs";

let _process: null | Process = null;
let _tenant: null | string = null;
let _token: null | string = null;
let _url: null | string = null;

export function setTenant(tenant: string): void {
  if (!_process) {
    _tenant = tenant;
  }
}

export function setToken(token: string): void {
  if (!_process) {
    _token = token;
  }
}

export function setUrl(url: string): void {
  if (!_process) {
    _url = url;
  }
}

function getUrl(): string {
  return (
    `${_url || "ws://localhost:8080"}` +
    `/${_tenant || "common"}/${_token || "TOKEN"}`
  );
}

export interface IProcess extends Node {
  status: number;
}

const _ws = Symbol("_ws");

class Process extends Node implements IProcess {
  private [_ws]: null | WebSocket = null;

  public status = 0;

  public constructor() {
    super();

    this[_ws] = new WebSocket(getUrl());
    this[_ws].addEventListener("open", () => {
      this.dispatch("process::opened");
      const msg = new Message({
        type: Type.Handshake,
        method: Method.Request,
        body: this.uid,
      });
      this[_ws] && this[_ws].send(<Buffer>msg.buffer);
    });
    this[_ws].addEventListener("message", (evt) => {
      // const msg = new Message(<Buffer>evt.data);
      this.dispatch("process::connected");
    });
    this[_ws].addEventListener("error", (err) => {
      this.dispatch("process::error", {
        type: err.type,
        message: err.message,
      });
    });
  }

  protected [destruct](): void {
    if (this[_ws]) {
      this[_ws].close();
      this[_ws] = null;
      _process = null;
    }
    super[destruct]();
  }
}

export function getProcess(): Process {
  if (!_process) {
    _process = new Process();
  }
  return _process;
}
