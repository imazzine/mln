# ssh-keygen -t ed25519 -C "imazzine.development.kit@gmail.com"
git config core.sshCommand "$(which ssh) -i ~/.ssh/imazzine.github"
git config user.name "imazzine"
git config user.email "imazzine.development.kit@gmail.com"