import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
} from "uWebSockets.js";
import { Port } from "./Port";

export class External extends Port {
  protected route(app: TemplatedApp): void {
    app.post(
      "/session/:tenant",
      this._sessionRequestHandler.bind(this),
    );
    super.route(app);
  }

  private _sessionRequestHandler(
    response: HttpResponse,
    request: HttpRequest,
  ): void {
    const tenant = request.getParameter(0);
    this._readPostedJson(
      response,
      (data: unknown) => {
        this.logger.trace(data);
        response.end("session");
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

  private _readPostedJson(
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
}
