/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `EventBinder` class.
 */

import { EventPhase } from "./enums/EventPhase";
import { Listenable } from "./Listenable";

/**
 * Class that holds internal event handling state .
 */
export class EventBinder {
  /**
   * Event handling phase.
   */
  phase: EventPhase;

  /**
   * Passive event flag.
   */
  passive = false;

  /**
   * Stopped event flag.
   */
  stopped: null | Date = null;

  /**
   * Prevented event flag.
   */
  prevented: null | Date = null;

  /**
   * Listenable object that dispatch the event.
   */
  source: Listenable;

  /**
   * Listenable object that had the listener attached.
   */
  handler: Listenable;

  /**
   * Class constructor.
   * @param phase Event handling phase.
   * @param source Listenable object that dispatch the event.
   * @param handler Listenable object that had the listener
   * attached.
   */
  constructor(
    phase: EventPhase,
    source: Listenable,
    handler: Listenable,
  ) {
    this.phase = phase || EventPhase.NONE;
    this.source = source;
    this.handler = handler;
  }
}
