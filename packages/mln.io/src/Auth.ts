import { readFile } from "fs";
import { resolve } from "path";
import {
  KeyLike,
  importSPKI,
  importPKCS8,
  CompactEncrypt,
  jwtDecrypt,
  JWTDecryptResult,
} from "jose";
import { Node, Event } from "@imazzine/mln.ts";
import { Env } from "./Env";
import { External } from "./ports/External";

/**
 * Session request event scope.
 */
type SessionRequest = {
  uid: string;
  tenant: string;
  bearer: string;
  data: object;
};

/**
 * Session upgrade event scope.
 */
type SessionUpgrade = {
  uid: string;
  tenant: string;
  token: string;
};

const _keys = Symbol("_keys");

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

    this.listen(
      "session::upgrade",
      this.sessionUpgradeListener.bind(this),
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
            message = "unknown error";
          }
        }
        port.rejectSessionRequest(scope.uid, message);
      });
  }

  /**
   * The `session::upgrade` event listener.
   */
  private sessionUpgradeListener(event: Event<unknown>): void {
    const scope = <SessionUpgrade>event.scope;
    const port = <External>event.source;
    this.sessionUpgradeWorkflow(scope)
      .then((jwt) => {
        port.resolveUpgradeRequest(
          scope.uid,
          jwt.payload.usr,
          <string[]>jwt.payload.res,
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
            message = "unknown error";
          }
        }
        port.rejectUpgradeRequest(scope.uid, message);
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
   * Executes session upgrade workflow and returns jwe token.
   */
  private async sessionUpgradeWorkflow(
    scope: SessionUpgrade,
  ): Promise<JWTDecryptResult> {
    const [key] = await this.getTenantKeys(scope.tenant);
    const jwt = await jwtDecrypt(
      decodeURIComponent(scope.token),
      key,
    );
    if (!jwt.payload.sub || jwt.payload.sub !== Env.SES_TKN_SUB) {
      throw new Error(
        "invalid token: missing or invalid `sub` claim",
      );
    }
    if (!jwt.payload.usr) {
      throw new Error("invalid token: no `usr` claim");
    }
    if (!jwt.payload.res) {
      throw new Error("invalid token: no `res` claim");
    }
    return jwt;
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
    if (jwt.payload.sub !== Env.SES_REQ_SUB) {
      throw new Error("invalid bearer");
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
        sub: Env.SES_TKN_SUB,
        // at
        iat: Date.now() / 1000,
        // which can be used from
        nbf: Date.now() / 1000 - 1,
        // up to
        exp: (Date.now() + Env.SES_TKN_TTL) / 1000,
      }),
      "utf8",
    );
    const ce = new CompactEncrypt(payload).setProtectedHeader({
      alg: Env.SES_TKN_ALG,
      enc: Env.SES_TKN_ENC,
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
    if (!this[_keys].has(tenant)) {
      const keyPath = resolve(
        process.cwd(),
        Env.TENANTS_PATH,
        `./${tenant}`,
        Env.TENANT_KEYS_PATH,
        `./${Env.TENANT_KEY_NAME}`,
      );
      const pubPath = resolve(
        process.cwd(),
        Env.TENANTS_PATH,
        `./${tenant}`,
        Env.TENANT_KEYS_PATH,
        `./${Env.TENANT_PUB_NAME}`,
      );
      const keyFile = await this.loadFile(keyPath);
      const pubFile = await this.loadFile(pubPath);
      const key = await importPKCS8(
        keyFile.toString(),
        Env.KEYS_IMPORT_ALG,
      );
      const pub = await importSPKI(
        pubFile.toString(),
        Env.KEYS_IMPORT_ALG,
      );
      this[_keys].set(tenant, [key, pub]);
    }
    return <[KeyLike, KeyLike]>this[_keys].get(tenant);
  }

  /**
   * Loads file from disk and returns its content as a Buffer.
   */
  private async loadFile(path: string): Promise<Buffer> {
    const file = await new Promise(
      (resolve: (val: Buffer) => void, reject) => {
        readFile(path, (err, data) => {
          if (err) {
            reject("no such tenant or key file is missing");
          } else {
            resolve(data);
          }
        });
      },
    );
    return file;
  }
}
