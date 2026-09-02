/* ==========================================================================
   Test harness — chạy app.js trên một DOM giả lập tối giản (node tools/test.js)
   Mục tiêu: bắt lỗi runtime, kiểm tra logic deadline / lọc / xuất file.
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
const fails = [];

function ok(name, cond, extra) {
  if (cond) { pass++; }
  else { fail++; fails.push(name + (extra ? "  → " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, `nhận ${JSON.stringify(a)}, mong đợi ${JSON.stringify(b)}`); }

/* ------------------------------------------------------------- DOM stub -- */
const captured = [];          // các file "tải xuống"
const listeners = {};          // handler đăng ký trên document

function makeEl(tag) {
  const el = {
    tagName: (tag || "div").toUpperCase(),
    _html: "", _text: "", value: "", href: "", src: "", hidden: false, disabled: false,
    style: { setProperty() {}, removeProperty() {} },
    dataset: {},
    classList: { add() {}, remove() {}, toggle() {}, contains: () => false },
    options: [],
    children: [],
    appendChild(c) { this.children.push(c); return c; },
    removeChild() {}, remove() {},
    insertAdjacentHTML(_, h) { this._html += h; },
    addEventListener(t, fn) { (this._ls = this._ls || {})[t] = fn; },
    removeEventListener() {},
    querySelector: () => makeEl("div"),
    querySelectorAll: () => [],
    closest: () => null,
    focus() {}, click() {}, blur() {},
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 300, height: 200 }),
    setAttribute() {}, getAttribute: () => null,
    get innerHTML() { return this._html; },
    set innerHTML(v) { this._html = String(v); },
    get textContent() { return this._text; },
    set textContent(v) { this._text = String(v); }
  };
  return el;
}

const registry = {};
function elFor(sel) {
  if (!registry[sel]) registry[sel] = makeEl("div");
  return registry[sel];
}

const document = {
  readyState: "complete",
  documentElement: Object.assign(makeEl("html"), { dataset: { theme: "dark" } }),
  body: Object.assign(makeEl("body"), { style: {} }),
  head: makeEl("head"),
  activeElement: null,
  createElement: (t) => makeEl(t),
  querySelector: (s) => elFor(s),
  querySelectorAll: () => [],
  addEventListener: (t, fn) => { listeners[t] = fn; },
  getElementById: (id) => elFor("#" + id)
};

class IntersectionObserverStub { observe() {} unobserve() {} disconnect() {} }

const store = {};
const localStorage = {
  getItem: (k) => (k in store ? store[k] : null),
  setItem: (k, v) => { store[k] = String(v); },
  removeItem: (k) => { delete store[k]; }
};

const location = { search: "", origin: "https://example.github.io", pathname: "/euromasters-tracker/", href: "https://example.github.io/euromasters-tracker/" };

const window = {
  document, localStorage, location, self: null, top: null,
  innerWidth: 1440, innerHeight: 900,
  matchMedia: () => ({ matches: false, addEventListener() {} }),
  addEventListener() {},
  requestAnimationFrame: (fn) => { setTimeout(() => fn(performance.now()), 0); return 1; },
  cancelAnimationFrame() {},
  IntersectionObserver: IntersectionObserverStub,
  URL: { createObjectURL: () => "blob:stub", revokeObjectURL() {} },
  print() { captured.push({ name: "PRINT", size: 0 }); },
  alert() {},
  Intl, console, setTimeout, clearTimeout, setInterval: () => 0, clearInterval() {},
  performance, fetch: () => Promise.reject(new Error("offline in test"))
};
window.window = window;

class BlobStub {
  constructor(parts, opts) {
    this.parts = parts; this.type = (opts && opts.type) || "";
    this.text = parts.map((p) => (typeof p === "string" ? p : "")).join("");
    this.size = this.text.length;
  }
}

const sandbox = Object.assign(Object.create(null), window, {
  window, document, localStorage, console, location, URLSearchParams,
  Blob: BlobStub, URL: window.URL, IntersectionObserver: IntersectionObserverStub,
  setTimeout, clearTimeout, setInterval: () => 0, clearInterval, performance,
  requestAnimationFrame: window.requestAnimationFrame, matchMedia: window.matchMedia,
  Intl, Date, Math, JSON, Object, Array, String, Number, Promise, RegExp, Error,
  URLSearchParams, fetch: window.fetch, globalThis: window
});
vm.createContext(sandbox);

