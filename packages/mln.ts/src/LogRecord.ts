/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the LogRecord class.
 */

import { LoggedType } from "./enums/LoggedType";
import { LogLevel } from "./enums/LogLevel";
import { LogMessage } from "./LogMessage";
import {
  _timestamp,
  _level,
  _stack,
  _type,
  _message,
} from "./symbols";

/**
 * Log record class.
 */
export class LogRecord {
  private [_timestamp]: Date = new Date();
  private [_level]: LogLevel;
  private [_stack]: null | string;
  private [_type]: LoggedType;
  private [_message]:
    | undefined
    | boolean
    | number
    | string
    | LogMessage;

  /**
   * Log instantiation timestamp.
   */
  public get timestamp(): Date {
    return this[_timestamp];
  }

  /**
   * Log level.
   */
  public get level(): LogLevel {
    return this[_level];
  }

  /**
   * Log type.
   */
  public get type(): LoggedType {
    return this[_type];
  }

  /**
   * Log stack.
   */
  public get stack(): null | string {
    return this[_stack];
  }

  /**
   * Logged message.
   */
  public get message():
    | undefined
    | boolean
    | number
    | string
    | Date
    | LogMessage {
    return this[_message];
  }

  /**
   * @param type Log type.
   * @param level Log level.
   * @param message Log
   */
  public constructor(
    type: LoggedType,
    level: LogLevel,
    message: undefined | boolean | number | string | LogMessage,
    stack: null | string = null,
  ) {
    this[_type] = type;
    this[_level] = level;
    this[_message] = message;
    this[_stack] = stack;
  }
}
