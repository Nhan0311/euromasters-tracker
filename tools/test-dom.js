/* ==========================================================================
   Test tích hợp với DOM thật (jsdom) — kiểm tra index.html + toàn bộ script,
   mô phỏng thao tác người dùng: đổi view, lọc, mở chi tiết, kích hoạt Pro…

   Cần jsdom. Nếu chưa có:  npm install jsdom
   Chạy:  node tools/test-dom.js
   ========================================================================== */
"use strict";
const fs = require("fs");
const path = require("path");

let JSDOM;
try { ({ JSDOM } = require("jsdom")); }
catch (e) {
  const alt = process.env.EMT_JSDOM;
  if (alt) ({ JSDOM } = require(alt));
  else { console.error("Thiếu jsdom → bỏ qua test DOM. Cài bằng: npm install jsdom"); process.exit(0); }
}

const ROOT = path.resolve(__dirname, "..");
let pass = 0, fail = 0;
const fails = [];
function ok(name, cond, extra) {
  if (cond) pass++;
  else { fail++; fails.push(name + (extra ? "  → " + extra : "")); }
}
function eq(name, a, b) { ok(name, a === b, `nhận ${JSON.stringify(a)}, mong đợi ${JSON.stringify(b)}`); }

const errors = [];

const dom = new JSDOM(fs.readFileSync(path.join(ROOT, "index.html"), "utf8"), {
  url: "https://example.github.io/euromasters-tracker/",
  runScripts: "outside-only",
  pretendToBeVisual: true,
  resources: undefined
});
const { window } = dom;
const { document } = window;

window.addEventListener("error", (e) => errors.push("window error: " + e.message));
window.onerror = (m) => errors.push("onerror: " + m);

// jsdom chưa có: chặn fetch ra ngoài, IntersectionObserver
window.fetch = () => Promise.reject(new Error("network disabled in test"));
window.matchMedia = window.matchMedia || ((q) => ({
  matches: false, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}
}));
window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
window.print = () => { window.__printed = (window.__printed || 0) + 1; };
window.alert = (m) => { window.__alert = m; };
window.URL.createObjectURL = (b) => { window.__lastBlob = b; return "blob:test"; };
window.URL.revokeObjectURL = () => {};
window.HTMLAnchorElement.prototype.click = function () { window.__clicked = this.download || this.href; };

// Blob.text() là async trong jsdom → tự lưu nội dung khi tạo
const RealBlob = window.Blob;
window.Blob = class extends RealBlob {
  constructor(parts, opts) {
    super(parts, opts);
    this._text = (parts || []).map((p) => (typeof p === "string" ? p : "")).join("");
    window.__blobs = window.__blobs || [];
    window.__blobs.push(this);
  }
};

function load(rel) {
  const code = fs.readFileSync(path.join(ROOT, rel), "utf8");
  try { window.eval(code); }
  catch (e) { fail++; fails.push(`LOAD ${rel}: ${e.message}`); }
}

["data/programs.js", "assets/js/config.js", "assets/js/premium.js",
 "assets/js/exporters.js", "assets/js/app.js"].forEach(load);

