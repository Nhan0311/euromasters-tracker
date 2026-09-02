/* ==========================================================================
   EuroMasters — bộ xuất dữ liệu (Excel / CSV / Word / PDF / iCal / JSON)
   Tất cả chạy phía trình duyệt, không gửi dữ liệu đi đâu.
   ========================================================================== */
(function () {
  "use strict";
  var CFG = window.EMT_CONFIG;

  /* ---------------------------------------------------------------- utils */
  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function stamp() {
    var d = new Date();
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + "-" + pad(d.getHours()) + pad(d.getMinutes());
  }

  function download(blob, filename) {
    try {
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 4000);
      return true;
    } catch (e) {
      return false;
    }
  }

  var loaded = {};
  function loadScript(src) {
    if (loaded[src]) return loaded[src];
    loaded[src] = new Promise(function (res, rej) {
      var s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = res;
      s.onerror = function () { delete loaded[src]; rej(new Error("Không tải được " + src)); };
      document.head.appendChild(s);
    });
    return loaded[src];
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }

  /* ------------------------------------------------------ chuẩn hoá 1 dòng */
  var HEADERS = [
    "STT", "Nhóm ngành", "Xếp hạng QS 2026", "Ngành cụ thể", "Trường", "Chương trình",
    "Quốc gia", "Thành phố", "Hạn nộp (nguyên văn)", "Hạn kế tiếp", "Còn lại (ngày)", "Độ tin cậy ngày",
    "Thời gian học", "Ngôn ngữ", "Học phí", "Học phí ~EUR/năm", "Chi phí sinh hoạt",
    "Học bổng của trường", "Học bổng khác", "Yêu cầu đầu vào", "Mô tả", "Ghi chú", "Website",
    "Trạng thái hồ sơ", "Ghi chú cá nhân", "Tiến độ giấy tờ"
  ];

  function rowOf(p, i) {
    var nx = window.EMT.nextDeadline(p);
    var tr = window.EMT.getTrack(p.id);
    var st = tr && tr.status ? (window.EMT.statusLabel(tr.status)) : "";
    var docs = tr && tr.docs ? Object.keys(tr.docs).filter(function (k) { return tr.docs[k]; }).length : 0;
    return [
      i + 1, p.group || "", p.rankText || "", p.field || "", p.school || "", p.program || "",
      p.country || "", p.city || "", p.deadlineRaw || "",
      nx ? window.EMT.fmtDate(nx.date) : "",
      nx ? window.EMT.daysLeft(nx.date) : "",
      nx ? (nx.rolled ? "Ước tính đợt sau" : nx.approx ? "Ước lượng theo tháng" : nx.exact ? "Chính xác" : "Lặp hằng năm") : "—",
      p.duration || "", p.language || "", p.tuitionRaw || "",
      (p.tuitionEur == null ? "" : p.tuitionEur), p.livingRaw || "",
      p.scholarshipSchool || "", p.scholarshipOther || "", p.requirements || "",
      p.desc || "", p.notes || "", p.link || "",
      st, (tr && tr.notes) || "", docs + "/" + CFG.DOCS.length
    ];
  }

  /* ------------------------------------------------------------------ CSV */
  function toCSV(list) {
    function cell(v) {
      var s = String(v == null ? "" : v);
      return /[",\n;]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
    }
    var lines = [HEADERS.map(cell).join(",")];
    list.forEach(function (p, i) { lines.push(rowOf(p, i).map(cell).join(",")); });
    return "\uFEFF" + lines.join("\r\n"); // BOM để Excel đọc đúng tiếng Việt
  }

  function exportCSV(list) {
    var ok = download(new Blob([toCSV(list)], { type: "text/csv;charset=utf-8" }),
      "EuroMasters-" + list.length + "-chuong-trinh-" + stamp() + ".csv");
    return ok ? "Đã tải file CSV (" + list.length + " dòng)." : null;
  }

  /* ----------------------------------------------------------------- XLSX */
  function exportXLSX(list) {
    return loadScript("https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js")
      .then(function () {
        var XLSX = window.XLSX;
        var aoa = [HEADERS].concat(list.map(function (p, i) { return rowOf(p, i); }));
        var ws = XLSX.utils.aoa_to_sheet(aoa);

        ws["!cols"] = [
          { wch: 5 }, { wch: 22 }, { wch: 30 }, { wch: 20 }, { wch: 40 }, { wch: 42 },
          { wch: 16 }, { wch: 14 }, { wch: 46 }, { wch: 13 }, { wch: 11 }, { wch: 20 },
          { wch: 18 }, { wch: 20 }, { wch: 40 }, { wch: 15 }, { wch: 30 },
          { wch: 40 }, { wch: 32 }, { wch: 50 }, { wch: 55 }, { wch: 40 }, { wch: 46 },
          { wch: 16 }, { wch: 34 }, { wch: 12 }
        ];
        ws["!autofilter"] = { ref: XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: aoa.length - 1, c: HEADERS.length - 1 } }) };
        ws["!freeze"] = { xSplit: "0", ySplit: "1" };

        // hyperlink cột Website
        var wsCol = HEADERS.indexOf("Website");
        list.forEach(function (p, i) {
          if (!p.link) return;
          var ref = XLSX.utils.encode_cell({ r: i + 1, c: wsCol });
          if (ws[ref]) ws[ref].l = { Target: p.link, Tooltip: p.school };
        });

        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Chương trình");

        // sheet tóm tắt
        var byCountry = {}, byGroup = {};
        list.forEach(function (p) {
          byCountry[p.country] = (byCountry[p.country] || 0) + 1;
          byGroup[p.group] = (byGroup[p.group] || 0) + 1;
        });
        var sum = [["EuroMasters — Bản xuất ngày " + new Date().toLocaleString("vi-VN")], [],
          ["Tổng số chương trình", list.length], [], ["Theo quốc gia", ""]];
        Object.keys(byCountry).sort().forEach(function (k) { sum.push([k, byCountry[k]]); });
        sum.push([], ["Theo nhóm ngành", ""]);
        Object.keys(byGroup).sort().forEach(function (k) { sum.push([k, byGroup[k]]); });
        sum.push([], ["Lưu ý", CFG.DISCLAIMER]);
        var ws2 = XLSX.utils.aoa_to_sheet(sum);
        ws2["!cols"] = [{ wch: 42 }, { wch: 90 }];
        XLSX.utils.book_append_sheet(wb, ws2, "Tóm tắt");

        XLSX.writeFile(wb, "EuroMasters-" + list.length + "-chuong-trinh-" + stamp() + ".xlsx");
        return "Đã tải file Excel (" + list.length + " dòng, 2 sheet).";
      });
  }

  /* ----------------------------------------------------------------- Word */
  function programBlockHTML(p, i) {
    var nx = window.EMT.nextDeadline(p);
    var tr = window.EMT.getTrack(p.id);
    function row(k, v) {
      if (!v) return "";
      return '<tr><td width="150" style="background:#f4f5f9;font-weight:bold">' + esc(k) + "</td><td>" + esc(v) + "</td></tr>";
    }
    return '<div style="page-break-inside:avoid;margin-bottom:18pt">' +
      "<h2 style='font-size:13pt;margin:0 0 2pt'>" + (i + 1) + ". " + esc(p.program) + "</h2>" +
      "<p style='margin:0 0 6pt;color:#444'><b>" + esc(p.school) + "</b> — " + esc(p.city) + ", " + esc(p.country) + "</p>" +
      '<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%;font-size:9.5pt">' +
      row("Xếp hạng QS", p.rankText) +
      row("Ngành", p.field) +
      row("Hạn nộp hồ sơ", p.deadlineRaw) +
      row("Hạn kế tiếp", nx ? window.EMT.fmtDate(nx.date) + "  (còn " + window.EMT.daysLeft(nx.date) + " ngày)" : "—") +
      row("Thời gian học", p.duration) +
      row("Ngôn ngữ giảng dạy", p.language) +
      row("Học phí", p.tuitionRaw) +
      row("Chi phí sinh hoạt", p.livingRaw) +
      row("Học bổng của trường", p.scholarshipSchool) +
      row("Học bổng khác", p.scholarshipOther) +
      row("Yêu cầu đầu vào", p.requirements) +
      row("Mô tả", p.desc) +
      row("Ghi chú", p.notes) +
      row("Website", p.link) +
      (tr && tr.status ? row("Trạng thái hồ sơ", window.EMT.statusLabel(tr.status)) : "") +
      (tr && tr.notes ? row("Ghi chú cá nhân", tr.notes) : "") +
      "</table></div>";
  }

  function docHTML(list, title) {
    return "<html xmlns:o='urn:schemas-microsoft-com:office:office' " +
      "xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>" +
      "<head><meta charset='utf-8'><title>" + esc(title) + "</title>" +
      "<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->" +
      "<style>@page{size:A4;margin:1.6cm} body{font-family:'Segoe UI',Arial,sans-serif;font-size:10.5pt;color:#111}" +
      "h1{font-size:17pt;margin:0 0 2pt} .sub{color:#666;font-size:9pt;margin-bottom:14pt}</style></head><body>" +
      "<h1>" + esc(title) + "</h1>" +
      "<div class='sub'>" + list.length + " chương trình · Xuất ngày " + new Date().toLocaleString("vi-VN") +
      " · EuroMasters Deadline Tracker</div>" +
      list.map(programBlockHTML).join("") +
      "<hr><p style='font-size:8.5pt;color:#666'>" + esc(CFG.DISCLAIMER) + "</p>" +
      "</body></html>";
  }

  function exportDOC(list) {
    var html = docHTML(list, "Hồ sơ chương trình thạc sĩ châu Âu");
    var ok = download(new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" }),
      "EuroMasters-ho-so-" + list.length + "-truong-" + stamp() + ".doc");
    return ok ? "Đã tải file Word (" + list.length + " chương trình)." : null;
  }

  /* ------------------------------------------------------------- PDF (in) */
  function printHTML(list, mode) {
    var head = "<h1>" + (mode === "table" ? "Bảng theo dõi hạn nộp hồ sơ" : "Hồ sơ chương trình thạc sĩ châu Âu") + "</h1>" +
      '<div class="p-sub">' + list.length + " chương trình · Xuất ngày " + new Date().toLocaleString("vi-VN") +
      " · EuroMasters Deadline Tracker</div>";

    var body;
    if (mode === "table") {
      body = "<table><thead><tr>" +
        ["#", "Trường", "Chương trình", "Nước", "Hạn kế tiếp", "Còn", "Học phí", "Ngôn ngữ"]
          .map(function (h) { return "<th>" + h + "</th>"; }).join("") +
        "</tr></thead><tbody>" +
        list.map(function (p, i) {
          var nx = window.EMT.nextDeadline(p);
          return "<tr><td>" + (i + 1) + "</td><td>" + esc(p.school) + "</td><td>" + esc(p.program) +
            "</td><td>" + esc(p.country) + "</td><td>" + (nx ? window.EMT.fmtDate(nx.date) : "—") +
            "</td><td>" + (nx ? window.EMT.daysLeft(nx.date) + " ngày" : "—") +
            "</td><td>" + esc(p.tuitionRaw) + "</td><td>" + esc(p.language) + "</td></tr>";
        }).join("") + "</tbody></table>";
    } else {
      body = list.map(function (p, i) {
        var nx = window.EMT.nextDeadline(p);
        function li(k, v) { return v ? "<div><b>" + esc(k) + ":</b> " + esc(v) + "</div>" : ""; }
        return '<div class="p-card"><h3>' + (i + 1) + ". " + esc(p.program) + "</h3>" +
          "<div style='color:#555;margin-bottom:6px'>" + esc(p.school) + " — " + esc(p.city) + ", " + esc(p.country) +
          (p.rankText ? " · " + esc(p.rankText) : "") + "</div>" +
          "<div style='font-size:10px;line-height:1.55'>" +
          li("Hạn nộp", p.deadlineRaw) +
          (nx ? li("Hạn kế tiếp", window.EMT.fmtDate(nx.date) + " (còn " + window.EMT.daysLeft(nx.date) + " ngày)") : "") +
          li("Thời gian học", p.duration) + li("Ngôn ngữ", p.language) +
          li("Học phí", p.tuitionRaw) + li("Sinh hoạt phí", p.livingRaw) +
          li("Học bổng trường", p.scholarshipSchool) + li("Học bổng khác", p.scholarshipOther) +
          li("Yêu cầu", p.requirements) + li("Website", p.link) +
          "</div></div>";
      }).join("");
    }

    return head + body + "<hr><p style='font-size:9px;color:#666'>" + esc(CFG.DISCLAIMER) + "</p>";
  }

  function exportPDF(list, mode) {
    var root = document.getElementById("printroot");
    root.innerHTML = '<button class="btn p-close" id="pClose">✕ Đóng</button>' + printHTML(list, mode || "cards");
    root.classList.add("show");
    document.body.style.overflow = "hidden";
    var close = function () {
      root.classList.remove("show");
      root.innerHTML = "";
      document.body.style.overflow = "";
    };
    root.querySelector("#pClose").addEventListener("click", close);
    setTimeout(function () {
      window.print();
      setTimeout(close, 800);
    }, 220);
    return "Đang mở hộp thoại in — chọn “Lưu dưới dạng PDF / Save as PDF”.";
  }

  /* ----------------------------------------------------------------- iCal */
  function icsEscape(s) {
    return String(s == null ? "" : s)
      .replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
  }
  function fold(line) {
    if (line.length <= 74) return line;
    var out = line.slice(0, 74), rest = line.slice(74);
    while (rest.length > 73) { out += "\r\n " + rest.slice(0, 73); rest = rest.slice(73); }
    return out + "\r\n " + rest;
  }
  function icsDate(d) {
    return d.getUTCFullYear() + pad(d.getUTCMonth() + 1) + pad(d.getUTCDate());
  }
  function icsStamp(d) {
    return icsDate(d) + "T" + pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + "Z";
  }

  function exportICS(list) {
    var now = new Date();
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//EuroMasters//Deadline Tracker//VI",
      "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:EuroMasters — Hạn nộp hồ sơ",
      "X-WR-TIMEZONE:UTC"];
    var n = 0;
    list.forEach(function (p) {
      var nx = window.EMT.nextDeadline(p);
      if (!nx) return;
      n++;
      var end = new Date(nx.date.getTime() + 86400000);
      var desc = [
        p.school,
        "Chương trình: " + p.program,
        "Địa điểm: " + p.city + ", " + p.country,
        "Hạn nộp (nguyên văn): " + p.deadlineRaw,
        p.rankText ? "QS: " + p.rankText : "",
        p.tuitionRaw ? "Học phí: " + p.tuitionRaw : "",
        p.language ? "Ngôn ngữ: " + p.language : "",
        p.scholarshipSchool ? "Học bổng: " + p.scholarshipSchool : "",
        p.requirements ? "Yêu cầu: " + p.requirements : "",
        p.link ? "Website: " + p.link : "",
        nx.rolled
          ? "⚠ Đợt trong nguồn (" + window.EMT.fmtDate(nx.prev) + ") đã đóng; ngày này là ước tính cho đợt kế tiếp — hãy kiểm tra lại trên web trường."
          : (nx.exact ? "" : "⚠ Ngày ước lượng từ mô tả — hãy kiểm tra lại trên web trường.")
      ].filter(Boolean).join("\n");

      L.push("BEGIN:VEVENT");
      L.push("UID:emt-" + p.id + "-" + icsDate(nx.date) + "@euromasters");
      L.push("DTSTAMP:" + icsStamp(now));
      L.push("DTSTART;VALUE=DATE:" + icsDate(nx.date));
      L.push("DTEND;VALUE=DATE:" + icsDate(end));
      L.push(fold("SUMMARY:" + icsEscape("🎓 Hạn nộp: " + p.school + " — " + p.program)));
      L.push(fold("DESCRIPTION:" + icsEscape(desc)));
      L.push(fold("LOCATION:" + icsEscape(p.city + ", " + p.country)));
      if (p.link) L.push(fold("URL:" + p.link));
      L.push("CATEGORIES:" + icsEscape(p.group || "Thạc sĩ"));
      L.push("TRANSP:TRANSPARENT");
      ["-P30D", "-P14D", "-P7D", "-P1D"].forEach(function (t) {
        L.push("BEGIN:VALARM", "ACTION:DISPLAY",
          fold("DESCRIPTION:" + icsEscape("Sắp đến hạn nộp: " + p.school)),
          "TRIGGER;RELATED=START:" + t, "END:VALARM");
      });
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR");
    if (!n) return "Không có chương trình nào có ngày hạn cụ thể để tạo lịch.";
    var ok = download(new Blob([L.join("\r\n") + "\r\n"], { type: "text/calendar;charset=utf-8" }),
      "EuroMasters-deadlines-" + stamp() + ".ics");
    return ok ? "Đã tải file lịch .ics (" + n + " sự kiện, nhắc trước 30/14/7/1 ngày)." : null;
  }

  /* ----------------------------------------------------------------- JSON */
  function exportJSON(list) {
    var payload = {
      exportedAt: new Date().toISOString(),
      app: "EuroMasters Deadline Tracker",
      count: list.length,
      programs: list.map(function (p) {
        var nx = window.EMT.nextDeadline(p);
        var o = JSON.parse(JSON.stringify(p));
        o.nextDeadline = nx ? { date: nx.date.toISOString().slice(0, 10), exact: nx.exact, daysLeft: window.EMT.daysLeft(nx.date) } : null;
        o.tracking = window.EMT.getTrack(p.id) || null;
        return o;
      })
    };
    var ok = download(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" }),
      "EuroMasters-" + list.length + "-" + stamp() + ".json");
    return ok ? "Đã tải file JSON (" + list.length + " bản ghi)." : null;
  }

  window.EMT_EXPORT = {
    csv: exportCSV,
    xlsx: exportXLSX,
    doc: exportDOC,
    pdf: exportPDF,
    ics: exportICS,
    json: exportJSON,
    _download: download
  };
})();
