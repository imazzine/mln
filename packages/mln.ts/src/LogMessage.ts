/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the log messages types.
 */

import { LoggedType } from "./enums/LoggedType";
import { Event } from "./Event";

/**
 * User's message.
 */
export type UserMessage =
  | undefined
  | symbol
  | boolean
  | bigint
  | number
  | string
  | unknown;

/**
 * Primitive message.
 */
export type PrimitiveMessage =
  | undefined
  | boolean
  | number
  | string
  | Date
  | Error;

/**
 * Parsed log message.
 */
export type ParsedMessage = [LoggedType, PrimitiveMessage];

/**
 * Parse UserMessage to a PrimitiveMessage and returns
 * ParsedLogMessage.
 *
 * @param message Message to parse.
 */
export function parseUserMessage(
  message: UserMessage,
): ParsedMessage {
  switch (typeof message) {
    case "undefined":
      return [LoggedType.UNDEFINED, undefined];
    case "symbol":
      return [LoggedType.SYMBOL, LoggedType.SYMBOL];
    case "bigint":
      return [LoggedType.BIGINT, message.toString()];
    case "boolean":
      return [LoggedType.BOOLEAN, message];
    case "number":
      return [LoggedType.NUMBER, message];
    case "string":
      return [LoggedType.STRING, message];
    case "function":
      return [LoggedType.FUNCTION, message.toString()];
    case "object":
      if (message instanceof Date) {
        return [LoggedType.DATE, message];
      } else if (message instanceof Error) {
        return [LoggedType.ERROR, message];
      } else {
        try {
          return [LoggedType.OBJECT, JSON.stringify(message)];
        } catch (err) {
          return message
            ? [LoggedType.OBJECT, message.toString()]
            : [LoggedType.OBJECT, "null"];
        }
      }
  }
}

/**
 * Log messages base class.
 */
export class LogMessage {}

/**
 * Event objects log messages base class.
 */
export class EventMessage extends LogMessage {
  /**
   * Logged event type.
   */
  public type: string;

  /**
   * Logged event call stack.
   */
  public stack: string;

  /**
   * Logged event constructed datetime.
   */
  public constructed: Date;

  /**
   * Logged event scope.
   */
  public scope?: unknown;

  /**
   * Class constructor.
   * @param type Constructed event type.
   * @param scope Constructed event scope.
   */
  constructor(
    type: string,
    stack: string,
    constructed: Date,
    scope?: unknown,
  ) {
    super();
    this.type = type;
    this.stack = stack;
    this.constructed = constructed;
    this.scope = scope;
  }
}

/**
 * Monitorable objects log messages base class.
 */
export class MonitorableMessage extends LogMessage {
  constructor(public uid: string) {
    super();
  }
}

/**
 * Monitorable objects checkpoint log messages base class.
 */
export class MonitorableCheckpoint extends MonitorableMessage {
  constructor(uid: string, public checkpoint: string) {
    super(uid);
  }
}

/**
 * Monitorable objects warning log messages base class.
 */
export class MonitorableWarning extends MonitorableMessage {
  constructor(uid: string, public warning: string) {
    super(uid);
  }
}

/**
 * Monitorable object saved to the monitorable map log message.
 */
export class MonitorableMapped extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Monitorable object removed from the monitorable map log message.
 */
export class MonitorableUnmapped extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Monitorable object constructed log message.
 */
export class MonitorableConstructed extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Monitorable object destructed log message.
 */
export class MonitorableDestructed extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Monitorable object changed log message.
 */
export class MonitorableChanged extends MonitorableMessage {
  /**
   * Logged property name.
   */
  public name: string;

  /**
   * Logged property type.
   */
  public type: LoggedType;

  /**
   * Logged property value.
   */
  public value: PrimitiveMessage;

  /**
   * Class constructor.
   * @param uid Object unique identifier.
   * @param name Changed property name.
   * @param value Changed ptoperty value.
   */
  constructor(uid: string, name: string, value: UserMessage) {
    super(uid);
    const [type, val] = parseUserMessage(value);
    this.name = name;
    this.type = type;
    this.value = val;
  }
}

/**
 * Listenable object saved to the listeners map log message.
 */
export class ListenableMapped extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Listenable object removed from the listeners map log message.
 */
export class ListenableUnmapped extends MonitorableMessage {
  constructor(uid: string) {
    super(uid);
  }
}

/**
 * Event listners map for a listenable object added log message.
 */
