use mln;

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn uid_is_unique() {
    let uid1 = mln::helpers::getUid().to_string();
    let uid2 = mln::helpers::getUid().to_string();

    assert!(uid1 != uid2);
  }
}
