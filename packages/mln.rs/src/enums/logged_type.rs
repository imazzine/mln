/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the LoggedType enum.
 */

 #[allow(non_camel_case_types)]

/// Logged message types enum.
pub enum LoggedType {
  ERROR,
  UNDEFINED,
  SYMBOL,
  BOOLEAN,
  NUMBER,
  BIGINT,
  STRING,
  FUNCTION,
  OBJECT,
  DATE,

  // trace
  MONITORABLE_CHECKPOINT,

  // debug
  MONITORABLE_CHANGED,
  MONITORABLE_MAPPED,
  MONITORABLE_UNMAPPED,

  LISTENABLE_MAPPED,
  LISTENABLE_UNMAPPED,
  LISTENERS_MAPPED,
  LISTENERS_UNMAPPED,
  LISTENER_ADDED,
  LISTENER_UPDATED,
  LISTENER_REMOVED,

  EVENT_STOPPED,
  EVENT_PREVENTED,

  // info
  MONITORABLE_CONSTRUCTED,
  MONITORABLE_DESTRUCTED,

  EVENT_CONSTRUCTED,

  INSERTED,
  REPLACED,
  REMOVED,

  // warn
  MONITORABLE_WARNING,

  // error
}
