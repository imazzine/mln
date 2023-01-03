/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `Listenable` class and related
 * types.
 */

import { listeners, nodes } from "./_state";
import { destruct } from "./symbols";
import { getCallbackUid } from "./helpers/getUid";
import {
  MonitorableCheckpoint,
  ListenableMapped,
  ListenableUnmapped,
  ListenersMapped,
  ListenersUnmapped,
  ListenerAdded,
  ListenerUpdated,
  ListenerRemoved,
} from "./LogMessage";
import { Monitorable } from "./Monitorable";
import { Event } from "./Event";
import { EventPhase } from "./enums/EventPhase";
import { EventListener } from "./EventListener";
import { EventBinder } from "./EventBinder";

/**
 * Returns listeners map for a given listenable object.
 */
export function getListenersMap(
  node: Listenable,
): Map<string, Array<EventListener>> {
  const maps = listeners.get(node);
  if (!maps) {
    const err = new Error(
      "The listeners map are missed for a listenable object.",
    );
    node.logger.fatal(err);
    throw err;
  } else {
    return maps;
  }
}

/**
 * Returns ancestors for a given listenable object.
 */
export function getAncestors(node: Listenable): Array<Listenable> {
  const ancestors: Array<Listenable> = [];
  let index = nodes.get(node);
  if (index) {
    let ancestor = index.parent;
    while (ancestor) {
      ancestors.push(ancestor);
      index = nodes.get(ancestor);
      if (!index) {
        const err = new Error(
          "The listenable object is missed in the nodes index map.",
        );
        node.logger.fatal(err);
        throw err;
      } else {
        ancestor = index.parent;
      }
    }
  }
  return ancestors;
}

/**
 * Execute appropriate listeners on `event.handler` listenable object.
 */
export function fireListeners(
  binder: EventBinder,
  event: Event<unknown>,
  capture: boolean,
): void {
  const listenable = event.handler;
  const listeners = getListenersMap(listenable).get(event.type);
  if (listeners) {
    let listener: EventListener;
    for (let i = 0; i < listeners.length; i++) {
      listener = listeners[i];
      if (
        listener.capture === capture &&
        !listener.removed &&
        !binder.stopped
      ) {
        // align binder
        if (binder.passive !== listener.passive) {
          binder.passive = listener.passive;
        }

        // run callback
        listener.callback.call(undefined, event);

        // unlisten one-time listener
        if (listener.once) {
          listenable.unlisten(event.type, listener.callback, {
            capture: capture,
          });
        }
      }
    }
  }
}

/**
 * Dispatches an event with the specified type and scope, and calls
 * all listeners listening for events of this type, putting generated
 * event object to the listener's callback.
 *
 * If any of the listeners returns false OR calls `event.prevent()`
 * then this function will return false. If one of the capture
 * listeners calls event.stop(), then the bubble listeners won't fire.
 */
export function dispatchEvent(
  node: Listenable,
  type: string,
  scope?: unknown,
): boolean {
  // construct an event binder
  const binder = new EventBinder(EventPhase.NONE, node, node);

  // construct an event
  const event = new Event<unknown>(type, binder, scope);

  // get object's ancestors if any
  const ancestors: Array<Listenable> = getAncestors(node);

  // run capturing phase cycle
  for (let i = ancestors.length - 1; i >= 0; i--) {
    binder.phase = EventPhase.CAPTURING;
    binder.handler = ancestors[i];
    fireListeners(binder, event, true);
  }

  // run capturing at target if event wasn't stoped
  if (!binder.stopped) {
    binder.phase = EventPhase.TARGET;
    binder.handler = node;
    fireListeners(binder, event, true);
  }

  // run bubbling at target if event wasn't stoped
  if (!binder.stopped) {
    fireListeners(binder, event, false);
  }

  // run bubbling phase cycle if event wasn't stoped
  if (!binder.stopped) {
    for (let i = 0; !binder.stopped && i < ancestors.length; i++) {
      binder.phase = EventPhase.BUBBLING;
      binder.handler = ancestors[i];
      fireListeners(binder, event, false);
    }
  }

  // unset event phase
  binder.phase = EventPhase.NONE;

  return !binder.stopped;
}

/**
 * Class that provides communication layer for the `mln`-objects. As a
 * structure it does not provide any additional public properties.
 * Communication approach is very similar to W3C
 * {@link developer.mozilla.org/en-US/docs/Web/API/EventTarget
 * | `EventTarget`} interface with it's `capture` and `bubble`
 * mechanism, stopping event propagation and preventing default
 * actions. Extends {@link Monitorable | `Monitorable`} behavior.
 *
 * You may subclass this class to turn your class into a monitorable
 * and listenable object.
 */
