/* ==========================================================================
   Kiểm tra link chương trình của từng trường.

   Khác với bản check_links.sh chỉ xem mã HTTP, bản này còn:
     - đi theo chuyển hướng và ghi lại URL cuối cùng
     - đọc <title> của trang đích
     - cảnh báo khi link bị đá về trang chủ (soft 404), khi tiêu đề trang
       không dính gì tới tên trường hoặc tên chương trình

   Chạy:
     node tools/check_links.js                 # kiểm tra toàn bộ
     node tools/check_links.js --limit 30      # thử nhanh 30 link đầu
     node tools/check_links.js --only-dead     # chỉ kiểm tra lại link từng hỏng
     node tools/check_links.js --apply         # ghi kết quả vào data/link-status.json

   Kết quả chi tiết luôn được ghi ra .linkcheck-report.json để soi lại.
   ========================================================================== */
"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const DATA = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "programs.json"), "utf8"));
const SIDECAR = path.join(ROOT, "data", "link-status.json");
const REPORT = path.join(ROOT, ".linkcheck-report.json");

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f, d) => { const i = args.indexOf(f); return i === -1 ? d : args[i + 1]; };

const CONCURRENCY = Number(val("--concurrency", 10));
const TIMEOUT = Number(val("--timeout", 25000));

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
           "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/* -------------------------------------------------------------- chuẩn bị -- */
const prev = fs.existsSync(SIDECAR)
  ? JSON.parse(fs.readFileSync(SIDECAR, "utf8"))
  : { checkedAt: null, links: {} };

let jobs = [];
const seen = new Set();
for (const p of DATA.programs) {
  if (!p.link || seen.has(p.link)) continue;
  seen.add(p.link);
  jobs.push({ url: p.link, school: p.school, program: p.program, id: p.id, country: p.country });
}
if (has("--only-dead")) {
  jobs = jobs.filter((j) => prev.links[j.url] && prev.links[j.url].status === "dead");
}
if (has("--min-id")) jobs = jobs.filter((j) => j.id >= Number(val("--min-id", 0)));
if (has("--limit")) jobs = jobs.slice(0, Number(val("--limit", 30)));

/* ------------------------------------------------------------- tiện ích -- */
function words(s) {
  return String(s || "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length >= 4);
}

/* Từ quá phổ biến thì không chứng minh được gì về việc trang có đúng hay không */
const STOP = new Set([
  "university", "universitat", "universite", "universita", "universidad", "universiteit",
  "master", "masters", "msc", "programme", "program", "school", "institute", "faculty",
  "college", "degree", "study", "studies", "graduate", "postgraduate", "campus", "science",
  "sciences", "technology", "hochschule", "universitaet", "politecnico", "polytechnic"
]);

function significant(s) { return words(s).filter((w) => !STOP.has(w)); }

function pathDepth(u) {
  try { return new URL(u).pathname.replace(/\/+$/, "").split("/").filter(Boolean).length; }
  catch (e) { return 0; }
}
function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }

function titleOf(html) {
  const m = /<title[^>]*>([\s\S]{0,400}?)<\/title>/i.exec(html || "");
  if (!m) return "";
  return m[1].replace(/\s+/g, " ").replace(/&amp;/g, "&").replace(/&#\d+;/g, "").trim();
}

/* ---------------------------------------------------------------- kiểm -- */
async function probe(job) {
  const out = {
    id: job.id, url: job.url, school: job.school, program: job.program,
    code: "000", finalUrl: "", title: "", status: "blocked", flags: []
  };

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT);
  try {
    const res = await fetch(job.url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "en,vi;q=0.8", "Accept": "text/html,*/*" }
    });
    out.code = String(res.status);
    out.finalUrl = res.url || job.url;

    let html = "";
    const ct = res.headers.get("content-type") || "";
    if (/text\/html|application\/xhtml/i.test(ct)) {
      const reader = res.body && res.body.getReader ? res.body.getReader() : null;
      if (reader) {
        const chunks = [];
        let total = 0;
        while (total < 120000) {
          const { done, value } = await reader.read();
          if (done) break;
          chunks.push(value); total += value.length;
        }
        try { reader.cancel(); } catch (e) { /* đã đóng */ }
        html = Buffer.concat(chunks.map(Buffer.from)).toString("utf8");
      } else {
        html = (await res.text()).slice(0, 120000);
      }
    }
    out.title = titleOf(html);
  } catch (e) {
    out.code = /abort/i.test(e.name || "") ? "timeout" : "000";
    out.flags.push("mang: " + (e.cause && e.cause.code ? e.cause.code : e.name || "loi"));
  } finally {
    clearTimeout(timer);
  }

  /* phân loại theo mã trạng thái */
  if (out.code === "404" || out.code === "410") out.status = "dead";
  else if (/^[23]/.test(out.code)) out.status = "ok";
  else out.status = "blocked";

  /* soft 404: trả về 200 nhưng đá người dùng về trang chủ hoặc trang lỗi */
  if (out.status === "ok" && out.finalUrl) {
    const t = out.title.toLowerCase();
    if (/\b(404|page not found|not found|page introuvable|seite nicht gefunden|pagina non trovada|no encontrada)\b/.test(t)) {
      out.status = "dead";
      out.flags.push("tieu de la trang loi");
    } else if (pathDepth(job.url) >= 2 && pathDepth(out.finalUrl) === 0) {
      out.status = "dead";
      out.flags.push("bi da ve trang chu");
    } else if (host(out.finalUrl) && host(job.url) && host(out.finalUrl) !== host(job.url)) {
      out.flags.push("doi ten mien: " + host(job.url) + " -> " + host(out.finalUrl));
    } else if (pathDepth(out.finalUrl) < pathDepth(job.url) - 1) {
      out.flags.push("chuyen huong len trang cha: " + out.finalUrl);
    }
  }

  /* tiêu đề có dính gì tới trường hoặc chương trình không */
  if (out.status === "ok" && out.title) {
    const t = " " + words(out.title).join(" ") + " ";
    const sch = significant(job.school);
    const prog = significant(job.program);
    const hitSchool = sch.some((w) => t.includes(" " + w + " "));
    const hitProgram = prog.some((w) => t.includes(" " + w + " "));
    if (!hitSchool && !hitProgram) out.flags.push("tieu de khong khop truong/nganh");
  }

  return out;
}

