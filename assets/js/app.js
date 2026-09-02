/* ==========================================================================
   EuroMasters Deadline Tracker — app chính
   ========================================================================== */
(function () {
  "use strict";

  var CFG = window.EMT_CONFIG;
  var FLAGS = window.EMT_FLAGS || {};
  var ISO = window.EMT_ISO || {};
  var PRO = window.EMT_PREMIUM;
  var DATA = window.EMT_DATA || { meta: {}, programs: [] };
  var ALL = DATA.programs || [];

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ==================================================================== LS */
  function lsGet(k, dflt) {
    try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : dflt; }
    catch (e) { return dflt; }
  }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  var shortlist = lsGet("emt.shortlist", []);
  var track = lsGet("emt.track", {});
  var compare = [];

  /* =============================================================== helpers */
  function noAccent(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "")
      .replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase();
  }
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function fmtNum(n) { return n == null ? "—" : Number(n).toLocaleString("vi-VN"); }
  function fmtEur(n) { return n == null ? "—" : "€" + Number(n).toLocaleString("vi-VN"); }

  var MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];

  function fmtDate(d) {
    if (!d) return "—";
    return ("0" + d.getDate()).slice(-2) + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
  }
  function daysLeft(d) {
    if (!d) return null;
    var now = new Date();
    var a = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    var b = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return Math.round((a - b) / 86400000);
  }

  /* ------------------------------------------------- tính hạn kế tiếp ---- */
  var dlCache = {}, dlCacheDay = "";
  function todayKey() {
    var n = new Date();
    return n.getFullYear() + "-" + n.getMonth() + "-" + n.getDate();
  }

  function occurrences(dl) {
    if (!dl || !dl.dates || !dl.dates.length) return [];
    var now = new Date();
    var out = [];
    function annual(m, d) {
      var y = now.getFullYear();
      var dt = new Date(y, m - 1, d, 23, 59, 59);
      if (dt < now) dt = new Date(y + 1, m - 1, d, 23, 59, 59);
      return dt;
    }
    dl.dates.forEach(function (x) {
      var approx = dl.type === "month";
      if (!x.y) {
        // không có năm → mặc định lặp lại hằng năm
        out.push({ date: annual(x.m, x.d), exact: !approx, past: false, approx: approx });
        return;
      }
      var dt = new Date(x.y, x.m - 1, x.d, 23, 59, 59);
      if (dt >= now) {
        out.push({ date: dt, exact: true, past: false, approx: approx });
        return;
      }
      // ngày ghi rõ năm nhưng đã trôi qua
      out.push({ date: dt, exact: true, past: true, approx: approx });
      // → ước tính đợt kế tiếp: cùng ngày/tháng của chu kỳ sau
      out.push({ date: annual(x.m, x.d), exact: false, past: false, approx: true, rolled: true, prev: dt });
    });
    out.sort(function (a, b) { return a.date - b.date; });
    return out;
  }

  function nextDeadline(p) {
    var k = todayKey();
    if (dlCacheDay !== k) { dlCache = {}; dlCacheDay = k; }
    if (dlCache[p.id] !== undefined) return dlCache[p.id];
    var occ = occurrences(p.deadline);
    var pick = null;
    for (var i = 0; i < occ.length; i++) { if (!occ[i].past) { pick = occ[i]; break; } }
    if (!pick && occ.length) pick = occ[occ.length - 1];
    dlCache[p.id] = pick;
    return pick;
  }

  function statusOf(p) {
    var nx = nextDeadline(p);
    if (!nx) {
      return p.deadline && p.deadline.type === "rolling"
        ? { cls: "s-ok", label: "Nhận hồ sơ quanh năm", sub: "Xét theo đợt / rolling", days: null }
        : { cls: "s-dead", label: "Chưa rõ ngày", sub: "Theo dõi web trường", days: null };
    }
    var d = daysLeft(nx.date);
    var cls = d < 0 ? "s-dead" : d <= 7 ? "s-hot" : d <= 30 ? "s-warn" : d <= 90 ? "s-soon" : "s-ok";
    return { cls: cls, days: d, date: nx.date, exact: nx.exact, approx: nx.approx, rolled: nx.rolled, prev: nx.prev };
  }

  function flagOf(c) { return FLAGS[c] || "🇪🇺"; }

  /* =============================================================== filters */
  var S = {
    q: "", group: "", country: "", lang: "", win: "", sort: "deadline",
    flags: {}, view: lsGet("emt.view", "cards"), tableSort: { k: "deadline", dir: 1 }
  };

  function matches(p) {
    if (S.q) {
      var hay = noAccent([p.school, p.program, p.city, p.country, p.field, p.group, p.notes, p.rankText].join(" "));
      var terms = noAccent(S.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    if (S.group && p.group !== S.group) return false;
    if (S.country && p.country !== S.country) return false;
    if (S.lang && p.mainLanguage !== S.lang) return false;
    if (S.flags.scholarship && !p.hasScholarship) return false;
    if (S.flags.english && !/tiếng anh/i.test(p.language || "")) return false;
    if (S.flags.shortlist && shortlist.indexOf(p.id) === -1) return false;
    if (S.flags.cheap && !(p.tuitionEur != null && p.tuitionEur <= 5000)) return false;
    if (S.flags.top50 && !(p.rank != null && p.rank <= 50)) return false;
    if (S.flags.dated) {
      var t = p.deadline && p.deadline.type;
      if (t !== "fixed" && t !== "window") return false;
    }
    if (S.win) {
      var st = statusOf(p);
      if (st.days == null || st.days < 0 || st.days > Number(S.win)) return false;
    }
    return true;
  }

  function sortList(list, key) {
    var k = key || S.sort;
    var arr = list.slice();
    var cmp = {
      deadline: function (a, b) {
        var da = statusOf(a).days, db = statusOf(b).days;
        var va = da == null || da < 0 ? 1e9 + (da == null ? 1 : 0) : da;
        var vb = db == null || db < 0 ? 1e9 + (db == null ? 1 : 0) : db;
        return va - vb || (a.rank || 999) - (b.rank || 999);
      },
      rank: function (a, b) { return (a.rank == null ? 9999 : a.rank) - (b.rank == null ? 9999 : b.rank); },
      tuitionAsc: function (a, b) { return (a.tuitionEur == null ? 1e9 : a.tuitionEur) - (b.tuitionEur == null ? 1e9 : b.tuitionEur); },
      tuitionDesc: function (a, b) { return (b.tuitionEur == null ? -1 : b.tuitionEur) - (a.tuitionEur == null ? -1 : a.tuitionEur); },
      school: function (a, b) { return (a.school || "").localeCompare(b.school || "", "vi"); },
      country: function (a, b) { return (a.country || "").localeCompare(b.country || "", "vi") || (a.rank || 999) - (b.rank || 999); }
    }[k] || cmp_deadline;
    function cmp_deadline() { return 0; }
    arr.sort(cmp);
    return arr;
  }

  function filtered() { return sortList(ALL.filter(matches)); }

  /* ================================================================= toast */
  var toastT;
  function toast(msg) {
    var el = $("#toast");
    el.textContent = msg;
    el.classList.add("on");
    clearTimeout(toastT);
    toastT = setTimeout(function () { el.classList.remove("on"); }, 3200);
  }

  /* ============================================================ shortlist */
  function isSaved(id) { return shortlist.indexOf(id) !== -1; }
  function toggleSave(id) {
    var i = shortlist.indexOf(id);
    if (i !== -1) { shortlist.splice(i, 1); }
    else {
      if (!PRO.active && shortlist.length >= CFG.FREE_SHORTLIST_MAX) {
        openPro("Danh sách không giới hạn");
        toast("Bản miễn phí lưu tối đa " + CFG.FREE_SHORTLIST_MAX + " trường.");
        return false;
      }
      shortlist.push(id);
    }
    lsSet("emt.shortlist", shortlist);
    return true;
  }

  /* ============================================================== tracker */
  function getTrack(id) { return track[id] || null; }
  function setTrack(id, patch) {
    track[id] = Object.assign({ status: "interested", notes: "", docs: {} }, track[id] || {}, patch);
    lsSet("emt.track", track);
  }
  function statusLabel(k) {
    var s = CFG.STATUSES.filter(function (x) { return x.k === k; })[0];
    return s ? s.t : k;
  }
  function statusColor(k) {
    var s = CFG.STATUSES.filter(function (x) { return x.k === k; })[0];
    return s ? s.c : "#64748b";
  }

  /* =========================================================== chi phí */
  function costOf(p) {
    var months = p.months || 24;
    var years = months / 12;
    var tuition = p.tuitionEur == null ? null : p.tuitionEur * years;
    var living = p.livingEur == null ? null : p.livingEur * months;
    if (tuition == null && living == null) return null;
    var total = (tuition || 0) + (living || 0);
    return { months: months, years: years, tuition: tuition, living: living, total: total };
  }

  /* ================================================================ links */
  function domainOf(url) {
    try { return new URL(url).hostname.replace(/^www\./, ""); } catch (e) { return ""; }
  }
  function gs(q) { return "https://www.google.com/search?q=" + encodeURIComponent(q); }

  function linksFor(p) {
    var dom = domainOf(p.link);
    var site = dom ? "site:" + dom + " " : "";
    var out = [];
    if (p.link) out.push({ ic: "🎓", t: "Trang chương trình chính thức", s: dom || p.link, u: p.link });
    out.push({ ic: "📄", t: "Hướng dẫn nộp hồ sơ / Admissions", s: "Tìm trên website trường", u: gs(site + "master admission how to apply") });
    out.push({ ic: "💶", t: "Bảng học phí & lệ phí", s: "Tuition fees " + (p.country || ""), u: gs(site + "tuition fees master international") });
    out.push({ ic: "🏅", t: "Học bổng của trường", s: "Scholarships & funding", u: gs(site + "scholarship master international student") });
    out.push({ ic: "📐", t: "Yêu cầu portfolio / hồ sơ năng lực", s: "Entry requirements", u: gs(p.school + " " + p.program + " entry requirements portfolio") });
    out.push({ ic: "📕", t: "Brochure / Programme guide (PDF)", s: "Tài liệu chính thức dạng PDF", u: gs(p.school + " " + p.program + " brochure OR handbook filetype:pdf") });
    out.push({ ic: "🗺️", t: "Vị trí trên bản đồ", s: [p.city, ISO[p.country] || p.country].filter(Boolean).join(", "), u: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.school + " " + (p.city || "") + " " + (ISO[p.country] || p.country || "")) });
    out.push({ ic: "📊", t: "Hồ sơ trường trên QS", s: "topuniversities.com", u: gs("site:topuniversities.com " + p.school) });
    out.push({ ic: "💬", t: "Review từ du học sinh Việt", s: "Kinh nghiệm thực tế", u: gs('"' + p.school + '" du học sinh Việt Nam kinh nghiệm') });
    return out;
  }

  /* ================================================================ stats */
  function renderStats() {
    var withDate = ALL.filter(function (p) { var s = statusOf(p); return s.days != null && s.days >= 0; });
    var d30 = withDate.filter(function (p) { return statusOf(p).days <= 30; }).length;
    var d90 = withDate.filter(function (p) { return statusOf(p).days <= 90; }).length;
    var sch = ALL.filter(function (p) { return p.hasScholarship; }).length;
    var items = [
      { n: ALL.length, l: "Chương trình" },
      { n: (DATA.meta.countries || []).length, l: "Quốc gia" },
      { n: d30, l: "Hạn trong 30 ngày" },
      { n: d90, l: "Hạn trong 90 ngày" },
      { n: sch, l: "Có học bổng" }
    ];
    $("#stats").innerHTML = items.map(function (x) {
      return '<div class="stat"><b data-to="' + x.n + '">0</b><span>' + esc(x.l) + "</span></div>";
    }).join("");
    countUp();
  }

  function countUp() {
    $$("#stats b[data-to]").forEach(function (el) {
      var to = Number(el.dataset.to) || 0, t0 = performance.now(), dur = 900;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.textContent = fmtNum(to); return; }
      function step(t) {
        var k = Math.min(1, (t - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmtNum(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step);
      }
      requestAnimationFrame(step);
    });
  }

  /* =============================================================== ticker */
  var tickerP = null, tickerTimer = null;
  function renderTicker() {
    var pool = ALL.filter(function (p) { var s = statusOf(p); return s.days != null && s.days >= 0; });
    pool = sortList(pool, "deadline");
    tickerP = pool[0] || null;
    var el = $("#ticker");
    if (!tickerP) { el.hidden = true; return; }
    el.hidden = false;
    el.innerHTML =
      '<span class="lbl">⏱ Hạn gần nhất</span>' +
      '<span class="school">' + flagOf(tickerP.country) + " " + esc(tickerP.school) + "</span>" +
      '<span style="color:var(--muted);font-size:12.5px">' + esc(tickerP.program) + "</span>" +
      '<span class="cd" id="cdBox"></span>';
    tickTicker();
    clearInterval(tickerTimer);
    tickerTimer = setInterval(tickTicker, 1000);
  }

  function tickTicker() {
    if (!tickerP) return;
    var box = $("#cdBox");
    if (!box) return;
    var nx = nextDeadline(tickerP);
    if (!nx) return;
    var ms = nx.date - new Date();
    if (ms < 0) ms = 0;
    var d = Math.floor(ms / 86400000);
    var h = Math.floor(ms / 3600000) % 24;
    var m = Math.floor(ms / 60000) % 60;
    var s = Math.floor(ms / 1000) % 60;
    var units = [[d, "ngày"], [h, "giờ"], [m, "phút"], [s, "giây"]];
    box.innerHTML = units.map(function (u) {
      return '<span class="cd-unit"><b>' + ("0" + u[0]).slice(-2) + "</b><span>" + u[1] + "</span></span>";
    }).join("");
  }

  /* ================================================================ cards */
  var io = null;
  function observe(el) {
    if (!io) {
      io = new IntersectionObserver(function (ents) {
        ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
      }, { rootMargin: "80px" });
    }
    io.observe(el);
  }

  function cdBadge(p) {
    var st = statusOf(p);
    if (st.days == null) {
      return '<div class="cdbadge ' + st.cls + '"><span class="days" style="font-size:13.5px">' + esc(st.label) +
        '</span><span class="when">' + esc(st.sub) + "</span></div>";
    }
    var txt = st.days < 0 ? "Đã đóng" : st.days === 0 ? "Hôm nay!" : fmtNum(st.days) + "<small>ngày</small>";
    var note = st.rolled ? "<em>ước tính đợt sau</em>"
      : st.approx ? "<em>ngày ước lượng</em>"
      : st.exact ? "" : "<em>lặp hằng năm</em>";
    return '<div class="cdbadge ' + st.cls + '">' +
      '<span class="days">' + txt + "</span>" +
      '<span class="when">' + fmtDate(st.date) + note +
      "</span></div>";
  }

  function cardHTML(p) {
    var saved = isSaved(p.id), cmp = compare.indexOf(p.id) !== -1;
    var tr = getTrack(p.id);
    return '<article class="card" data-id="' + p.id + '" role="listitem" tabindex="0">' +
      '<div class="top">' +
        '<span class="flag">' + flagOf(p.country) + "</span>" +
        '<div style="flex:1;min-width:0">' +
          "<h3>" + esc(p.program) + "</h3>" +
          '<div class="school">' + esc(p.school) + "</div>" +
        "</div>" +
        (p.rank ? '<span class="rank">#' + p.rank + "</span>" : "") +
      "</div>" +
      '<div class="where">📍 ' + esc(p.city || "—") + ", " + esc(p.country) + "</div>" +
      cdBadge(p) +
      '<div class="meta">' +
        (p.duration ? '<span class="tag">⏳ ' + esc(p.duration) + "</span>" : "") +
        (p.mainLanguage ? '<span class="tag">🗣 ' + esc(p.mainLanguage) + "</span>" : "") +
        (p.tuitionEur != null ? '<span class="tag">💶 ~' + fmtEur(p.tuitionEur) + "/năm</span>" : "") +
        (p.hasScholarship ? '<span class="tag sch">🎓 Học bổng</span>' : "") +
        (tr && tr.status ? '<span class="tag" style="color:' + statusColor(tr.status) + ';border-color:' + statusColor(tr.status) + '55">● ' + esc(statusLabel(tr.status)) + "</span>" : "") +
      "</div>" +
      '<div class="act" data-stop="1">' +
        '<button class="iconbtn save' + (saved ? " on" : "") + '" data-act="save" title="Lưu vào danh sách">' + (saved ? "★" : "☆") + "</button>" +
        '<button class="iconbtn cmp' + (cmp ? " on cmp" : "") + '" data-act="cmp" title="Thêm vào so sánh">⚖</button>' +
        (p.link ? '<a class="iconbtn" href="' + esc(p.link) + '" target="_blank" rel="noopener" data-act="link" title="Mở web trường">↗</a>' : "") +
        '<span style="flex:1"></span>' +
        '<button class="btn xs ghost" data-act="detail">Chi tiết →</button>' +
      "</div>" +
    "</article>";
  }

  function renderCards(list) {
    var box = $("#view-cards");
    if (!list.length) { box.innerHTML = emptyHTML(); return; }
    box.innerHTML = list.slice(0, renderLimit).map(cardHTML).join("") +
      (list.length > renderLimit
        ? '<div style="grid-column:1/-1;text-align:center;padding:18px"><button class="btn" id="moreBtn">Xem thêm ' +
          Math.min(60, list.length - renderLimit) + " chương trình (còn " + fmtNum(list.length - renderLimit) + ")</button></div>"
        : "");
    $$(".card", box).forEach(observe);
    bindCardMotion(box);
  }

  var renderLimit = 60;

  function emptyHTML() {
    return '<div class="empty" style="grid-column:1/-1"><div class="big">🔍</div>' +
      "<h3>Không tìm thấy chương trình phù hợp</h3>" +
      "<p>Thử bỏ bớt bộ lọc hoặc đổi từ khoá tìm kiếm.</p>" +
      '<button class="btn" onclick="document.getElementById(\'resetBtn\').click()">↺ Đặt lại bộ lọc</button></div>';
  }

  /* ============================================================= timeline */
  function renderTimeline(list) {
    var box = $("#view-timeline");
    var dated = [], undated = [];
    list.forEach(function (p) {
      var s = statusOf(p);
      if (s.days != null && s.days >= 0) dated.push(p); else undated.push(p);
    });
    dated = sortList(dated, "deadline");

    if (!dated.length && !undated.length) { box.innerHTML = emptyHTML(); return; }

    var groups = {}, order = [];
    dated.forEach(function (p) {
      var d = statusOf(p).date;
      var k = d.getFullYear() + "-" + d.getMonth();
      if (!groups[k]) { groups[k] = []; order.push(k); }
      groups[k].push(p);
    });

    var html = order.map(function (k) {
      var parts = k.split("-");
      var items = groups[k];
      return '<div class="tl-month">' +
        '<div class="tl-head"><h3>' + MONTHS[+parts[1]] + " " + parts[0] + '</h3><span class="n">' + items.length + " chương trình</span></div>" +
        '<div class="tl-items">' + items.map(function (p) {
          var st = statusOf(p);
          return '<div class="tl-item ' + st.cls + '" data-id="' + p.id + '">' +
            '<div class="tl-date"><b>' + st.date.getDate() + "</b><span>" + MONTHS[st.date.getMonth()].replace("Tháng ", "Th") + "</span></div>" +
            '<div class="tl-body"><b>' + flagOf(p.country) + " " + esc(p.school) + "</b><span>" + esc(p.program) + "</span></div>" +
            '<div class="tl-left">' + (st.days === 0 ? "Hôm nay" : "còn " + fmtNum(st.days) + " ngày") + "</div>" +
          "</div>";
        }).join("") + "</div></div>";
    }).join("");

    if (undated.length) {
      html += '<div class="tl-month"><div class="tl-head"><h3>Chưa có ngày cụ thể</h3>' +
        '<span class="n">' + undated.length + " chương trình</span></div><div class=\"tl-items\">" +
        undated.map(function (p) {
          var st = statusOf(p);
          return '<div class="tl-item s-dead" data-id="' + p.id + '">' +
            '<div class="tl-date"><b>?</b><span>—</span></div>' +
            '<div class="tl-body"><b>' + flagOf(p.country) + " " + esc(p.school) + "</b><span>" + esc(p.program) + "</span></div>" +
            '<div class="tl-left">' + esc(st.label || "Xem web trường") + "</div></div>";
        }).join("") + "</div></div>";
    }

    box.innerHTML = html;
    $$(".tl-month", box).forEach(observe);
  }

  /* ================================================================ table */
  var COLS = [
    { k: "rank", t: "QS", w: 60 },
    { k: "school", t: "Trường" },
    { k: "program", t: "Chương trình" },
    { k: "country", t: "Quốc gia" },
    { k: "deadline", t: "Hạn kế tiếp" },
    { k: "days", t: "Còn lại" },
    { k: "tuition", t: "Học phí ~/năm" },
    { k: "lang", t: "Ngôn ngữ" },
    { k: "sch", t: "HB" }
  ];

  function renderTable(list) {
    var head = $("#tblHead"), body = $("#tblBody");
    head.innerHTML = COLS.map(function (c) {
      var on = S.tableSort.k === c.k;
      return "<th data-k=\"" + c.k + "\">" + esc(c.t) +
        '<span class="ar">' + (on ? (S.tableSort.dir > 0 ? "▲" : "▼") : "↕") + "</span></th>";
    }).join("");

    var arr = list.slice();
    var k = S.tableSort.k, dir = S.tableSort.dir;
    arr.sort(function (a, b) {
      var va, vb;
      switch (k) {
        case "rank": va = a.rank == null ? 9999 : a.rank; vb = b.rank == null ? 9999 : b.rank; break;
        case "days": case "deadline":
          va = statusOf(a).days; vb = statusOf(b).days;
          va = va == null || va < 0 ? 1e9 : va; vb = vb == null || vb < 0 ? 1e9 : vb; break;
        case "tuition": va = a.tuitionEur == null ? 1e9 : a.tuitionEur; vb = b.tuitionEur == null ? 1e9 : b.tuitionEur; break;
        case "sch": va = a.hasScholarship ? 0 : 1; vb = b.hasScholarship ? 0 : 1; break;
        case "lang": va = a.mainLanguage || ""; vb = b.mainLanguage || ""; break;
        default: va = a[k] || ""; vb = b[k] || "";
      }
      if (typeof va === "string") return va.localeCompare(vb, "vi") * dir;
      return (va - vb) * dir;
    });

    body.innerHTML = arr.slice(0, 300).map(function (p) {
      var st = statusOf(p);
      return '<tr data-id="' + p.id + '">' +
        "<td class=\"nowrap\">" + (p.rank ? "<b>#" + p.rank + "</b>" : "—") + "</td>" +
        "<td><b>" + flagOf(p.country) + " " + esc(p.school) + '</b><div class="mini">' + esc(p.city) + "</div></td>" +
        "<td>" + esc(p.program) + '<div class="mini">' + esc(p.field) + "</div></td>" +
        '<td class="nowrap">' + esc(p.country) + "</td>" +
        '<td class="nowrap">' + (st.days == null ? "—" : fmtDate(st.date)) + "</td>" +
        '<td class="nowrap"><span style="color:var(--c);font-weight:750" class="' + st.cls + '">' +
          (st.days == null ? esc(st.label) : st.days < 0 ? "Đã đóng" : fmtNum(st.days) + " ngày") + "</span></td>" +
        '<td class="nowrap">' + (p.tuitionEur == null ? "—" : "~" + fmtEur(p.tuitionEur)) + "</td>" +
        "<td>" + esc(p.mainLanguage || "—") + "</td>" +
        '<td>' + (p.hasScholarship ? "🎓" : "—") + "</td>" +
      "</tr>";
    }).join("") || '<tr><td colspan="9" style="text-align:center;padding:34px;color:var(--muted)">Không có kết quả</td></tr>';

    if (arr.length > 300) {
      body.insertAdjacentHTML("beforeend",
        '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:14px">Hiển thị 300/' +
        fmtNum(arr.length) + " dòng — thu hẹp bộ lọc hoặc xuất file Excel để xem đầy đủ.</td></tr>");
    }
  }

  /* ============================================================== tracker */
  function renderTracker() {
    var box = $("#view-tracker");
    var ids = Object.keys(track).map(Number);
    if (!PRO.active) {
      box.innerHTML = proTeaseHTML(
        "Bảng theo dõi hồ sơ",
        "Sắp xếp mọi trường bạn đang nhắm theo trạng thái Quan tâm → Đang chuẩn bị → Đã nộp → Phỏng vấn → Kết quả, " +
        "kèm checklist 10 loại giấy tờ và ghi chú riêng cho từng trường.");
      return;
    }
    if (!ids.length) {
      box.innerHTML = '<div class="empty"><div class="big">🗂️</div><h3>Chưa theo dõi hồ sơ nào</h3>' +
        "<p>Mở chi tiết một chương trình rồi chọn trạng thái để đưa vào bảng theo dõi.</p></div>";
      return;
    }
    var tot = { tuition: 0, living: 0, n: 0 };
    ids.forEach(function (id) {
      var p = byId(id); if (!p) return;
      var c = costOf(p); if (!c) return;
      tot.tuition += c.tuition || 0; tot.living += c.living || 0; tot.n++;
    });

    var cols = CFG.STATUSES.map(function (s) {
      var items = ids.map(byId).filter(function (p) { return p && (track[p.id].status || "interested") === s.k; });
      return '<div class="col"><h4><span style="width:8px;height:8px;border-radius:50%;background:' + s.c + ';display:inline-block"></span>' +
        esc(s.t) + '<span class="n">' + items.length + "</span></h4>" +
        items.map(function (p) {
          var st = statusOf(p);
          var tr = track[p.id];
          var done = tr.docs ? Object.keys(tr.docs).filter(function (k) { return tr.docs[k]; }).length : 0;
          return '<div class="mini-card" data-id="' + p.id + '"><b>' + flagOf(p.country) + " " + esc(p.school) + "</b>" +
            "<span>" + esc(p.program) + "</span>" +
            '<div style="margin-top:7px;display:flex;gap:8px;align-items:center">' +
              '<div class="progbar" style="flex:1"><i style="width:' + Math.round(done / CFG.DOCS.length * 100) + '%"></i></div>' +
              '<span style="font-size:10.5px;color:var(--muted)">' + done + "/" + CFG.DOCS.length + "</span>" +
            "</div>" +
            '<div style="margin-top:5px;font-size:11px" class="' + st.cls + '"><span style="color:var(--c);font-weight:700">' +
              (st.days == null ? esc(st.label) : st.days < 0 ? "Đã đóng" : "còn " + fmtNum(st.days) + " ngày") + "</span></div>" +
          "</div>";
        }).join("") + "</div>";
    }).join("");

    box.innerHTML =
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
        '<div class="stat" style="flex:1;min-width:230px"><b>' + fmtEur(Math.round(tot.tuition + tot.living)) +
        '</b><span>Tổng chi phí ước tính · ' + tot.n + " trường</span></div>" +
        '<div class="stat" style="flex:1;min-width:230px"><b>' + fmtNum(Math.round((tot.tuition + tot.living) * CFG.VND_PER_EUR / 1e6)) +
        ' triệu ₫</b><span>Quy đổi (' + fmtNum(CFG.VND_PER_EUR) + " ₫/€)</span></div>" +
        '<button class="btn" id="trackExport">⬇ Xuất bảng theo dõi</button>' +
      "</div>" +
      '<div class="board">' + cols + "</div>";

    $("#trackExport").addEventListener("click", function () { openExport("tracker"); });
    $$(".mini-card", box).forEach(function (el) {
      el.addEventListener("click", function () { openDrawer(byId(+el.dataset.id)); });
    });
  }

  function proTeaseHTML(title, body) {
    return '<div class="empty"><div class="big">🔒</div><h3>' + esc(title) + " — tính năng Pro</h3>" +
      '<p style="max-width:56ch;margin:0 auto 18px">' + esc(body) + "</p>" +
      '<button class="btn gold" onclick="document.getElementById(\'proBtn\').click()">✦ Mở khoá EuroMasters Pro</button></div>';
  }

  function byId(id) {
    for (var i = 0; i < ALL.length; i++) if (ALL[i].id === +id) return ALL[i];
    return null;
  }

  /* =============================================================== render */
  var lastCount = 0;

  function updateResultLine(n) {
    if (n != null) lastCount = n;
    $("#resultLine").innerHTML =
      "<b>" + fmtNum(lastCount) + "</b> chương trình khớp bộ lọc" +
      (shortlist.length ? ' · <b>★ ' + shortlist.length + "</b> đã lưu" : "") +
      (Object.keys(track).length ? " · <b>🗂 " + Object.keys(track).length + "</b> đang theo dõi" : "") +
      ' · <span>múi giờ ' + (Intl.DateTimeFormat().resolvedOptions().timeZone || "địa phương") + "</span>";
  }

  /* Cập nhật nút ★ tại chỗ — tránh render lại cả lưới (gây nháy + mất hiệu ứng) */
  function refreshSaveState(id) {
    var on = isSaved(id);
    $$('[data-id="' + id + '"] [data-act="save"]').forEach(function (b) {
      b.classList.toggle("on", on);
      b.textContent = on ? "★" : "☆";
    });
    updateResultLine();
  }

  function render() {
    var list = filtered();
    updateResultLine(list.length);

    ["cards", "timeline", "table", "tracker"].forEach(function (v) {
      $("#view-" + v).hidden = S.view !== v;
    });
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === S.view); });

    if (S.view === "cards") renderCards(list);
    else if (S.view === "timeline") renderTimeline(list);
    else if (S.view === "table") renderTable(list);
    else renderTracker();

    updateCompareBar();
  }

  /* =============================================================== drawer */
  var current = null;

  function kv(k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + esc(v) + "</dd>" : ""; }

  function openDrawer(p) {
    if (!p) return;
    current = p;
    var st = statusOf(p);
    var c = costOf(p);
    var tr = getTrack(p.id);

    $("#dTitle").textContent = p.program;
    $("#dSub").innerHTML = flagOf(p.country) + " <b>" + esc(p.school) + "</b> — " + esc(p.city || "") + ", " + esc(p.country) +
      (p.rankText ? ' <span style="color:var(--muted)">· ' + esc(p.rankText) + "</span>" : "");

    var html = "";

    /* countdown */
    html += '<div class="dsec">' + cdBadge(p) +
      (st.rolled
        ? '<div style="font-size:12.4px;color:var(--warn);margin-top:8px">⚠ Đợt tuyển sinh ghi trong nguồn (' +
          fmtDate(st.prev) + ") đã khép lại. Ngày trên là <b>ước tính cho đợt kế tiếp</b> (cùng kỳ năm sau) — " +
          "hãy xác nhận lại trên trang trường.</div>"
        : "") +
      (st.approx && !st.rolled
        ? '<div style="font-size:12.4px;color:var(--muted);margin-top:8px">⚠ Nguồn chỉ nêu tháng, chưa nêu ngày — app lấy ngày cuối tháng làm mốc tạm.</div>'
        : "") +
      '<div style="font-size:12.4px;color:var(--muted);margin-top:8px">Nguyên văn từ nguồn: “' + esc(p.deadlineRaw || "—") + "”</div></div>";

    /* facts */
    html += '<div class="dsec"><h4>Thông tin chính</h4><dl class="kv">' +
      kv("Nhóm ngành", p.group) + kv("Ngành cụ thể", p.field) +
      kv("Xếp hạng QS", p.rankText) + kv("Thời gian học", p.duration) +
      kv("Ngôn ngữ giảng dạy", p.language) +
      kv("Học phí", p.tuitionRaw) + kv("Chi phí sinh hoạt", p.livingRaw) +
      "</dl></div>";

    /* cost calculator (Pro) */
    if (c) {
      if (PRO.active) {
        html += '<div class="dsec"><h4>Ước tính tổng chi phí <span class="pro-badge">PRO</span></h4>' +
          '<dl class="kv">' +
          kv("Thời lượng", (c.months) + " tháng (~" + c.years.toFixed(1) + " năm)") +
          (c.tuition != null ? "<dt>Học phí toàn khoá</dt><dd>" + fmtEur(Math.round(c.tuition)) + "</dd>" : "") +
          (c.living != null ? "<dt>Sinh hoạt phí</dt><dd>" + fmtEur(Math.round(c.living)) + "</dd>" : "") +
          "<dt><b>Tổng cộng</b></dt><dd><b>" + fmtEur(Math.round(c.total)) + "</b> ≈ " +
            fmtNum(Math.round(c.total * CFG.VND_PER_EUR / 1e6)) + " triệu ₫</dd>" +
          "</dl><div style='font-size:11.5px;color:var(--muted);margin-top:8px'>Lấy mức thấp nhất tìm được trong mô tả học phí/sinh hoạt phí; chỉ mang tính tham khảo.</div></div>";
      } else {
        html += '<div class="dsec"><h4>Ước tính tổng chi phí</h4>' +
          '<div class="linkrow" style="cursor:pointer" data-pro="Máy tính chi phí du học">' +
          '<span class="ic">🔒</span><div><b>Mở khoá để xem tổng chi phí toàn khoá</b>' +
          "<small>Học phí × số năm + sinh hoạt phí × số tháng, quy đổi sang VND</small></div>" +
          '<span class="go">→</span></div></div>';
      }
    }

    /* description */
    if (p.desc) html += '<div class="dsec"><h4>Giới thiệu</h4><div class="prose">' + esc(p.desc) + "</div></div>";

    /* scholarship */
    if (p.scholarshipSchool || p.scholarshipOther) {
      html += '<div class="dsec"><h4>Học bổng</h4><dl class="kv">' +
        kv("Của trường", p.scholarshipSchool) + kv("Nguồn khác", p.scholarshipOther) + "</dl>";
      if (p.scholarshipDeadline && p.scholarshipDeadline.dates.length) {
        var sd = occurrences(p.scholarshipDeadline)[0];
        if (sd) html += '<div style="margin-top:8px;font-size:12.5px;color:var(--warn)">📌 Hạn học bổng phát hiện trong mô tả: <b>' +
          fmtDate(sd.date) + "</b> (còn " + fmtNum(daysLeft(sd.date)) + " ngày)</div>";
      }
      html += "</div>";
    }

    if (p.requirements) html += '<div class="dsec"><h4>Yêu cầu đầu vào</h4><div class="prose">' + esc(p.requirements) + "</div></div>";
    if (p.notes) html += '<div class="dsec"><h4>Ghi chú nguồn</h4><div class="prose">' + esc(p.notes) + "</div></div>";

    /* links */
    html += '<div class="dsec"><h4>Tài liệu &amp; liên kết từ trường</h4><div class="linklist">' +
      linksFor(p).map(function (l) {
        return '<a class="linkrow" href="' + esc(l.u) + '" target="_blank" rel="noopener">' +
          '<span class="ic">' + l.ic + "</span><div><b>" + esc(l.t) + "</b><small>" + esc(l.s) + "</small></div>" +
          '<span class="go">↗</span></a>';
      }).join("") + "</div></div>";

    /* tracker */
    html += '<div class="dsec"><h4>Hồ sơ của tôi ' + (PRO.active ? "" : '<span class="pro-badge">PRO</span>') + "</h4>";
    if (PRO.active) {
      html += '<div class="statusrow" style="margin-bottom:12px">' +
        CFG.STATUSES.map(function (s) {
          var on = tr && tr.status === s.k;
          return '<button class="chip st' + (on ? " on" : "") + '" data-status="' + s.k + '" style="--st:' + s.c + (on ? ";border-color:transparent;color:#fff" : "") + '">' + esc(s.t) + "</button>";
        }).join("") +
        (tr ? '<button class="chip" data-status="__clear" style="margin-left:auto">✕ Bỏ theo dõi</button>' : "") +
        "</div>";

      var done = tr && tr.docs ? Object.keys(tr.docs).filter(function (k) { return tr.docs[k]; }).length : 0;
      html += '<div style="display:flex;gap:9px;align-items:center;margin-bottom:9px">' +
        '<div class="progbar" style="flex:1"><i style="width:' + Math.round(done / CFG.DOCS.length * 100) + '%"></i></div>' +
        '<span style="font-size:11.5px;color:var(--muted);white-space:nowrap">' + done + "/" + CFG.DOCS.length + " giấy tờ</span></div>";

      html += '<div class="checklist">' + CFG.DOCS.map(function (d, i) {
        var ck = tr && tr.docs && tr.docs[i];
        return '<label class="chk' + (ck ? " done" : "") + '"><input type="checkbox" data-doc="' + i + '"' + (ck ? " checked" : "") + "> " + esc(d) + "</label>";
      }).join("") + "</div>";

      html += '<h4 style="margin-top:16px">Ghi chú cá nhân</h4>' +
        '<textarea class="notes" id="trNotes" placeholder="Ví dụ: đã liên hệ GS. X ngày 12/3, cần dịch bảng điểm…">' +
        esc((tr && tr.notes) || "") + "</textarea>";
    } else {
      html += '<div class="linkrow" style="cursor:pointer" data-pro="Bảng theo dõi hồ sơ">' +
        '<span class="ic">🔒</span><div><b>Theo dõi trạng thái + checklist 10 giấy tờ</b>' +
        "<small>Ghi chú riêng cho từng trường, tiến độ hồ sơ, tổng chi phí</small></div><span class=\"go\">→</span></div>";
    }
    html += "</div>";

    $("#dBody").innerHTML = html;

    /* footer */
    var saved = isSaved(p.id);
    $("#dFoot").innerHTML =
      (p.link ? '<a class="btn primary" href="' + esc(p.link) + '" target="_blank" rel="noopener">Mở web trường ↗</a>' : "") +
      '<button class="btn" id="dSave">' + (saved ? "★ Đã lưu" : "☆ Lưu") + "</button>" +
      '<button class="btn" id="dCmp">⚖ So sánh</button>' +
      '<button class="btn" id="dIcs">📅 Nhắc lịch' + (PRO.active ? "" : ' <span class="lock">🔒</span>') + "</button>" +
      '<button class="btn" id="dPdf">🖨 In hồ sơ' + (PRO.active ? "" : ' <span class="lock">🔒</span>') + "</button>";

    bindDrawer(p);
    $("#scrim").classList.add("on");
    $("#drawer").classList.add("on");
    document.body.style.overflow = "hidden";
    $("#dClose").focus();
  }

  function bindDrawer(p) {
    var body = $("#dBody");

    $$("[data-pro]", body).forEach(function (el) {
      el.addEventListener("click", function () { openPro(el.dataset.pro); });
    });

    $$("[data-status]", body).forEach(function (b) {
      b.addEventListener("click", function () {
        var k = b.dataset.status;
        if (k === "__clear") { delete track[p.id]; lsSet("emt.track", track); toast("Đã bỏ theo dõi."); }
        else { setTrack(p.id, { status: k }); toast("Trạng thái: " + statusLabel(k)); }
        openDrawer(p); render();
      });
    });

    $$("[data-doc]", body).forEach(function (cb) {
      cb.addEventListener("change", function () {
        var tr = getTrack(p.id) || {};
        var docs = Object.assign({}, tr.docs || {});
        docs[cb.dataset.doc] = cb.checked;
        setTrack(p.id, { docs: docs });
        openDrawer(p); render();
      });
    });

    var notes = $("#trNotes", body);
    if (notes) {
      var t;
      notes.addEventListener("input", function () {
        clearTimeout(t);
        t = setTimeout(function () { setTrack(p.id, { notes: notes.value }); }, 500);
      });
    }

    $("#dSave").addEventListener("click", function () {
      if (!toggleSave(p.id)) return;
      var on = isSaved(p.id);
      $("#dSave").textContent = on ? "★ Đã lưu" : "☆ Lưu";
      refreshSaveState(p.id);
      if (S.flags.shortlist) render();
      toast(on ? "Đã lưu vào danh sách ★" : "Đã bỏ khỏi danh sách.");
    });
    $("#dCmp").addEventListener("click", function () { toggleCompare(p.id); });
    $("#dIcs").addEventListener("click", function () {
      if (!PRO.gate("Nhắc lịch iCal")) return;
      var msg = window.EMT_EXPORT.ics([p]);
      toast(msg || "Trình duyệt chặn tải file — hãy mở trang ở tab riêng.");
    });
    $("#dPdf").addEventListener("click", function () {
      if (!PRO.gate("Xuất PDF")) return;
      closeDrawer();
      toast(window.EMT_EXPORT.pdf([p], "cards"));
    });
  }

  function closeDrawer() {
    $("#scrim").classList.remove("on");
    $("#drawer").classList.remove("on");
    document.body.style.overflow = "";
    current = null;
  }

  /* ============================================================== compare */
  function toggleCompare(id) {
    var i = compare.indexOf(id);
    if (i !== -1) compare.splice(i, 1);
    else {
      var max = PRO.active ? 6 : CFG.FREE_COMPARE_MAX;
      if (compare.length >= max) {
        if (!PRO.active) { openPro("So sánh không giới hạn"); toast("Bản miễn phí so sánh tối đa " + max + " chương trình."); return; }
        toast("Tối đa 6 chương trình.");
        return;
      }
      compare.push(id);
    }
    updateCompareBar();
  }

  function updateCompareBar() {
    var bar = $("#cmpBar");
    bar.classList.toggle("on", compare.length > 0);
    $("#cmpThumbs").innerHTML = compare.map(function (id) {
      var p = byId(id);
      return '<span class="th" title="' + esc(p.school) + '">' + flagOf(p.country) + " " + esc(p.school) + "</span>";
    }).join("");
    $$(".iconbtn.cmp").forEach(function (b) {
      var id = +b.closest("[data-id]").dataset.id;
      b.classList.toggle("on", compare.indexOf(id) !== -1);
      b.classList.toggle("cmp", compare.indexOf(id) !== -1);
    });
  }

  function openCompare() {
    if (compare.length < 2) { toast("Chọn ít nhất 2 chương trình để so sánh."); return; }
    var ps = compare.map(byId);
    var rows = [
      ["Quốc gia / TP", function (p) { return flagOf(p.country) + " " + p.country + " — " + (p.city || ""); }],
      ["Xếp hạng QS", function (p) { return p.rankText || "—"; }, function (p) { return p.rank == null ? 1e9 : p.rank; }],
      ["Hạn kế tiếp", function (p) { var s = statusOf(p); return s.days == null ? (s.label || "—") : fmtDate(s.date); }],
      ["Còn lại", function (p) { var s = statusOf(p); return s.days == null ? "—" : (s.days < 0 ? "Đã đóng" : fmtNum(s.days) + " ngày"); }],
      ["Thời gian học", function (p) { return p.duration || "—"; }],
      ["Ngôn ngữ", function (p) { return p.language || "—"; }],
      ["Học phí (~EUR/năm)", function (p) { return p.tuitionEur == null ? "—" : fmtEur(p.tuitionEur); }, function (p) { return p.tuitionEur == null ? 1e9 : p.tuitionEur; }],
      ["Sinh hoạt (~EUR/tháng)", function (p) { return p.livingEur == null ? "—" : fmtEur(p.livingEur); }, function (p) { return p.livingEur == null ? 1e9 : p.livingEur; }],
      ["Tổng chi phí ước tính", function (p) { var c = costOf(p); return c ? fmtEur(Math.round(c.total)) : "—"; }, function (p) { var c = costOf(p); return c ? c.total : 1e9; }],
      ["Học bổng trường", function (p) { return p.scholarshipSchool || "—"; }],
      ["Học bổng khác", function (p) { return p.scholarshipOther || "—"; }],
      ["Yêu cầu đầu vào", function (p) { return p.requirements || "—"; }]
    ];

    $("#cmpBody").innerHTML = "<table class='cmp'><thead><tr><th></th>" +
      ps.map(function (p) { return "<th>" + flagOf(p.country) + " " + esc(p.school) + "<div style='font-weight:500;color:var(--muted);font-size:12px'>" + esc(p.program) + "</div></th>"; }).join("") +
      "</tr></thead><tbody>" +
      rows.map(function (r) {
        var best = -1;
        if (r[2]) {
          var vals = ps.map(r[2]);
          var mn = Math.min.apply(null, vals);
          if (mn < 1e9) best = vals.indexOf(mn);
        }
        return "<tr><th>" + esc(r[0]) + "</th>" + ps.map(function (p, i) {
          return "<td" + (i === best ? " class='best'" : "") + ">" + esc(r[1](p)) + "</td>";
        }).join("") + "</tr>";
      }).join("") + "</tbody></table>";

    show("#cmpModal");
  }

  /* ================================================================ modals */
  function show(sel) { $(sel).classList.add("on"); document.body.style.overflow = "hidden"; }
  function hide(sel) { $(sel).classList.remove("on"); document.body.style.overflow = ""; }

  function openPro(feature) {
    $("#keyMsg").className = "msg";
    if (feature) {
      $("#keyMsg").className = "msg info on";
      $("#keyMsg").textContent = "“" + feature + "” là tính năng của EuroMasters Pro.";
    }
    show("#proModal");
  }

  function renderProModal() {
    $("#featList").innerHTML = CFG.FEATURES.map(function (f) {
      return '<div><span class="ic">' + f.ic + "</span><div><b>" + esc(f.t) + "</b><span>" + esc(f.d) + "</span></div></div>";
    }).join("");
    $("#buyBtn").href = CFG.GUMROAD_URL;
    syncProUI();
  }

  function syncProUI() {
    var on = PRO.active;
    $("#proBtnLabel").textContent = on ? "Pro đã kích hoạt" : "Nâng cấp Pro";
    $("#proBtn").classList.toggle("gold", !on);
    $("#proBtn").classList.toggle("primary", on);
    $("#exportLock").hidden = on;
    $("#deactivateBtn").hidden = !on;
    $$("#chips [data-pro-chip]").forEach(function (c) { c.classList.toggle("pro", !on); });
    if (on && PRO.info) {
      $("#keyMsg").className = "msg ok on";
      $("#keyMsg").textContent = "Pro đang hoạt động" + (PRO.info.email ? " — " + PRO.info.email : "") +
        " (nguồn: " + (PRO.info.source === "gumroad" ? "Gumroad" : "key nội bộ") + ").";
      $("#keyInput").value = PRO.info.key;
    }
  }

  /* ================================================================ export */
  var EXPORTS = [
    { k: "xlsx", ic: "📊", t: "Excel (.xlsx)", d: "25 cột + sheet tóm tắt, có autofilter", pro: true },
    { k: "pdf", ic: "🖨️", t: "PDF (bản in)", d: "Mở hộp thoại in → Lưu dưới dạng PDF", pro: true },
    { k: "doc", ic: "📝", t: "Word (.doc)", d: "Hồ sơ từng trường, mở bằng MS Word", pro: true },
    { k: "ics", ic: "📅", t: "Lịch (.ics)", d: "Nạp vào Google/Apple Calendar, nhắc 30/14/7/1 ngày", pro: true },
    { k: "csv", ic: "📄", t: "CSV đầy đủ", d: "Cho Google Sheets / Notion / Airtable", pro: true },
    { k: "json", ic: "🧩", t: "JSON", d: "Cho lập trình viên, kèm dữ liệu theo dõi", pro: true },
    { k: "csv10", ic: "🎁", t: "CSV thử — 10 dòng", d: "Miễn phí, để bạn xem trước định dạng", pro: false }
  ];

  function scopeList() {
    var v = $("#expScope").value;
    if (v === "all") return sortList(ALL);
    if (v === "shortlist") return sortList(ALL.filter(function (p) { return isSaved(p.id); }));
    if (v === "tracker") return sortList(ALL.filter(function (p) { return !!track[p.id]; }));
    return filtered();
  }

  function openExport(scope) {
    $("#expList").innerHTML = EXPORTS.map(function (e) {
      return '<div data-exp="' + e.k + '" style="cursor:pointer"><span class="ic">' + e.ic + "</span><div><b>" +
        esc(e.t) + (e.pro && !PRO.active ? " 🔒" : "") + "</b><span>" + esc(e.d) + "</span></div></div>";
    }).join("");
    if (scope) $("#expScope").value = scope;
    updateExpSub();
    $$("[data-exp]").forEach(function (el) {
      el.addEventListener("click", function () { doExport(el.dataset.exp); });
    });
    show("#expModal");
  }

  function updateExpSub() {
    var n = scopeList().length;
    $("#expSub").innerHTML = "<b>" + fmtNum(n) + "</b> chương trình sẽ được xuất." +
      (PRO.active ? "" : ' <span style="color:var(--gold)">Cần Pro để mở khoá đầy đủ.</span>');
  }

  function doExport(kind) {
    var list = scopeList();
    if (!list.length) { toast("Phạm vi đang chọn không có chương trình nào."); return; }

    if (kind === "csv10") {
      var msg = window.EMT_EXPORT.csv(list.slice(0, 10));
      toast(msg || "Trình duyệt chặn tải file — hãy mở trang ở tab riêng.");
      return;
    }
    if (!PRO.gate("Xuất " + kind.toUpperCase())) { hide("#expModal"); return; }

    var out;
    try {
      if (kind === "xlsx") {
        $("#expMsg").className = "msg info on";
        $("#expMsg").textContent = "Đang tạo file Excel…";
        window.EMT_EXPORT.xlsx(list).then(function (m) {
          $("#expMsg").className = "msg ok on"; $("#expMsg").textContent = m; toast(m);
        }).catch(function (e) {
          $("#expMsg").className = "msg err on";
          $("#expMsg").textContent = "Không tải được thư viện Excel (" + e.message + "). Hãy dùng CSV thay thế.";
        });
        return;
      }
      if (kind === "pdf") { hide("#expModal"); toast(window.EMT_EXPORT.pdf(list, list.length > 25 ? "table" : "cards")); return; }
      out = window.EMT_EXPORT[kind](list);
    } catch (e) {
      out = null;
      console.error(e);
    }
    if (out) { $("#expMsg").className = "msg ok on"; $("#expMsg").textContent = out; toast(out); }
    else {
      $("#expMsg").className = "msg err on";
      $("#expMsg").textContent = "Trình duyệt đã chặn tải file. Nếu bạn đang xem trong khung nhúng (Google Sites), hãy mở trang ở tab riêng rồi thử lại.";
    }
  }

  /* ================================================================ motion */
  function initMotion() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    var glow = $("#glow"), tx = innerWidth / 2, ty = innerHeight / 3, cx = tx, cy = ty, raf;
    window.addEventListener("pointermove", function (e) { tx = e.clientX; ty = e.clientY; if (!raf) raf = requestAnimationFrame(loop); }, { passive: true });
    function loop() {
      cx += (tx - cx) * .09; cy += (ty - cy) * .09;
      glow.style.transform = "translate3d(" + cx + "px," + cy + "px,0)";
      if (Math.abs(tx - cx) > .5 || Math.abs(ty - cy) > .5) raf = requestAnimationFrame(loop); else raf = null;
    }
  }

  function bindCardMotion(box) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    $$(".card", box).forEach(function (c) {
      c.addEventListener("pointermove", function (e) {
        var r = c.getBoundingClientRect();
        c.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%");
        c.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%");
      }, { passive: true });
    });
  }

  /* ================================================================ facets */
  function fillFacets() {
    function fill(sel, values, cur) {
      var el = $(sel);
      var first = el.options[0];
      el.innerHTML = "";
      el.appendChild(first);
      values.forEach(function (v) {
        var o = document.createElement("option");
        o.value = v[0]; o.textContent = v[0] + " (" + v[1] + ")";
        el.appendChild(o);
      });
      el.value = cur || "";
    }
    function tally(key) {
      var m = {};
      ALL.forEach(function (p) { if (p[key]) m[p[key]] = (m[p[key]] || 0) + 1; });
      return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || a.localeCompare(b, "vi"); })
        .map(function (k) { return [k, m[k]]; });
    }
    fill("#fGroup", tally("group"), S.group);
    fill("#fCountry", tally("country"), S.country);
    fill("#fLang", tally("mainLanguage"), S.lang);
  }

  /* ================================================================= bind */
  function bind() {
    /* nav */
    $$("#nav button").forEach(function (b) {
      b.addEventListener("click", function () { S.view = b.dataset.view; lsSet("emt.view", S.view); renderLimit = 60; render(); });
    });

    /* search */
    var qt;
    $("#q").addEventListener("input", function (e) {
      $("#qClear").hidden = !e.target.value;
      clearTimeout(qt);
      qt = setTimeout(function () { S.q = e.target.value.trim(); renderLimit = 60; render(); }, 180);
    });
    $("#qClear").addEventListener("click", function () {
      $("#q").value = ""; S.q = ""; $("#qClear").hidden = true; render();
    });

    /* selects */
    [["#fGroup", "group"], ["#fCountry", "country"], ["#fLang", "lang"], ["#fWindow", "win"], ["#fSort", "sort"]]
      .forEach(function (pair) {
        $(pair[0]).addEventListener("change", function (e) { S[pair[1]] = e.target.value; renderLimit = 60; render(); });
      });

    /* chips */
    $$("#chips .chip[data-flag]").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.flag;
        var isPro = ["cheap", "top50", "dated"].indexOf(f) !== -1;
        if (isPro && !PRO.active) { openPro("Bộ lọc nâng cao"); return; }
        S.flags[f] = !S.flags[f];
        c.classList.toggle("on", !!S.flags[f]);
        renderLimit = 60;
        render();
      });
    });

    $("#resetBtn").addEventListener("click", function () {
      S.q = ""; S.group = ""; S.country = ""; S.lang = ""; S.win = ""; S.sort = "deadline"; S.flags = {};
      $("#q").value = ""; $("#qClear").hidden = true;
      $("#fGroup").value = ""; $("#fCountry").value = ""; $("#fLang").value = "";
      $("#fWindow").value = ""; $("#fSort").value = "deadline";
      $$("#chips .chip").forEach(function (c) { c.classList.remove("on"); });
      renderLimit = 60;
      render();
    });

    /* delegated clicks: cards + timeline + table */
    document.addEventListener("click", function (e) {
      var actEl = e.target.closest("[data-act]");
      if (actEl) {
        var host = actEl.closest("[data-id]");
        var id = host ? +host.dataset.id : 0;
        var act = actEl.dataset.act;
        if (act === "link") return;
        e.stopPropagation();
        if (act === "save") {
          if (toggleSave(id)) {
            refreshSaveState(id);
            if (S.flags.shortlist) render(); // đang lọc theo ★ thì danh sách phải đổi
            toast(isSaved(id) ? "Đã lưu ★" : "Đã bỏ khỏi danh sách.");
          }
          return;
        }
        if (act === "cmp") { toggleCompare(id); return; }
        if (act === "detail") { openDrawer(byId(id)); return; }
      }
      var row = e.target.closest(".card, .tl-item, #tblBody tr");
      if (row && row.dataset.id) { openDrawer(byId(+row.dataset.id)); return; }
      if (e.target.id === "moreBtn") { renderLimit += 60; render(); return; }
      var th = e.target.closest("#tblHead th");
      if (th) {
        var k = th.dataset.k;
        S.tableSort = S.tableSort.k === k ? { k: k, dir: -S.tableSort.dir } : { k: k, dir: 1 };
        render();
      }
    });

    /* keyboard on cards */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") {
        if ($("#drawer").classList.contains("on")) closeDrawer();
        else { hide("#proModal"); hide("#expModal"); hide("#cmpModal"); }
      }
      if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("card")) {
        openDrawer(byId(+document.activeElement.dataset.id));
      }
      if (e.key === "/" && document.activeElement !== $("#q")) { e.preventDefault(); $("#q").focus(); }
    });

    /* drawer */
    $("#dClose").addEventListener("click", closeDrawer);
    $("#scrim").addEventListener("click", closeDrawer);

    /* theme */
    $("#themeBtn").addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      lsSet("emt.theme", next);
    });

    /* premium */
    $("#proBtn").addEventListener("click", function () { openPro(""); });
    $("#proClose").addEventListener("click", function () { hide("#proModal"); });
    $("#proModal").addEventListener("click", function (e) { if (e.target.id === "proModal") hide("#proModal"); });
    $("#keyBtn").addEventListener("click", activateKey);
    $("#keyInput").addEventListener("keydown", function (e) { if (e.key === "Enter") activateKey(); });
    $("#deactivateBtn").addEventListener("click", function () {
      PRO.clear(); syncProUI(); render();
      $("#keyMsg").className = "msg info on";
      $("#keyMsg").textContent = "Đã gỡ kích hoạt trên thiết bị này.";
      toast("Đã gỡ kích hoạt Pro.");
    });

    /* export */
    $("#exportBtn").addEventListener("click", function () { openExport(); });
    $("#expClose").addEventListener("click", function () { hide("#expModal"); });
    $("#expModal").addEventListener("click", function (e) { if (e.target.id === "expModal") hide("#expModal"); });
    $("#expScope").addEventListener("change", updateExpSub);

    /* compare */
    $("#cmpOpen").addEventListener("click", openCompare);
    $("#cmpClear").addEventListener("click", function () { compare = []; render(); });
    $("#cmpClose").addEventListener("click", function () { hide("#cmpModal"); });
    $("#cmpModal").addEventListener("click", function (e) { if (e.target.id === "cmpModal") hide("#cmpModal"); });

    /* ticker → mở chi tiết (gắn một lần) */
    $("#ticker").addEventListener("click", function () { if (tickerP) openDrawer(tickerP); });

    /* disclaimer */
    $("#disclaimerLink").addEventListener("click", function (e) {
      e.preventDefault();
      alert(CFG.DISCLAIMER);
    });
  }

  function activateKey() {
    var key = $("#keyInput").value;
    var msg = $("#keyMsg"), btn = $("#keyBtn");
    msg.className = "msg info on";
    msg.textContent = "Đang xác thực…";
    btn.disabled = true;
    PRO.activate(key).then(function (r) {
      btn.disabled = false;
      msg.className = "msg " + (r.ok ? "ok" : "err") + " on";
      msg.textContent = r.message;
      if (r.ok) {
        syncProUI();
        render();
        toast("✦ EuroMasters Pro đã mở khoá!");
        setTimeout(function () { hide("#proModal"); }, 1400);
      }
    });
  }

  /* ================================================================= init */
  function init() {
    if (!ALL.length) {
      document.querySelector("main").innerHTML =
        '<div class="wrap empty"><div class="big">⚠️</div><h3>Không nạp được dữ liệu</h3>' +
        "<p>Thiếu file <code>data/programs.js</code>. Chạy <code>python tools/build_data.py</code> để tạo lại.</p></div>";
      return;
    }

    var th = lsGet("emt.theme", null);
    if (th) document.documentElement.dataset.theme = th;

    /* chế độ nhúng cho Google Sites: index.html?embed=1 */
    var qp = new URLSearchParams(window.location.search);
    if (qp.get("embed") === "1" || (window.self !== window.top && qp.get("embed") !== "0")) {
      document.body.classList.add("embed");
      var full = $("#openFull");
      full.hidden = false;
      full.href = window.location.origin + window.location.pathname + "?embed=0";
    }
    if (qp.get("view")) S.view = qp.get("view");
    if (qp.get("q")) { S.q = qp.get("q"); $("#q").value = S.q; $("#qClear").hidden = false; }

    $("#yr").textContent = new Date().getFullYear();
    $("#buildDate").textContent = CFG.DATA_DATE;
    $("#heroCount").textContent = fmtNum(ALL.length);
    $("#heroCountries").textContent = (DATA.meta.countries || []).length;

    // đồng bộ nhãn chip miễn phí/pro
    fillFacets();
    renderStats();
    renderTicker();
    renderProModal();
    bind();
    initMotion();

    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === S.view); });
    render();

    // cập nhật đếm ngược mỗi phút (thẻ + bảng)
    setInterval(function () {
      var k = todayKey();
      if (dlCacheDay !== k) { dlCache = {}; dlCacheDay = k; renderTicker(); render(); }
    }, 60000);
  }

  /* ================================================================== API */
  window.EMT = {
    nextDeadline: nextDeadline,
    fmtDate: fmtDate,
    daysLeft: daysLeft,
    getTrack: getTrack,
    statusLabel: statusLabel,
    openPro: openPro,
    statusOf: statusOf,
    filtered: filtered,
    all: ALL,
    _S: S
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
