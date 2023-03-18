/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Package export.
 *
 * [[include:README.md]]
 */

import { config } from "dotenv";
import { Gateway } from "./Gateway";

config();
new Gateway();
