import { WebSocket } from "@imazzine/mln.ws";
import { destruct, Node } from "@imazzine/mln.ts";

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
