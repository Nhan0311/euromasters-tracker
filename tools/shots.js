/* ==========================================================================
   Chụp ảnh giao diện ở nhiều kích thước màn hình, có giả lập thiết bị thật.

   Chrome trên Windows ép cửa sổ rộng tối thiểu khoảng 500px, nên cờ
   --window-size không kiểm tra được màn hình điện thoại. Script này nói
   chuyện thẳng với Chrome DevTools Protocol để đặt đúng kích thước, tỉ lệ
   điểm ảnh và chế độ cảm ứng.

   Chạy:  node tools/shots.js [thư-mục-lưu]
   Cần:   Google Chrome hoặc Microsoft Edge, Node 22 trở lên (có WebSocket sẵn).
   ========================================================================== */
"use strict";

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const os = require("os");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.resolve(process.argv[2] || path.join(ROOT, "shots"));
const PORT = 9333;

/* Kích thước tiêu biểu cho từng nhóm thiết bị */
const DEVICES = [
  { name: "phone-small", w: 360, h: 780, dpr: 3, mobile: true },   // Android phổ thông
  { name: "phone", w: 390, h: 844, dpr: 3, mobile: true },         // iPhone 14/15
  { name: "phone-max", w: 430, h: 932, dpr: 3, mobile: true },     // iPhone Pro Max
  { name: "tablet-portrait", w: 820, h: 1180, dpr: 2, mobile: true },  // iPad Air dọc
  { name: "tablet-landscape", w: 1180, h: 820, dpr: 2, mobile: true }, // iPad Air ngang
  { name: "laptop", w: 1440, h: 900, dpr: 1, mobile: false },
  { name: "desktop", w: 1920, h: 1080, dpr: 1, mobile: false },
  { name: "desktop-wide", w: 2560, h: 1200, dpr: 1, mobile: false }
];

const THEMES = ["dark", "light"];

function findBrowser() {
  const candidates = [
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "/usr/bin/google-chrome",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
  ];
  for (const c of candidates) if (fs.existsSync(c)) return c;
  throw new Error("Không tìm thấy Chrome hoặc Edge trên máy này.");
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url) {
  const res = await fetch(url);
  return res.json();
}

/* Bọc CDP cho gọn: gửi lệnh, chờ đúng id trả về */
function cdp(ws) {
  let id = 0;
  const waiting = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && waiting.has(msg.id)) {
      const { resolve, reject } = waiting.get(msg.id);
      waiting.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    }
  });
  return function send(method, params) {
    const n = ++id;
    return new Promise((resolve, reject) => {
      waiting.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params: params || {} }));
    });
  };
}

(async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), "emt-shots-"));

  const proc = spawn(findBrowser(), [
    "--headless=old", "--disable-gpu", "--hide-scrollbars",
    "--no-first-run", "--no-default-browser-check",
    "--remote-debugging-port=" + PORT,
    "--user-data-dir=" + profile,
    "about:blank"
  ], { stdio: "ignore" });

  let targets = null;
  for (let i = 0; i < 60 && !targets; i++) {
    await sleep(250);
    try { targets = await getJson(`http://127.0.0.1:${PORT}/json/list`); } catch (e) { /* chưa sẵn sàng */ }
  }
  if (!targets) { proc.kill(); throw new Error("Chrome không mở cổng gỡ lỗi."); }

  const page = targets.find((t) => t.type === "page") || targets[0];
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  const send = cdp(ws);

  await send("Page.enable");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });

  const url = "file:///" + path.join(ROOT, "index.html").replace(/\\/g, "/");

  for (const theme of THEMES) {
    for (const d of DEVICES) {
      await send("Emulation.setDeviceMetricsOverride", {
        width: d.w, height: d.h, deviceScaleFactor: 1,
        mobile: d.mobile, screenWidth: d.w, screenHeight: d.h
      });
      await send("Emulation.setTouchEmulationEnabled", { enabled: d.mobile, maxTouchPoints: d.mobile ? 5 : 1 });

      await send("Page.navigate", { url: url + "?theme=" + theme });
      await sleep(900);

      /* Đặt nền và tắt gợi ý lần đầu để ảnh chụp ổn định */
      await send("Runtime.evaluate", {
        expression: `document.documentElement.dataset.theme=${JSON.stringify(theme)};
                     localStorage.setItem("emt.seen","true");
                     document.getElementById("toast").classList.remove("on");`
      });
      await sleep(350);

      /* hai ảnh: khung nhìn đầu tiên (để soi bố cục) và toàn trang */
      const fold = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
      fs.writeFileSync(path.join(OUT, `${theme}-${d.name}-fold.png`), Buffer.from(fold.data, "base64"));

      const full = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: true });
      fs.writeFileSync(path.join(OUT, `${theme}-${d.name}-full.png`), Buffer.from(full.data, "base64"));

      /* Báo lại nếu trang bị tràn ngang: lỗi bố cục hay gặp nhất trên di động */
      const { result } = await send("Runtime.evaluate", {
        expression: `JSON.stringify({
          vw: document.documentElement.clientWidth,
          sw: document.documentElement.scrollWidth,
          over: [...document.querySelectorAll("body *")]
            .filter(e => {
              const cs = getComputedStyle(e);
              if (cs.position === "fixed" || cs.display === "none") return false;
              /* bỏ qua thứ nằm trong lớp phủ cố định: chúng nằm ngoài luồng trang */
              if (e.closest(".drawer, .modal, .compare-bar, .toast, .nav, .skip")) return false;
              /* bỏ qua thứ nằm trong vùng cuộn ngang có chủ đích (dải chip, bảng) */
              for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) {
                const ox = getComputedStyle(a).overflowX;
                if (ox === "auto" || ox === "scroll") return false;
              }
              const r = e.getBoundingClientRect();
              return r.width > 0 && r.right > document.documentElement.clientWidth + 1;
            })
            .slice(0, 5)
            .map(e => e.tagName.toLowerCase() + (e.id ? "#" + e.id : "") +
                 (typeof e.className === "string" && e.className ? "." + e.className.trim().split(/\\s+/)[0] : ""))
        })`,
        returnByValue: true
      });
      const r = JSON.parse(result.value);
      const bad = r.sw > r.vw + 1 || r.over.length;
      console.log(
        `${bad ? "TRÀN " : "ok   "} ${theme.padEnd(5)} ${d.name.padEnd(17)} ${d.w}x${d.h}` +
        (bad ? `  scrollW=${r.sw} vw=${r.vw}  ${r.over.join(", ")}` : "")
      );
    }
  }

  ws.close();
  proc.kill();
  console.log("\nẢnh đã lưu vào " + OUT);
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
