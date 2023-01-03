/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the Monitorable class and related
 * types.
 */

import { monitorable } from "./_state";
import {
  _uid,
  _state,
  _constructed,
  _destructed,
  _stack,
  _logger,
  destruct,
} from "./symbols";
import { MonitorableState } from "./enums/MonitorableState";
import { getUid } from "./helpers/getUid";
import { getStack } from "./helpers/getStack";
import { setState, hasState } from "./helpers/state";
import {
  MonitorableCheckpoint,
  MonitorableWarning,
  MonitorableChanged,
  MonitorableMapped,
  MonitorableConstructed,
  MonitorableUnmapped,
  MonitorableDestructed,
} from "./LogMessage";
import { Logger } from "./Logger";

/**
 * Class that provides the basic layer for the `mln`-objects. It
 * responds for the object construction, object uniqueness and the
 * ability to log associated with the object data. As a structure it
 * hosts a unique object identifier, object creation moment timestamp,
 * object creation stack and associated logger.
 */
export class Monitorable {
  /**
   * Symbolic field for the object's unique UUID-like identifier.
   */
  private [_uid]: string = getUid();

  /**
   * Symbolic field for the object's state.
   */
  private [_state] = 0x00;

  /**
   * Symbolic field for the object's creation moment timestamp.
   */
  private [_constructed]: Date = new Date();

  /**
   * Symbolic field for the object's destruction moment timestamp.
   */
  private [_destructed]: null | Date = null;

  /**
   * Symbolic field for the object's instantiation stack.
   */
  private [_stack]: string = getStack("Instantiation stack");

  /**
   * Symbolic field for the object's associated logger.
   */
  private [_logger]: Logger = new Logger(this[_uid]);

  /**
   * Unique UUID-like identifier.
   */
  public get uid(): string {
    return this[_uid];
  }

  /**
   * Instantiation timestamp.
   */
  public get constructed(): Date {
    return this[_constructed];
  }

  /**
   * Timestamp of the object destruction moment or null, if object is
   * not destructed.
   */
  public get destructed(): null | Date {
    return this[_destructed];
  }

  /**
   * Instantiation stack.
   */
  public get stack(): string {
    return this[_stack];
  }

  /**
   * Object logger.
   */
  public get logger(): Logger {
    return this[_logger];
  }

  /**
   * Constructor of the `mln`-object. Classes that extends `mln`-types
   * SHOULD NOT override the original `constructor` method. Instead
   * protected symbolic {@link [construct] | `[construct]`} method
   * MUST be used. This allows to handle moments of the construction
   * start, end and other significant for the logging purposes
   * information.
   */
  public constructor() {
    this[_logger].trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Monitorable.constructor()` call.",
      ),
    );

    // _constructed
    this.logger.debug(
      new MonitorableChanged(
        this[_uid],
        "_constructed",
        this[_constructed],
      ),
    );
    this.logger.debug(
      new MonitorableChanged(this[_uid], "_stack", this[_stack]),
    );

    // _state
    this[_state] = setState(
      this[_state],
      MonitorableState.CONSTRUCTED,
      true,
    );
    this[_state] = setState(
      this[_state],
      MonitorableState.DESTRUCTING,
      false,
    );
    this[_state] = setState(
      this[_state],
      MonitorableState.DESTRUCTED,
      false,
    );
    this.logger.debug(
      new MonitorableChanged(this[_uid], "_state", this[_state]),
    );

    // _state.monitorable
    monitorable.set(this.uid, this);
    this.logger.debug(new MonitorableMapped(this[_uid]));

    // logging constructed object
    this.logger.info(new MonitorableConstructed(this[_uid]));
  }

  /**
   * Destruct the `mln`-object. If the object hasn't already been
   * destructed, calls symbolic {@link [destruct] | `[destruct]`}
   * method. Logs new warning if object has already been destructed.
   */
  public destructor(): void {
    this[_logger].trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Monitorable.destructor()` call.",
      ),
    );
    if (this.destructed !== null) {
      this.logger.warn(
        new MonitorableWarning(
          this.uid,
          "The `Monitorable.destructor()` repeated call.",
        ),
      );
    } else {
      // setting state
      this[_state] = setState(
        this[_state],
        MonitorableState.DESTRUCTING,
        true,
      );

      // logging state
      this.logger.debug(
        new MonitorableChanged(this[_uid], "_state", this[_state]),
      );

      // safe run of the [destruct] hierarchy
      try {
        this[destruct]();
      } catch (err) {
        // logging unhandled user's error
        this.logger.error(err);
      } finally {
        if (
          !hasState(this[_state], MonitorableState.DESTRUCTED) ||
          hasState(this[_state], MonitorableState.DESTRUCTING)
        ) {
          if (monitorable.has(this.uid)) {
            this.logger.warn(
              new MonitorableWarning(
                this[_uid],
                "The `Monitorable` object hard remove.",
              ),
            );

            // deleting the object from the monitorable map
            monitorable.delete(this.uid);

            // logging monitorable map update
            this.logger.debug(new MonitorableUnmapped(this[_uid]));
          }

          const err = new Error(
            "The `Monitorable[destruct]()` wrong implementation. " +
              "The `super[destruct]` method MUST be called.",
          );
          this.logger.fatal(err);
          // eslint-disable-next-line no-unsafe-finally
          throw err;
        }
        // logging destructed object
        this.logger.info(new MonitorableDestructed(this[_uid]));
      }
    }
  }

  /**
   * Performs appropriate piece of the destructing logic and log all
   * destruction related data. Classes that extends the `Monitorable`
   * should override this method. Not reentrant. To avoid calling it
   * twice, it must only be called from the subclass's symbolic
   * `[destruct]` method.
   *
   * @example
   * ```typescript
   * import { destruct, Monitorable } from "mln";
   *
   * class MyClass extends Monitorable {
   *   protected [destruct](): void {
   *     // Destruct logic specific to MyClass.
   *     // ...
   *     // Call superclass's [destruct] at the end of the subclass's,
   *     // like in C++, to avoid hard-to-catch issues.
   *     super[destruct]();
   *   }
   * }
   * ```
   */
  protected [destruct](): void {
    this[_logger].trace(
      new MonitorableCheckpoint(
        this.uid,
        "The `Monitorable[destruct]()` call.",
      ),
    );
    if (!hasState(this[_state], MonitorableState.DESTRUCTING)) {
      const err = new Error(
        "The `Monitorable[destruct]()` could not be explicitly " +
          "called",
      );
      this.logger.error(err);
      throw err;
    } else {
      // delete object from the monitorable map
      monitorable.delete(this.uid);

      // logging monitorable map update
      this.logger.debug(new MonitorableUnmapped(this[_uid]));

      // updating state
      this[_state] = setState(
        this[_state],
        MonitorableState.DESTRUCTING,
        false,
      );
      this[_state] = setState(
        this[_state],
        MonitorableState.DESTRUCTED,
        true,
      );

      // logging state
      this.logger.debug(
        new MonitorableChanged(this[_uid], "_state", this[_state]),
      );

      // saving destructed time stamp
      this[_destructed] = new Date();

      // logging destructed timestamp
      this.logger.debug(
        new MonitorableChanged(
          this[_uid],
          "_destructed",
          this[_destructed],
        ),
      );
    }
  }
}
