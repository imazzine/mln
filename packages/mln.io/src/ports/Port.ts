import { destruct, Node } from "@imazzine/mln.ts";
import * as uWebSockets from "uWebSockets.js";
import { Env } from "../Env";

const _uws = Symbol("_uws");
const _port = Symbol("_port");
const _sock = Symbol("_sock");

/**
 * Base port options.
 */
type PortOpts = {
  name: string;
  port: number;
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
   * Class constructor.
   */
  public constructor(opts: PortOpts) {
    super();
    this[_port] = opts.port;
    this[_uws] = uWebSockets
      .App({
        key_file_name: opts?.key_file,
        cert_file_name: opts?.cert_file,
        passphrase: opts?.passphrase,
      })
      .addServerName(opts.name, {
        key_file_name: opts?.key_file,
        cert_file_name: opts?.cert_file,
        passphrase: opts?.passphrase,
      });
  }

  /**
   * Configures the port routes. This method must be overridden to
   * provide the necessary functionality. Returns "501 Not
   * Implemented" by default.
   */
  protected route(app: uWebSockets.TemplatedApp): void {
    app.any("/*", (response, request) => {
      response
        .writeStatus("501 Not Implemented")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end(
          "requested endpoint is not implemented: " +
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

  /**
   * Starts listening for incoming TCP traffic.
   */
  public async start(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (this[_uws] && this[_port]) {
        this.route(this[_uws]);
        this[_uws].listen(this[_port], (socket) => {
          if (!socket) {
            this.logger.error(
              `Port[${this.uid}] is failed to listen ` +
                `port ${<number>this[_port]}`,
            );
            this.destructor();
            reject();
          } else {
            this[_sock] = socket;
            this.logger.info(
              `Port[${this.uid}] is listening to ` +
                `port ${<number>this[_port]}`,
            );
            resolve(<number>this[_port]);
          }
        });
      }
    });
  }

  /**
   * Returns authorization bearer token from the HTTP request or an
   * empty string if not specified.
   */
  public getBearer(request: uWebSockets.HttpRequest): string {
    let bearer = "";
    request.forEach((header, val) => {
      if (header === "authorization") {
        bearer = val && val.length ? val.split("Bearer ")[1] : "";
      }
    });
    return bearer;
  }

  /**
   * Reads data from the query body and retirns it as a Buffer.
   */
  public async readBuffer(
    response: uWebSockets.HttpResponse,
  ): Promise<Buffer> {
    const promise = new Promise((resolve: (data: Buffer) => void) => {
      let buffer = Buffer.from([]);
      response.onData((chunk, last) => {
        buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
        if (last) resolve(buffer);
      });
    });
    return promise;
  }

  /**
   * Reads data from the query body and retirns it as a JSON.
   */
  public async readJSON(
    response: uWebSockets.HttpResponse,
  ): Promise<unknown> {
    const buf = await this.readBuffer(response);
    const str = buf.toString();
    let obj: unknown;
    try {
      obj = JSON.parse(str);
    } catch (err) {
      const msg = `posted data is not a valid JSON string: ${str}`;
      this.logger.error(msg);
      response
        .writeStatus("400 Bad Request")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end(msg);
    }
    return obj;
  }
}
