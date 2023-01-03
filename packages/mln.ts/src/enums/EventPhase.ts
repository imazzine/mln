/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the EventPhase enum.
 */

/**
 * Event phases enums.
 */
export enum EventPhase {
  NONE = 0,
  CAPTURING = 1,
  TARGET = 2,
  BUBBLING = 3,
}
