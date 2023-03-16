/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the log messages types.
 */

use uuid::Uuid;
use crate::enums::LoggedType;

/// Monitorable object checkpoint log messages.
pub struct MonitorableCheckpoint {
  /// Message identifier.
  pub uid: Uuid,

  /// Checkpoint message.
  pub checkpoint: String,
}

/// Monitorable object warning log messages.
pub struct MonitorableWarning {
  /// Message identifier.
  pub uid: Uuid,

  /// Warning message.
  pub warning: String,
}

/// Monitorable object mapped log message.
pub struct MonitorableMapped {
  /// Message identifier.
  pub uid: Uuid,
}

/// Monitorable object unmapped log message.
pub struct MonitorableUnmapped {
  /// Message identifier.
  pub uid: Uuid,
}

/// Monitorable object constructed log message.
pub struct MonitorableConstructed {
  /// Message identifier.
  pub uid: Uuid,
}

/// Monitorable object destructed log message.
pub struct MonitorableDestructed {
  /// Message identifier.
  pub uid: Uuid,
}

/// Monitorable object changed log message.
pub struct MonitorableChanged<T> {
  /// Message identifier.
  pub uid: Uuid,

  /// Logged property name.
  pub name: String,

  /// Logged property type.
  pub r#type: LoggedType,

  /// Logged property value.
  pub value: T,
}
