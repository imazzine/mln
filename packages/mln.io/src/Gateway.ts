import { Node } from "@imazzine/mln.ts";
import { Auth } from "./Auth";
import { External } from "./ports/External";

export class Gateway extends Node {
  public constructor() {
    super();

    const auth = new Auth();
    this.insert(auth);

    const external = new External();
    auth.insert(external);

    external.start().catch((reason) => {
      console.error(reason);
    });
  }
}
