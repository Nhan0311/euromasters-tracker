# -*- coding: utf-8 -*-
"""
Sinh license key offline cho EuroMasters Pro.

    python tools/genkey.py 20            -> in 20 key
    python tools/genkey.py 20 > keys.txt -> lưu ra file

Thuật toán khớp 1-1 với assets/js/premium.js (FNV-1a 32-bit + checksum 4 ký tự).
QUAN TRỌNG: SALT phải trùng với KEY_SALT trong assets/js/config.js.
"""
import secrets
import sys
import re
from pathlib import Path

ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"  # 32 ký tự, bỏ I O 0 1


def read_salt():
    cfg = Path(__file__).resolve().parent.parent / "assets" / "js" / "config.js"
    try:
        m = re.search(r'KEY_SALT:\s*"([^"]*)"', cfg.read_text(encoding="utf-8"))
        if m:
            return m.group(1)
    except OSError:
        pass
    return "euromasters-2026"


SALT = read_salt()


def fnv1a(s: str) -> int:
    h = 0x811C9DC5
    for ch in s:
        h ^= ord(ch)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return h


def checksum(payload: str) -> str:
    h = fnv1a(payload + "|" + SALT)
    return "".join(ALPHABET[(h >> (i * 5)) & 31] for i in range(4))


def make_key() -> str:
    payload = "".join(secrets.choice(ALPHABET) for _ in range(12))
    full = payload + checksum(payload)
    return "-".join(full[i:i + 4] for i in range(0, 16, 4))


def verify(key: str) -> bool:
    k = re.sub(r"[^A-Z0-9]", "", key.upper())
    if len(k) != 16 or any(c not in ALPHABET for c in k):
        return False
    return checksum(k[:12]) == k[12:]


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "verify":
        for k in sys.argv[2:]:
            print(k, "->", "OK" if verify(k) else "INVALID")
        sys.exit(0)
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 10
    sys.stderr.write("salt = %r\n" % SALT)
    for _ in range(n):
        print(make_key())
