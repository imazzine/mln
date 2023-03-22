import { Node } from "@imazzine/mln.ts";
import { Auth } from "./Auth";
import { External } from "./ports/External";

export class Gateway extends Node {
  private external: External;

  public constructor() {
    super();

    const auth = new Auth();
    this.insert(auth);

    this.external = new External();
    auth.insert(this.external);
  }

  public async start(): Promise<number> {
    return await this.external.start();
  }
}
