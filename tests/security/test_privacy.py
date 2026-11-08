import base64
from decimal import Decimal
import importlib.util
import json
import os
from pathlib import Path
import subprocess
import sys

import pytest
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import rsa

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'backend'))
from app.encryption import keyring, seal, unseal


def load(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

logs = load('decrypt_logs', ROOT / 'scripts/decrypt-logs.py')
backup = load('decrypt_backup', ROOT / 'scripts/decrypt-backup.py')

@pytest.fixture(scope='module')
def keys(tmp_path_factory):
    directory = tmp_path_factory.mktemp('privacy-keys')
    private = rsa.generate_private_key(public_exponent=65537, key_size=3072)
    public = directory / 'public.pem'
    public.write_bytes(private.public_key().public_bytes(serialization.Encoding.PEM, serialization.PublicFormat.SubjectPublicKeyInfo))
    return private, public

@pytest.mark.parametrize('runtime', ['python', 'node'])
def test_service_output_never_contains_plaintext_and_is_recoverable(runtime, keys):
    private, public = keys
    payload = 'cliente@example.test receita confidencial ' * 400
    if runtime == 'python':
        command = [sys.executable, str(ROOT/'backend/scripts/encrypted_run.py'), sys.executable, '-c', f'import sys;sys.stdout.write({payload!r});sys.stderr.write("token-secreto");sys.exit(7)']
    else:
        command = ['node', str(ROOT/'frontend/scripts/encrypted-run.mjs'), 'node', '-e', f'process.stdout.write({json.dumps(payload)});process.stderr.write("token-secreto");process.exitCode=7;']
    result = subprocess.run(command, env={**os.environ, 'LOG_PUBLIC_KEY_FILE': str(public)}, capture_output=True)
    assert result.returncode == 7
    assert result.stderr == b''
    assert b'cliente@' not in result.stdout and b'token-secreto' not in result.stdout
    decoded = {'stdout': b'', 'stderr': b''}
    for line in result.stdout.splitlines():
        record = json.loads(line)
        decoded[record['stream']] += logs.decrypt(record, private)
    assert decoded['stdout'] == payload.encode()
    assert decoded['stderr'] == b'token-secreto'

@pytest.mark.parametrize('runtime', ['python', 'node'])
def test_missing_log_key_never_starts_service(runtime, tmp_path):
    executable = sys.executable if runtime == 'python' else 'node'
    wrapper = ROOT / ('backend/scripts/encrypted_run.py' if runtime == 'python' else 'frontend/scripts/encrypted-run.mjs')
    result = subprocess.run([executable, str(wrapper), executable, '-c' if runtime == 'python' else '-e', 'print("SENSITIVE")' if runtime=='python' else 'console.log("SENSITIVE")'], env={**os.environ, 'LOG_PUBLIC_KEY_FILE': str(tmp_path/'missing')}, capture_output=True)
    assert result.returncode == 78
    assert b'SENSITIVE' not in result.stdout + result.stderr


def test_field_encryption_precision_unicode_and_tamper_detection(tmp_path, monkeypatch):
    key = os.urandom(32)
    path = tmp_path/'data.json'
    path.write_text(json.dumps({'active':'test','keys':{'test':base64.b64encode(key).decode()}}))
    monkeypatch.setenv('DATA_KEYS_FILE', str(path))
    keyring.cache_clear()
    try:
        for value, kind in [('Receita secreta 🍰','name'), (Decimal('0.12345678901234567890123456789'),'decimal'), (True,'bool'), (123,'positive_int'), ({'cliente':'cliente@example.test','valor':'12.34'},'json')]:
            token = seal(value,'test.field',kind)
            assert token != seal(value,'test.field',kind)
            assert unseal(token,'test.field',kind) == value
            with pytest.raises(ValueError):
                unseal(token,'other.field',kind)
            head, data = token.rsplit(':',1)
            altered = bytearray(base64.b64decode(data)); altered[-1] ^= 1
            with pytest.raises(ValueError):
                unseal(head+':'+base64.b64encode(altered).decode(),'test.field',kind)
        with pytest.raises(ValueError):
            unseal('plaintext','test.field','name')
    finally:
        keyring.cache_clear()


def test_backup_integrity_truncation_and_restore(keys, tmp_path):
    private, public = keys
    payload = b'PGDMP' + os.urandom(160000) + b'cliente@example.test'
    result = subprocess.run([sys.executable,str(ROOT/'backend/scripts/encrypt_backup.py')],input=payload,env={**os.environ,'BACKUP_PUBLIC_KEY_FILE':str(public)},capture_output=True,check=True)
    assert b'cliente@example.test' not in result.stdout
    source=tmp_path/'backup.enc'; source.write_bytes(result.stdout)
    output=tmp_path/'restored.dump'
    backup.restore(source,output,private)
    assert output.read_bytes() == payload
    assert output.stat().st_mode & 0o777 == 0o600
    lines=result.stdout.splitlines(keepends=True)
    for index, modified in enumerate([b''.join(lines[:-1]), b''.join([lines[1],lines[0],*lines[2:]]), result.stdout+lines[0]]):
        source.write_bytes(modified)
        dest=tmp_path/f'invalid-{index}'
        with pytest.raises(Exception):
            backup.restore(source,dest,private)
        assert not dest.exists()