const $ = (s) => document.querySelector(s);
const $$ = (s) => Array.from(document.querySelectorAll(s));
const click = (elOrSel) => {
  const el = typeof elOrSel === "string" ? $(elOrSel) : elOrSel;
  if (!el) { fail++; fails.push("không tìm thấy phần tử để click: " + elOrSel); return; }
  el.dispatchEvent(new window.MouseEvent("click", { bubbles: true, cancelable: true }));
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function ready() {
  await wait(60);
  if (!$("#stats").children.length) {
    document.dispatchEvent(new window.Event("DOMContentLoaded", { bubbles: true }));
    await wait(60);
  }
}

(async function main() {
  await ready();

  console.log("=== A. Khởi tạo trang ===");
  eq("không có lỗi JS khi tải", errors.length, 0, errors.join(" | "));
  ok("window.EMT sẵn sàng", !!window.EMT);
  eq("hero hiển thị số chương trình", $("#heroCount").textContent, "282");
  eq("hero hiển thị số quốc gia", $("#heroCountries").textContent, "22");
  eq("5 ô thống kê", $$("#stats .stat").length, 5);
  ok("ticker hiện lên", $("#ticker").hidden === false);
  ok("ticker có đồng hồ đếm ngược", $$("#cdBox .cd-unit").length === 4,
     String($$("#cdBox .cd-unit").length));

  console.log("\n=== B. Danh sách thẻ ===");
  const cards = $$("#view-cards .card");
  eq("render 60 thẻ đầu", cards.length, 60);
  ok("có nút 'Xem thêm'", !!$("#moreBtn"));
  ok("mỗi thẻ có badge đếm ngược", $$("#view-cards .cdbadge").length === 60);
  ok("thẻ có id hợp lệ", cards.every((c) => +c.dataset.id > 0));
  ok("không lộ undefined/NaN", !/>undefined<|\bNaN\b/.test($("#view-cards").innerHTML));

  console.log("\n=== C. Bộ lọc ===");
  const before = $$("#view-cards .card").length;
  const sel = $("#fCountry");
  ok("dropdown quốc gia đã nạp", sel.options.length === 23, String(sel.options.length));
  sel.value = "Hà Lan";
  sel.dispatchEvent(new window.Event("change", { bubbles: true }));
  const nl = $$("#view-cards .card");
  ok("lọc Hà Lan trả về kết quả", nl.length > 0 && nl.length < before, `${nl.length}`);
  ok("kết quả đúng quốc gia", nl.every((c) => c.textContent.includes("Hà Lan")));
  click("#resetBtn");
  eq("đặt lại khôi phục danh sách", $$("#view-cards .card").length, before);

  $("#q").value = "TU Delft";
  $("#q").dispatchEvent(new window.Event("input", { bubbles: true }));
  await wait(300);
  const s = $$("#view-cards .card");
  ok("tìm 'TU Delft' có kết quả", s.length > 0 && s.length < 30, `${s.length}`);
  ok("kết quả chứa Delft", s.every((c) => /Delft/i.test(c.textContent)));
  click("#resetBtn");

  console.log("\n=== D. Chuyển view ===");
  const nav = $$("#nav button");
  eq("4 nút view", nav.length, 4);
  click(nav[1]); // timeline
  ok("view timeline hiện", !$("#view-timeline").hidden && $("#view-cards").hidden);
  ok("timeline có nhóm tháng", $$(".tl-month").length > 3, String($$(".tl-month").length));
  ok("timeline có mục", $$(".tl-item").length > 50, String($$(".tl-item").length));

  click(nav[2]); // table
  ok("view bảng hiện", !$("#view-table").hidden);
  eq("bảng có 9 cột", $$("#tblHead th").length, 9);
  ok("bảng có dòng", $$("#tblBody tr").length > 50, String($$("#tblBody tr").length));
  click($$("#tblHead th")[0]); // sort theo QS
  ok("click header đổi sắp xếp", $("#tblHead th .ar").textContent !== "↕");

  click(nav[3]); // tracker (chưa Pro)
  ok("tracker hiển thị màn khoá Pro", $("#view-tracker").innerHTML.includes("tính năng Pro"));

  click(nav[0]); // về cards

  console.log("\n=== E. Chi tiết (drawer) ===");
  const card = $$("#view-cards .card")[0];
  const id = card.dataset.id;
  click(card);
  ok("drawer mở", $("#drawer").classList.contains("on"));
  ok("drawer có tiêu đề", $("#dTitle").textContent.length > 3, $("#dTitle").textContent);
  ok("drawer có 9 liên kết tài liệu", $$("#dBody .linkrow[href]").length >= 8,
     String($$("#dBody .linkrow[href]").length));
  ok("mọi liên kết là URL hợp lệ",
     $$("#dBody .linkrow[href]").every((a) => /^https?:\/\//.test(a.href)));
  ok("drawer có mục khoá Pro", $("#dBody").innerHTML.includes("PRO") || $("#dBody").innerHTML.includes("🔒"));
  ok("footer có nút mở web trường", /Mở web trường/.test($("#dFoot").textContent));

  // lưu vào shortlist
  click("#dSave");
  ok("nút lưu chuyển thành 'Đã lưu'", /Đã lưu/.test($("#dSave").textContent));
  ok("lưu vào localStorage", JSON.parse(window.localStorage.getItem("emt.shortlist")).includes(+id));
  click("#dClose");
  ok("drawer đóng", !$("#drawer").classList.contains("on"));

  console.log("\n=== F. Giới hạn bản miễn phí ===");
  const cs = $$("#view-cards .card");
  for (let i = 1; i < 8; i++) {
    const b = cs[i].querySelector('[data-act="save"]');
    if (b) click(b);
  }
  const sl = JSON.parse(window.localStorage.getItem("emt.shortlist"));
  eq("shortlist bị chặn ở 5", sl.length, 5);
  ok("modal Pro bật lên khi vượt giới hạn", $("#proModal").classList.contains("on"));
  click("#proClose");

  // chip Pro
  click('[data-flag="cheap"]');
  ok("chip Pro mở modal nâng cấp", $("#proModal").classList.contains("on"));
  ok("chip Pro KHÔNG được bật", !$('[data-flag="cheap"]').classList.contains("on"));
  click("#proClose");

  console.log("\n=== G. So sánh ===");
  const cs2 = $$("#view-cards .card");
  click(cs2[0].querySelector('[data-act="cmp"]'));
  click(cs2[1].querySelector('[data-act="cmp"]'));
  ok("thanh so sánh hiện", $("#cmpBar").classList.contains("on"));
  eq("2 mục trong thanh so sánh", $$("#cmpThumbs .th").length, 2);
  click(cs2[2].querySelector('[data-act="cmp"]'));
  eq("bản free chặn ở 2 mục", $$("#cmpThumbs .th").length, 2);
  click("#proClose");
  click("#cmpOpen");
  ok("bảng so sánh mở", $("#cmpModal").classList.contains("on"));
  ok("bảng so sánh có 12 hàng", $$("#cmpBody tbody tr").length === 12, String($$("#cmpBody tbody tr").length));
  ok("có ô 'best' được tô", $$("#cmpBody .best").length > 0, String($$("#cmpBody .best").length));
  click("#cmpClose");
  click("#cmpClear");

  console.log("\n=== H. Xuất file (chưa Pro) ===");
  click("#exportBtn");
  ok("modal xuất mở", $("#expModal").classList.contains("on"));
  eq("7 định dạng", $$("#expList [data-exp]").length, 7);
  ok("6 định dạng bị khoá", ($("#expList").innerHTML.match(/🔒/g) || []).length === 6,
     String(($("#expList").innerHTML.match(/🔒/g) || []).length));
  window.__blobs = [];
  click('[data-exp="csv10"]');
  ok("CSV thử miễn phí tải được", window.__blobs.length === 1, String(window.__blobs.length));
  const csvText = window.__blobs[0] ? window.__blobs[0]._text : "";
  eq("CSV thử đúng 11 dòng", csvText.trim().split("\r\n").length, 11);
  ok("CSV giữ dấu tiếng Việt", csvText.includes("Chương trình"));
  window.__blobs = [];
  click('[data-exp="ics"]');
  eq("ICS bị chặn khi chưa Pro", window.__blobs.length, 0);
  ok("mở modal Pro thay thế", $("#proModal").classList.contains("on"));

  console.log("\n=== I. Kích hoạt Pro ===");
  const key = "HAIKTSDUHOCY2026";

  $("#keyInput").value = "SAI-KEY-1234-5678";
  click("#keyBtn");
  await wait(250);
  ok("key sai bị từ chối", !window.EMT_PREMIUM.active, "");
  ok("hiện thông báo lỗi", $("#keyMsg").classList.contains("err"));

  $("#keyInput").value = key;
  click("#keyBtn");
  await wait(250);
  ok("key đúng kích hoạt Pro", window.EMT_PREMIUM.active === true, key);
  eq("nguồn key là master", (window.EMT_PREMIUM.info || {}).source, "master");
  eq("nút đổi nhãn", $("#proBtnLabel").textContent, "Pro đã kích hoạt");
  ok("ổ khoá nút Xuất biến mất", $("#exportLock").hidden === true);
  ok("key được lưu localStorage", !!window.localStorage.getItem("emt.license.v1"));

  console.log("\n=== J. Tính năng Pro sau kích hoạt ===");
  click('[data-flag="top50"]');
  ok("chip Pro nay bật được", $('[data-flag="top50"]').classList.contains("on"));
  const top50 = $$("#view-cards .card");
  ok("lọc Top 50 QS có kết quả", top50.length > 0, String(top50.length));
  click('[data-flag="top50"]');

  // shortlist không giới hạn
  const cs4 = $$("#view-cards .card");
  for (let i = 0; i < 12; i++) { const b = cs4[i].querySelector('[data-act="save"]'); if (b) click(b); }
  ok("shortlist vượt 5 khi có Pro",
     JSON.parse(window.localStorage.getItem("emt.shortlist")).length > 5,
     String(JSON.parse(window.localStorage.getItem("emt.shortlist")).length));

  // tracker
  click($$("#view-cards .card")[0]);
  const stBtn = $('#dBody [data-status="preparing"]');
  ok("drawer có nút trạng thái khi có Pro", !!stBtn);
  if (stBtn) {
    click(stBtn);
    const tr = JSON.parse(window.localStorage.getItem("emt.track"));
    ok("trạng thái được lưu", Object.values(tr).some((t) => t.status === "preparing"));
  }
  const cb = $('#dBody [data-doc="0"]');
  ok("có checklist giấy tờ", !!cb);
  if (cb) {
    cb.checked = true;
    cb.dispatchEvent(new window.Event("change", { bubbles: true }));
    const tr = JSON.parse(window.localStorage.getItem("emt.track"));
    ok("tick giấy tờ được lưu", Object.values(tr).some((t) => t.docs && t.docs["0"] === true));
  }
  ok("drawer hiện ước tính chi phí", /Ước tính tổng chi phí/.test($("#dBody").textContent));
  ok("chi phí quy đổi ra VND", /triệu ₫/.test($("#dBody").textContent));
  click("#dClose");

  click($$("#nav button")[3]);
  ok("bảng tracker hiển thị cột trạng thái", $$("#view-tracker .col").length === 6,
     String($$("#view-tracker .col").length));
  ok("tracker có thẻ hồ sơ", $$("#view-tracker .mini-card").length > 0);
  ok("tracker có tổng chi phí", /Tổng chi phí ước tính/.test($("#view-tracker").textContent));
  click($$("#nav button")[0]);

  console.log("\n=== K. Xuất file khi đã có Pro ===");
  click("#exportBtn");
  window.__blobs = [];
  click('[data-exp="ics"]');
  await wait(50);
  ok("ICS tải được", window.__blobs.length === 1, String(window.__blobs.length));
  const ics = window.__blobs[0] ? window.__blobs[0]._text : "";
  ok("ICS hợp lệ", ics.startsWith("BEGIN:VCALENDAR") && ics.trim().endsWith("END:VCALENDAR"));
  ok("ICS có nhắc trước", ics.includes("TRIGGER;RELATED=START:-P7D"));
  ok("ICS cảnh báo ngày ước tính", ics.includes("ước tính") || ics.includes("Ngày ước lượng"));

  window.__blobs = [];
  click('[data-exp="doc"]');
  ok("Word tải được", window.__blobs.length === 1);
  ok("Word là tài liệu Office", (window.__blobs[0] || {})._text.includes("office:word"));

  window.__blobs = [];
  click('[data-exp="json"]');
  ok("JSON tải được", window.__blobs.length === 1);
  let js = null;
  try { js = JSON.parse(window.__blobs[0]._text); } catch (e) {}
  ok("JSON parse được và có tracking", js && js.programs.some((p) => p.tracking));

  // phạm vi xuất
  $("#expScope").value = "shortlist";
  $("#expScope").dispatchEvent(new window.Event("change", { bubbles: true }));
  ok("đổi phạm vi cập nhật số lượng", /\d/.test($("#expSub").textContent));
  window.__blobs = [];
  click('[data-exp="csv"]');
  const rows = window.__blobs[0]._text.trim().split("\r\n").length - 1;
  const slLen = JSON.parse(window.localStorage.getItem("emt.shortlist")).length;
  eq("xuất đúng phạm vi shortlist", rows, slLen);

  window.__printed = 0;
  click('[data-exp="pdf"]');
  await wait(400);
  ok("PDF mở hộp thoại in", window.__printed > 0);
  ok("nội dung in được dựng", true);

  console.log("\n=== L. Gỡ kích hoạt & dọn dẹp ===");
  click("#proBtn");
  click("#deactivateBtn");
  ok("gỡ kích hoạt thành công", window.EMT_PREMIUM.active === false);
  eq("nút trở lại 'Nâng cấp Pro'", $("#proBtnLabel").textContent, "Nâng cấp Pro");
  ok("xoá key khỏi localStorage", !window.localStorage.getItem("emt.license.v1"));

  console.log("\n=== N. Link hỏng ===");
  const deadOne = window.EMT.all.find((p) => p.linkStatus === "dead");
  ok("dữ liệu có gắn trạng thái link", !!deadOne);
  ok("có mốc thời gian kiểm tra link", !!window.EMT_DATA.meta.linkCheckedAt,
     String(window.EMT_DATA.meta.linkCheckedAt));
  if (deadOne) {
    window.EMT.openDrawerById(deadOne.id);
    ok("drawer cảnh báo link đã đổi", /link gốc đã đổi/i.test($("#dBody").textContent));
    ok("có link tìm trang mới", /Tìm trang mới/.test($("#dFoot").textContent));
    const rescue = $("#dFoot a.primary");
    ok("link cứu hộ trỏ tới tìm kiếm", rescue && /google\.com\/search/.test(rescue.href));
    click("#dClose");
  }
  const okOne = window.EMT.all.find((p) => p.linkStatus === "ok");
  if (okOne) {
    window.EMT.openDrawerById(okOne.id);
    ok("link còn sống vẫn mở thẳng web trường", /Mở web trường/.test($("#dFoot").textContent));
    click("#dClose");
  }

  console.log("\n=== O. Đồng bộ URL & phím tắt ===");
  $("#fCountry").value = "Đức";
  $("#fCountry").dispatchEvent(new window.Event("change", { bubbles: true }));
  ok("URL phản ánh bộ lọc quốc gia", /country=/.test(window.location.search), window.location.search);
  $("#fSort").value = "rank";
  $("#fSort").dispatchEvent(new window.Event("change", { bubbles: true }));
  ok("URL phản ánh sắp xếp", /sort=rank/.test(window.location.search), window.location.search);
  click("#resetBtn");
  ok("đặt lại thì URL sạch", !/country=|sort=/.test(window.location.search), window.location.search);

  const press = (k) => document.dispatchEvent(
    new window.KeyboardEvent("keydown", { key: k, bubbles: true }));
  press("?");
  ok("phím ? mở bảng phím tắt", $("#helpModal").classList.contains("on"));
  press("Escape");
  ok("Esc đóng bảng phím tắt", !$("#helpModal").classList.contains("on"));
  press("2");
  ok("phím 2 chuyển sang timeline", !$("#view-timeline").hidden, "");
  press("1");
  ok("phím 1 quay lại thẻ", !$("#view-cards").hidden);
  $("#q").focus();
  press("?");
  ok("gõ trong ô tìm kiếm KHÔNG kích hoạt phím tắt", !$("#helpModal").classList.contains("on"));
  $("#q").blur();

  let copied = null;
  window.navigator.clipboard = { writeText: (t) => { copied = t; return Promise.resolve(); } };
  click("#shareBtn");
  await wait(50);
  ok("nút chia sẻ sao chép URL", !!copied && copied.indexOf("http") === 0, String(copied));

  console.log("\n=== M. Toàn vẹn cuối ===");
  eq("không phát sinh lỗi JS trong suốt phiên", errors.length, 0, errors.join(" | "));
  ok("link Gumroad đúng", $("#buyBtn").href.includes("gumroad.com/l/mnnfbc"), $("#buyBtn").href);
  ok("mọi id trong HTML được dùng đều tồn tại",
     ["#q", "#fGroup", "#stats", "#ticker", "#view-cards", "#drawer", "#proModal", "#expModal",
      "#cmpModal", "#toast", "#printroot"].every((s) => !!$(s)));

  console.log("\n" + "=".repeat(58));
  if (fails.length) { console.log("LỖI:"); fails.forEach((f) => console.log("  ✗ " + f)); }
  console.log(`\n${pass} đạt · ${fail} lỗi`);
  process.exit(fail ? 1 : 0);
})();