function run(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  try { vm.runInContext(code, sandbox, { filename: rel }); return true; }
  catch (e) { fail++; fails.push(`LOAD ${rel}: ${e.message}\n${e.stack.split("\n").slice(0, 4).join("\n")}`); return false; }
}

/* ---------------------------------------------------------------- chạy --- */
console.log("Nạp script…");
["data/programs.js", "assets/js/config.js", "assets/js/premium.js",
 "assets/js/exporters.js", "assets/js/app.js"].forEach(run);

const W = sandbox.window;
const EMT = W.EMT, DATA = W.EMT_DATA, CFG = W.EMT_CONFIG, PRO = W.EMT_PREMIUM, EX = W.EMT_EXPORT;

console.log("\n=== 1. Nạp dữ liệu ===");
ok("EMT_DATA tồn tại", !!DATA);
eq("số chương trình", DATA.programs.length, 282);
eq("số quốc gia", DATA.meta.countries.length, 22);
ok("app khởi tạo (window.EMT)", !!EMT);
ok("bộ xuất sẵn sàng", !!EX);

console.log("\n=== 2. Trường dữ liệu bắt buộc ===");
const missing = { school: 0, program: 0, country: 0, link: 0, deadlineRaw: 0 };
DATA.programs.forEach((p) => {
  Object.keys(missing).forEach((k) => { if (!p[k]) missing[k]++; });
});
eq("thiếu tên trường", missing.school, 0);
eq("thiếu tên chương trình", missing.program, 0);
eq("thiếu quốc gia", missing.country, 0);
ok("thiếu link ≤ 5", missing.link <= 5, `thiếu ${missing.link}`);
ok("thiếu mô tả hạn nộp ≤ 5", missing.deadlineRaw <= 5, `thiếu ${missing.deadlineRaw}`);
ok("id là duy nhất", new Set(DATA.programs.map((p) => p.id)).size === 282);

console.log("\n=== 3. Logic đếm ngược ===");
let threw = 0, future = 0, past = 0, none = 0, approx = 0;
const now = new Date();
DATA.programs.forEach((p) => {
  let st;
  try { st = EMT.statusOf(p); } catch (e) { threw++; fails.push("statusOf ném lỗi id=" + p.id + ": " + e.message); return; }
  if (st.days == null) { none++; return; }
  if (st.days >= 0) future++; else past++;
  if (st.approx) approx++;
  const nx = EMT.nextDeadline(p);
  if (nx && p.deadline.recurring && nx.date < now) {
    fails.push(`hạn lặp hằng năm nhưng ở quá khứ: id=${p.id} ${EMT.fmtDate(nx.date)}`);
    fail++;
  }
});
eq("statusOf không ném lỗi", threw, 0);
ok("có chương trình còn hạn", future > 200, `future=${future}`);
console.log(`   còn hạn: ${future} · đã đóng: ${past} · không ngày: ${none} · ngày ước lượng: ${approx}`);

// kiểm tra thủ công vài ca đặc biệt
function findByRaw(sub) { return DATA.programs.find((p) => (p.deadlineRaw || "").includes(sub)); }
const tud = DATA.programs.find((p) => p.school.includes("TU Delft") && p.program.includes("Architecture"));
if (tud) {
  const nx = EMT.nextDeadline(tud);
  eq("TU Delft: hạn kế tiếp là 15/1", nx ? nx.date.getDate() + "/" + (nx.date.getMonth() + 1) : "", "15/1");
  ok("TU Delft: hạn ở tương lai", nx.date > now, EMT.fmtDate(nx.date));
}
const eth = DATA.programs.find((p) => p.school.includes("ETH Zurich") && p.program.includes("Architektur"));
if (eth) {
  const nx = EMT.nextDeadline(eth);
  eq("ETH: cửa sổ 1/11-30/11 → chốt 30/11", nx ? nx.date.getDate() + "/" + (nx.date.getMonth() + 1) : "", "30/11");
}
const rolling = DATA.programs.filter((p) => p.deadline.type === "rolling");
ok("có nhóm rolling", rolling.length > 0, `${rolling.length}`);
if (rolling.length) {
  const st = EMT.statusOf(rolling[0]);
  eq("rolling hiển thị nhãn riêng", st.days, null);
}

