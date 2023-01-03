/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview IO message origin enum declaration.
 */

export enum IoOrigin {
  WORKER = "1",
  ROUTER = "2",
  CLIENT = "3",
  ADMIN = "4",
}
