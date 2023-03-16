use mln::enums::{
  EventPhase,
  LoggedType,
};
use mln::helpers::getUid;
use mln::logger::{
  MonitorableCheckpoint,
  MonitorableChanged,
};

fn main() {
  let phase = EventPhase::NONE;
  match phase
  {
    EventPhase::NONE => println!("NONE"),
    _ => println!("Hello, world!"),
  }
  println!("{}", getUid());
  println!("{}", getUid());
  println!("{}", getUid());
  println!("{}", getUid());
  println!("{}", getUid());
  println!("{}", getUid());
  println!("{}", getUid());

  // checkpoint
  let chekpoint = MonitorableCheckpoint {
    uid: getUid(),
    checkpoint: "some text".to_string(),
  };
  println!(
    "uid: {}, checkpoint: {}",
    chekpoint.uid,
    chekpoint.checkpoint,
  );

  // changed
  let changed = MonitorableChanged {
    uid: getUid(),
    name: "name".to_string(),
    r#type: LoggedType::MONITORABLE_CHANGED,
    value: 123,
  };
  match changed.r#type
  {
    LoggedType::MONITORABLE_CHANGED => println!("MONITORABLE_CHANGED"),
    _ => println!("Hello, world!"),
  }
  println!(
    "uid: {}, name: {}, value: {}",
    changed.uid,
    changed.name,
    changed.value,
  );
}