console.log("\n=== 4. Bộ lọc & sắp xếp ===");
const S = EMT._S;
eq("mặc định: tất cả", EMT.filtered().length, 282);
S.country = "Vương quốc Anh";
const uk = EMT.filtered();
ok("lọc theo quốc gia", uk.length > 0 && uk.every((p) => p.country === "Vương quốc Anh"), `${uk.length}`);
S.country = "";
S.q = "delft";
const dq = EMT.filtered();
ok("tìm kiếm 'delft'", dq.length > 0 && dq.every((p) => /delft/i.test(p.school + p.city)), `${dq.length}`);
S.q = "kien truc";
ok("tìm kiếm không dấu 'kien truc'", EMT.filtered().length > 0, `${EMT.filtered().length}`);
S.q = "";
S.flags.scholarship = true;
const sc = EMT.filtered();
ok("lọc có học bổng", sc.length > 0 && sc.every((p) => p.hasScholarship), `${sc.length}`);
S.flags = {};
S.win = "30";
const w30 = EMT.filtered();
ok("lọc hạn ≤30 ngày", w30.every((p) => { const s = EMT.statusOf(p); return s.days >= 0 && s.days <= 30; }), `${w30.length}`);
S.win = "";
S.sort = "tuitionAsc";
const ta = EMT.filtered();
let sortedOk = true;
for (let i = 1; i < ta.length; i++) {
  const a = ta[i - 1].tuitionEur == null ? 1e9 : ta[i - 1].tuitionEur;
  const b = ta[i].tuitionEur == null ? 1e9 : ta[i].tuitionEur;
  if (a > b) { sortedOk = false; break; }
}
ok("sắp xếp học phí tăng dần", sortedOk);
S.sort = "deadline";

console.log("\n=== 5. Kích hoạt Pro (master key) ===");
const MASTER = "HAIKTSDUHOCY2026";
ok("mặc định chưa kích hoạt", PRO.active === false);
ok("có cấu hình MASTER_KEY_HASH", !!CFG.MASTER_KEY_HASH);
ok("key đúng được chấp nhận", PRO._verifyMaster(MASTER) === true);
ok("chấp nhận chữ thường", PRO._verifyMaster(MASTER.toLowerCase()) === true);
ok("chấp nhận có dấu gạch", PRO._verifyMaster("HAIK-TSDU-HOCY-2026") === true);
ok("key sai bị từ chối", PRO._verifyMaster("HAIKTSDUHOCY2027") === false);
ok("key rỗng bị từ chối", PRO._verifyMaster("") === false);
ok("key thô KHÔNG lộ trong config.js",
   !fs.readFileSync(path.join(ROOT, "assets/js/config.js"), "utf8").includes(MASTER));
ok("key thô KHÔNG lộ trong premium.js",
   !fs.readFileSync(path.join(ROOT, "assets/js/premium.js"), "utf8").includes(MASTER));

// SHA-256 tự viết phải khớp thư viện chuẩn của Node (kể cả ở biên block 55/56/64)
const nodeCrypto = require("crypto");
let shaBad = 0;
["", "a", "abc", "x".repeat(55), "y".repeat(56), "z".repeat(64), "Tiếng Việt ✓"].forEach((c) => {
  if (PRO._sha256(c) !== nodeCrypto.createHash("sha256").update(c, "utf8").digest("hex")) shaBad++;
});
eq("SHA-256 khớp crypto của Node", shaBad, 0);

console.log("\n=== 6. Xuất file (khi đã có Pro) ===");
// bật Pro thủ công để test bộ xuất
PRO.active = true; PRO.info = { key: MASTER, source: "master" };
const sample = DATA.programs.slice(0, 25);

function grab(fn, label) {
  captured.length = 0;
  let msg = null;
  const origDl = EX._download;
  EX._download = origDl;
  try { msg = fn(); } catch (e) { fails.push(`${label} ném lỗi: ${e.message}`); fail++; return null; }
  return msg;
}

// bắt nội dung blob bằng cách vá lại download
let lastBlob = null;
const realCreate = sandbox.document.createElement;
sandbox.Blob = class extends BlobStub { constructor(p, o) { super(p, o); lastBlob = this; } };

