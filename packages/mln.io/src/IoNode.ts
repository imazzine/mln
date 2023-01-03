/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Network node class definition.
 */

import { Node, destruct } from "@imazzine/mln.ts";
import { _sendFn, _closeFn } from "./symbols";

export class IoNode extends Node {
  private [_sendFn]: (msg: string) => void = () => undefined;
  private [_closeFn]: () => void = () => undefined;

  public constructor(opts: {
    sendFn: (msg: string) => void;
    closeFn: () => void;
  }) {
    super();
    this[_sendFn] = opts.sendFn;
    this[_closeFn] = opts.closeFn;
  }

  protected [destruct](): void {
    this[_sendFn] = () => undefined;
    this[_closeFn] = () => undefined;
  }

  public send(message: string): void {
    this[_sendFn](message);
  }

  public close(): void {
    this[_closeFn]();
  }
}
