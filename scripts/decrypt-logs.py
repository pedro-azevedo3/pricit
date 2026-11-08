"""Explicit, offline log recovery. Reads Docker --no-log-prefix output from stdin.
Requires cryptography. Does NOT save plaintext. Run only in a private terminal.
"""
import argparse
import base64
import hashlib
import json
from pathlib import Path
import sys
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def decrypt(record, private):
    if record['v'] != 1 or record['alg'] != 'RSA-OAEP-256+A256GCM':
        raise ValueError('Unsupported encrypted log')
    der = private.public_key().public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    if record['kid'] != hashlib.sha256(der).hexdigest()[:16]:
        raise ValueError('Wrong key')
    decode = lambda value: base64.b64decode(value, validate=True)
    secret = private.decrypt(decode(record['key']), padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    aad = f"pricit/log/v1/{record['kid']}/{record['service']}/{record['stream']}".encode()
    return AESGCM(secret).decrypt(decode(record['nonce']), decode(record['data']), aad)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private-key', required=True)
    args = parser.parse_args()
    try:
        private = serialization.load_pem_private_key(Path(args.private_key).read_bytes(), password=None)
        for line in sys.stdin.buffer:
            if line.strip():
                sys.stdout.buffer.write(decrypt(json.loads(line), private))
        sys.stdout.buffer.flush()
    except Exception:
        sys.stderr.write('Cannot decrypt log: invalid record, key, or integrity check.\n')
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
