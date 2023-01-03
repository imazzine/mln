/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `Event<T>` class.
 */

import {
  _type,
  _binder,
  _stack,
  _constructed,
  _scope,
  _state,
} from "./symbols";
import { getStack } from "./helpers/getStack";
import { setState } from "./helpers/state";
import { EventPhase } from "./enums/EventPhase";
import { EventState } from "./enums/EventState";
import {
  EventConstructed,
  EventStoped,
  EventPrevented,
} from "./LogMessage";
import { EventBinder } from "./EventBinder";
import { Listenable } from "./Listenable";

/**
 * A class for an event objects.
 *
 * Events expect internal `EventBinder` object to be passed to the
 * constructor function. You should not try to instantiate this object
 * manually. Use {@link Listenable.dispatch | `Listenable#dispatch`}
 * to dispatch an event.
 */
export class Event<T> {
  /**
   * Symbolic field for the event type.
   */
  private [_type]: string;

  /**
   * Symbolic field for the event binder.
   */
  private [_binder]: EventBinder;

  /**
   * Symbolic field for the event scope.
   */
  private [_scope]?: T;

  /**
   * Symbolic field for the event state.
   */
  private [_state] = 0x00;

  /**
   * Symbolic field for the event stack.
   */
  private [_stack]: string;

  /**
   * Symbolic field for the event creation moment timestamp.
   */
  private [_constructed]: Date;

  /**
   * Event type.
   */
  get type(): string {
    return this[_type];
  }

  /**
   * Event creation stack.
   */
  get stack(): string {
    return this[_stack];
  }

  /**
   * Event instantiation timestamp.
   */
  get created(): Date {
    return this[_constructed];
  }

  /**
   * Listenable object that dispatched the event.
   */
  get source(): Listenable {
    return this[_binder].source;
  }

  /**
   * Listenable object that had the listener attached.
   */
  get handler(): Listenable {
    return this[_binder].handler;
  }

  /**
   * Event processing phase.
   */
  get phase(): EventPhase {
    return this[_binder].phase;
  }

  /**
   * `null` if event has not been prevented or {@link prevent |
   * `event.prevent()`} call moment timestamp.
   */
  get prevented(): null | Date {
    return this[_binder].prevented;
  }

  /**
   * `false` if event propagation has not been stopped or {@link stop
   * | `event.stop()`} call moment timestamp.
   */
  get stopped(): null | Date {
    return this[_binder].stopped;
  }

  /**
   * Event associated scope.
   */
  get scope(): undefined | T {
    return this[_scope];
  }

  /**
   * Class constructor.
   */
  constructor(type: string, binder: EventBinder, scope?: T) {
    this[_type] = type;
    this[_binder] = binder;
    this[_scope] = scope;
    this[_state] = setState(
      this[_state],
      EventState.PREVENTED,
      false,
    );
    this[_state] = setState(this[_state], EventState.STOPPED, false);
    this[_stack] = getStack("Instantiation stack");
    this[_constructed] = new Date();

    // logging constructed event
    this[_binder].source.logger.info(
      new EventConstructed(
        this.type,
        this.stack,
        this.created,
        this.scope,
      ),
    );
  }

  /**
   * Stops the propagation of the event.
   */
  stop(): void {
    if (!this[_binder].passive) {
      this[_state] = setState(this[_state], EventState.STOPPED, true);
      this[_binder].stopped = new Date();

      // logging stopped event
      this[_binder].source.logger.debug(
        new EventStoped(
          this.type,
          this.stack,
          this.created,
          this.scope,
        ),
      );
    } else {
      this.handler.logger.warn(
        "The `Event.stop()` call ignored for the passive event",
      );
    }
  }

  /**
   * Prevents the default action.
   */
  prevent(): void {
    if (!this[_binder].passive) {
      this[_state] = setState(
        this[_state],
        EventState.PREVENTED,
        true,
      );
      this[_binder].prevented = new Date();

      // logging prevented event
      this[_binder].source.logger.debug(
        new EventPrevented(
          this.type,
          this.stack,
          this.created,
          this.scope,
        ),
      );
    } else {
      this.handler.logger.warn("prevent() ignored for passive event");
    }
  }
}