export class Listenable extends Monitorable {
  /**
   * @override
   */
  public constructor() {
    super();

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Listenable.constructor()` call.",
      ),
    );

    // adding listeners map to the _state.listeners
    listeners.set(this, new Map());

    // logging listenable listeners map update
    this.logger.debug(new ListenableMapped(this.uid));
  }

  /**
   * @override
   */
  protected [destruct](): void {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Listenable[destruct]()` call.",
      ),
    );

    // delete listeners map from the listeners storage
    listeners.delete(this);

    // logging listenable listeners map update
    this.logger.debug(new ListenableUnmapped(this.uid));

    super[destruct]();
  }

  /**
   * Adds an event listener. A listener can only be added once to an
   * object and if it is added again only `passive` and `once` options
   * are applied to the registered one.
   *
   * @param eventType Event type.
   * @param callback Callback function to run.
   * @param options Callback options:
   * @param options.capture Execute listener on the `capture` phase.
   * @param options.passive Ignore {@link Event.stop | `event.stop()`}
   * and {@link Event.prevent | `event.prevent()`} calls from a
   * listener.
   * @param options.once Remove listener after it was executed first
   * time.
   */
  listen(
    eventType: string,
    callback: (event: Event<unknown>) => void,
    options?: {
      capture?: boolean;
      passive?: boolean;
      once?: boolean;
    },
  ): void {
    // evaluating options
    const opts = {
      capture: false,
      passive: false,
      once: false,
      ...options,
    };

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Listenable.listen(" +
          `'${eventType}', ` +
          `${getCallbackUid(callback)}, ` +
          `${opts.toString()}` +
          ")` call.",
      ),
    );

    try {
      // getting object's listeners map
      const listenersMap = getListenersMap(this);

      // getting event listeners array for a given event type
      let eventListeners = listenersMap.get(eventType);

      // construct and add listeners array if not exists
      if (!eventListeners) {
        eventListeners = [];

        listenersMap.set(eventType, eventListeners);

        // logging listenable events listeners map update
        this.logger.debug(new ListenersMapped(this.uid, eventType));
      }

      // finding and updating (if exists and not removed) a listener
      // equivalent to the specified in arguments
      let listener: null | EventListener = null;
      for (let i = 0; i < eventListeners.length; i++) {
        if (
          !eventListeners[i].removed &&
          eventListeners[i].callback === callback &&
          eventListeners[i].capture === opts.capture
        ) {
          listener = eventListeners[i];
          listener.passive = opts.passive;
          listener.once = opts.once;

          // logging listenable event listeners map update
          this.logger.debug(
            new ListenerUpdated(
              this.uid,
              eventType,
              listener.callback,
              listener.capture,
              listener.passive,
              listener.once,
            ),
          );
        }
      }

      if (!listener) {
        listener = new EventListener(
          callback,
          opts.capture,
          opts.passive,
          false,
          opts.once,
        );

        // adding a listener to the listeners map
        eventListeners.push(listener);

        // logging listenable events listeners map update
        this.logger.debug(
          new ListenerAdded(
            this.uid,
            eventType,
            listener.callback,
            listener.capture,
            listener.passive,
            listener.once,
          ),
        );
      }
    } catch (e) {
      // TODO (buntarb): crash logic here.
    }
  }

  /**
   * Removes an event listener which was added with the {@link listen
   * | `listen`}.
   *
   * @param eventType Event type.
   * @param callback Callback function to run.
   * @param options Callback options:
   * @param options.capture Execute listener on the `capture` phase.
   */
  unlisten(
    eventType: string,
    callback: (event: Event<unknown>) => void,
    options?: {
      capture?: boolean;
    },
  ): void {
    // parse options
    const opts = {
      capture: false,
      ...options,
    };

    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Listenable.unlisten(" +
          `'${eventType}', ` +
          `${getCallbackUid(callback)}, ` +
          `${opts.toString()}` +
          ")` call.",
      ),
    );

    try {
      // getting object's listeners map
      const listenersMap = getListenersMap(this);

      // getting listeners array for the given event type
      const eventListeners = listenersMap.get(eventType);

      if (eventListeners) {
        // finding and removing (if exists and not removed) a listener
        // equivalent to the specified in arguments
        for (let i = 0; i < eventListeners.length; i++) {
          if (
            !eventListeners[i].removed &&
            eventListeners[i].callback === callback &&
            eventListeners[i].capture === opts.capture
          ) {
            eventListeners[i].removed = true;
            eventListeners.splice(i, 1);

            // logging listenable events listeners map update
            this.logger.debug(
              new ListenerRemoved(
                this.uid,
                eventType,
                callback,
                opts.capture,
              ),
            );
          }
        }

        if (eventListeners.length === 0) {
          // removing listeners from the listeners map
          listenersMap.delete(eventType);

          // logging listenable events listeners map update
          this.logger.debug(
            new ListenersUnmapped(this.uid, eventType),
          );
        }
      }
    } catch (e) {
      // TODO (buntarb): crash logic here.
    }
  }

  /**
   * Dispatches an {@link Event | `event`} with the specified `type`
   * and `scope`, and calls all listeners listening for an {@link
   * Event | `event`} of this type, putting the generated {@link
   * Event | `event`} object to the listener's callback.
   *
   * If any of the listeners calls `event.prevent()` then this
   * function will return `false`. If one of the capture listeners
   * calls `event.stop()`, then the bubble listeners won't fire.
   *
   * @param eventType Event type.
   * @param eventScope User defined data associated with the event.
   */
  dispatch(eventType: string, eventScope?: unknown): boolean {
    this.logger.trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Listenable.dispatch(" +
          `'${eventType}', ` +
          `${eventScope ? eventScope.toString() : "undefined"}` +
          ")` call.",
      ),
    );

    // safe call of existing listeners
    try {
      return dispatchEvent(this, eventType, eventScope);
    } catch (err) {
      // logging unhandled user's error
      this.logger.error(err);
      return false;
    }
  }
}
