import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
} from "uWebSockets.js";
import { getUid } from "@imazzine/mln.ts";
import { Port } from "./Port";

const SESSION_REQUEST_TIMEOUT = process.env
  .MLN_SESSION_REQUEST_TIMEOUT
  ? parseInt(process.env.MLN_SESSION_REQUEST_TIMEOUT)
  : 1000;

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
    const tenant = request.getParameter(0);
    this.readPostedData(
      response,
      (data: Buffer) => {
        const uid = getUid();
        const timeout = setTimeout(() => {
          this._sessionRequests.delete(uid);
          response
            .writeStatus("408 Request Timeout")
            .writeHeader("mln.io", "1.0.0")
            .end();
        }, SESSION_REQUEST_TIMEOUT);
        const resolve = (token: string) => {
          clearTimeout(timeout);
          this._sessionRequests.delete(uid);
          response
            .writeStatus("200 OK")
            .writeHeader("mln.io", "1.0.0")
            .end(token);
        };
        const reject = (reason: string) => {
          clearTimeout(timeout);
          this._sessionRequests.delete(uid);
          response
            .writeStatus("403 Forbidden")
            .writeHeader("mln.io", "1.0.0")
            .end(reason);
        };
        this._sessionRequests.set(uid, {
          resolve,
          reject,
        });
        this.dispatch("session::request", {
          uid,
          tenant,
          data,
        });
      },
      () => {
        const msg =
          "Request was prematurely aborted or invalid or missing.";
        this.logger.error(msg);
        response
          .writeStatus("400 Bad Request")
          .writeHeader("mln.io", "1.0.0")
          .end(msg);
      },
    );
  }

  /**
   * Reads data from the POST query body.
   */
  private readPostedData(
    response: HttpResponse,
    callback: (data: Buffer) => void,
    error: () => void,
  ): void {
    let buffer = Buffer.from([]);
    response.onAborted(error);
    response.onData((chunk, last) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
      if (last) callback(buffer);
    });
  }

  private readPostedJson(
    response: HttpResponse,
    callback: (data: unknown) => void,
    error: () => void,
  ): void {
    let buffer = Buffer.from([]);
    response.onAborted(error);
    response.onData((chunk, last) => {
      buffer = Buffer.concat([buffer, Buffer.from(chunk)]);
      if (last) {
        const str: string = buffer.toString();
        try {
          const obj: unknown = JSON.parse(str);
          callback(obj);
        } catch (err: unknown) {
          const msg =
            "Posted data is not a valid JSON string: " + str;
          this.logger.error(msg);
          response
            .writeStatus("400 Bad Request")
            .writeHeader("mln.io", "1.0.0")
            .end(msg);
        }
      }
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
