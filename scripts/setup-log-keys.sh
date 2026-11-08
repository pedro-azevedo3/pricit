#!/bin/sh
# Keep private keys on the host; containers receive ONLY the public key.
set -eu
cd "$(dirname "$0")/.."
umask 077
mkdir -p .secrets
chmod 700 .secrets
if [ ! -e .secrets/log-private.pem ]; then
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out .secrets/log-private.pem 2>/dev/null
fi
openssl pkey -in .secrets/log-private.pem -pubout -out .secrets/log-public.pem 2>/dev/null
chmod 600 .secrets/log-private.pem
chmod 644 .secrets/log-public.pem
if [ ! -e .secrets/backup-private.pem ]; then
  openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out .secrets/backup-private.pem 2>/dev/null
fi
openssl pkey -in .secrets/backup-private.pem -pubout -out .secrets/backup-public.pem 2>/dev/null
chmod 600 .secrets/backup-private.pem
chmod 644 .secrets/backup-public.pem
printf 'Log key pair ready. Private key stays in .secrets/log-private.pem; never share or commit it.\n'
