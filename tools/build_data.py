# -*- coding: utf-8 -*-
"""
Build data/programs.json from the source Excel workbook.
Parses Vietnamese free-text deadlines into structured, countdown-ready records.
"""
import json, os, re, sys, unicodedata
from pathlib import Path
import openpyxl

# Nguồn dữ liệu là workbook Excel của tác giả, không nằm trong repo.
# Thứ tự tìm: tham số dòng lệnh, biến môi trường EMT_SOURCE_XLSX,
# rồi thư mục Downloads của người đang chạy.
SRC_NAME = "DANH SÁCH MỞ RỘNG 282 CHƯƠNG TRÌNH THẠC SĨ CHÂU ÂU - QS RANKING 2026.xlsx"

if len(sys.argv) > 1:
    SRC = Path(sys.argv[1])
elif os.environ.get("EMT_SOURCE_XLSX"):
    SRC = Path(os.environ["EMT_SOURCE_XLSX"])
else:
    SRC = Path.home() / "Downloads" / SRC_NAME
OUT = Path(__file__).resolve().parent.parent / "data" / "programs.json"
LINK_STATUS = Path(__file__).resolve().parent.parent / "data" / "link-status.json"
LINK_OVERRIDES = Path(__file__).resolve().parent.parent / "data" / "link-overrides.json"


def load_link_overrides():
    """URL sửa tay, khoá là URL cũ trong Excel.

    File Excel là nguồn dữ liệu, nhưng khi một trường đổi đường dẫn thì sửa ở
    đây nhanh hơn và không phải đụng vào workbook gốc. Xoá mục tương ứng khi
    nào Excel đã được cập nhật.
    """
    try:
        data = json.loads(LINK_OVERRIDES.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}
    return {k: v["to"] for k, v in data.get("links", {}).items() if v.get("to")}

SHEETS = [
    "Chương Trình Thạc Sĩ Kiến Trúc ",
    "Kinh tế-QTKD-Tài chính",
    "CNTT-Data Science-AI",
    "Kỹ thuật (Engineering)",
    "Luật-YDược-Marketing-QHQT-DL",
]

COLS = ["stt", "groupQs", "rankText", "field", "school", "program", "country", "city", "desc",
        "duration", "deadlineRaw", "link", "language", "tuitionRaw", "livingRaw",
        "scholarshipSchool", "scholarshipOther", "requirements", "notes", "mainLanguage"]

# ---------------------------------------------------------------- currencies
RATE = {"EUR": 1.0, "GBP": 1.17, "CHF": 1.06, "USD": 0.92, "SEK": 0.088, "NOK": 0.086,
        "DKK": 0.134, "CZK": 0.040, "PLN": 0.232, "HUF": 0.0026, "TRY": 0.027, "RON": 0.20}
SYM = {"£": "GBP", "€": "EUR", "$": "USD"}

CUR_ALT = "GBP|EUR|CHF|USD|SEK|NOK|DKK|CZK|PLN|HUF|TRY|RON|£|€"
NUM_RE = re.compile(
    r"(?:(" + CUR_ALT + r")\s*([\d][\d.,\s]*\d|\d)"
    r"|([\d][\d.,\s]*\d|\d)\s*(" + CUR_ALT + r"))", re.I)


def strip_accents(s):
    s = str(s).replace("đ", "d").replace("Đ", "D")
    return "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")


def to_number(raw):
    """'35.400' / '22,290' / '1 460' -> 35400 / 22290 / 1460"""
    s = raw.replace(" ", "").strip(".,")
    if re.fullmatch(r"\d+,\d{1,2}", s):  # '19,43' / '454,47': phẩy thập phân kiểu Việt
        return float(s.replace(",", "."))
    m = re.fullmatch(r"(.*)[.,](\d{1,2})", s)
    if m and re.search(r"[.,]", m.group(1)):
        s = m.group(1).replace(".", "").replace(",", "") + "." + m.group(2)
    else:
        s = s.replace(".", "").replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


# Số tiền đi sau các cụm này là lệ phí/phụ phí, không phải học phí
FEE_BEFORE = re.compile(r"(phi (ho so|nop ho so|xu ly ho so|xet tuyen|ghi danh|dich vu|sinh vien|bao hiem|hoi sinh vien)|le phi|"
                        r"phi hoc ky|phi ky|phi sv|phi bat buoc|phi ban nien|phi ban phan|semesterbeitrag|phi hanh chinh|dat coc|tien coc|cvec|\boh\b|phu phi|application fee|deposit|cems)[^;,]{0,45}$")
