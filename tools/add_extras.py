# -*- coding: utf-8 -*-
"""
Gộp data/extra-programs.json (cử nhân, tiến sĩ, khoá online, thêm quốc gia)
vào data/programs.json + programs.js.

Bản ghi gốc từ Excel giữ nguyên; mọi bản ghi có "extra": true bị xoá rồi
thêm lại từ file extra, nên chạy bao nhiêu lần cũng ra cùng một kết quả.
build_data.py gọi hàm merge() ở cuối, nên dựng lại từ Excel không làm mất phần bổ sung.

Chạy:  python tools/add_extras.py
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_data import (parse_money, parse_tuition, strip_accents, parse_deadlines, parse_months, has_scholarship,  # noqa: E402
                        load_link_status, OUT)

EXTRA = OUT.parent / "extra-programs.json"
# Mục đã đối chiếu với trang chính thức của trường (tools/verify_set.py), thắng dữ liệu gốc.
OVERRIDES = OUT.parent / "data-overrides.json"

LEVEL_SHEET = {"bachelor": "Cử nhân", "master": "Thạc sĩ", "phd": "Tiến sĩ"}

LIVING = {
    "Vương quốc Anh": "Khoảng GBP 1100-1400/tháng", "Ý": "Khoảng €800-1100/tháng",
    "Đức": "Khoảng €950-1100/tháng (tài khoản phong toả khoảng €992/tháng)",
    "Pháp": "Khoảng €800-1200/tháng", "Hà Lan": "Khoảng €1000-1300/tháng",
    "Thụy Sĩ": "Khoảng CHF 1800-2300/tháng", "Bỉ": "Khoảng €900-1100/tháng",
    "Thụy Điển": "Khoảng SEK 10000-12000/tháng", "Đan Mạch": "Khoảng DKK 8000-10000/tháng",
    "Tây Ban Nha": "Khoảng €800-1100/tháng", "Áo": "Khoảng €900-1200/tháng",
    "Séc": "Khoảng €600-800/tháng", "Phần Lan": "Khoảng €800-1000/tháng",
    "Na Uy": "Khoảng NOK 12000-14000/tháng", "Ireland": "Khoảng €1100-1400/tháng",
    "Bồ Đào Nha": "Khoảng €700-900/tháng", "Hungary": "Khoảng €600-800/tháng",
    "Hy Lạp": "Khoảng €600-800/tháng", "Ba Lan": "Khoảng €600-800/tháng",
    "Estonia": "Khoảng €600-800/tháng", "Lithuania": "Khoảng €600-800/tháng",
    "Latvia": "Khoảng €600-800/tháng", "Slovenia": "Khoảng €600-800/tháng",
    "Croatia": "Khoảng €600-800/tháng", "Slovakia": "Khoảng €600-750/tháng",
    "Romania": "Khoảng €500-700/tháng", "Serbia": "Khoảng €500-650/tháng",
    "Luxembourg": "Khoảng €1200-1500/tháng", "Malta": "Khoảng €800-1000/tháng",
    "Síp": "Khoảng €700-900/tháng", "Iceland": "Khoảng €1300-1600/tháng",
}

SCHOLAR = {
    "Vương quốc Anh": "Chevening (thạc sĩ), GREAT Scholarships, học bổng của trường",
    "Ý": "Học bổng vùng DSU, Invest Your Talent in Italy, học bổng Chính phủ Ý (MAECI)",
    "Đức": "DAAD, Deutschlandstipendium", "Pháp": "Eiffel Excellence (Campus France)",
    "Hà Lan": "NL Scholarship (Holland Scholarship), Orange Tulip Scholarship",
    "Thụy Sĩ": "Swiss Government Excellence Scholarships (sau đại học)",
    "Bỉ": "Master Mind Scholarships (Flanders), VLIR-UOS",
    "Thụy Điển": "Swedish Institute Scholarship for Global Professionals",
    "Đan Mạch": "Danish Government Scholarship (qua trường)",
    "Tây Ban Nha": "Học bổng của trường, Fundación Carolina (hạn chế)", "Áo": "OeAD scholarships",
    "Séc": "Học bổng Chính phủ Séc (hạn chế), học bổng của trường",
    "Phần Lan": "Học bổng của trường (miễn 50-100% học phí), Finland Scholarship",
    "Na Uy": "Học bổng của trường (hạn chế)",
    "Ireland": "Government of Ireland International Education Scholarship",
    "Bồ Đào Nha": "Học bổng của trường", "Hungary": "Stipendium Hungaricum",
    "Hy Lạp": "Học bổng Chính phủ Hy Lạp (IKY, hạn chế)", "Ba Lan": "NAWA scholarships",
    "Estonia": "Học bổng miễn học phí của trường", "Lithuania": "Học bổng Chính phủ Lithuania (hạn chế)",
    "Latvia": "Học bổng Chính phủ Latvia (hạn chế)", "Slovenia": "Học bổng Chính phủ Slovenia (CMEPIUS)",
    "Croatia": "Học bổng Chính phủ Croatia (hạn chế)", "Slovakia": "Học bổng Chính phủ Slovakia (hạn chế)",
    "Romania": "Học bổng Chính phủ Romania (hạn chế)", "Serbia": "World in Serbia (hạn chế)",
    "Luxembourg": "Học bổng của trường", "Malta": "Học bổng của trường", "Síp": "Học bổng của trường",
    "Iceland": "Học bổng của trường (hạn chế)", "Toàn châu Âu": "Erasmus Mundus, MSCA",
}

REQ = {
    "bachelor": "Tốt nghiệp THPT, bảng điểm, chứng chỉ tiếng Anh (thường IELTS 6.0-6.5), bài luận",
    "master": "Cử nhân ngành liên quan, CV, thư động lực, IELTS 6.5",
    "phd": "Bằng thạc sĩ, đề cương nghiên cứu, CV, 2-3 thư giới thiệu, IELTS 6.5-7.0",
}

LEVEL_DESC = {"bachelor": "Chương trình cử nhân", "master": "Chương trình thạc sĩ", "phd": "Chương trình tiến sĩ"}

NOTE = "Số liệu bổ sung 10/2026, tham khảo cho năm học 2027/28. Kiểm tra lại hạn nộp và học phí trên trang trường."


def build_record(x, pid, link_status):
    lv = x.get("lv", "master")
    online = bool(x.get("on"))
    country = x["c"]
    lang = x.get("la", "Tiếng Anh")
    living = "Học online, không phát sinh sinh hoạt phí ở nước ngoài" if online else x.get("li", LIVING.get(country, ""))
    ss = x.get("ss", "")
    so = x.get("so", SCHOLAR.get(country, ""))
    if lv == "phd" and "so" not in x:
        so = (so + ", " if so else "") + "nghiên cứu sinh thường có lương hoặc học bổng theo vị trí"
    desc = x.get("d") or "{} {}{} tại {}, {}, giảng dạy bằng {}.".format(
        LEVEL_DESC[lv], x["p"], " (học online)" if online else "", x["s"],
        x.get("ci") or country, lang.replace("Tiếng", "tiếng"))
    dl = parse_deadlines(x["dl"])
    sch = parse_deadlines(ss + " " + so)
    tui_eur, tui_cur, _ = parse_tuition(x.get("tu", ""), parse_months(x.get("du", "")))
    # Học phí tiến sĩ thường ghi kèm lương hoặc học bổng: con số đó không phải học phí
    low = strip_accents(x.get("tu", "")).lower()
    if "mien hoc phi" in low and not tui_eur:
        tui_eur, tui_cur = 0, "EUR"
    elif lv == "phd" and ("luong" in low or "hoc bong" in low or "hop dong" in low):
        tui_eur, tui_cur = None, None
    liv_eur, _, _ = parse_money(living)
    return {
        "id": pid,
        "sheet": LEVEL_SHEET[lv] + (" online" if online else ""),
        "group": x["g"],
        "rank": None,
        "rankText": "",
        "field": x.get("f", x["g"]),
        "school": x["s"],
        "program": x["p"],
        "country": country,
        "city": x.get("ci", ""),
        "desc": desc,
        "duration": x.get("du", ""),
        "months": parse_months(x.get("du", "")),
        "deadlineRaw": x["dl"],
        "deadline": dl,
        "scholarshipDeadline": sch if sch["type"] in ("fixed", "window", "month") else None,
        "link": x["u"],
        "linkStatus": (link_status.get(x["u"], {}) or {}).get("status", "unknown"),
        "language": lang,
        "mainLanguage": lang,
        "tuitionRaw": x.get("tu", ""),
        "tuitionEur": tui_eur,
        "tuitionCur": tui_cur,
        "livingRaw": living,
        "livingEur": liv_eur,
        "scholarshipSchool": ss,
        "scholarshipOther": so,
        "hasScholarship": has_scholarship(ss, so),
        "requirements": x.get("rq", REQ[lv]),
        "notes": x.get("n", NOTE),
        "level": lv,
        "online": online,
        "extra": True,
    }


def apply_overrides(rows):
    """dl = hạn nộp mới (phân tích lại), link = URL mới, tu = học phí mới, note = thêm vào ghi chú; khoá "trường | chương trình"."""
    if not OVERRIDES.exists():
        return 0
    items = json.loads(OVERRIDES.read_text(encoding="utf-8"))["items"]
    used = 0
    for r in rows:
        o = items.get(r["school"] + " | " + r["program"])
        if not o:
            continue
        used += 1
        if "dl" in o:
            r["deadlineRaw"] = o["dl"]
            r["deadline"] = parse_deadlines(o["dl"])
        if "link" in o:
            r["link"] = o["link"]
            r["linkStatus"] = "ok"
        if "tu" in o:
            r["tuitionRaw"] = o["tu"]
            r["tuitionEur"], r["tuitionCur"], _ = parse_tuition(o["tu"], r.get("months"))
        if "tuEur" in o:
            r["tuitionEur"] = o["tuEur"]
        if "note" in o:
            r["notes"] = (r.get("notes") or "").rstrip(". ") + (". " if r.get("notes") else "") + o["note"]
        r["verifiedAt"] = o.get("checked")
    missing = set(items) - {r["school"] + " | " + r["program"] for r in rows}
    if missing:
        print("override không khớp chương trình nào:", sorted(missing))
    return used


def merge():
    payload = json.loads(OUT.read_text(encoding="utf-8"))
    base = [p for p in payload["programs"] if not p.get("extra")]
    for p in base:
        p.setdefault("level", "master")
        p.setdefault("online", False)
        # tính lại từ chữ gốc để mọi bản sửa của bộ đọc số áp cho cả dữ liệu từ Excel
        p["tuitionEur"], p["tuitionCur"], _ = parse_tuition(p.get("tuitionRaw", ""), p.get("months"))
        p["livingEur"], _, _ = parse_money(p.get("livingRaw", ""))
    extra = json.loads(EXTRA.read_text(encoding="utf-8"))["items"]
    link_status, _ = load_link_status()
    pid = max(p["id"] for p in base)
    rows = list(base)
    for x in extra:
        pid += 1
        rows.append(build_record(x, pid, link_status))

    used = apply_overrides(rows)

    meta = payload["meta"]
    meta["count"] = len(rows)
    meta["countries"] = sorted({r["country"] for r in rows if r["country"]})
    meta["groups"] = sorted({r["group"] for r in rows if r["group"]})
    meta["languages"] = sorted({r["mainLanguage"] for r in rows if r["mainLanguage"]})
    meta["levels"] = {lv: sum(1 for r in rows if r["level"] == lv) for lv in ("bachelor", "master", "phd")}
    meta["online"] = sum(1 for r in rows if r["online"])
    meta["extraCount"] = len(extra)
    meta["linkDead"] = sum(1 for r in rows if r["linkStatus"] == "dead")
    payload["programs"] = rows

    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")
    OUT.with_suffix(".js").write_text(
        "window.EMT_DATA = " + json.dumps(payload, ensure_ascii=False, separators=(",", ":")) + ";\n",
        encoding="utf-8")
    print("programs:", len(rows), "| extra:", len(extra), "| levels:", meta["levels"],
          "| online:", meta["online"], "| countries:", len(meta["countries"]), "| overrides:", used)


if __name__ == "__main__":
    merge()
