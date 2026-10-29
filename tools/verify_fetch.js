/* Tải nội dung trang chính thức của từng chương trình về .verify/<id>.txt (chữ thuần, đã bỏ thẻ)
   để so với dữ liệu. Chạy: node tools/verify_fetch.js [--concurrency 10] */
"use strict";
const fs = require("fs"), path = require("path");
const ROOT = path.resolve(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "programs.json"), "utf8"));
const L = DATA.programs || DATA;
const OUT = path.join(ROOT, ".verify"); fs.mkdirSync(OUT, { recursive: true });
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const C = Number((process.argv.find((a, i) => process.argv[i - 1] === "--concurrency")) || 10);
const strip = (h) => h.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<noscript[\s\S]*?<\/noscript>/gi, " ")
  .replace(/<(br|\/p|\/div|\/li|\/h\d|\/tr|\/td|\/th)[^>]*>/gi, "\n").replace(/<[^>]+>/g, " ")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#8211;|&ndash;/g, "–").replace(/&euro;/g, "€").replace(/&#\d+;/g, " ")
  .replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
async function one(p) {
  const f = path.join(OUT, p.id + ".txt");
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 30000);
    const r = await fetch(p.link, { headers: { "User-Agent": UA, "Accept-Language": "en,it;q=0.8,de;q=0.6" }, redirect: "follow", signal: ctl.signal });
    clearTimeout(t);
    const txt = strip(await r.text());
    fs.writeFileSync(f, `URL ${r.url}\nHTTP ${r.status}\n\n${txt}`);
    return [p.id, r.status, txt.length];
  } catch (e) { fs.writeFileSync(f, `URL ${p.link}\nERR ${e.name}\n`); return [p.id, "ERR", 0]; }
}
(async () => {
  const q = L.slice(); const res = [];
  await Promise.all(Array.from({ length: C }, async () => { while (q.length) res.push(await one(q.shift())); }));
  const ok = res.filter(r => r[1] === 200 && r[2] > 1500).length;
  console.log("xong", res.length, "trang; có nội dung đọc được:", ok);
})();
