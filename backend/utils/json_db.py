# backend/utils/json_db.py
# E/S JSON robustes + lock simple pour éviter la corruption en écriture concurrente.

import json, os, time
from pathlib import Path
from contextlib import contextmanager

@contextmanager
def file_lock(lock_path: Path, timeout=5):
    start = time.time()
    while True:
        try:
            fd = os.open(str(lock_path), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
            os.close(fd)
            break
        except FileExistsError:
            if time.time() - start > timeout:
                raise TimeoutError("DB lock timeout")
            time.sleep(0.05)
    try:
        yield
    finally:
        try:
            lock_path.unlink(missing_ok=True)
        except Exception:
            pass

def read_json(path: Path, default):
    if not path.exists(): 
        return default
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)

def write_json_atomic(path: Path, data):
    tmp = path.with_suffix(path.suffix + ".tmp")
    with tmp.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.flush(); os.fsync(f.fileno())
    os.replace(tmp, path)  # move atomique
