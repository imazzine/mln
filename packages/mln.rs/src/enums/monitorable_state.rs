/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the MonitorableState enum.
 */

/// MonitorableState enums.
pub enum MonitorableState {
  CONSTRUCTED = 0x01,
  DESTRUCTING = 0x02,
  DESTRUCTED = 0x04,
  // NEXT = 0x08,
}
