/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the LoggedType enum.
 */

/**
 * Logged message types enum.
 */
export enum LoggedType {
  ERROR = 0,
  UNDEFINED = 10,
  SYMBOL = 20,
  BOOLEAN = 30,
  NUMBER = 40,
  BIGINT = 50,
  STRING = 60,
  FUNCTION = 70,
  OBJECT = 80,
  DATE = 90,

  // trace
  MONITORABLE_CHECKPOINT = 120,

  // debug
  MONITORABLE_CHANGED = 100,
  MONITORABLE_MAPPED = 110,
  MONITORABLE_UNMAPPED = 110,

  LISTENABLE_MAPPED = 110,
  LISTENABLE_UNMAPPED = 110,
  LISTENERS_MAPPED = 110,
  LISTENERS_UNMAPPED = 110,
  LISTENER_ADDED = 110,
  LISTENER_UPDATED = 110,
  LISTENER_REMOVED = 110,

  EVENT_STOPPED = 140,
  EVENT_PREVENTED = 140,

  // info
  MONITORABLE_CONSTRUCTED = 130,
  MONITORABLE_DESTRUCTED = 140,

  EVENT_CONSTRUCTED = 140,

  INSERTED = 150,
  REPLACED = 160,
  REMOVED = 170,

  // warn
  MONITORABLE_WARNING = 120,

  // error
}