/* ------------------------------------------------------------------ chạy -- */
(async function main() {
  console.log(`Kiểm tra ${jobs.length} link, ${CONCURRENCY} luồng song song...\n`);
  const results = [];
  let done = 0;

  async function worker() {
    while (jobs.length) {
      const job = jobs.shift();
      const r = await probe(job);
      results.push(r);
      done++;
      if (done % 25 === 0 || jobs.length === 0) {
        process.stdout.write(`  ${done} link đã kiểm tra\n`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  const by = {};
  results.forEach((r) => { by[r.status] = (by[r.status] || 0) + 1; });
  const flagged = results.filter((r) => r.flags.length);

  console.log("\n===== KẾT QUẢ =====");
  console.log("còn sống (ok) :", by.ok || 0);
  console.log("đã hỏng (dead):", by.dead || 0);
  console.log("bị chặn/timeout:", by.blocked || 0);
  console.log("có cảnh báo   :", flagged.length);

  if (by.dead) {
    console.log("\n--- LINK ĐÃ HỎNG ---");
    results.filter((r) => r.status === "dead").forEach((r) => {
      console.log(`  [${r.code}] ${r.school}\n        ${r.url}` + (r.flags.length ? `\n        ${r.flags.join("; ")}` : ""));
    });
  }
  if (flagged.length) {
    console.log("\n--- CẦN XEM LẠI BẰNG MẮT ---");
    flagged.filter((r) => r.status !== "dead").forEach((r) => {
      console.log(`  ${r.school}\n        ${r.url}\n        -> ${r.finalUrl}\n        title: ${r.title.slice(0, 110)}\n        ${r.flags.join("; ")}`);
    });
  }

  fs.writeFileSync(REPORT, JSON.stringify({
    checkedAt: new Date().toISOString().slice(0, 10),
    summary: by,
    results
  }, null, 2), "utf8");
  console.log("\nBáo cáo chi tiết: " + path.relative(ROOT, REPORT));

  if (has("--apply")) {
    const links = Object.assign({}, prev.links);
    const today = new Date().toISOString().slice(0, 10);
    let kept = 0;
    results.forEach((r) => {
      const before = links[r.url];
      /* Lỗi mạng tạm thời (timeout, TLS, ECONNRESET) không đủ căn cứ để xoá
         một kết luận "hỏng" đã chắc chắn trước đó. Chỉ mã 2xx/3xx thật mới gỡ. */
      if (before && before.status === "dead" && r.status === "blocked") {
        kept++;
        return;
      }
      links[r.url] = { checked: today, code: r.code, status: r.status };
    });
    if (kept) console.log(`Giữ nguyên ${kept} link vẫn ghi là hỏng: lần này chỉ gặp lỗi mạng, chưa đủ căn cứ gỡ.`);
    fs.writeFileSync(SIDECAR, JSON.stringify({ checkedAt: today, links }, null, 2), "utf8");
    console.log("Đã ghi vào data/link-status.json. Chạy tiếp: python tools/build_data.py");
  } else {
    console.log("Chưa ghi vào dữ liệu. Thêm cờ --apply nếu muốn cập nhật.");
  }
})();
