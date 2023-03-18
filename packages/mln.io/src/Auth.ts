import { readFile } from "fs";
import { resolve } from "path";
import {
  KeyLike,
  importSPKI,
  importPKCS8,
  CompactEncrypt,
  compactDecrypt,
  GeneralEncrypt,
  generalDecrypt,
  FlattenedEncrypt,
  flattenedDecrypt,
} from "jose";
import { Node, Event } from "@imazzine/mln.ts";
import { External } from "./ports/External";

const tenantsPath = process.env.MLN_TENANTS_PATH
  ? process.env.MLN_TENANTS_PATH
  : "./tenants";

export type SessionRequest = {
  uid: string;
  tenant: string;
  data: Buffer;
};

export class Auth extends Node {
  public constructor() {
    super();
    this.listen(
      "session::request",
      this.sessionRequestListener.bind(this),
    );
  }

  private sessionRequestListener(event: Event<unknown>) {
    const scope = <SessionRequest>event.scope;
    const port = <External>event.source;
    this.loadTenantKeys(scope.tenant)
      .then(([key, pub]) => {
        console.log(scope.data.toString());
        // new CompactEncrypt(scope.data)
        //   .setProtectedHeader({
        // alg: "RSA-OAEP-256", enc: "A256GCM" })
        //   .encrypt(pub)
        //   .then((jwe) => {
        //     port.resolveSessionRequest(scope.uid, jwe);
        //     console.log(jwe);
        //     compactDecrypt(jwe, key).then((val) => {
        //       console.log(val);
        //       console.log(val.plaintext.toString());
        //     }).catch;
        //   }).catch;
        const e = new GeneralEncrypt(scope.data);
        e.setProtectedHeader({ enc: "A256GCM", alg: "RSA-OAEP-256" });
        e.addRecipient(pub);
        e.encrypt().then((jwe) => {
          port.resolveSessionRequest(scope.uid, JSON.stringify(jwe));
          console.log(jwe);
          generalDecrypt(jwe, key).then((val) => {
            console.log(val);
            console.log(val.plaintext.toString());
          }).catch;
        }).catch;
      })
      .catch((reason: string) => {
        port.rejectSessionRequest(scope.uid, reason);
      });
  }

  private async loadTenantKeys(
    tenant: string,
  ): Promise<[KeyLike, KeyLike]> {
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
    return Promise.all([
      new Promise((resolve: (val: KeyLike) => void, reject) => {
        readFile(keyPath, (err, data) => {
          if (err) {
            reject(err.message);
          } else {
            importPKCS8(data.toString(), "ES256")
              .then((key) => {
                resolve(key);
              })
              .catch((reason) => {
                reject((<Error>reason).message);
              });
          }
        });
      }),
      new Promise((resolve: (val: KeyLike) => void, reject) => {
        readFile(pubPath, (err, data) => {
          if (err) {
            reject(err.message);
          } else {
            importSPKI(data.toString(), "ES256")
              .then((pub) => {
                resolve(pub);
              })
              .catch((reason) => {
                reject((<Error>reason).message);
              });
          }
        });
      }),
    ]);
  }
}