let m;
m = grab(() => EX.csv(sample), "CSV");
ok("CSV: có thông báo", !!m, m);
ok("CSV: có BOM UTF-8", lastBlob && lastBlob.text.charCodeAt(0) === 0xFEFF);
ok("CSV: đủ 26 dòng (header + 25)", lastBlob && lastBlob.text.trim().split("\r\n").length >= 26,
   lastBlob ? lastBlob.text.trim().split("\r\n").length : "n/a");
ok("CSV: giữ dấu tiếng Việt", lastBlob && lastBlob.text.includes("Chương trình"));

m = grab(() => EX.json(sample), "JSON");
ok("JSON: có thông báo", !!m, m);
let parsed = null;
try { parsed = JSON.parse(lastBlob.text); } catch (e) {}
ok("JSON: parse được", !!parsed);
eq("JSON: đúng số bản ghi", parsed ? parsed.programs.length : -1, 25);
ok("JSON: có nextDeadline", parsed && parsed.programs.some((p) => p.nextDeadline));

m = grab(() => EX.doc(sample), "DOC");
ok("DOC: có thông báo", !!m, m);
ok("DOC: là HTML Word", lastBlob && lastBlob.text.includes("urn:schemas-microsoft-com:office:word"));
ok("DOC: chứa tên trường", lastBlob && lastBlob.text.includes(sample[0].school.slice(0, 20)));

m = grab(() => EX.ics(sample), "ICS");
ok("ICS: có thông báo", !!m, m);
const ics = lastBlob ? lastBlob.text : "";
ok("ICS: mở/đóng VCALENDAR", ics.startsWith("BEGIN:VCALENDAR") && ics.trim().endsWith("END:VCALENDAR"));
ok("ICS: dùng CRLF", ics.includes("\r\n") && !/[^\r]\n/.test(ics));
ok("ICS: có VALARM nhắc trước", ics.includes("TRIGGER;RELATED=START:-P30D"));
const nEvents = (ics.match(/BEGIN:VEVENT/g) || []).length;
eq("ICS: số VEVENT khớp số BEGIN/END", nEvents, (ics.match(/END:VEVENT/g) || []).length);
ok("ICS: có sự kiện", nEvents > 0, `${nEvents}`);
const longLine = ics.split("\r\n").find((l) => l.length > 75 && !l.startsWith(" "));
ok("ICS: dòng dài đã được fold (≤75 ký tự)", !longLine, longLine ? longLine.slice(0, 60) + "…" : "");

console.log("\n=== 7. Render không ném lỗi ===");
["cards", "timeline", "table", "tracker"].forEach((v) => {
  S.view = v;
  try {
    // render() không được export → gọi gián tiếp qua filtered + template
    const list = EMT.filtered();
    ok(`view ${v}: có dữ liệu để render`, list.length > 0);
  } catch (e) { fail++; fails.push(`render ${v}: ${e.message}`); }
});
const cardsHTML = elFor("#view-cards").innerHTML;
ok("HTML thẻ đã được sinh khi init", cardsHTML.length > 1000, `${cardsHTML.length} ký tự`);
ok("HTML thẻ có countdown", cardsHTML.includes("cdbadge"));
ok("HTML thẻ không lộ 'undefined'", !cardsHTML.includes(">undefined<"), "");
ok("HTML thẻ không lộ 'NaN'", !/\bNaN\b/.test(cardsHTML));

console.log("\n=== 8. Chi phí & liên kết ===");
const withCost = DATA.programs.filter((p) => p.tuitionEur != null && p.livingEur != null);
ok("đa số có dữ liệu chi phí", withCost.length > 250, `${withCost.length}/282`);
const outliers = DATA.programs.filter((p) => p.tuitionEur != null && p.tuitionEur > 120000);
ok("không có học phí phi lý (>120k EUR)", outliers.length === 0,
   outliers.slice(0, 3).map((p) => `${p.school}: ${p.tuitionEur} ← "${p.tuitionRaw}"`).join(" | "));
const badLinks = DATA.programs.filter((p) => p.link && !/^https?:\/\//.test(p.link));
eq("mọi link đều là http(s)", badLinks.length, 0);

/* --------------------------------------------------------------- kết quả */
console.log("\n" + "=".repeat(58));
if (fails.length) {
  console.log("LỖI:");
  fails.forEach((f) => console.log("  ✗ " + f));
}
console.log(`\n${pass} đạt · ${fail} lỗi`);
process.exit(fail ? 1 : 0);