export class ListenersMapped extends MonitorableMessage {
  /**
   * Event type.
   */
  public type: string;

  /**
   * Class constructor.
   * @param uid Object unique identifier.
   * @param type Event type.
   */
  constructor(uid: string, type: string) {
    super(uid);
    this.type = type;
  }
}

/**
 * Event listners map for a listenable object removed log message.
 */
export class ListenersUnmapped extends MonitorableMessage {
  /**
   * Event type.
   */
  public type: string;

  /**
   * Class constructor.
   * @param uid Object unique identifier.
   * @param type Event type.
   */
  constructor(uid: string, type: string) {
    super(uid);
    this.type = type;
  }
}

/**
 * Event listner added log message.
 */
export class ListenerAdded extends MonitorableMessage {
  /**
   * Event type.
   */
  public type: string;

  /**
   * Listener callback.
   */
  public callback: (evt: Event<unknown>) => void;

  /**
   * Capture flag.
   */
  public capture: boolean;

  /**
   * Passive flag.
   */
  public passive: boolean;

  /**
   * Once flag.
   */
  public once: boolean;

  /**
   * Class constructor.
   * @param Object unique identifier.
   * @param type Event type.
   * @param callback Listener callback.
   * @param capture Listener capture flag.
   * @param passive Listener passive flag.
   * @param once Listener once flag.
   */
  constructor(
    uid: string,
    type: string,
    callback: (evt: Event<unknown>) => void,
    capture: boolean,
    passive: boolean,
    once: boolean,
  ) {
    super(uid);
    this.type = type;
    this.callback = callback;
    this.capture = capture;
    this.passive = passive;
    this.once = once;
  }
}

/**
 * Event listener updated log message.
 */
export class ListenerUpdated extends MonitorableMessage {
  /**
   * Event type.
   */
  public type: string;

  /**
   * Listener callback.
   */
  public callback: (evt: Event<unknown>) => void;

  /**
   * Capture flag.
   */
  public capture: boolean;

  /**
   * Passive flag.
   */
  public passive: boolean;

  /**
   * Once flag.
   */
  public once: boolean;

  /**
   * Class constructor.
   * @param Object unique identifier.
   * @param type Event type.
   * @param callback Listener callback.
   * @param capture Listener capture flag.
   * @param passive Listener passive flag.
   * @param once Listener once flag.
   */
  constructor(
    uid: string,
    type: string,
    callback: (evt: Event<unknown>) => void,
    capture: boolean,
    passive: boolean,
    once: boolean,
  ) {
    super(uid);
    this.type = type;
    this.callback = callback;
    this.capture = capture;
    this.passive = passive;
    this.once = once;
  }
}

/**
 * Event listener removed log message.
 */
export class ListenerRemoved extends MonitorableMessage {
  /**
   * Event type.
   */
  public type: string;

  /**
   * Listener callback.
   */
  public callback: (evt: Event<unknown>) => void;

  /**
   * Capture flag.
   */
  public capture: boolean;

  /**
   * Class constructor.
   * @param Object unique identifier.
   * @param type Event type.
   * @param callback Listener callback.
   * @param capture Listener capture flag.
   */
  constructor(
    uid: string,
    type: string,
    callback: (evt: Event<unknown>) => void,
    capture: boolean,
  ) {
    super(uid);
    this.type = type;
    this.callback = callback;
    this.capture = capture;
  }
}

/**
 * Event object constructed log message.
 */
export class EventConstructed extends EventMessage {
  /**
   * Class constructor.
   * @param type Constructed event type.
   * @param scope Constructed event scope.
   */
  constructor(
    type: string,
    stack: string,
    constructed: Date,
    scope?: unknown,
  ) {
    super(type, stack, constructed, scope);
  }
}

/**
 * Event object stoped log message.
 */
export class EventStoped extends EventMessage {
  /**
   * Class constructor.
   * @param type Constructed event type.
   * @param scope Constructed event scope.
   */
  constructor(
    type: string,
    stack: string,
    constructed: Date,
    scope?: unknown,
  ) {
    super(type, stack, constructed, scope);
  }
}

/**
 * Event object prevented log message.
 */
export class EventPrevented extends EventMessage {
  /**
   * Class constructor.
   * @param type Constructed event type.
   * @param scope Constructed event scope.
   */
  constructor(
    type: string,
    stack: string,
    constructed: Date,
    scope?: unknown,
  ) {
    super(type, stack, constructed, scope);
  }
}
