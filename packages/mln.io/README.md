IO.

Generate ssh keys:
```/bin/bash
ssh-keygen -t rsa -m PKCS8
openssl rsa -in key -pubout -out key.pub
```