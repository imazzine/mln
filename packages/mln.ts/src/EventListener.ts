/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `EventListener` class.
 */

import { Event } from "./Event";

/**
 * The helper class for storing certain event callback and its scope.
 */
export class EventListener {
  /**
   * Added callback function.
   */
  callback: (evt: Event<unknown>) => void;

  /**
   * Capture flag. Optional. False by default.
   */
  capture: boolean;

  /**
   * Passive flag. Optional. False by default.
   */
  passive: boolean;

  /**
   * Removed flag. Optional. False by default.
   */
  removed: boolean;

  /**
   * Once flag. Optional. False by default.
   */
  once: boolean;

  /**
   * Class constructor.
   * @param callback Added callback function.
   * @param capture Capture flag. Optional. False by default.
   * @param passive Passive flag. Optional. False by default.
   * @param removed Removed flag. Optional. False by default.
   * @param once Once flag. Optional. False by default.
   */
  constructor(
    callback: (evt: Event<unknown>) => void,
    capture = false,
    passive = false,
    removed = false,
    once = false,
  ) {
    this.callback = callback;
    this.capture = capture;
    this.passive = passive;
    this.removed = removed;
    this.once = once;
  }
}
