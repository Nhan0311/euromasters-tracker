# -*- coding: utf-8 -*-
"""Ghi một mục sửa đã đối chiếu với trang trường vào data/data-overrides.json.
    python tools/verify_set.py <id> dl "<hạn nộp mới>" [tu "<học phí mới>"] [note "<ghi chú>"]
Khoá là "trường | chương trình" để không phụ thuộc số thứ tự. Nguồn = URL trang đã tải trong .verify/."""
import json, sys, datetime
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
F = ROOT / "data" / "data-overrides.json"
L = json.loads((ROOT / "data" / "programs.json").read_text(encoding="utf-8"))["programs"]
pid, kv = int(sys.argv[1]), sys.argv[2:]
p = next(x for x in L if x["id"] == pid)
d = json.loads(F.read_text(encoding="utf-8")) if F.exists() else {"items": {}}
key = f'{p["school"]} | {p["program"]}'
e = d["items"].get(key, {})
for k, v in zip(kv[::2], kv[1::2]): e[k] = v
src = (ROOT / ".verify" / f"{pid}.txt").read_text(encoding="utf-8", errors="ignore").split("\n", 1)[0][4:]
e.setdefault("src", src); e["checked"] = datetime.date.today().isoformat()
d["items"][key] = e
F.write_text(json.dumps(d, ensure_ascii=False, indent=1), encoding="utf-8")
print(pid, key, "->", {k: v for k, v in e.items() if k != "src"})
