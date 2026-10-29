# -*- coding: utf-8 -*-
"""Mở trang bằng Chrome thật (Playwright) cho các chương trình chưa đọc được / chưa thấy hạn nộp,
đi theo tối đa 3 link tuyển sinh, ghi đè .verify/<id>.txt.   python tools/verify_render.py"""
import asyncio, json, re, sys
from pathlib import Path
from playwright.async_api import async_playwright
sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
REP = json.loads((ROOT / ".verify" / "_report.json").read_text(encoding="utf-8"))
TODO = [x for x in REP if x["st"] in ("KHONG_DOC", "KHONG_TIN")]
RX = re.compile(r"deadline|key dates|dates|how to apply|apply|admission|application|scadenz|ammission|bewerbung|zulassung|candidature|admisi|aanmelden|toelating|ansök|søknad|opptak|rekrutac|přijímací", re.I)
SKIP = re.compile(r"\.pdf$|login|cookie|privacy|news|event|mailto:|tel:", re.I)
async def text(pg, url):
    await pg.goto(url, wait_until="domcontentloaded", timeout=45000)
    await pg.wait_for_timeout(3500)
    for sel in ["button:has-text('Accept all')", "button:has-text('Accept')", "button:has-text('Alle akzeptieren')", "button:has-text('Accetta')"]:
        try:
            b = pg.locator(sel).first
            if await b.is_visible(timeout=300): await b.click(timeout=1500); break
        except Exception: pass
    return pg.url, await pg.evaluate("document.body ? document.body.innerText : ''")
async def one(ctx, x, sem):
    async with sem:
        pg = await ctx.new_page(); out = []
        try:
            url, t = await text(pg, x["url"] if x["url"].startswith("http") else x["url"])
            out.append(f"URL {url}\nHTTP render\n\n{t}")
            host = re.sub(r"^www\.", "", re.sub(r"^https?://([^/]+).*", r"\1", url)); dom = ".".join(host.split(".")[-2:])
            links = await pg.evaluate("[...document.querySelectorAll('a[href]')].map(a=>[a.href,(a.innerText||'').trim().slice(0,80)])")
            cand, seen = [], {url}
            for h, tx in links:
                h = h.split("#")[0]
                if not h.startswith("http") or h in seen or SKIP.search(h) or dom not in h.split("/")[2]: continue
                if RX.search(tx + " " + h): seen.add(h); cand.append((0 if re.search(r"deadline|dates|scadenz|frist", tx + h, re.I) else 1, h))
            for _, h in sorted(cand)[:3]:
                try:
                    u2, t2 = await text(pg, h); out.append(f"\n=== FOLLOW {u2}\n{t2}")
                except Exception: pass
            (ROOT / ".verify" / f"{x['id']}.txt").write_text("\n".join(out), encoding="utf-8")
            return 1
        except Exception as e:
            return 0
        finally:
            await pg.close()
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(channel="chrome", headless=True)
        ctx = await b.new_context(locale="en-GB", user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36", viewport={"width": 1400, "height": 900})
        sem = asyncio.Semaphore(5)
        r = await asyncio.gather(*[one(ctx, x, sem) for x in TODO])
        print("render xong", sum(r), "/", len(TODO)); await b.close()
asyncio.run(main())