RANGE_TAIL = r"(?:\s*[-–]\s*[0-9][0-9.,]*\s*(?:eur|gbp|chf|usd|sek|nok|dkk|czk|pln|huf|try|ron|€|£)?)?"
PER_TERM = re.compile(r"^" + RANGE_TAIL + r"\s*/\s*(hoc ky|ky|semester)|^\s*(moi ky|mot ky|per semester)")
PER_CREDIT = re.compile(r"^" + RANGE_TAIL + r"\s*/\s*(tin chi|credit|ects)|^\s*(moi tin chi|per credit)")
WHOLE = re.compile(r"^" + RANGE_TAIL + r"[^;]{0,25}(toan khoa|toan chuong trinh|tron khoa|ca khoa|cho [23] nam)")
WHOLE_BEFORE = re.compile(r"(tong|toan khoa|tron khoa)[^;]{0,12}$")
PER_YEAR = re.compile(r"^" + RANGE_TAIL + r"\s*(/\s*nam|/\s*year|moi nam|per year)")
LOWER = re.compile(r"([0-9][0-9.,]*)\s*[-–]\s*$")


NON_EU = re.compile(r"ngoai (eu|eea|khoi|chau au)|non[- ]?eu|non[- ]?eea|quoc te|international|nuoc ngoai|overseas|"
                    r"sinh vien khac|sv khac|category 2|ngoai khoi|tra phi")
EU = re.compile(r"eu|eea|trong nuoc|home|thuong tru|ban dia|chau au|thuy si|bac au|dan mach|hoa ky")
DISCOUNT = re.compile(r"(giam|uu dai|hoc bong|tro cap)[^;]{0,30}$")


def parse_tuition(text, months=None):
    """Học phí theo NĂM cho sinh viên ngoài EU (người dùng là SV Việt Nam).
    - Bỏ lệ phí, phí học kỳ/hành chính, đặt cọc, khoản giảm; đổi /học kỳ x2, /tín chỉ x60, cả khoá chia số năm.
    - Khoảng "a-b" lấy cận dưới a.
    - Mệnh đề nào nói ngoài EU / quốc tế thì lấy mức thấp nhất trong đó; không có thì lấy mức thấp nhất không gắn EU.
    - "Miễn học phí" chỉ cho 0 khi không còn mức nào áp cho SV ngoài EU."""
    if not text:
        return None, None, None
    t = str(text)
    low = strip_accents(t).lower()
    segs = [(m.start(), m.end()) for m in re.finditer(r"(?:[^;|,]|,(?=\d))+", low)]
    seg_of = lambda i: next((low[x:y] for x, y in segs if x <= i < y), "")
    years = (months or 24) / 12
    found = []
    for m in NUM_RE.finditer(t):
        cur = SYM.get((m.group(1) or m.group(4) or "").upper(), (m.group(1) or m.group(4) or "").upper())
        num = m.group(2) or m.group(3)
        if cur not in RATE:
            continue
        v = to_number(num)
        if v is None or v <= 0 or (1900 <= v <= 2100 and not re.search(r"[.,]", num)):
            continue
        before = low[max(0, m.start() - 45):m.start()]
        after = low[m.end():m.end() + 45]
        if FEE_BEFORE.search(before) or DISCOUNT.search(before):
            continue
        lo = LOWER.search(before)
        if lo and m.group(3):  # "3.100-5.800 EUR": lấy cận dưới
            lv = to_number(lo.group(1))
            if lv and 0 < lv < v:
                v = lv
        if PER_CREDIT.search(after):
            v *= 60
        elif PER_TERM.search(after):
            v *= 2
        elif (WHOLE.search(after) or WHOLE_BEFORE.search(before)) and not PER_YEAR.search(after) and years > 1:
            v /= years
        eur = v * RATE[cur]
        if eur < 100:
            continue
        seg = seg_of(m.start())
        non_eu = bool(NON_EU.search(seg))
        found.append((eur, cur, v, non_eu, bool(EU.search(seg)) and not non_eu))
    free = re.search(r"mien phi|mien hoc phi|khong hoc phi|khong thu hoc phi|hoc phi 0", low)
    pick = [x for x in found if x[3]] or [x for x in found if not x[4]] or ([] if free else found)
    if pick:
        best = min(pick)
        return int(round(best[0])), best[1], best[2]
    if free:
        return 0, "EUR", 0
    return parse_money(t)


