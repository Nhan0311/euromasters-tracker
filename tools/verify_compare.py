# -*- coding: utf-8 -*-
"""So dữ liệu với nội dung trang chính thức đã tải (.verify/<id>.txt, từ verify_fetch.js).
Phân loại hạn nộp: KHOP (trang có đúng ngày/tháng), THANG (đúng tháng), LECH (trang có ngày hạn khác), KHONG_TIN (trang không nói hạn).
Ghi .verify/_report.json.   python tools/verify_compare.py"""
import json, re, sys
from pathlib import Path
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
L = json.loads((ROOT / "data" / "programs.json").read_text(encoding="utf-8"))
L = L.get("programs", L) if isinstance(L, dict) else L
MON = {}
for i, names in enumerate([
    "january jan gennaio januar janvier enero januari janeiro styczeń stycznia leden ledna tammikuuta",
    "february feb febbraio februar février fevrier febrero februari fevereiro lutego únor února helmikuuta",
    "march mar marzo märz maerz mars marts maart março marca březen března maaliskuuta",
    "april apr aprile avril abril kwietnia duben dubna huhtikuuta",
    "may maggio mai mayo maj mei maio maja květen května toukokuuta",
    "june jun giugno juni juin junio junho czerwca červen června kesäkuuta",
    "july jul luglio juli juillet julio julho lipca červenec července heinäkuuta",
    "august aug agosto août aout augusti augustus sierpnia srpen srpna elokuuta",
    "september sep sept settembre septembre septiembre setembro września září syyskuuta",
    "october oct ottobre oktober octobre octubre outubro października říjen října lokakuuta",
    "november nov novembre noviembre novembro listopada listopad listopadu marraskuuta",
    "december dec dicembre dezember décembre decembre diciembre december dezembro grudnia prosinec prosince joulukuuta"], 1):
    for n in names.split(): MON[n] = i
MRX = "|".join(sorted(map(re.escape, MON), key=len, reverse=True))
KEY = re.compile(r"deadline|closing date|apply|application|admission|submission|scadenz|candidatur|bewerb|frist|einschreib|date limite|inscripci|plazo|aanmeld|ansök|ansøg|søknadsfrist|haku|termin|rekrutac|přihl|prazo|intake|round|call", re.I)
DATE = re.compile(rf"\b(\d{{1,2}})(?:st|nd|rd|th)?\.?\s*(?:of\s+)?({MRX})\b|\b({MRX})\.?\s+(\d{{1,2}})(?:st|nd|rd|th)?\b|\b(\d{{1,2}})[./](\d{{1,2}})[./](?:20)?(2[5-8])\b", re.I)
FEE = re.compile(r"(?:€|eur|euro)\s?([\d.,' ]{3,9})|([\d.,' ]{3,9})\s?(?:€|eur\b|euro)", re.I)
def num(s):
    s = re.sub(r"[ ']", "", s); s = re.sub(r"[.,](\d{3})", r"\1", s); s = s.split(",")[0].split(".")[0]
    return int(s) if s.isdigit() else None
rep = []
for p in L:
    f = ROOT / ".verify" / f"{p['id']}.txt"
    t = f.read_text(encoding="utf-8", errors="ignore") if f.exists() else ""
    body = t.split("\n", 3)[-1] if t else ""
    lines = body.split("\n")
    found = []  # (d, m, snippet)
    for i, ln in enumerate(lines):
        ctx = " ".join(lines[max(0, i - 1): i + 2])
        if not KEY.search(ctx): continue
        for m in DATE.finditer(ln):
            if m.group(1): d, mo = int(m.group(1)), MON[m.group(2).lower()]
            elif m.group(3): d, mo = int(m.group(4)), MON[m.group(3).lower()]
            else: d, mo = int(m.group(5)), int(m.group(6))
            if 1 <= d <= 31 and 1 <= mo <= 12: found.append((d, mo, ln.strip()[:220]))
    dl = p.get("deadline") or {}
    ours = [(x.get("d"), x.get("m")) for x in dl.get("dates", [])]
    exact = dl.get("type") != "month"
    hit = [x for x in found if (x[0], x[1]) in ours]
    mhit = [x for x in found if x[1] in [o[1] for o in ours]]
    if not body or len(body) < 1500: st = "KHONG_DOC"
    elif not found: st = "KHONG_TIN"
    elif hit: st = "KHOP"
    elif mhit: st = "THANG"
    else: st = "LECH"
    fees = sorted({n for a, b in FEE.findall(body) for n in [num(a or b)] if n and 100 <= n <= 80000})
    te = p.get("tuitionEur")
    fee_ok = None if te in (None, 0) or not fees else any(abs(x - te) <= max(50, te * 0.03) for x in fees)
    rep.append(dict(id=p["id"], school=p["school"], program=p["program"][:70], level=p.get("level"), st=st, exact=exact,
                    ours=ours, raw=p.get("deadlineRaw", "")[:160], found=[(d, m) for d, m, _ in found][:12],
                    snip=list(dict.fromkeys(s for *_, s in found))[:4], tuition=te, tuitionRaw=(p.get("tuitionRaw") or "")[:120],
                    fees=fees[:15], fee_ok=fee_ok, url=t.split("\n", 1)[0][4:] if t else p["link"]))
(ROOT / ".verify" / "_report.json").write_text(json.dumps(rep, ensure_ascii=False, indent=1), encoding="utf-8")
from collections import Counter
print(Counter(r["st"] for r in rep)); print("học phí không thấy trên trang:", sum(r["fee_ok"] is False for r in rep), "| khớp:", sum(r["fee_ok"] is True for r in rep))
