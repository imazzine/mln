use mln::enums::EventPhase;
use mln::helpers::getUid;

fn main() {
    let phase = EventPhase::NONE;
    match phase
    {
        EventPhase::NONE => println!("NONE"),
        _ => println!("Hello, world!")
    }
    println!("{}", getUid());
    println!("{}", getUid());
    println!("{}", getUid());
    println!("{}", getUid());
    println!("{}", getUid());
    println!("{}", getUid());
    println!("{}", getUid());
}
