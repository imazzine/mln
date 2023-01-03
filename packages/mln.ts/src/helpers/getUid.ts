/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `getUid` and the `getCallbackUid`
 * functions.
 */

import { v1, v5 } from "uuid";
import { Event } from "../Event";

const ns = "00000000-0000-0000-0000-000000000000";
const callbacks: Map<(event: Event<unknown>) => void, string> =
  new Map();

/**
 * Returns random session unique UUID-like string.
 *
 * @example
 * ```TypeScript
 * import { getUid } from "mln";
 *
 * console.log(getUid() === getUid());
 * // => false
 * ```
 */
export function getUid(): string {
  return v5(v1(), v1()).toString();
}

/**
 * Returns calculated UUID hash of the provided function, persistent
 * for the session. Throws a TypeError if callback is not a function.
 *
 * @example
 * ```TypeScript
 * import { getCallbackUid } from "mln";
 *
 * const fn1 = (e)=>{};
 * const fn2 = (e)=>{};
 *
 * console.log(getCallbackUid(fn1) === getCallbackUid(fn1);
 * // => true
 *
 * console.log(getCallbackUid(fn1) === getCallbackUid(fn2);
 * // => false
 *
 * console.log(getCallbackUid(fn2) === getCallbackUid(fn2);
 * // => true
 * ```
 */
export function getCallbackUid(
  callback: (event: Event<unknown>) => void,
): string {
  if (typeof callback === "function") {
    if (!callbacks.has(callback)) {
      callbacks.set(callback, v5(callback.toString(), ns).toString());
    }
    return callbacks.get(callback) as string;
  } else {
    throw new TypeError(
      `Unsupported callback type: ${typeof callback}`,
    );
  }
}
