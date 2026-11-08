"""Generate the data key locally, without printing or overwriting existing keys."""
import base64
import json
import os
from pathlib import Path

root = Path(__file__).resolve().parent.parent / '.secrets'
root.mkdir(mode=0o700, exist_ok=True)
path = root / 'data-keys.json'
try:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
except FileExistsError:
    print('Existing data key retained.')
else:
    with os.fdopen(descriptor, 'w') as target:
        json.dump({'active': 'data-v1', 'keys': {'data-v1': base64.b64encode(os.urandom(32)).decode()}}, target)
    print('Data key created locally; keep a separate secure copy for recovery.')
