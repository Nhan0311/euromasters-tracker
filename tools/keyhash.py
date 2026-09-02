# -*- coding: utf-8 -*-
"""
Sinh SHA-256 cho master key của EuroMasters Pro.

    python tools/keyhash.py "HAIKTSDUHOCY2026"

Dán chuỗi hash in ra vào MASTER_KEY_HASH trong assets/js/config.js.
Key thô sẽ không xuất hiện ở bất kỳ đâu trong mã nguồn.
"""
import hashlib
import re
import sys
from pathlib import Path

CFG = Path(__file__).resolve().parent.parent / "assets" / "js" / "config.js"


def read_salt() -> str:
    try:
        m = re.search(r'KEY_SALT:\s*"([^"]*)"', CFG.read_text(encoding="utf-8"))
        if m:
            return m.group(1)
    except OSError:
        pass
    return "euromasters-2026"


def normalize(key: str) -> str:
    """Khớp với normalize() trong assets/js/premium.js"""
    return re.sub(r"[^A-Z0-9]", "", key.upper())


def key_hash(key: str, salt: str = None) -> str:
    salt = read_salt() if salt is None else salt
    return hashlib.sha256((normalize(key) + "|" + salt).encode("utf-8")).hexdigest()


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    raw = sys.argv[1]
    salt = read_salt()
    print("key nhập vào : %s" % raw)
    print("sau chuẩn hoá: %s" % normalize(raw))
    print("salt         : %s" % salt)
    print()
    print("MASTER_KEY_HASH: \"%s\"," % key_hash(raw, salt))
