/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the LogsBuffer and related types.
 */

import { debounce } from "throttle-debounce";
import { LogRecord } from "./LogRecord";
import { LogLevel } from "./enums/LogLevel";
import { getLogLevel } from "./Logger";
import {
  _buffer,
  _debouncer,
  _timeout,
  _errors,
  syncBufferInternal,
} from "./symbols";

/**
 * LogRecords buffer class.
 */
export class LogsBuffer {
  /**
   * Sync debouncer timeout, ms.
   */
  private [_timeout] = 250;

  /**
   * Logs buffer.
   */
  private [_buffer]: Set<LogRecord> = new Set();

  /**
   * Failed in sync logs buffer.
   */
  private [_errors]: Set<LogRecord> = new Set();

  /**
   * Sync debouncer.
   */
  private [_debouncer]: debounce<() => Promise<void>> = debounce(
    this[_timeout],
    async () => {
      const logs: Set<LogRecord> =
        this[_errors].size === 0
          ? this[_buffer]
          : new Set([...this[_errors], ...this[_buffer]]);
      this[_buffer] = new Set();
      this[_errors] = new Set();
      try {
        await this[syncBufferInternal](logs);
      } catch (error) {
        this[_errors] = logs;
        throw error;
      }
    },
  );

  /**
   * Set sync debouncer timeout.
   * @param timeout Timeout in ms.
   */
  public set timeout(timeout: number) {
    this[_timeout] = timeout;
  }

  /**
   * Return sync debouncer timeout in ms.
   */
  public get timeout(): number {
    return this[_timeout];
  }

  /**
   * Default sync function.
   */
  protected async [syncBufferInternal](
    logs: Set<LogRecord>,
  ): Promise<void> {
    return new Promise((resolve) => {
      logs.forEach((log: LogRecord) => {
        if (getLogLevel() === LogLevel.NONE) {
          return;
        } else {
          switch (log.level) {
            case LogLevel.TRACE:
              if (log.level == LogLevel.TRACE) {
                console.log(log);
              }
              break;
            case LogLevel.DEBUG:
              if (log.level <= LogLevel.DEBUG) {
                console.log(log);
              }
              break;
            case LogLevel.INFO:
              if (log.level <= LogLevel.INFO) {
                console.log(log);
              }
              break;
            case LogLevel.WARN:
              if (log.level <= LogLevel.WARN) {
                console.log(log);
              }
              break;
            case LogLevel.ERROR:
              if (log.level <= LogLevel.ERROR) {
                console.log(log);
              }
              break;
            case LogLevel.FATAL:
              console.log(log);
              break;
          }
          return;
        }
      });
      resolve();
    });
  }

  /**
   * Adds log to the buffer.
   * @param log Log to add.
   */
  public add(log: LogRecord): boolean {
    canUpdateBuffer = false;
    this[_buffer].add(log);
    try {
      this[_debouncer]();
    } catch (error) {
      console.error(`Logging sync failed: ${error as string}`);
      return false;
    }
    return true;
  }
}

/**
 * Flag to determine whether LogsBuffer still can be updated or not.
 */
let canUpdateBuffer = true;

/**
 * Logs buffer object.
 */
let logsBuffer: LogsBuffer = new LogsBuffer();

/**
 * Replace buffer object which logger will internally use. Do nothing
 * if {@link LogsBuffer.add | LogsBuffer#add } was already called or
 * `buf` is not an object constructed from the {@link LogsBuffer}
 * child class.
 *
 * @param buffer New buffer object.
 */
export function setLogsBuffer(lb: LogsBuffer): boolean {
  if (lb instanceof LogsBuffer && canUpdateBuffer) {
    logsBuffer = lb;
    return true;
  }
  return false;
}

/**
 * Returns logs buffer instance.
 */
export function getLogsBuffer(): LogsBuffer {
  return logsBuffer;
}
