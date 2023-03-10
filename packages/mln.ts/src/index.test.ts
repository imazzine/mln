/**
 * @fileoverview Package's export test suite definition.
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 */

import * as regular_import from "./index";
import default_import from "./index";

describe("Package's export test suite", () => {
  test("export object is defined", () => {
    expect(regular_import).toBeDefined();
  });
  test("default export object is defined", () => {
    expect(default_import).toBeDefined();
    expect(regular_import.Node).toEqual(default_import);
  });
});
