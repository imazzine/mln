/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Package export.
 *
 * [[include:README.md]]
 */

import { Env } from "./router/Env";
import { Root } from "./router/Root";
import {
  setTenant,
  setToken,
  setUrl,
  getProcess,
  IProcess,
} from "./processes/Process";

export {
  setTenant,
  setToken,
  setUrl,
  getProcess,
  IProcess,
  Env,
  Root,
};
