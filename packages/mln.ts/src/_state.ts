/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Module internal state declaration.
 */

import { Monitorable } from "./Monitorable";
import { Listenable } from "./Listenable";
import { EventListener } from "./EventListener";

/**
 * Map of the monitorable objects.
 */
export const monitorable: Map<string, Monitorable> = new Map();

/**
 * Map of the listenable object listeners maps.
 */
export const listeners: Map<
  Listenable,
  Map<string, Array<EventListener>>
> = new Map();

/**
 * Nodes index map.
 */
export const nodes: Map<
  Listenable,
  {
    parent?: Listenable;
    children: Array<Listenable>;
  }
> = new Map();
