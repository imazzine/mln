import {
  TemplatedApp,
  HttpResponse,
  HttpRequest,
} from "uWebSockets.js";
import { Node } from "@imazzine/mln.ts";
import { External } from "./ports/External";

export class Gateway extends Node {
  public constructor() {
    super();
    const external = new External();
    this.insert(external);
    external.start().catch((reason) => {
      console.error(reason);
    });
  }
}