def parse_money(text):
    """Return (value_in_eur, currency, native_value) for the lowest credible figure."""
    if not text:
        return None, None, None
    t = str(text)
    low = strip_accents(t).lower()
    if re.search(r"mien phi|khong hoc phi|khong thu hoc phi|hoc phi 0", low):
        return 0, "EUR", 0
    best = None
    for m in NUM_RE.finditer(t):
        cur = (m.group(1) or m.group(4) or "").upper()
        num = m.group(2) or m.group(3)
        cur = SYM.get(cur, cur)
        if cur not in RATE:
            continue
        v = to_number(num)
        if v is None or v <= 0:
            continue
        if 1900 <= v <= 2100 and not re.search(r"[.,]", num):
            continue  # a year, not an amount
        eur = v * RATE[cur]
        if best is None or eur < best[0]:
            best = (eur, cur, v)
    if best:
        return int(round(best[0])), best[1], best[2]
    return None, None, None


# ---------------------------------------------------------------- deadlines
MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]


def valid_dm(d, m):
    return 1 <= m <= 12 and 1 <= d <= MONTH_DAYS[m - 1]


DATE_FULL = re.compile(r"\b(\d{1,2})\s*[/.\-]\s*(\d{1,2})\s*[/.\-]\s*(20\d{2})\b")
DATE_DM = re.compile(r"\b(\d{1,2})\s*/\s*(\d{1,2})\b(?!\s*[/.\-]\s*\d)")
DAY_MONTH = re.compile(r"\b(\d{1,2})\s+thang\s+(\d{1,2})\b")
MONTH_ONLY = re.compile(r"\bthang\s+(\d{1,2})\b")

ROLLING_HINTS = ["khong co han co dinh", "khong co han", "cuon chieu", "rolling", "quanh nam",
                 "lien tuc", "khong gioi han", "mo quanh nam", "xet theo dot",
                 "nhieu vong", "nhieu dot", "theo dot"]


def parse_deadlines(text):
    """-> dict(type, dates[{d,m,y|None}], recurring)"""
    if not text:
        return {"type": "unknown", "dates": [], "recurring": False}
    raw = str(text)
    low = strip_accents(raw).lower()
    recurring = ("hang nam" in low) or ("moi nam" in low)

    dates = []
    for m in DATE_FULL.finditer(low):
        d, mo, y = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if valid_dm(d, mo):
            dates.append({"d": d, "m": mo, "y": y})
    consumed = DATE_FULL.sub(" ", low)

    for m in DAY_MONTH.finditer(consumed):
        d, mo = int(m.group(1)), int(m.group(2))
        if valid_dm(d, mo):
            dates.append({"d": d, "m": mo, "y": None})
    consumed = DAY_MONTH.sub(" ", consumed)

    for m in DATE_DM.finditer(consumed):
        d, mo = int(m.group(1)), int(m.group(2))
        if valid_dm(d, mo):
            dates.append({"d": d, "m": mo, "y": None})
    consumed = DATE_DM.sub(" ", consumed)

    kind = None
    if dates:
        seen, uniq = set(), []
        for x in dates:
            k = (x["d"], x["m"], x["y"])
            if k not in seen:
                seen.add(k)
                uniq.append(x)
        dates = uniq
        is_range = bool(re.search(r"\d\s*[-\u2013]\s*\d", low)) or " den " in low
        kind = "window" if is_range else "fixed"
    else:
        months = [int(x) for x in MONTH_ONLY.findall(consumed) if 1 <= int(x) <= 12]
        if months:
            mo = months[0]
            dates = [{"d": 28 if mo == 2 else MONTH_DAYS[mo - 1], "m": mo, "y": None}]
            kind = "month"
            recurring = True

    if kind is None:
        if any(h in low for h in ROLLING_HINTS):
            return {"type": "rolling", "dates": [], "recurring": False}
        return {"type": "unknown", "dates": [], "recurring": False}

    if not any(x["y"] for x in dates):
        recurring = True
    return {"type": kind, "dates": dates, "recurring": recurring}


RANK_RE = re.compile(r"#\s*(\d+)")


def parse_rank(text):
    if not text:
        return None
    m = RANK_RE.search(str(text))
    return int(m.group(1)) if m else None


DUR_RE = re.compile(r"(\d+(?:[.,]\d+)?)\s*(nam|thang|hoc ky|semester|year|month)")


def parse_months(text):
    if not text:
        return None
    low = strip_accents(text).lower()
    best = None
    for m in DUR_RE.finditer(low):
        v = float(m.group(1).replace(",", "."))
        unit = m.group(2)
        if unit in ("nam", "year"):
            months = v * 12
        elif "ky" in unit or unit == "semester":
            months = v * 6
        else:
            months = v
        if 1 <= months <= 60 and (best is None or months < best):
            best = months
    return int(round(best)) if best else None


def clean(v):
    if v is None:
        return ""
    s = str(v).strip()
    if s.lower() in ("none", "nan", "-"):
        return ""
    return re.sub(r"\s+", " ", s)


