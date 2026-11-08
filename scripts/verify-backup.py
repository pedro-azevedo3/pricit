"""Restore an encrypted backup into a disposable DB and compare logical fingerprints.
No customer content or decrypted dump is printed. Run from project root.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import subprocess
import tempfile
import uuid
from cryptography.hazmat.primitives import serialization

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location('backup', ROOT/'scripts/decrypt-backup.py')
backup = importlib.util.module_from_spec(spec)
spec.loader.exec_module(backup)


def run(args, **kwargs):
    result = subprocess.run(['docker','compose',*args],cwd=ROOT,capture_output=True,**kwargs)
    if result.returncode:
        raise RuntimeError('Backup verification command failed; details suppressed to protect data')
    return result.stdout


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--input',required=True,type=Path)
    parser.add_argument('--fingerprint',required=True,type=Path)
    args=parser.parse_args()
    database='restore_check_'+uuid.uuid4().hex
    private=serialization.load_pem_private_key((ROOT/'.secrets/backup-private.pem').read_bytes(),password=None)
    with tempfile.TemporaryDirectory(prefix='pricit-backup-check-') as directory:
        dump=Path(directory)/'verified.dump'
        backup.restore(args.input,dump,private)
        run(['exec','-T','db','sh','-c','createdb -U "$POSTGRES_USER" "$1"','--',database])
        try:
            with dump.open('rb') as source:
                run(['exec','-T','db','sh','-c','exec pg_restore -U "$POSTGRES_USER" -d "$1" --no-owner --exit-on-error','--',database],stdin=source)
            code="import os,runpy;from sqlalchemy.engine import make_url;os.environ['DATABASE_URL']=make_url(os.environ['DATABASE_URL']).set(database=os.environ['VERIFY_DB']).render_as_string(hide_password=False);runpy.run_module('scripts.fingerprint',run_name='__main__')"
            actual=run(['run','--rm','--no-deps','-T','-e',f'VERIFY_DB={database}','backend','python','-c',code])
            if json.loads(actual)!=json.loads(args.fingerprint.read_text()):
                raise RuntimeError('Restored data differs from the expected fingerprint')
        finally:
            run(['exec','-T','db','sh','-c','dropdb -U "$POSTGRES_USER" --force "$1"','--',database])
    print('Encrypted backup restored successfully into an isolated database; all logical fingerprints match. Temporary plaintext removed.')

if __name__=='__main__':
    main()
