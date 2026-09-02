# -*- coding: utf-8 -*-
"""
Gộp kết quả kiểm tra link vào data/link-status.json (sidecar).

    bash tools/check_links.sh > .linkcheck-results.tsv
    python tools/apply_linkcheck.py .linkcheck-results.tsv [.recheck-results.tsv ...]
    python tools/build_data.py          # nạp sidecar vào programs.json

Sidecar được commit vào repo nên mỗi lần dựng lại dữ liệu từ Excel vẫn giữ
được trạng thái link. Lần kiểm tra sau ghi đè lần trước cho cùng một URL.

Phân loại:
  ok      2xx/3xx           → link còn sống
  dead    404/410           → trang đã bị gỡ/đổi đường dẫn, app sẽ chuyển sang link tìm kiếm
  blocked 403/400/000/5xx   → site chặn bot hoặc timeout; trình duyệt thật vẫn mở được
"""
import json
import sys
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "data" / "link-status.json"


def classify(code: str) -> str:
    if not code or code == "000":
        return "blocked"
    if code[0] in "23":
        return "ok"
    if code in ("404", "410"):
        return "dead"
    return "blocked"


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)

    store = {}
    if OUT.exists():
        store = json.loads(OUT.read_text(encoding="utf-8")).get("links", {})

    today = date.today().isoformat()
    seen = 0
    for path in sys.argv[1:]:
        for line in Path(path).read_text(encoding="utf-8").splitlines():
            parts = line.rstrip("\n").split("\t")
            if len(parts) < 3:
                continue
            # định dạng check_links.sh: id, code, url_cuoi, url_goc
            # định dạng recheck:       id, code, url_goc
            code = parts[1]
            url = parts[-1]
            if not url.startswith("http"):
                continue
            store[url] = {"status": classify(code), "code": code, "checked": today}
            seen += 1

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({"checkedAt": today, "links": store},
                              ensure_ascii=False, indent=1, sort_keys=True), encoding="utf-8")

    tally = {}
    for v in store.values():
        tally[v["status"]] = tally.get(v["status"], 0) + 1
    print("đã đọc %d dòng · %d URL trong sidecar" % (seen, len(store)))
    print("phân loại:", tally)
    print("ghi:", OUT)


if __name__ == "__main__":
    main()
