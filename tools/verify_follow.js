/* Với trang không nói hạn nộp: mở lại trang, đi theo tối đa 3 link "admission/deadline/how to apply"
   cùng tên miền, nối nội dung vào .verify/<id>.txt.  node tools/verify_follow.js */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const REP = JSON.parse(fs.readFileSync(path.join(ROOT, ".verify", "_report.json"), "utf8"));
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const RX = /deadline|dates|how to apply|apply|admission|application|key dates|scadenz|ammission|iscrizion|bewerbung|zulassung|candidature|admisi|preinscrip|aanmelden|toelating|ansök|søknad|opptak|haku|rekrutac|přijímací/i;
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
  .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/td|\/th)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&euro;/g, "€").replace(/&#\d+;/g, " ").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
async function get(u) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 25000);
  try { const r = await fetch(u, { headers: { "User-Agent": UA, "Accept-Language": "en" }, redirect: "follow", signal: ctl.signal }); return { url: r.url, html: await r.text() }; }
  catch (e) { return null; } finally { clearTimeout(t); }
}
async function one(x) {
  const f = path.join(ROOT, ".verify", x.id + ".txt");
  const base = await get(x.url); if (!base) return 0;
  const host = new URL(base.url).hostname.replace(/^www\./, "");
  const seen = new Set([base.url]); const links = [];
  for (const m of base.html.matchAll(/<a\b[^>]*href="([^"#]+)"[^>]*>([\s\S]*?)<\/a>/gi)) {
    let u; try { u = new URL(m[1].replace(/&amp;/g, "&"), base.url).href; } catch { continue; }
    const txt = m[2].replace(/<[^>]+>/g, " ").trim();
    if (!/^https?:/.test(u) || seen.has(u) || !new URL(u).hostname.replace(/^www\./, "").endsWith(host.split(".").slice(-2).join("."))) continue;
    if (!RX.test(txt + " " + u) || /\.pdf$|login|cookie|privacy|news|event/i.test(u)) continue;
    seen.add(u); links.push([/deadline|dates|scadenz|frist/i.test(txt + u) ? 0 : 1, u]);
  }
  links.sort((a, b) => a[0] - b[0]);
  let n = 0;
  for (const [, u] of links.slice(0, 3)) {
    const r = await get(u); if (!r) continue;
    fs.appendFileSync(f, `\n=== FOLLOW ${r.url}\n${strip(r.html)}`); n++;
  }
  return n;
}
(async () => {
  const q = REP.filter(x => x.st === "KHONG_TIN"); let done = 0, fol = 0;
  await Promise.all(Array.from({ length: 8 }, async () => { while (q.length) { const x = q.shift(); fol += (await one(x)) ? 1 : 0; done++; } }));
  console.log("đã xử lý", done, "trang; có trang phụ:", fol);
})();
