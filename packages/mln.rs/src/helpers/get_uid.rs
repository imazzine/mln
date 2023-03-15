/**
 * @author Artem Lytvynov
 * @copyright Artem Lytvynov
 * @license Apache-2.0
 * @fileoverview Declaration of the `getUid` function.
 */

use uuid::Uuid;

#[allow(non_snake_case)]

/// Returns random session unique UUID.
pub fn getUid()-> Uuid {
  let ns = "00000000-0000-0000-0000-000000000000".as_bytes();
  let v4 = Uuid::new_v4();
  let id = Uuid::new_v5(&v4, ns);

  id
}
