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

  /* ============================================================ song ngữ */
  var I18N = window.EMT_I18N;
  function t(k, v) { return I18N.t(k, v); }          /* chuỗi giao diện     */
  function L(v) { return I18N.pick(v); }             /* {vi:…, en:…} trong config */
  function C(v) { return I18N.term("country", v); }  /* tên quốc gia        */
  function G(v) { return I18N.term("group", v); }    /* nhóm ngành          */
  function LG(v) { return I18N.term("language", v); }/* ngôn ngữ giảng dạy  */
  function DU(v) { return I18N.dur(v); }             /* thời lượng học      */

  /* Biểu tượng lấy từ sprite ở đầu index.html, không dùng emoji cho giao diện */
  /* rankText trong bộ dữ liệu là tiếng Việt và kèm ghi chú STT gốc.
     Bản tiếng Anh dựng lại từ nhóm ngành đã dịch. */
  function rankText(p) {
    if (!p.rankText) return p.rankText;
    if (I18N.lang !== "en") return p.rankText;
    return p.rank == null ? I18N.term("group", p.group) : I18N.term("group", p.group) + " #" + p.rank;
  }

  function ic(id, cls) {
    return '<svg class="i' + (cls ? " " + cls : "") +
      '" viewBox="0 0 24 24" aria-hidden="true"><use href="#' + id + '"/></svg>';
  }

  var DASH = "-";  /* ô trống trong bảng dữ liệu */

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
  function fmtNum(n) { return n == null ? DASH : Number(n).toLocaleString(I18N.locale()); }
  function fmtEur(n) { return n == null ? DASH : "€" + Number(n).toLocaleString(I18N.locale()); }

  var MONTHS_VI = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
    "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  var MONTHS_EN = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"];
  var MON_SHORT_VI = ["Th1", "Th2", "Th3", "Th4", "Th5", "Th6", "Th7", "Th8", "Th9", "Th10", "Th11", "Th12"];
  var MON_SHORT_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function monthName(i) { return (I18N.lang === "en" ? MONTHS_EN : MONTHS_VI)[i]; }
  function monthShort(i) { return (I18N.lang === "en" ? MON_SHORT_EN : MON_SHORT_VI)[i]; }

  function fmtDate(d) {
    if (!d) return DASH;
    var dd = ("0" + d.getDate()).slice(-2);
    if (I18N.lang === "en") return dd + " " + MON_SHORT_EN[d.getMonth()] + " " + d.getFullYear();
    return dd + "/" + ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
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
        ? { cls: "s-ok", label: t("st.rolling"), sub: t("st.rollingSub"), days: null }
        : { cls: "s-dead", label: t("st.unknown"), sub: t("st.unknownSub"), days: null };
    }
    var d = daysLeft(nx.date);
    var cls = d < 0 ? "s-dead" : d <= 7 ? "s-hot" : d <= 30 ? "s-warn" : d <= 90 ? "s-soon" : "s-ok";
    return { cls: cls, days: d, date: nx.date, exact: nx.exact, approx: nx.approx, rolled: nx.rolled, prev: nx.prev };
  }

  function flagOf(c) { return FLAGS[c] || "🇪🇺"; }

  /* =============================================================== filters */
  var S = {
    q: "", level: "", group: "", country: "", lang: "", win: "", sort: "deadline",
    flags: {}, view: lsGet("emt.view", "cards"), tableSort: { k: "deadline", dir: 1 }
  };

  function matches(p) {
    if (S.q) {
      var hay = noAccent([p.school, p.program, p.city, p.country, p.field, p.group, p.notes, p.rankText].join(" "));
      var terms = noAccent(S.q).split(/\s+/).filter(Boolean);
      for (var i = 0; i < terms.length; i++) if (hay.indexOf(terms[i]) === -1) return false;
    }
    if (S.level && (p.level || "master") !== S.level) return false;
    if (S.flags.online && !p.online) return false;
    if (S.group && p.group !== S.group) return false;
    if (S.country && p.country !== S.country) return false;
    if (S.lang && p.mainLanguage !== S.lang) return false;
    if (S.flags.scholarship && !p.hasScholarship) return false;
    if (S.flags.english && !/tiếng anh/i.test(p.language || "")) return false;
    if (S.flags.shortlist && shortlist.indexOf(p.id) === -1) return false;
    if (S.flags.cheap && !(p.tuitionEur != null && p.tuitionEur <= 5000)) return false;
    if (S.flags.top50 && !(p.rank != null && p.rank <= 50)) return false;
    if (S.flags.dated) {
      var dt = p.deadline && p.deadline.type;
      if (dt !== "fixed" && dt !== "window") return false;
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

  /* Hết dùng thử mà chưa có key: chỉ mở FREE_VISIBLE chương trình có hạn gần nhất.
     Danh sách này tính lại mỗi ngày vì hạn nộp trôi theo thời gian. */
  var freeIds = null, freeDay = "";
  function freePool() {
    var k = todayKey();
    if (!freeIds || freeDay !== k) {
      freeDay = k;
      freeIds = {};
      sortList(ALL, "deadline").slice(0, CFG.FREE_VISIBLE || 50)
        .forEach(function (p) { freeIds[p.id] = true; });
    }
    return ALL.filter(function (p) { return freeIds[p.id]; });
  }
  function locked() { return !PRO.active; }
  function visiblePool() { return locked() ? freePool() : ALL; }

  function filtered() { return sortList(visiblePool().filter(matches)); }

  /* ------------------------------------------------------- đồng bộ URL ---
     Đưa bộ lọc lên thanh địa chỉ để người dùng chia sẻ đúng khung nhìn.
     Dùng replaceState nên không làm rác lịch sử trình duyệt.                */
  var FLAG_KEYS = ["scholarship", "english", "online", "shortlist", "cheap", "top50", "dated"];

  function stateToQuery() {
    var qp = new URLSearchParams();
    if (S.q) qp.set("q", S.q);
    if (S.view !== "cards") qp.set("view", S.view);
    if (S.level) qp.set("level", S.level);
    if (S.group) qp.set("group", S.group);
    if (S.country) qp.set("country", S.country);
    if (S.lang) qp.set("lang", S.lang);
    if (S.win) qp.set("win", S.win);
    if (S.sort !== "deadline") qp.set("sort", S.sort);
    var on = FLAG_KEYS.filter(function (k) { return S.flags[k]; });
    if (on.length) qp.set("flags", on.join(","));
    if (embedMode) qp.set("embed", "1");
    return qp.toString();
  }

  function syncUrl() {
    if (!window.history || !window.history.replaceState) return;
    var qs = stateToQuery();
    try {
      window.history.replaceState(null, "",
        window.location.pathname + (qs ? "?" + qs : "") + window.location.hash);
    } catch (e) { /* một số iframe chặn replaceState — bỏ qua */ }
  }

  function applyQuery(qp) {
    if (qp.get("q")) { S.q = qp.get("q"); $("#q").value = S.q; $("#qClear").hidden = false; }
    if (qp.get("view")) S.view = qp.get("view");
    if (qp.get("level")) { S.level = qp.get("level"); $("#fLevel").value = S.level; }
    if (qp.get("group")) { S.group = qp.get("group"); $("#fGroup").value = S.group; }
    if (qp.get("country")) { S.country = qp.get("country"); $("#fCountry").value = S.country; }
    if (qp.get("lang")) { S.lang = qp.get("lang"); $("#fLang").value = S.lang; }
    if (qp.get("win")) { S.win = qp.get("win"); $("#fWindow").value = S.win; }
    if (qp.get("sort")) { S.sort = qp.get("sort"); $("#fSort").value = S.sort; }
    (qp.get("flags") || "").split(",").filter(Boolean).forEach(function (f) {
      if (FLAG_KEYS.indexOf(f) === -1) return;
      var chip = $('#chips [data-flag="' + f + '"]');
      if (chip && chip.hasAttribute("data-pro-chip") && !PRO.active) return; // lọc Pro cần key
      S.flags[f] = true;
      if (chip) chip.classList.add("on");
    });
  }

  var embedMode = false;

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
        openPro(t("pro.unlimitedList"));
        toast(t("toast.saveLimit", { n: CFG.FREE_SHORTLIST_MAX }));
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
    return s ? L(s.t) : k;
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

  /* Link tìm kiếm thay thế khi trang gốc đã bị gỡ */
  function rescueLink(p) {
    return gs(p.school + " " + p.program + " master programme");
  }

  function linksFor(p) {
    var dom = domainOf(p.link);
    var site = dom ? "site:" + dom + " " : "";
    var out = [];
    if (p.linkStatus === "dead") {
      out.push({
        ic: "i-warning", warn: true,
        t: t("link.rescue"),
        s: t("link.rescueSub", { d: DATA.meta.linkCheckedAt || "2026-09-03" }),
        u: rescueLink(p)
      });
      if (p.link) out.push({ ic: "i-external", t: t("link.old"), s: dom || p.link, u: p.link, dim: true });
    } else if (p.link) {
      out.push({ ic: "i-cap", t: t("link.official"), s: dom || p.link, u: p.link });
    }
    out.push({ ic: "i-file", t: t("link.admissions"), s: t("link.admissionsSub"), u: gs(site + "master admission how to apply") });
    out.push({ ic: "i-euro", t: t("link.fees"), s: "Tuition fees " + (C(p.country) || ""), u: gs(site + "tuition fees master international") });
    out.push({ ic: "i-cap", t: t("link.scholarship"), s: t("link.scholarshipSub"), u: gs(site + "scholarship master international student") });
    out.push({ ic: "i-list-checks", t: t("link.portfolio"), s: t("link.portfolioSub"), u: gs(p.school + " " + p.program + " entry requirements portfolio") });
    out.push({ ic: "i-file", t: t("link.brochure"), s: t("link.brochureSub"), u: gs(p.school + " " + p.program + " brochure OR handbook filetype:pdf") });
    out.push({ ic: "i-pin", t: t("link.map"), s: [p.city, ISO[p.country] || p.country].filter(Boolean).join(", "), u: "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(p.school + " " + (p.city || "") + " " + (ISO[p.country] || p.country || "")) });
    out.push({ ic: "i-sparkle", t: t("link.qs"), s: "topuniversities.com", u: gs("site:topuniversities.com " + p.school) });
    out.push({ ic: "i-globe", t: t("link.review"), s: t("link.reviewSub"), u: gs('"' + p.school + '" du học sinh Việt Nam kinh nghiệm') });
    return out;
  }

  /* ================================================================ stats */
  function renderStats() {
    var withDate = ALL.filter(function (p) { var s = statusOf(p); return s.days != null && s.days >= 0; });
    var d30 = withDate.filter(function (p) { return statusOf(p).days <= 30; }).length;
    var d90 = withDate.filter(function (p) { return statusOf(p).days <= 90; }).length;

    var items = [
      { n: ALL.length, l: t("stat.programs") },
      { n: (DATA.meta.countries || []).length, l: t("stat.countries") },
      { n: d30, l: t("stat.d30") },
      { n: d90, l: t("stat.d90") },
      { n: ALL.filter(function (p) { return p.online; }).length, l: t("chip.online") }
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
      function step(now) {
        var k = Math.min(1, (now - t0) / dur);
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
      '<span class="lbl">' + ic("i-clock") + t("next.label") + "</span>" +
      '<span class="school">' + flagOf(tickerP.country) + " " + esc(tickerP.school) + "</span>" +
      '<span class="prog">' + esc(tickerP.program) + "</span>" +
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
    var units = [[d, t("cd.d")], [h, t("cd.h")], [m, t("cd.m")], [s, t("cd.s")]];
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
    var txt = st.days < 0 ? t("cd.closed")
      : st.days === 0 ? t("cd.today")
      : fmtNum(st.days) + "<small>" + t("cd.dayUnit") + "</small>";
    var note = st.rolled ? "<em>" + t("cd.nextRound") + "</em>"
      : st.approx ? "<em>" + t("cd.approxDate") + "</em>"
      : st.exact ? "" : "<em>" + t("cd.yearly") + "</em>";
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
      '<div class="where">' + ic("i-pin") + esc(p.city || DASH) + ", " + esc(C(p.country)) + "</div>" +
      cdBadge(p) +
      '<div class="meta">' +
        ((p.level && p.level !== "master") ? '<span class="tag lv">' + esc(t("lv." + p.level)) + "</span>" : "") +
        (p.online ? '<span class="tag on">' + ic("i-globe") + esc(t("card.online")) + "</span>" : "") +
        (p.duration ? '<span class="tag">' + ic("i-clock") + esc(DU(p.duration)) + "</span>" : "") +
        (p.mainLanguage ? '<span class="tag">' + ic("i-language") + esc(LG(p.mainLanguage)) + "</span>" : "") +
        (p.tuitionEur != null ? '<span class="tag">' + ic("i-euro") + fmtEur(p.tuitionEur) + t("card.perYear") + "</span>" : "") +
        (p.hasScholarship ? '<span class="tag sch">' + ic("i-cap") + t("card.scholarship") + "</span>" : "") +
        (tr && tr.status ? '<span class="tag" style="color:' + statusColor(tr.status) + ';border-color:' + statusColor(tr.status) + '55">' + esc(statusLabel(tr.status)) + "</span>" : "") +
      "</div>" +
      '<div class="act" data-stop="1">' +
        '<button class="iconbtn save' + (saved ? " on" : "") + '" data-act="save" title="' + esc(t("card.save")) + '" aria-label="' + esc(t("card.save")) + '">' + ic("i-star") + "</button>" +
        '<button class="iconbtn cmp' + (cmp ? " on cmp" : "") + '" data-act="cmp" title="' + esc(t("card.compare")) + '" aria-label="' + esc(t("card.compare")) + '">' + ic("i-columns") + "</button>" +
        (p.link || p.linkStatus === "dead"
          ? '<a class="iconbtn' + (p.linkStatus === "dead" ? " warn" : "") + '" href="' +
            esc(p.linkStatus === "dead" ? rescueLink(p) : p.link) + '" target="_blank" rel="noopener" data-act="link" title="' +
            esc(p.linkStatus === "dead" ? t("link.rescue") : t("card.web")) + '" aria-label="' +
            esc(p.linkStatus === "dead" ? t("link.rescue") : t("card.web")) + '">' +
            ic(p.linkStatus === "dead" ? "i-warning" : "i-external") + "</a>"
          : "") +
        '<button class="btn xs ghost" data-act="detail">' + t("card.detail") + ic("i-arrow-right") + "</button>" +
      "</div>" +
    "</article>";
  }

  function lockedCardHTML() {
    if (!locked()) return "";
    var n = CFG.FREE_VISIBLE || 50;
    return '<div class="lockcard" style="grid-column:1/-1">' +
      '<span class="lk-ic">' + ic("i-lock") + "</span>" +
      "<div><h3>" + esc(t("trial.lockedCard", { locked: fmtNum(ALL.length - n) })) + "</h3>" +
      "<p>" + esc(t("trial.lockedCardSub", { n: n })) + "</p></div>" +
      '<a class="btn gold" href="' + esc(CFG.GUMROAD_URL) + '" target="_blank" rel="noopener">' +
      ic("i-sparkle") + esc(t("trial.buy", { p: L(CFG.PRICE) })) + "</a></div>";
  }

  function renderCards(list) {
    var box = $("#view-cards");
    if (!list.length) { box.innerHTML = emptyHTML() + lockedCardHTML(); return; }
    var more = list.length > renderLimit;
    box.innerHTML = list.slice(0, renderLimit).map(cardHTML).join("") + (more ? "" : lockedCardHTML()) +
      (list.length > renderLimit
        ? '<div style="grid-column:1/-1;text-align:center;padding:18px"><button class="btn" id="moreBtn">' +
          esc(t("res.more", { n: Math.min(60, list.length - renderLimit) })) + "</button></div>"
        : "");
    $$(".card", box).forEach(observe);
  }

  var renderLimit = 60;

  function emptyHTML() {
    return '<div class="empty" style="grid-column:1/-1"><div class="big">' + ic("i-search") + "</div>" +
      "<h3>" + esc(t("empty.title")) + "</h3>" +
      "<p>" + esc(t("empty.sub")) + "</p>" +
      '<button class="btn" onclick="document.getElementById(\'resetBtn\').click()">' +
      ic("i-reset") + esc(t("empty.reset")) + "</button></div>";
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
        '<div class="tl-head"><h3>' + monthName(+parts[1]) + " " + parts[0] + '</h3><span class="n">' + esc(t("tl.programs", { n: items.length })) + "</span></div>" +
        '<div class="tl-items">' + items.map(function (p) {
          var st = statusOf(p);
          return '<div class="tl-item ' + st.cls + '" data-id="' + p.id + '">' +
            '<div class="tl-date"><b>' + st.date.getDate() + "</b><span>" + monthShort(st.date.getMonth()) + "</span></div>" +
            '<div class="tl-body"><b>' + flagOf(p.country) + " " + esc(p.school) + "</b><span>" + esc(p.program) + "</span></div>" +
            '<div class="tl-left">' + (st.days === 0 ? t("tl.today") : t("tl.left", { n: fmtNum(st.days) })) + "</div>" +
          "</div>";
        }).join("") + "</div></div>";
    }).join("");

    if (undated.length) {
      html += '<div class="tl-month"><div class="tl-head"><h3>' + esc(t("tl.undated")) + "</h3>" +
        '<span class="n">' + esc(t("tl.programs", { n: undated.length })) + "</span></div><div class=\"tl-items\">" +
        undated.map(function (p) {
          var st = statusOf(p);
          return '<div class="tl-item s-dead" data-id="' + p.id + '">' +
            '<div class="tl-date"><b>?</b><span></span></div>' +
            '<div class="tl-body"><b>' + flagOf(p.country) + " " + esc(p.school) + "</b><span>" + esc(p.program) + "</span></div>" +
            '<div class="tl-left">' + esc(st.label || t("tl.checkSite")) + "</div></div>";
        }).join("") + "</div></div>";
    }

    box.innerHTML = html;
    $$(".tl-month", box).forEach(observe);
  }

  /* ================================================================ table */
  var COL_KEYS = [
    { k: "rank",     i: "tbl.rank" },
    { k: "school",   i: "tbl.school" },
    { k: "program",  i: "tbl.program" },
    { k: "country",  i: "tbl.country" },
    { k: "deadline", i: "tbl.deadline" },
    { k: "left",     i: "tbl.left" },
    { k: "tuition",  i: "tbl.tuition" },
    { k: "lang",     i: "tbl.lang" },
    { k: "sch",      i: "card.scholarship" }
  ];
  function cols() {
    return COL_KEYS.map(function (c) { return { k: c.k, t: t(c.i) }; });
  }

  function renderTable(list) {
    var head = $("#tblHead"), body = $("#tblBody");
    var COLS = cols();
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
        case "left": case "deadline":
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

    /* data-label và data-col cho phép bảng xếp lại thành danh sách thẻ trên điện thoại */
    function td(colKey, cls, html) {
      var lbl = COLS.filter(function (c) { return c.k === colKey; })[0];
      return '<td data-col="' + colKey + '" data-label="' + esc(lbl ? lbl.t : "") + '"' +
        (cls ? ' class="' + cls + '"' : "") + ">" + html + "</td>";
    }

    body.innerHTML = arr.slice(0, 300).map(function (p) {
      var st = statusOf(p);
      return '<tr data-id="' + p.id + '">' +
        td("rank", "nowrap", p.rank ? "<b>#" + p.rank + "</b>" : DASH) +
        td("school", "", "<b>" + flagOf(p.country) + " " + esc(p.school) + '</b><div class="mini">' + esc(p.city) + "</div>") +
        td("program", "", esc(p.program) + '<div class="mini">' + esc(G(p.group)) + "</div>") +
        td("country", "nowrap", esc(C(p.country))) +
        td("deadline", "nowrap", st.days == null ? DASH : fmtDate(st.date)) +
        td("left", "nowrap", '<span style="color:var(--c);font-weight:700" class="' + st.cls + '">' +
          (st.days == null ? esc(st.label)
            : st.days < 0 ? t("cd.closed")
            : fmtNum(st.days) + " " + t("cd.dayUnit")) + "</span>") +
        td("tuition", "nowrap", p.tuitionEur == null ? DASH : fmtEur(p.tuitionEur)) +
        td("lang", "", esc(LG(p.mainLanguage) || DASH)) +
        td("sch", "", p.hasScholarship ? ic("i-check") : DASH) +
      "</tr>";
    }).join("") || '<tr><td colspan="9" style="text-align:center;padding:34px;color:var(--muted)">' +
      esc(t("empty.title")) + "</td></tr>";

    if (arr.length > 300) {
      body.insertAdjacentHTML("beforeend",
        '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:14px">' +
        esc(t("res.showing", { n: 300, total: fmtNum(arr.length) })) + "</td></tr>");
    }
  }

  /* ============================================================== tracker */
  function renderTracker() {
    var box = $("#view-tracker");
    var ids = Object.keys(track).map(Number);
    if (!PRO.active) {
      box.innerHTML = proTeaseHTML(t("track.h"), t("pro.trackBody"));
      return;
    }
    if (!ids.length) {
      box.innerHTML = '<div class="empty"><div class="big">' + ic("i-folder") + "</div><h3>" +
        esc(t("empty.trackTitle")) + "</h3><p>" + esc(t("empty.trackSub")) + "</p></div>";
      return;
    }
    var tot = { tuition: 0, living: 0, n: 0 };
    ids.forEach(function (id) {
      var p = byId(id); if (!p) return;
      var c = costOf(p); if (!c) return;
      tot.tuition += c.tuition || 0; tot.living += c.living || 0; tot.n++;
    });

    var board = CFG.STATUSES.map(function (s) {
      var items = ids.map(byId).filter(function (p) { return p && (track[p.id].status || "interested") === s.k; });
      return '<div class="col"><h4><span style="width:8px;height:8px;border-radius:50%;background:' + s.c + ';display:inline-block"></span>' +
        esc(L(s.t)) + '<span class="n">' + items.length + "</span></h4>" +
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
              (st.days == null ? esc(st.label)
                : st.days < 0 ? t("cd.closed")
                : t("tl.left", { n: fmtNum(st.days) })) + "</span></div>" +
          "</div>";
        }).join("") + "</div>";
    }).join("");

    box.innerHTML =
      '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;margin-bottom:16px">' +
        '<div class="stat" style="flex:1;min-width:220px"><b>' + fmtEur(Math.round(tot.tuition + tot.living)) +
        "</b><span>" + esc(t("track.total")) + " (" + tot.n + ")</span></div>" +
        '<div class="stat" style="flex:1;min-width:220px"><b>' + fmtNum(Math.round((tot.tuition + tot.living) * CFG.VND_PER_EUR / 1e6)) +
        " " + t("d.million") + "</b><span>" + esc(t("track.totalVnd")) + " (" + fmtNum(CFG.VND_PER_EUR) + " VND/EUR)</span></div>" +
        '<button class="btn" id="trackExport">' + ic("i-download") + esc(t("track.export")) + "</button>" +
      "</div>" +
      '<div class="board">' + board + "</div>";

    $("#trackExport").addEventListener("click", function () { openExport("tracker"); });
    $$(".mini-card", box).forEach(function (el) {
      el.addEventListener("click", function () { openDrawer(byId(+el.dataset.id)); });
    });
  }

  function proTeaseHTML(title, body) {
    return '<div class="empty"><div class="big">' + ic("i-lock") + "</div>" +
      "<h3>" + esc(t("pro.locked", { name: title })) + "</h3><p>" + esc(body) + "</p>" +
      '<button class="btn gold" onclick="document.getElementById(\'proBtn\').click()">' + ic("i-sparkle") + esc(t("pro.unlock")) + "</button></div>";
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
      (locked()
        ? t("res.freeShowing", { n: "<b>" + fmtNum(lastCount) + "</b>", free: CFG.FREE_VISIBLE || 50, total: fmtNum(ALL.length) })
        : t("res.showing", { n: "<b>" + fmtNum(lastCount) + "</b>", total: fmtNum(ALL.length) })) +
      (shortlist.length ? " &middot; " + t("res.savedCount", { n: shortlist.length }) : "");
  }

  /* Cập nhật nút ★ tại chỗ — tránh render lại cả lưới (gây nháy + mất hiệu ứng) */
  function refreshSaveState(id) {
    var on = isSaved(id);
    $$('[data-id="' + id + '"] [data-act="save"]').forEach(function (b) {
      b.classList.toggle("on", on);
    });
    updateResultLine();
  }

  function render() {
    var list = filtered();
    updateResultLine(list.length);
    updateFilterCount();

    ["cards", "timeline", "table", "tracker"].forEach(function (v) {
      $("#view-" + v).hidden = S.view !== v;
    });
    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === S.view); });

    syncUrl();

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
    $("#dSub").innerHTML = flagOf(p.country) + " <b>" + esc(p.school) + "</b>, " +
      esc([p.city, C(p.country)].filter(Boolean).join(", ")) +
      (p.rankText ? ' <span style="color:var(--muted)">' + esc(rankText(p)) + "</span>" : "");

    var html = "";

    /* countdown */
    html += '<div class="dsec">' + cdBadge(p) +
      (st.rolled
        ? '<div class="dnote warn">' + ic("i-warning") + esc(t("d.rolledWarn", { d: fmtDate(st.prev) })) + "</div>"
        : "") +
      (st.approx && !st.rolled
        ? '<div class="dnote">' + ic("i-warning") + esc(t("d.approxWarn")) + "</div>"
        : "") +
      '<div class="dnote">' + esc(t("d.raw", { s: p.deadlineRaw || DASH })) + "</div></div>";

    /* facts */
    html += '<div class="dsec"><h4>' + esc(t("d.main")) + '</h4><dl class="kv">' +
      kv(t("d.group"), G(p.group)) + kv(t("d.fieldDetail"), p.field) +
      kv(t("d.rank"), rankText(p)) + kv(t("d.duration"), DU(p.duration)) +
      kv(t("d.language"), LG(p.mainLanguage) || p.language) +
      kv(t("d.tuition"), p.tuitionRaw) + kv(t("d.living"), p.livingRaw) +
      "</dl></div>";

    /* cost calculator (Pro) */
    if (c) {
      if (PRO.active) {
        html += '<div class="dsec"><h4>' + esc(t("d.total")) + ' <span class="pro-badge">PRO</span></h4>' +
          '<dl class="kv">' +
          kv(t("d.duration"), t("d.durationVal", { m: c.months, y: c.years.toFixed(1) })) +
          (c.tuition != null ? "<dt>" + esc(t("d.tuitionTotal")) + "</dt><dd>" + fmtEur(Math.round(c.tuition)) + "</dd>" : "") +
          (c.living != null ? "<dt>" + esc(t("d.livingTotal")) + "</dt><dd>" + fmtEur(Math.round(c.living)) + "</dd>" : "") +
          "<dt><b>" + esc(t("d.sum")) + "</b></dt><dd><b>" + fmtEur(Math.round(c.total)) + "</b> = " +
            fmtNum(Math.round(c.total * CFG.VND_PER_EUR / 1e6)) + " " + t("d.million") + "</dd>" +
          '</dl><div class="dnote">' + esc(t("d.totalNote")) + "</div></div>";
      } else {
        html += '<div class="dsec"><h4>' + esc(t("d.total")) + "</h4>" +
          '<div class="linkrow" style="cursor:pointer" data-pro="' + esc(t("pro.cost")) + '">' +
          '<span class="ic">' + ic("i-lock") + "</span><div><b>" + esc(t("d.costTease")) + "</b>" +
          "<small>" + esc(t("d.costTeaseSub")) + "</small></div>" +
          '<span class="go">' + ic("i-arrow-right") + "</span></div></div>";
      }
    }

    /* description */
    if (p.desc) html += '<div class="dsec"><h4>' + esc(t("d.desc")) + '</h4><div class="prose">' + esc(p.desc) + "</div></div>";

    /* scholarship */
    if (p.scholarshipSchool || p.scholarshipOther) {
      html += '<div class="dsec"><h4>' + esc(t("d.scholarship")) + '</h4><dl class="kv">' +
        kv(t("d.schSchool"), p.scholarshipSchool) + kv(t("d.schOther"), p.scholarshipOther) + "</dl>";
      if (p.scholarshipDeadline && p.scholarshipDeadline.dates.length) {
        var sd = occurrences(p.scholarshipDeadline)[0];
        if (sd) html += '<div class="dnote warn">' + ic("i-calendar") +
          esc(t("d.schDeadline", { d: fmtDate(sd.date), n: fmtNum(daysLeft(sd.date)) })) + "</div>";
      }
      html += "</div>";
    }

    if (p.requirements) html += '<div class="dsec"><h4>' + esc(t("d.req")) + '</h4><div class="prose">' + esc(p.requirements) + "</div></div>";
    if (p.notes) html += '<div class="dsec"><h4>' + esc(t("d.srcNotes")) + '</h4><div class="prose">' + esc(p.notes) + "</div></div>";
    if (I18N.lang === "en") {
      html += '<div class="dnote" style="margin:-12px 0 20px">' + esc(t("note.dataVi")) + "</div>";
    }

    /* links */
    html += '<div class="dsec"><h4>' + esc(t("d.links")) + '</h4><div class="linklist">' +
      linksFor(p).map(function (l) {
        return '<a class="linkrow' + (l.warn ? " warn" : "") + (l.dim ? " dim" : "") +
          '" href="' + esc(l.u) + '" target="_blank" rel="noopener">' +
          '<span class="ic">' + ic(l.ic) + "</span><div><b>" + esc(l.t) + "</b><small>" + esc(l.s) + "</small></div>" +
          '<span class="go">' + ic("i-external") + "</span></a>";
      }).join("") + "</div></div>";

    /* tracker */
    html += '<div class="dsec"><h4>' + esc(t("d.mine")) + " " + (PRO.active ? "" : '<span class="pro-badge">PRO</span>') + "</h4>";
    if (PRO.active) {
      html += '<div class="statusrow" style="margin-bottom:12px">' +
        CFG.STATUSES.map(function (s) {
          var on = tr && tr.status === s.k;
          return '<button class="chip st' + (on ? " on" : "") + '" data-status="' + s.k + '" style="--st:' + s.c + '">' + esc(L(s.t)) + "</button>";
        }).join("") +
        (tr ? '<button class="chip" data-status="__clear">' + ic("i-x") + esc(t("d.untrack")) + "</button>" : "") +
        "</div>";

      var done = tr && tr.docs ? Object.keys(tr.docs).filter(function (k) { return tr.docs[k]; }).length : 0;
      html += '<div style="display:flex;gap:9px;align-items:center;margin-bottom:9px">' +
        '<div class="progbar" style="flex:1"><i style="width:' + Math.round(done / CFG.DOCS.length * 100) + '%"></i></div>' +
        '<span style="font-size:11.5px;color:var(--muted);white-space:nowrap">' + done + "/" + CFG.DOCS.length + " " + t("d.docsUnit") + "</span></div>";

      html += '<div class="checklist">' + CFG.DOCS.map(function (d, i) {
        var ck = tr && tr.docs && tr.docs[i];
        return '<label class="chk' + (ck ? " done" : "") + '"><input type="checkbox" data-doc="' + i + '"' + (ck ? " checked" : "") + "> " + esc(L(d)) + "</label>";
      }).join("") + "</div>";

      html += '<h4 style="margin-top:16px">' + esc(t("d.notes")) + "</h4>" +
        '<textarea class="notes" id="trNotes" placeholder="' + esc(t("d.notesPh")) + '">' +
        esc((tr && tr.notes) || "") + "</textarea>";
    } else {
      html += '<div class="linkrow" style="cursor:pointer" data-pro="' + esc(t("track.h")) + '">' +
        '<span class="ic">' + ic("i-lock") + "</span><div><b>" + esc(t("d.trackTease")) + "</b>" +
        "<small>" + esc(t("d.trackTeaseSub")) + '</small></div><span class="go">' + ic("i-arrow-right") + "</span></div>";
    }
    html += "</div>";

    $("#dBody").innerHTML = html;

    /* footer */
    var saved = isSaved(p.id);
    $("#dFoot").innerHTML =
      (p.linkStatus === "dead"
        ? '<a class="btn primary" href="' + esc(rescueLink(p)) + '" target="_blank" rel="noopener">' + esc(t("d.findNew")) + ic("i-external") + "</a>"
        : (p.link ? '<a class="btn primary" href="' + esc(p.link) + '" target="_blank" rel="noopener">' + esc(t("d.openSite")) + ic("i-external") + "</a>" : "")) +
      '<button class="btn" id="dSave">' + ic("i-star") + esc(saved ? t("d.saved") : t("d.save")) + "</button>" +
      '<button class="btn" id="dCmp">' + ic("i-columns") + esc(t("d.compare")) + "</button>" +
      '<button class="btn" id="dIcs">' + ic("i-calendar") + esc(t("d.ical")) + (PRO.active ? "" : ' <span class="lock">' + ic("i-lock") + "</span>") + "</button>" +
      '<button class="btn" id="dPdf">' + ic("i-file") + esc(t("d.print")) + (PRO.active ? "" : ' <span class="lock">' + ic("i-lock") + "</span>") + "</button>";

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
        if (k === "__clear") { delete track[p.id]; lsSet("emt.track", track); toast(t("d.untracked")); }
        else { setTrack(p.id, { status: k }); toast(t("toast.status", { s: statusLabel(k) })); }
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
      var noteTimer;
      notes.addEventListener("input", function () {
        clearTimeout(noteTimer);
        noteTimer = setTimeout(function () { setTrack(p.id, { notes: notes.value }); }, 500);
      });
    }

    $("#dSave").addEventListener("click", function () {
      if (!toggleSave(p.id)) return;
      var on = isSaved(p.id);
      $("#dSave").innerHTML = ic("i-star") + esc(on ? t("d.saved") : t("d.save"));
      $("#dSave").classList.toggle("primary", on);
      refreshSaveState(p.id);
      if (S.flags.shortlist) render();
      toast(on ? t("toast.savedTo") : t("toast.removed"));
    });
    $("#dCmp").addEventListener("click", function () { toggleCompare(p.id); });
    $("#dIcs").addEventListener("click", function () {
      if (!PRO.gate(t("pro.icalName"))) return;
      var msg = window.EMT_EXPORT.ics([p]);
      toast(msg || t("exp.blocked"));
    });
    $("#dPdf").addEventListener("click", function () {
      if (!PRO.gate(t("pro.pdfName"))) return;
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
        if (!PRO.active) { openPro(t("pro.unlimitedCmp")); toast(t("toast.cmpLimit", { n: max })); return; }
        toast(t("cmp.max"));
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
    if (compare.length < 2) { toast(t("cmp.min2")); return; }
    var ps = compare.map(byId);
    var rows = [
      [t("cmp.rowCountry"), function (p) { return flagOf(p.country) + " " + C(p.country) + ", " + (p.city || ""); }],
      [t("cmp.rowRank"), function (p) { return rankText(p) || DASH; }, function (p) { return p.rank == null ? 1e9 : p.rank; }],
      [t("cmp.rowDeadline"), function (p) { var s = statusOf(p); return s.days == null ? (s.label || DASH) : fmtDate(s.date); }],
      [t("cmp.rowLeft"), function (p) { var s = statusOf(p); return s.days == null ? DASH : (s.days < 0 ? t("cd.closed") : fmtNum(s.days) + " " + t("cd.dayUnit")); }],
      [t("cmp.rowDuration"), function (p) { return DU(p.duration) || DASH; }],
      [t("cmp.rowLang"), function (p) { return LG(p.mainLanguage) || p.language || DASH; }],
      [t("cmp.rowTuition"), function (p) { return p.tuitionEur == null ? DASH : fmtEur(p.tuitionEur); }, function (p) { return p.tuitionEur == null ? 1e9 : p.tuitionEur; }],
      [t("cmp.rowLiving"), function (p) { return p.livingEur == null ? DASH : fmtEur(p.livingEur); }, function (p) { return p.livingEur == null ? 1e9 : p.livingEur; }],
      [t("cmp.rowTotal"), function (p) { var c = costOf(p); return c ? fmtEur(Math.round(c.total)) : DASH; }, function (p) { var c = costOf(p); return c ? c.total : 1e9; }],
      [t("cmp.rowSchool"), function (p) { return p.scholarshipSchool || DASH; }],
      [t("cmp.rowOther"), function (p) { return p.scholarshipOther || DASH; }],
      [t("cmp.rowReq"), function (p) { return p.requirements || DASH; }]
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
  var FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),' +
                  'textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
  var lastFocus = null;

  /* Giữ Tab quẩn trong hộp thoại đang mở — cần cho người dùng bàn phím / đọc màn hình */
  function trapFocus(e) {
    if (e.key !== "Tab") return;
    var box = $("#drawer").classList.contains("on") ? $("#drawer")
      : ["#proModal", "#expModal", "#cmpModal", "#helpModal"]
          .map(function (x) { return $(x); })
          .filter(function (el) { return el.classList.contains("on"); })[0];
    if (!box) return;
    var items = $$(FOCUSABLE, box).filter(function (el) { return el.offsetParent !== null || el === document.activeElement; });
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }

  function show(sel) {
    lastFocus = document.activeElement;
    $(sel).classList.add("on");
    document.body.style.overflow = "hidden";
    var f = $$(FOCUSABLE, $(sel))[0];
    if (f) f.focus();
  }
  function hide(sel) {
    $(sel).classList.remove("on");
    document.body.style.overflow = "";
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (e) {} }
  }

  function openPro(feature) {
    $("#keyMsg").className = "msg";
    if (feature) {
      $("#keyMsg").className = "msg info on";
      $("#keyMsg").textContent = t("pro.needKey", { f: feature });
    }
    show("#proModal");
  }

  function renderProModal() {
    $("#featList").innerHTML = CFG.FEATURES.map(function (f) {
      return '<div><span class="ic">' + ic(f.ic) + "</span><div><b>" + esc(L(f.t)) + "</b><span>" + esc(L(f.d)) + "</span></div></div>";
    }).join("");
    $("#buyBtn").href = CFG.GUMROAD_URL;
    syncProUI();
  }

  function syncProUI() {
    var on = PRO.active;
    $("#proBtnLabel").textContent = on ? t("act.proOn") : t("act.pro");
    $("#proBtn").classList.toggle("gold", !on);
    $("#proBtn").classList.toggle("primary", on);
    $("#exportLock").hidden = on;
    $("#deactivateBtn").hidden = !on;
    $$("#chips [data-pro-chip]").forEach(function (c) { c.classList.toggle("pro", !on); });
    if (on && PRO.info) {
      $("#keyMsg").className = "msg ok on";
      $("#keyMsg").textContent = t("pro.on") + (PRO.info.email ? ", " + PRO.info.email : "") +
        " (" + (PRO.info.source === "gumroad" ? t("pro.srcGumroad") : t("pro.srcLocal")) + ").";
      $("#keyInput").value = PRO.info.key;
    }
  }

  /* ================================================================ export */
  var EXPORTS = [
    { k: "xlsx",  ic: "i-file",        i: "exp.xlsx",  pro: true },
    { k: "pdf",   ic: "i-file",        i: "exp.pdf",   pro: true },
    { k: "doc",   ic: "i-file",        i: "exp.doc",   pro: true },
    { k: "ics",   ic: "i-calendar",    i: "exp.ics",   pro: true },
    { k: "csv",   ic: "i-rows",        i: "exp.csv",   pro: true },
    { k: "json",  ic: "i-list-checks", i: "exp.json",  pro: true },
    { k: "csv10", ic: "i-download",    i: "exp.csv10", pro: false }
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
      var locked = e.pro && !PRO.active;
      return '<div data-exp="' + e.k + '" style="cursor:pointer"><span class="ic">' + ic(e.ic) + "</span><div><b>" +
        esc(t(e.i)) + (locked ? ' <span class="lock">' + ic("i-lock") + "</span>" : "") +
        "</b><span>" + esc(t(e.i + "D")) + "</span></div></div>";
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
    $("#expSub").innerHTML = t("exp.count", { n: "<b>" + fmtNum(n) + "</b>" }) +
      (PRO.active ? "" : ' <span style="color:var(--muted)">' + esc(t("exp.needPro")) + "</span>");
  }

  function doExport(kind) {
    var list = scopeList();
    if (!list.length) { toast(t("exp.emptyScope")); return; }

    if (kind === "csv10") {
      var msg = window.EMT_EXPORT.csv(list.slice(0, 10));
      toast(msg || t("exp.blocked"));
      return;
    }
    if (!PRO.gate(t("pro.exportName", { k: kind.toUpperCase() }))) { hide("#expModal"); return; }

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

  /* ================================================================ facets */
  function fillFacets() {
    function fill(sel, values, cur, label) {
      var el = $(sel);
      var first = el.options[0];
      el.innerHTML = "";
      el.appendChild(first);
      values.forEach(function (v) {
        var o = document.createElement("option");
        o.value = v[0];
        o.textContent = label(v[0]) + " (" + v[1] + ")";
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
    fill("#fGroup", tally("group"), S.group, G);
    fill("#fCountry", tally("country"), S.country, C);
    fill("#fLang", tally("mainLanguage"), S.lang, LG);
  }

  /* Nhan cua o "Sap xep" khong the dat data-i18n vi value phai giu nguyen */
  var SORT_KEYS = {
    deadline: "sort.deadline", rank: "sort.rank",
    tuitionAsc: "sort.tuitionAsc", tuitionDesc: "sort.tuitionDesc",
    school: "sort.school", country: "sort.country"
  };
  function fillSortLabels() {
    $$("#fSort option").forEach(function (o) {
      var k = SORT_KEYS[o.value];
      if (k) o.textContent = t("sort.prefix") + t(k);
    });
  }

  /* So bo loc dang bat, hien tren nut "Bo loc" o man hinh hep */
  function updateFilterCount() {
    var n = 0;
    if (S.level) n++;
    if (S.group) n++;
    if (S.country) n++;
    if (S.lang) n++;
    if (S.win) n++;
    var el = $("#filterCount");
    if (!el) return;
    el.textContent = n;
    el.hidden = n === 0;
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
    [["#fLevel", "level"], ["#fGroup", "group"], ["#fCountry", "country"], ["#fLang", "lang"], ["#fWindow", "win"], ["#fSort", "sort"]]
      .forEach(function (pair) {
        $(pair[0]).addEventListener("change", function (e) { S[pair[1]] = e.target.value; renderLimit = 60; render(); });
      });

    /* chips */
    $$("#chips .chip[data-flag]").forEach(function (c) {
      c.addEventListener("click", function () {
        var f = c.dataset.flag;
        var isPro = ["cheap", "top50", "dated"].indexOf(f) !== -1;
        if (isPro && !PRO.active) { openPro(t("pro.advFilter")); return; }
        S.flags[f] = !S.flags[f];
        c.classList.toggle("on", !!S.flags[f]);
        renderLimit = 60;
        render();
      });
    });

    $("#resetBtn").addEventListener("click", function () {
      S.q = ""; S.level = ""; S.group = ""; S.country = ""; S.lang = ""; S.win = ""; S.sort = "deadline"; S.flags = {};
      $("#q").value = ""; $("#qClear").hidden = true;
      $("#fLevel").value = ""; $("#fGroup").value = ""; $("#fCountry").value = ""; $("#fLang").value = "";
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
            toast(isSaved(id) ? t("toast.savedTo") : t("toast.removed"));
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
      trapFocus(e);

      if (e.key === "Escape") {
        if ($("#drawer").classList.contains("on")) closeDrawer();
        else { hide("#proModal"); hide("#expModal"); hide("#cmpModal"); hide("#helpModal"); }
        return;
      }
      if (e.key === "Enter" && document.activeElement && document.activeElement.classList.contains("card")) {
        openDrawer(byId(+document.activeElement.dataset.id));
        return;
      }

      var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((document.activeElement || {}).tagName || "");
      if (typing || e.ctrlKey || e.metaKey || e.altKey) return;

      if (e.key === "/") { e.preventDefault(); $("#q").focus(); return; }
      if (e.key === "?") { e.preventDefault(); show("#helpModal"); return; }
      if (e.key >= "1" && e.key <= "4") {
        var views = ["cards", "timeline", "table", "tracker"];
        S.view = views[+e.key - 1];
        lsSet("emt.view", S.view);
        renderLimit = 60;
        render();
      }
    });

    /* drawer */
    $("#dClose").addEventListener("click", closeDrawer);
    $("#scrim").addEventListener("click", closeDrawer);

    /* nen sang / toi */
    $("#themeBtn").addEventListener("click", function () {
      var next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      lsSet("emt.theme", next);
      syncThemeIcon();
    });

    /* ngon ngu */
    $$("#langSeg button").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.dataset.lang === I18N.lang) return;
        I18N.set(b.dataset.lang);
      });
    });

    /* bo loc thu gon tren man hinh hep */
    var ft = $("#filterToggle");
    if (ft) {
      ft.addEventListener("click", function () {
        var open = $("#controls").classList.toggle("open");
        ft.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    /* premium */
    $("#proBtn").addEventListener("click", function () { openPro(""); });
    $("#proClose").addEventListener("click", function () { hide("#proModal"); });
    $("#proModal").addEventListener("click", function (e) { if (e.target.id === "proModal") hide("#proModal"); });
    $("#keyBtn").addEventListener("click", activateKey);
    $("#keyInput").addEventListener("keydown", function (e) { if (e.key === "Enter") activateKey(); });
    $("#deactivateBtn").addEventListener("click", function () {
      PRO.clear(); syncProUI(); syncTrialBar(); render();
      $("#keyMsg").className = "msg info on";
      $("#keyMsg").textContent = t("pro.off");
      toast(t("pro.off"));
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

    /* chia sẻ link kèm bộ lọc */
    $("#shareBtn").addEventListener("click", function () {
      var qs = stateToQuery();
      var base = embedMode ? CFG.FULL_URL : window.location.origin + window.location.pathname;
      var url = base + (qs ? "?" + qs.replace(/(^|&)embed=1(&|$)/, "$1").replace(/^&|&$/g, "") : "");
      function fallback() {
        window.prompt("Sao chép link này:", url);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          function () { toast(t("toast.copied")); },
          fallback
        );
      } else fallback();
    });

    /* hướng dẫn sử dụng */
    function openGuide(e) { if (e) e.preventDefault(); show("#guideModal"); }
    $("#guideBtn").addEventListener("click", openGuide);
    $("#guideLink").addEventListener("click", openGuide);
    $("#guideClose").addEventListener("click", function () { hide("#guideModal"); });
    $("#guideModal").addEventListener("click", function (e) { if (e.target.id === "guideModal") hide("#guideModal"); });

    /* dùng thử */
    function toKey() { hide("#trialModal"); openPro(""); setTimeout(function () { $("#keyInput").focus(); }, 60); }
    $("#trialKeyBtn").addEventListener("click", toKey);
    $("#trialModalKey").addEventListener("click", toKey);
    $("#trialClose").addEventListener("click", function () { hide("#trialModal"); });
    $("#trialModalContinue").addEventListener("click", function () { hide("#trialModal"); });
    $("#trialModal").addEventListener("click", function (e) { if (e.target.id === "trialModal") hide("#trialModal"); });

    /* phím tắt */
    $("#helpBtn").addEventListener("click", function () { show("#helpModal"); });
    $("#helpClose").addEventListener("click", function () { hide("#helpModal"); });
    $("#helpModal").addEventListener("click", function (e) { if (e.target.id === "helpModal") hide("#helpModal"); });

    /* ticker → mở chi tiết (gắn một lần) */
    $("#ticker").addEventListener("click", function () { if (tickerP) openDrawer(tickerP); });

    /* disclaimer */
    $("#disclaimerLink").addEventListener("click", function (e) {
      e.preventDefault();
      alert(L(CFG.DISCLAIMER));
    });
  }

  /* Bieu tuong nut doi nen: hien thi hanh dong ke tiep, khong phai trang thai */
  function syncThemeIcon() {
    var dark = document.documentElement.dataset.theme === "dark";
    var use = $("#themeIcon use");
    if (use) use.setAttribute("href", dark ? "#i-sun" : "#i-moon");
  }

  function syncLangUI() {
    $$("#langSeg button").forEach(function (b) {
      b.classList.toggle("on", b.dataset.lang === I18N.lang);
    });
  }

  /* Doi ngon ngu: ve lai toan bo phan sinh boi JS */
  function onLangChange() {
    syncLangUI();
    fillFacets();
    fillSortLabels();
    renderStats();
    renderTicker();
    renderProModal();
    updateHero();
    fillDynamicText();
    render();
    if (current && $("#drawer").classList.contains("on")) openDrawer(current);
  }

  function updateHero() {
    $("#heroLead").innerHTML = t("hero.lead", {
      n: '<b id="heroCount">' + fmtNum(ALL.length) + "</b>",
      c: '<b id="heroCountries">' + (DATA.meta.countries || []).length + "</b>"
    });
    $("#buildPill").textContent = t("hero.updated", { d: CFG.DATA_DATE });
  }

  /* Nội dung có tham số (số phút, số chương trình, giá) không đặt bằng data-i18n được */
  function fillDynamicText() {
    var m = CFG.TRIAL_MINUTES, n = CFG.FREE_VISIBLE || 50;
    $$("[data-guide]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-guide"), { m: m, n: n });
    });
    $("#trialSub").textContent = t("trial.sub", { m: m, n: n });
    $("#trialList").innerHTML = ["trial.unlock1", "trial.unlock2", "trial.unlock3", "trial.unlock4"].map(function (k) {
      return "<li>" + ic("i-check") + "<span>" + esc(t(k, { total: fmtNum(ALL.length) })) + "</span></li>";
    }).join("");
    var buy = t("trial.buy", { p: L(CFG.PRICE) });
    $("#trialModalBuy").innerHTML = ic("i-sparkle") + esc(buy);
    $("#trialBuyBtn").textContent = buy;
    $("#trialModalBuy").href = CFG.GUMROAD_URL;
    $("#trialBuyBtn").href = CFG.GUMROAD_URL;
    $("#trialModalContinue").textContent = t("trial.continue", { n: n });
    syncTrialBar();
  }

  function mmss(ms) {
    var sec = Math.ceil(ms / 1000), m = Math.floor(sec / 60), r = sec % 60;
    return m + ":" + (r < 10 ? "0" : "") + r;
  }

  var wasActive = null;
  function syncTrialBar() {
    var bar = $("#trialBar");
    if (PRO.licensed) { bar.hidden = true; return; }
    bar.hidden = false;
    var over = PRO.trialOver();
    bar.classList.toggle("over", over);
    $("#trialTxt").textContent = over
      ? t("trial.over", { m: CFG.TRIAL_MINUTES, n: CFG.FREE_VISIBLE || 50, locked: fmtNum(ALL.length - (CFG.FREE_VISIBLE || 50)) })
      : t("trial.running", { t: mmss(PRO.trialLeft()) });
  }

  /* Gọi mỗi giây: cập nhật đồng hồ, và khi vừa hết giờ thì khoá lại + mời mua */
  function trialTick() {
    var now = PRO.active;
    syncTrialBar();
    if (wasActive === true && !now) {
      Object.keys(S.flags).forEach(function (f) {
        if (["cheap", "top50", "dated"].indexOf(f) !== -1 && S.flags[f]) {
          S.flags[f] = false;
          var c = $('#chips [data-flag="' + f + '"]');
          if (c) c.classList.remove("on");
        }
      });
      syncProUI();
      render();
      showTrialEnded();
    }
    wasActive = now;
  }

  function showTrialEnded() {
    if ($("#proModal").classList.contains("on")) return;
    show("#trialModal");
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
        syncTrialBar();
        render();
        toast(t("pro.unlocked"));
        setTimeout(function () { hide("#proModal"); }, 1400);
      }
    });
  }

  /* ================================================================= init */
  function init() {
    if (!ALL.length) {
      document.querySelector("main").innerHTML =
        '<div class="wrap empty"><div class="big">' + ic("i-warning") + "</div><h3>" + t("err.dataTitle") + "</h3>" +
        "<p>Thiếu file <code>data/programs.js</code>. Chạy <code>python tools/build_data.py</code> để tạo lại.</p></div>";
      return;
    }

    var th = lsGet("emt.theme", null);
    if (th) document.documentElement.dataset.theme = th;

    /* chế độ nhúng cho Google Sites: index.html?embed=1 */
    var qp = new URLSearchParams(window.location.search);
    if (qp.get("embed") === "1" || (window.self !== window.top && qp.get("embed") !== "0")) {
      embedMode = true;
      document.body.classList.add("embed");
      var full = $("#openFull");
      full.hidden = false;
      var rest = window.location.search.slice(1).split("&").filter(function (kv) {
        return kv && kv.split("=")[0] !== "embed";
      });
      full.href = CFG.FULL_URL + "?" + ["embed=0"].concat(rest).join("&");
    }

    $("#yr").textContent = new Date().getFullYear();

    I18N.apply(document);
    I18N.onChange(onLangChange);
    syncLangUI();
    syncThemeIcon();
    fillSortLabels();
    updateHero();

    // đồng bộ nhãn chip miễn phí/pro
    fillFacets();
    applyQuery(qp);
    renderStats();
    renderTicker();
    renderProModal();
    bind();
    fillDynamicText();
    wasActive = PRO.active;
    setInterval(trialTick, 1000);

    $$("#nav button").forEach(function (b) { b.classList.toggle("on", b.dataset.view === S.view); });
    render();

    // vào lại trang khi đã hết dùng thử: nhắc một lần mỗi phiên
    if (PRO.trialOver()) {
      var seenEnd = false;
      try { seenEnd = sessionStorage.getItem("emt.trialEndSeen") === "1"; sessionStorage.setItem("emt.trialEndSeen", "1"); } catch (e) {}
      if (!seenEnd) setTimeout(showTrialEnded, 900);
    }

    // gợi ý nhẹ cho người dùng lần đầu
    if (!lsGet("emt.seen", false)) {
      lsSet("emt.seen", true);
      setTimeout(function () {
        toast(t("tip.keys"));
      }, 2200);
    }

    // cập nhật đếm ngược mỗi phút (thẻ + bảng)
    setInterval(function () {
      var k = todayKey();
      if (dlCacheDay !== k) { dlCache = {}; dlCacheDay = k; renderTicker(); render(); }
      updateFilterCount();
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
    openDrawerById: function (id) { openDrawer(byId(id)); },
    statusOf: statusOf,
    filtered: filtered,
    all: ALL,
    _S: S
  };

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
