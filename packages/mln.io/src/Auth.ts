import { readFile } from "fs";
import { resolve } from "path";
import {
  KeyLike,
  importSPKI,
  importPKCS8,
  CompactEncrypt,
  jwtDecrypt,
} from "jose";
import { Node, Event } from "@imazzine/mln.ts";
import { External } from "./ports/External";

const _keys = Symbol("_keys");

const tenantsPath = process.env.MLN_TENANTS_PATH
  ? process.env.MLN_TENANTS_PATH
  : "./tenants";

const SES_TKN_EXP = process.env.MLN_SES_TKN_EXP
  ? parseInt(process.env.MLN_SES_TKN_EXP)
  : 1000;

const SES_TKN_ALG = process.env.MLN_SES_TKN_ALG
  ? process.env.MLN_SES_TKN_ALG
  : "RSA-OAEP-256";

const SES_TKN_ENC = process.env.MLN_SES_TKN_ENC
  ? process.env.MLN_SES_TKN_ENC
  : "A256GCM";

export type SessionRequest = {
  uid: string;
  tenant: string;
  bearer: string;
  data: object;
};

export class Auth extends Node {
  private [_keys]: Map<string, [KeyLike, KeyLike]> = new Map();

  /**
   * Class constructor.
   */
  public constructor() {
    super();
    this.listen(
      "session::request",
      this.sessionRequestListener.bind(this),
    );
  }

  /**
   * The `session::request` event listener.
   */
  private sessionRequestListener(event: Event<unknown>): void {
    const scope = <SessionRequest>event.scope;
    const port = <External>event.source;
    this.sessionRequestWorkflow(scope)
      .then((jwe) => {
        port.resolveSessionRequest(
          scope.uid,
          encodeURIComponent(jwe),
        );
      })
      .catch((reason: unknown) => {
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
        port.rejectSessionRequest(scope.uid, message);
      });
  }

  /**
   * Executes session request workflow and returns jwe token.
   */
  private async sessionRequestWorkflow(
    scope: SessionRequest,
  ): Promise<string> {
    await this.assertSessionRequestBearer(scope.tenant, scope.bearer);
    const jwe = await this.getSessionAccessToken(
      scope.tenant,
      scope.data,
    );
    return jwe;
  }

  /**
   * Asserts incomming session request bearer token.
   */
  private async assertSessionRequestBearer(
    tenant: string,
    bearer: string,
  ): Promise<void> {
    const [key] = await this.getTenantKeys(tenant);
    const jwt = await jwtDecrypt(decodeURIComponent(bearer), key);
    if (jwt.payload.sub !== "session::bearer") {
      throw new Error("Invalid Bearer.");
    }
  }

  /**
   * Evaluates and returns session inialization token.
   */
  private async getSessionAccessToken(
    tenant: string,
    data: object,
  ): Promise<string> {
    const [, pub] = await this.getTenantKeys(tenant);
    const payload = Buffer.from(
      JSON.stringify({
        // with the following scope
        ...data,
        // current service produced token
        iss: this.uid,
        // for session initialization
        sub: "session::access",
        // at
        iat: Date.now() / 1000,
        // which can be used from
        nbf: Date.now() / 1000,
        // up to
        exp: (Date.now() + SES_TKN_EXP) / 1000,
      }),
      "utf8",
    );
    const ce = new CompactEncrypt(payload).setProtectedHeader({
      alg: SES_TKN_ALG,
      enc: SES_TKN_ENC,
    });
    const jwe = await ce.encrypt(pub);
    return jwe;
  }

  /**
   * Returns ssh keys for the specified token.
   */
  private async getTenantKeys(
    tenant: string,
  ): Promise<[KeyLike, KeyLike]> {
    if (this[_keys].has(tenant)) {
      return Promise.resolve(
        <[KeyLike, KeyLike]>this[_keys].get(tenant),
      );
    } else {
      const keyPath = resolve(
        process.cwd(),
        tenantsPath,
        `./${tenant}/keys`,
        "./key",
      );
      const pubPath = resolve(
        process.cwd(),
        tenantsPath,
        `./${tenant}/keys`,
        "./key.pub",
      );
      const keyFile = await this.loadFile(keyPath);
      const pubFile = await this.loadFile(pubPath);
      const key = await importPKCS8(keyFile.toString(), "ES256");
      const pub = await importSPKI(pubFile.toString(), "ES256");
      return [key, pub];
    }
  }

  /**
   * Loads file from disk and returns its content as a Buffer.
   */
  private async loadFile(path: string): Promise<Buffer> {
    const file = await new Promise(
      (resolve: (val: Buffer) => void, reject) => {
        readFile(path, (err, data) => {
          if (err) {
            reject("No such tenant or key file is missing");
          } else {
            resolve(data);
          }
        });
      },
    );
    return file;
  }
}
