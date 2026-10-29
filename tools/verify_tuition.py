# -*- coding: utf-8 -*-
"""Tìm chương trình mà tuitionEur (số nhỏ nhất bắt được) có vẻ là lệ phí/phụ phí chứ không phải học phí.
    python tools/verify_tuition.py"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
sys.path.insert(0, str(Path(__file__).parent))
from build_data import NUM_RE, SYM, RATE, to_number, strip_accents
ROOT = Path(__file__).resolve().parent.parent
L = json.loads((ROOT / "data" / "programs.json").read_text(encoding="utf-8"))["programs"]
FEE = re.compile(r"phi ho so|le phi|phi ghi danh|phi dang ky|application fee|phi xet|phi nhap hoc|phi hoc ky|semester fee|deposit|dat coc|phi thanh vien|phi bao hiem|dong them|phu phi", re.I)
for p in L:
    t = p.get("tuitionRaw") or ""; te = p.get("tuitionEur")
    if not te: continue
    vals = []
    for m in NUM_RE.finditer(t):
        cur = SYM.get((m.group(1) or m.group(4) or "").upper(), (m.group(1) or m.group(4) or "").upper())
        v = to_number(m.group(2) or m.group(3) or "")
        if cur in RATE and v and not (1900 <= v <= 2100 and not re.search(r"[.,]", m.group(2) or m.group(3))): vals.append(v * RATE[cur])
    if len(vals) >= 2 and max(vals) > 4 * te and FEE.search(strip_accents(t).lower()):
        print(f'#{p["id"]} €{te} (max €{int(max(vals))}) {p["school"][:30]} | {p["program"][:30]}\n    «{t[:200]}»')
