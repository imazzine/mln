import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
} from "uWebSockets.js";
import { getUid } from "@imazzine/mln.ts";
import { Port } from "./Port";

const SES_REQ_TIMEOUT = process.env.MLN_SES_REQ_TIMEOUT
  ? parseInt(process.env.MLN_SES_REQ_TIMEOUT)
  : 1000;

const PROTOCOL = process.env.MLN_PROTOCOL
  ? process.env.MLN_PROTOCOL
  : "mln.io";

const VERSION = process.env.MLN_VERSION
  ? process.env.MLN_VERSION
  : "0.0.0";

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
   * @override
   */
  protected route(app: TemplatedApp): void {
    app.post(
      "/session/:tenant",
      this.sessionRequestHandler.bind(this),
    );
    super.route(app);
  }

  /**
   * Session HTTP request handler. Parses incoming requests and
   * dispatches the `session::request` events.
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
            message = "Unknown error.";
          }
        }
        response
          .writeStatus("500 Internal Server Error")
          .writeHeader(PROTOCOL, VERSION)
          .end(message);
      },
    );
  }

  /**
   * Executes session request workflow.
   */
  private async sessionRequestWorkflow(
    response: HttpResponse,
    request: HttpRequest,
  ): Promise<void> {
    const uid = getUid();
    const tenant = request.getParameter(0);
    const bearer = this.getBearer(request);
    const data = await this.readJSON(response);
    const timeout = setTimeout(() => {
      this._sessionRequests.delete(uid);
      response
        .writeStatus("408 Request Timeout")
        .writeHeader(PROTOCOL, VERSION)
        .end();
    }, SES_REQ_TIMEOUT);
    const resolve = (token: string) => {
      clearTimeout(timeout);
      this._sessionRequests.delete(uid);
      response
        .writeStatus("200 OK")
        .writeHeader(PROTOCOL, VERSION)
        .end(token);
    };
    const reject = (reason: string) => {
      clearTimeout(timeout);
      this._sessionRequests.delete(uid);
      response
        .writeStatus("403 Forbidden")
        .writeHeader(PROTOCOL, VERSION)
        .end(reason);
    };
    this._sessionRequests.set(uid, {
      resolve,
      reject,
    });
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
   * @param uid Session request identifier.
   * @param token Session access token.
   */
  public resolveSessionRequest(uid: string, token: string): void {
    this._sessionRequests.get(uid)?.resolve(token);
  }

  /**
   * Rejects session request specified by the `uid` because of the
   * `reason`.
   * @param uid Session request identifier.
   * @param reason Session rejected reason.
   */
  public rejectSessionRequest(uid: string, reason: string): void {
    this._sessionRequests.get(uid)?.reject(reason);
  }
}
