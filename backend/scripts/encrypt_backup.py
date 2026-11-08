import hashlib
import json
import os
import sys
from encrypted_run import encrypt_chunk, load_key


def main():
    try:
        public, kid = load_key(os.environ.get('BACKUP_PUBLIC_KEY_FILE', '/run/secrets/backup_public_key'))
        digest = hashlib.sha256()
        count = 0
        while chunk := sys.stdin.buffer.read(65536):
            digest.update(chunk)
            print(encrypt_chunk(public, kid, 'backup', f'chunk-{count}', chunk), flush=True)
            count += 1
        manifest = json.dumps({'chunks': count, 'sha256': digest.hexdigest()}).encode()
        print(encrypt_chunk(public, kid, 'backup', 'complete', manifest), flush=True)
        return 0
    except Exception:
        sys.stderr.write('Backup encryption failed.\n')
        return 1

if __name__ == '__main__':
    sys.exit(main())