def has_scholarship(*vals):
    for v in vals:
        s = strip_accents(clean(v)).lower()
        if s and len(s) > 6 and not re.match(r"^(khong|chua|n/?a|khong ro)", s):
            return True
    return False


def load_link_status():
    """Trạng thái link từ tools/check_links.sh (xem tools/apply_linkcheck.py)."""
    try:
        d = json.loads(LINK_STATUS.read_text(encoding="utf-8"))
        return d.get("links", {}), d.get("checkedAt", "")
    except (OSError, ValueError):
        return {}, ""


def main():
    link_status, link_checked_at = load_link_status()
    link_overrides = load_link_overrides()
    overrides_used = 0
    wb = openpyxl.load_workbook(SRC, data_only=True)
    rows, pid = [], 0
    for sheet in SHEETS:
        ws = wb[sheet]
        for r in ws.iter_rows(min_row=2, values_only=True):
            if not r[4] or not clean(r[4]):
                continue
            rec = {COLS[i]: (clean(r[i]) if i < len(r) else "") for i in range(len(COLS))}
            pid += 1

            # URL sửa tay thắng URL trong Excel
            link = rec["link"]
            if link in link_overrides:
                link = link_overrides[link]
                overrides_used += 1

            tui_eur, tui_cur, _ = parse_money(rec["tuitionRaw"])
            liv_eur, _, _ = parse_money(rec["livingRaw"])
            dl = parse_deadlines(rec["deadlineRaw"])
            sch = parse_deadlines(rec["scholarshipSchool"] + " " + rec["scholarshipOther"])
            rows.append({
                "id": pid,
                "sheet": sheet.strip(),
                "group": rec["groupQs"],
                "rank": parse_rank(rec["rankText"]),
                "rankText": rec["rankText"],
                "field": rec["field"],
                "school": rec["school"],
                "program": rec["program"],
                "country": rec["country"],
                "city": rec["city"],
                "desc": rec["desc"],
                "duration": rec["duration"],
                "months": parse_months(rec["duration"]),
                "deadlineRaw": rec["deadlineRaw"],
                "deadline": dl,
                "scholarshipDeadline": sch if sch["type"] in ("fixed", "window", "month") else None,
                "link": link,
                "linkStatus": (link_status.get(link, {}) or {}).get("status", "unknown"),
                "language": rec["language"],
                "mainLanguage": rec["mainLanguage"] or rec["language"],
                "tuitionRaw": rec["tuitionRaw"],
                "tuitionEur": tui_eur,
                "tuitionCur": tui_cur,
                "livingRaw": rec["livingRaw"],
                "livingEur": liv_eur,
                "scholarshipSchool": rec["scholarshipSchool"],
                "scholarshipOther": rec["scholarshipOther"],
                "hasScholarship": has_scholarship(rec["scholarshipSchool"], rec["scholarshipOther"]),
                "requirements": rec["requirements"],
                "notes": rec["notes"],
            })

    meta = {
        "source": SRC.name,
        "count": len(rows),
        "countries": sorted({r["country"] for r in rows if r["country"]}),
        "groups": sorted({r["group"] for r in rows if r["group"]}),
        "sheets": [s.strip() for s in SHEETS],
        "languages": sorted({r["mainLanguage"] for r in rows if r["mainLanguage"]}),
        "linkCheckedAt": link_checked_at,
        "linkDead": sum(1 for r in rows if r["linkStatus"] == "dead"),
    }
    payload = {"meta": meta, "programs": rows}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1), encoding="utf-8")

    # JS twin so the app also runs straight from file:// (no fetch / CORS needed)
    js = OUT.with_suffix(".js")
    js.write_text("window.EMT_DATA = " + json.dumps(payload, ensure_ascii=False,
                  separators=(",", ":")) + ";\n", encoding="utf-8")

    dt = {}
    for r in rows:
        dt[r["deadline"]["type"]] = dt.get(r["deadline"]["type"], 0) + 1
    print("programs:", len(rows))
    print("deadline types:", dt)
    print("tuition parsed:", sum(1 for r in rows if r["tuitionEur"] is not None))
    print("living parsed:", sum(1 for r in rows if r["livingEur"] is not None))
    print("scholarship deadlines:", sum(1 for r in rows if r["scholarshipDeadline"]))
    print("countries:", len(meta["countries"]))
    ls = {}
    for r in rows:
        ls[r["linkStatus"]] = ls.get(r["linkStatus"], 0) + 1
    print("link status:", ls)
    print("link overrides applied:", overrides_used)
    print("written:", OUT)

    # chương trình bổ sung (cử nhân, tiến sĩ, online...) nằm ngoài Excel
    import add_extras
    add_extras.merge()


if __name__ == "__main__":
    main()
