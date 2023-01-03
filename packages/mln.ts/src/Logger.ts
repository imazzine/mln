/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the Logger and related types.
 */

import { _uid, _level, _buffer } from "./symbols";
import { LoggedType } from "./enums/LoggedType";
import { LogLevel } from "./enums/LogLevel";
import { getStack } from "./helpers/getStack";
import {
  parseUserMessage,
  MonitorableCheckpoint,
  MonitorableWarning,
  MonitorableChanged,
  MonitorableMapped,
  MonitorableUnmapped,
  MonitorableConstructed,
  MonitorableDestructed,
  ListenableMapped,
  ListenableUnmapped,
  ListenersMapped,
  ListenersUnmapped,
  ListenerAdded,
  ListenerUpdated,
  ListenerRemoved,
  EventConstructed,
  EventStoped,
  EventPrevented,
} from "./LogMessage";
import { LogRecord } from "./LogRecord";
import { LogsBuffer, getLogsBuffer } from "./LogsBuffer";

/**
 * Core logger class. Provides the basic implementation for the logger
 * object. This interface used internally by the other core types to
 * log some internal data and could be used as a unified way to log
 * app/process data.
 */
export class Logger {
  private [_uid]: string;
  private [_level]: LogLevel;
  private [_buffer]: LogsBuffer = getLogsBuffer();

  /**
   * Unique identifier.
   */
  get uid(): string {
    return this[_uid];
  }

  /**
   * Logging level.
   * @param level Logging level.
   */
  set level(level: LogLevel) {
    this[_level] = level;
  }

  /**
   * Logging level. This value is calculated in the runtime and
   * depends on two values: the internal logger level stored in the
   * {@link Logger[_level]} and the global logging level configurable
   * by the {@link setLogLevel}. If the internal level is specified
   * and differs from {@link LogLevel.NONE}, then it will be used as a
   * value. Otherwise, a global log level value will be used.
   */
  get level(): LogLevel {
    return this[_level] !== LogLevel.NONE
      ? this[_level]
      : getLogLevel();
  }

  /**
   * Class constructor.
   * @param uid Unique identifier.
   * @param level Initial logging level ({@link LogLevel.NONE} by
   * default).
   */
  constructor(uid: string, level = LogLevel.NONE) {
    this[_uid] = uid;
    this[_level] = level;
  }

  /**
   * Logs a message at the "trace" log level.
   */
  public trace(message: unknown): void {
    if (message instanceof MonitorableCheckpoint) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_CHECKPOINT,
          LogLevel.TRACE,
          message,
          getStack("Monitorable checkpoint"),
        ),
      );
    } else {
      const [type, val] = parseUserMessage(message);
      void this[_buffer].add(
        new LogRecord(type, LogLevel.TRACE, val, getStack("Trace")),
      );
    }
  }

  /**
   * Logs a message at the "debug" log level.
   */
  public debug(message: unknown): void {
    if (message instanceof MonitorableChanged) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_CHANGED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof MonitorableMapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_MAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof MonitorableUnmapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_UNMAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenableMapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENABLE_MAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenableUnmapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENABLE_UNMAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenersMapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENERS_MAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenersUnmapped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENERS_UNMAPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenerAdded) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENER_ADDED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenerUpdated) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENER_UPDATED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof ListenerRemoved) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.LISTENER_REMOVED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof EventStoped) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.EVENT_STOPPED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else if (message instanceof EventPrevented) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.EVENT_PREVENTED,
          LogLevel.DEBUG,
          message,
          null,
        ),
      );
    } else {
      const [type, val] = parseUserMessage(message);
      void this[_buffer].add(
        new LogRecord(type, LogLevel.DEBUG, val, null),
      );
    }
  }

  /**
   * Logs a message at the "info" log level.
   */
  public info(message: unknown): void {
    if (message instanceof MonitorableConstructed) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_CONSTRUCTED,
          LogLevel.INFO,
          message,
          null,
        ),
      );
    } else if (message instanceof MonitorableDestructed) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_DESTRUCTED,
          LogLevel.INFO,
          message,
          null,
        ),
      );
    } else if (message instanceof EventConstructed) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.EVENT_CONSTRUCTED,
          LogLevel.INFO,
          message,
          null,
        ),
      );
    } else {
      const [type, val] = parseUserMessage(message);
      void this[_buffer].add(
        new LogRecord(type, LogLevel.INFO, val, null),
      );
    }
  }

  /**
   * Logs a message at the "warn" log level.
   */
  public warn(message: unknown): void {
    if (message instanceof MonitorableWarning) {
      void this[_buffer].add(
        new LogRecord(
          LoggedType.MONITORABLE_WARNING,
          LogLevel.WARN,
          message,
          getStack("Warning checkpoint"),
        ),
      );
    } else {
      const [type, val] = parseUserMessage(message);
      void this[_buffer].add(
        new LogRecord(type, LogLevel.WARN, val, getStack("Warning")),
      );
    }
  }

  /**
   * Logs a message at the "error" log level.
   */
  public error(message: unknown): void {
    const [type, val] = parseUserMessage(message);
    void this[_buffer].add(
      new LogRecord(type, LogLevel.ERROR, val, null),
    );
  }

  /**
   * Logs a message at the "fatal" log level.
   */
  public fatal(message: unknown): void {
    const [type, val] = parseUserMessage(message);
    void this[_buffer].add(
      new LogRecord(type, LogLevel.FATAL, val, null),
    );
  }
}

/**
 * Global log level.
 */
let logLevel: LogLevel = LogLevel.TRACE;

/**
 * Configures logging level in the runtime. Each particular logger
 * could be reconfigured independently by changing {@link Logger.level
 * | `Logger#level`}. Could be called in the runtime any number of
 * times.
 *
 * @param level Logging level.
 */
export function setLogLevel(level: LogLevel): void {
  logLevel = level;
}

/**
 * Returns global logging level.
 */
export function getLogLevel(): LogLevel {
  return logLevel;
}
