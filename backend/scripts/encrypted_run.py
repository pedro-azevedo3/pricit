"""Run a service with stdout/stderr encrypted before reaching the Docker logger."""
import base64
import hashlib
import json
import os
from pathlib import Path
import selectors
import signal
import subprocess
import sys

from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding, rsa
from cryptography.hazmat.primitives.ciphers.aead import AESGCM


def load_key(path):
    encoded = os.environ.get('LOG_PUBLIC_KEY_PEM')
    contents = encoded.replace('\\n', '\n').encode() if encoded is not None else Path(path).read_bytes()
    key = serialization.load_pem_public_key(contents)
    if not isinstance(key, rsa.RSAPublicKey) or key.key_size < 3072:
        raise ValueError('Invalid log encryption key')
    der = key.public_bytes(serialization.Encoding.DER, serialization.PublicFormat.SubjectPublicKeyInfo)
    return key, hashlib.sha256(der).hexdigest()[:16]


def encrypt_chunk(key, kid, service, stream, data):
    aad = f'pricit/log/v1/{kid}/{service}/{stream}'.encode()
    secret = AESGCM.generate_key(bit_length=256)
    nonce = os.urandom(12)
    sealed = AESGCM(secret).encrypt(nonce, data, aad)
    wrapped = key.encrypt(secret, padding.OAEP(mgf=padding.MGF1(hashes.SHA256()), algorithm=hashes.SHA256(), label=None))
    b64 = lambda value: base64.b64encode(value).decode('ascii')
    return json.dumps(dict(v=1, alg='RSA-OAEP-256+A256GCM', kid=kid, service=service, stream=stream,
                           key=b64(wrapped), nonce=b64(nonce), data=b64(sealed)), separators=(',', ':'))


def main():
    # Fail closed: never start the application with unprotected log output.
    try:
        key, kid = load_key(os.environ.get('LOG_PUBLIC_KEY_FILE', '/run/secrets/log_public_key'))
    except Exception:
        sys.stderr.write('Log encryption unavailable; service not started.\n')
        return 78
    if len(sys.argv) < 2:
        return 64
    service = 'backend'
    child = subprocess.Popen(sys.argv[1:], stdout=subprocess.PIPE, stderr=subprocess.PIPE, start_new_session=True)
    def forward(signum, _frame):
        try:
            os.killpg(child.pid, signum)
        except ProcessLookupError:
            pass
    signal.signal(signal.SIGTERM, forward)
    signal.signal(signal.SIGINT, forward)
    selector = selectors.DefaultSelector()
    for stream, name in [(child.stdout, 'stdout'), (child.stderr, 'stderr')]:
        selector.register(stream, selectors.EVENT_READ, name)
    try:
        while selector.get_map():
            for item, _ in selector.select():
                chunk = os.read(item.fileobj.fileno(), 4096)
                if not chunk:
                    selector.unregister(item.fileobj)
                    item.fileobj.close()
                    continue
                sys.stdout.write(encrypt_chunk(key, kid, service, item.data, chunk) + '\n')
                sys.stdout.flush()
    except Exception:
        # Do not print exception text or fall back to plaintext on encryption/output failure.
        forward(signal.SIGTERM, None)
        try:
            child.wait(timeout=5)
        except subprocess.TimeoutExpired:
            forward(signal.SIGKILL, None)
            child.wait()
        return 74
    finally:
        selector.close()
    code = child.wait()
    return code if code >= 0 else 128 - code


if __name__ == '__main__':
    sys.exit(main())
