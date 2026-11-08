"""Offline backup verification/decryption. Plaintext is published only after full verification."""
import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import sys
import tempfile
from cryptography.hazmat.primitives import serialization

spec = importlib.util.spec_from_file_location('log_crypto', Path(__file__).with_name('decrypt-logs.py'))
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def restore(source, output, private):
    if output.exists():
        raise ValueError('Destination exists')
    descriptor, temp = tempfile.mkstemp(prefix='.pricit-restore-', dir=output.parent)
    try:
        count = 0
        digest = hashlib.sha256()
        complete = False
        with os.fdopen(descriptor, 'wb') as target, source.open('rb') as records:
            for line in records:
                record = json.loads(line)
                if complete or record['service'] != 'backup':
                    raise ValueError('Unexpected record')
                payload = module.decrypt(record, private)
                if record['stream'] == 'complete':
                    manifest = json.loads(payload)
                    if manifest != {'chunks': count, 'sha256': digest.hexdigest()}:
                        raise ValueError('Invalid manifest')
                    complete = True
                else:
                    if record['stream'] != f'chunk-{count}':
                        raise ValueError('Unexpected chunk sequence')
                    target.write(payload)
                    digest.update(payload)
                    count += 1
            if not complete:
                raise ValueError('Incomplete backup')
            target.flush()
            os.fsync(target.fileno())
        os.link(temp, output)  # Atomic, and fails if output was created concurrently.
    finally:
        os.unlink(temp)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--private-key', required=True, type=Path)
    args = parser.parse_args()
    try:
        private = serialization.load_pem_private_key(args.private_key.read_bytes(), password=None)
        restore(args.input, args.output, private)
    except Exception:
        sys.stderr.write('Backup verification failed; no verified plaintext file created.\n')
        return 1
    print('Backup integrity verified; restore file created with restricted permissions.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
