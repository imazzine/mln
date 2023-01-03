/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the state functions.
 */

/**
 * Sets or clears the given state on the original state and returns
 * new state value.
 */
export function setState(
  original: number,
  state: number,
  enable: boolean,
): number {
  return enable ? original | state : original & ~state;
}

/**
 * Returns true if the object is in the specified state, false
 * otherwise.
 */
export function hasState(original: number, state: number): boolean {
  return !!(original & state);
}
