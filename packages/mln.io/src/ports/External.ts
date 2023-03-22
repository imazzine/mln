import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
  us_socket_context_t,
} from "uWebSockets.js";
import { getUid } from "@imazzine/mln.ts";
import { Env } from "../Env";
import { Port } from "./Port";

/**
 * External port options.
 */
type ExtOpts = {
  name?: string;
  port?: number;
  key_file?: string;
  cert_file?: string;
  passphrase?: string;
};

/**
 * The class that provides logic to handle external TCP traffic.
 */
export class External extends Port {
  /**
   * Session requests map.
   */
  private _sessionRequests: Map<
    string,
    {
      resolve: (token: string) => void;
      reject: (reason: string) => void;
    }
  > = new Map();

  /**
   * Upgrade requests map.
   */
  private _upgradeRequests: Map<
    string,
    {
      resolve: (user: unknown, resources: string[]) => void;
      reject: (reason: string) => void;
    }
  > = new Map();

  /**
   * Class constructor.
   */
  public constructor(opts?: ExtOpts) {
    super({
      ...opts,
      port: opts?.port || Env.EXT_PORT,
      name: opts?.name || Env.EXT_NAME,
    });
  }

  /**
   * @override
   */
  protected route(app: TemplatedApp): void {
    app
      .post("/session/:tenant", this.sessionRequestHandler.bind(this))
      .ws("/session/:tenant/:token", {
        compression: Env.EXT_COMPRESSION,
        maxPayloadLength: Env.EXT_PAYLOAD_LENGTH,
        idleTimeout: Env.EXT_IDLE_TIMEOUT,
        upgrade: this.upgradeRequestHandler.bind(this),
        open: (ws) => {
          // console.log(
          //   `A WebSocket connected with URL: ${ws.myData}`,
          // );
          console.log("open");
          // this.logger.info("WebSocket opened.");
        },
        message: (ws, message, isBinary) => {
          /* Ok is false if backpressure was built up, wait for
          drain */
          // const ok = ws.send(message, isBinary);
          console.log("message");
          // this.logger.info("WebSocket message.");
        },
        drain: (ws) => {
          // console.log(
          //   "WebSocket backpressure: " + ws.getBufferedAmount(),
          // );
          console.log("drain");
          // this.logger.info("WebSocket drained.");
        },
        close: (ws, code, message) => {
          // console.log("WebSocket closed");
          console.log("close");
          // this.logger.info("WebSocket closed.");
        },
      });
    super.route(app);
  }

  /**
   * Session HTTP request handler. Parses incoming requests and
   * dispatches the `session::request` event.
   */
  private sessionRequestHandler(
    response: HttpResponse,
    request: HttpRequest,
  ): void {
    this.sessionRequestWorkflow(response, request).catch(
      (reason: unknown) => {
        let message: string;
        if (reason instanceof Error) {
          message = reason.message;
        } else if (typeof reason === "string") {
          message = reason;
        } else {
          try {
            message = JSON.stringify(reason);
          } catch (err) {
            message = "unknown error";
          }
        }
        response
          .writeStatus("500 Internal Server Error")
          .writeHeader(Env.PROTOCOL, Env.VERSION)
          .end(message);
      },
    );
  }

  /**
   * HTTP upgrade request handler. Parses incoming parameters and
   * dispatches the `session::upgrade` event.
   */
  private upgradeRequestHandler(
    response: HttpResponse,
    request: HttpRequest,
    context: us_socket_context_t,
  ): void {
    response.onAborted(() => {
      clearTimeout(timeout);
      this._upgradeRequests.delete(uid);
      const msg =
        "request was prematurely aborted or invalid or missing";
      this.logger.error(msg);
    });

    const uid = getUid();
    const tenant = request.getParameter(0);
    const token = request.getParameter(1);
    const wsKey = request.getHeader("sec-websocket-key");
    const wsProtocol = request.getHeader("sec-websocket-protocol");
    const wsExtensions = request.getHeader(
      "sec-websocket-extensions",
    );

    const timeout = setTimeout(() => {
      this._upgradeRequests.delete(uid);
      response
        .writeStatus("408 Request Timeout")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end();
    }, Env.SES_REQ_TIMEOUT);

    const resolve = (user: unknown, resources: string[]) => {
      clearTimeout(timeout);
      this._upgradeRequests.delete(uid);
      response.upgrade(
        { user, resources },
        wsKey,
        wsProtocol,
        wsExtensions,
        context,
      );
    };

    const reject = (reason: string) => {
      clearTimeout(timeout);
      this._sessionRequests.delete(uid);
      response
        .writeStatus("403 Forbidden")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end(reason);
    };

    this._upgradeRequests.set(uid, { resolve, reject });
    this.dispatch("session::upgrade", { uid, tenant, token });
  }

  /**
   * Executes session request workflow.
   */
  private async sessionRequestWorkflow(
    response: HttpResponse,
    request: HttpRequest,
  ): Promise<void> {
    response.onAborted(() => {
      clearTimeout(timeout);
      this._upgradeRequests.delete(uid);
      const msg =
        "request was prematurely aborted or invalid or missing";
      this.logger.error(msg);
    });

    const uid = getUid();
    const tenant = request.getParameter(0);
    const bearer = this.getBearer(request);
    const data = await this.readJSON(response);

    const timeout = setTimeout(() => {
      this._sessionRequests.delete(uid);
      response
        .writeStatus("408 Request Timeout")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end();
    }, Env.SES_REQ_TIMEOUT);

    const resolve = (token: string) => {
      clearTimeout(timeout);
      this._sessionRequests.delete(uid);
      response
        .writeStatus("200 OK")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end(token);
    };

    const reject = (reason: string) => {
      clearTimeout(timeout);
      this._sessionRequests.delete(uid);
      response
        .writeStatus("403 Forbidden")
        .writeHeader(Env.PROTOCOL, Env.VERSION)
        .end(reason);
    };

    this._sessionRequests.set(uid, { resolve, reject });
    this.dispatch("session::request", {
      uid,
      tenant,
      bearer,
      data,
    });
  }

  /**
   * Resolves session request specified by the `uid` with the access
   * `token`.
   */
  public resolveSessionRequest(uid: string, token: string): void {
    this._sessionRequests.get(uid)?.resolve(token);
  }

  /**
   * Rejects session request specified by the `uid` because of the
   * `reason`.
   */
  public rejectSessionRequest(uid: string, reason: string): void {
    this._sessionRequests.get(uid)?.reject(reason);
  }

  /**
   * Resolves upgrade request specified by the `uid` with the `user`
   * and `resources`.
   */
  public resolveUpgradeRequest(
    uid: string,
    user: unknown,
    resources: string[],
  ): void {
    this._upgradeRequests.get(uid)?.resolve(user, resources);
  }

  /**
   * Rejects upgrade request specified by the `uid` because of the
   * `reason`.
   */
  public rejectUpgradeRequest(uid: string, reason: string): void {
    this._upgradeRequests.get(uid)?.reject(reason);
  }
}
