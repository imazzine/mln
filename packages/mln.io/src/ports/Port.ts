import { destruct, Node } from "@imazzine/mln.ts";
import * as uWebSockets from "uWebSockets.js";

const _uws = Symbol("_uws");
const _port = Symbol("_port");
const _sock = Symbol("_sock");

type PortOpts = {
  name?: string;
  port?: number;
  key_file?: string;
  cert_file?: string;
  passphrase?: string;
};

/**
 * The class that provides basic functionality to convert TCP traffic
 * to an `mln`-object events.
 */
export class Port extends Node {
  private [_uws]: null | uWebSockets.TemplatedApp = null;

  private [_port]: null | number = null;

  private [_sock]: null | unknown = null;

  /**
   * TCP port that is listened by the instance.
   */
  public get port(): null | number {
    return this[_port];
  }

  /**
   * Construct `Port` instance.
   */
  public constructor(opts?: PortOpts) {
    super();
    this[_port] = opts?.port || 9090;
    this[_uws] = uWebSockets
      .App({
        key_file_name: opts?.key_file,
        cert_file_name: opts?.cert_file,
        passphrase: opts?.passphrase,
      })
      .addServerName(opts?.name || "localhost", {
        key_file_name: opts?.key_file,
        cert_file_name: opts?.cert_file,
        passphrase: opts?.passphrase,
      });
  }

  /**
   * Starts listening for incoming TCP traffic.
   */
  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this[_uws] && this[_port]) {
        this.route(this[_uws]);
        this[_uws].listen(this[_port], (socket) => {
          if (!socket) {
            this.logger.fatal(
              `The Gateway#${this.uid} is failed to listen ` +
                `port ${<number>this[_port]}`,
            );
            this.destructor();
            reject();
          } else {
            this[_sock] = socket;
            this.logger.info(
              `The Gateway#${this.uid} is listening to ` +
                `port ${<number>this[_port]}`,
            );
            resolve(<number>this[_port]);
          }
        });
      }
    });
  }

  /**
   * Configures the port routes. This method must be overridden to
   * provide the necessary functionality. Returns "501 Not
   * Implemented" by default.
   */
  protected route(app: uWebSockets.TemplatedApp): void {
    app
      .options("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      })
      .get("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      })
      .post("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      })
      .put("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      })
      .patch("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      })
      .del("/*", (response, request) => {
        response
          .writeStatus("501 Not Implemented")
          .writeHeader("mln.io", "1.0.0")
          .end(
            "Requested endpoint is not implemented: " +
              request.getUrl(),
          );
      });
  }

  /**
   * @override
   */
  protected [destruct](): void {
    if (this[_sock]) {
      uWebSockets.us_listen_socket_close(this[_sock]);
      this[_sock] = null;
    }
    this[_uws] = null;
    this[_port] = null;
    super[destruct]();
  }
}
