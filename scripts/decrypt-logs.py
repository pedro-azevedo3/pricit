"""Explicit, offline log recovery. Reads Docker output or Railway text exports from stdin.
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


MARKER = 'PRICIT_ENCRYPTED_LOG '


def parse_record(line):
    """Read current messages, Railway text exports, or legacy raw envelopes."""
    if isinstance(line, bytes):
        line = line.decode('utf-8')
    line = line.strip()
    if line.startswith('{'):
        record = json.loads(line)
        if record.get('alg') == 'RSA-OAEP-256+A256GCM':
            return record
        line = record.get('message', '')
    if MARKER in line:
        return json.loads(line.split(MARKER, 1)[1])
    # Container lifecycle messages are not encrypted application output.
    return None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--private-key', required=True)
    args = parser.parse_args()
    try:
        private = serialization.load_pem_private_key(Path(args.private_key).read_bytes(), password=None)
        count = 0
        for line in sys.stdin.buffer:
            record = parse_record(line)
            if record is not None:
                sys.stdout.buffer.write(decrypt(record, private))
                count += 1
        if not count:
            sys.stderr.write('No encrypted records found; export must include PRICIT_ENCRYPTED_LOG messages.\n')
            return 1
        sys.stdout.buffer.flush()
    except Exception:
        sys.stderr.write('Cannot decrypt log: invalid record, key, or integrity check.\n')
        return 1
    return 0

if __name__ == '__main__':
    sys.exit(main())
