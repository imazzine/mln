import { destruct, Node } from "@imazzine/mln.ts";
import * as uWebSockets from "uWebSockets.js";

const _app = Symbol("_app");
const _port = Symbol("_port");

export class Gateway extends Node {
  private [_app]: uWebSockets.TemplatedApp;
  private [_port]: number;

  constructor(port?: number, key?: string, cert?: string) {
    super();
    this[_port] = port || 9090;
    this[_app] = uWebSockets.App({
      key_file_name: key,
      cert_file_name: cert,
    });
    this._configure();
    this._run();
  }

  private _configure(): void {
    this[_app].get(
      "/auth/:tenant/:token",
      this._authRequestHandler.bind(this),
    );
  }

  private _authRequestHandler(
    response: uWebSockets.HttpResponse,
    request: uWebSockets.HttpRequest,
  ): void {
    const tenant = request.getParameter(0);
    const token = request.getParameter(1);
    this.dispatch("auth", { response, request, tenant, token });
    response.end("auth");
  }

  private _run(): void {
    this[_app].listen(this[_port], (token) => {
      if (!token) {
        this.logger.fatal(
          `The Gateway#${this.uid} is failed to listen ` +
            `port ${this[_port]}`,
        );
      } else {
        this.logger.info(
          `The Gateway#${this.uid} is listening to ` +
            `port ${this[_port]}`,
        );
      }
    });
  }
}
