/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview IO message method enum declaration.
 */

export enum IoMethod {
  REGISTER = "1",
  REGISTERED = "2",
  UNREGISTER = "3",
  UNREGISTERING = "4",
  UNREGISTERED = "5",
  HEARTBEAT = "6",
  CONNECT = "7",
  CONNECTED = "8",
  MESSAGE = "9",
  DISCONNECT = "A",
  DISCONNECTED = "B",
}
