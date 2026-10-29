# -*- coding: utf-8 -*-
"""In ngữ cảnh quanh các dòng nói về hạn nộp trong trang đã tải: python tools/verify_ctx.py 13 26 37 [--re deadline|apply]"""
import re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
a = sys.argv[1:]; rx = r"deadline|closing|apply by|applications? (?:open|close)|round \d|scadenz|frist|bewerbungs|date limite|plazo|ansök|søknadsfrist|application period"
if "--re" in a: i = a.index("--re"); rx = a[i + 1]; a = a[:i] + a[i + 2:]
for pid in a:
    t = (ROOT / ".verify" / f"{pid}.txt").read_text(encoding="utf-8", errors="ignore").split("\n")
    print(f"===== #{pid} {t[0][4:]}")
    shown = set()
    for i, ln in enumerate(t):
        if re.search(rx, ln, re.I):
            for j in range(max(0, i - 1), min(len(t), i + 3)):
                if j not in shown: shown.add(j); print("  ", t[j][:230])
            if len(shown) > 24: break
