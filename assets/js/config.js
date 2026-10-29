/* ==========================================================================
   EuroMasters — cấu hình. Sửa file này, không cần đụng vào app.js.
   ========================================================================== */
window.EMT_CONFIG = {
  brand: "EuroMasters",

  /* ---- Gumroad ----------------------------------------------------------
     GUMROAD_URL      : link bán hàng hiển thị trên nút "Mua key ↗"
     GUMROAD_PERMALINK: phần đuôi sau /l/ trong link Gumroad (ở đây là "euromasters-pro")
     GUMROAD_PRODUCT_ID: (tuỳ chọn) product_id dạng dài của Gumroad.
        Gumroad khuyến nghị dùng product_id; nếu để trống app sẽ dùng permalink.
        Lấy tại: Gumroad → Product → Share → "Product ID" hoặc qua API /v2/products
     Đổi link mới sau này: chỉ cần sửa 2-3 dòng dưới đây.
  ------------------------------------------------------------------------ */
  GUMROAD_URL: "https://haiktsduoihiennha.gumroad.com/l/euromasters-pro",
  GUMROAD_PERMALINK: "euromasters-pro",
  GUMROAD_PRODUCT_ID: "",

  /* Số thiết bị tối đa cho 1 key (Gumroad trả về "uses").
     Đặt 0 để không giới hạn. */
  MAX_USES: 5,

  /* ---- Master key (1 key duy nhất của tác giả) --------------------------
     Key thô KHÔNG nằm trong file này — chỉ lưu SHA-256 để người xem mã nguồn
     không đọc được key. Đổi key mới:
         python tools/keyhash.py "KEY-MOI-CUA-BAN"
     rồi dán chuỗi hash in ra vào MASTER_KEY_HASH bên dưới.

     ⚠ Đây vẫn là kiểm tra phía trình duyệt nên người rành kỹ thuật có thể
     vượt qua. Khi bắt đầu bán cho nhiều người, dùng license key của Gumroad
     (mỗi đơn một key, thu hồi được) — xem README mục 6.
  ------------------------------------------------------------------------ */
  KEY_SALT: "euromasters-2026",
  MASTER_KEY_HASH: "cce88d32d5cadf177516ea52eccdc971515ce25e1eb5e8db4ce69009fa30826c",

  /* Giới hạn bản miễn phí */
  FREE_SHORTLIST_MAX: 5,
  FREE_COMPARE_MAX: 2,

  /* Dùng thử: người mới được dùng đủ tính năng Pro trong TRIAL_MINUTES phút.
     Hết giờ thì khoá Pro và chỉ cho xem FREE_VISIBLE chương trình có hạn gần nhất. */
  TRIAL_MINUTES: 5,
  FREE_VISIBLE: 50,

  /* Giá hiển thị trên nút mua (khớp với giá trên Gumroad) */
  PRICE: { vi: "1,99 USD", en: "US$1.99" },

  /* Link chia sẻ khi đang nhúng trong Google Sites: trang danh sách trên
     website Hai KTS (không lộ địa chỉ GitHub). */
  FULL_URL: "https://www.haiktsduoihiennha.com/danh-s%C3%A1ch-ch%C6%B0%C6%A1ng-tr%C3%ACnh-th%E1%BA%A1c-s%C4%A9-2026",

  /* Ngày cập nhật dữ liệu (hiển thị ở hero) */
  DATA_DATE: "10/2026",

  /* ---- Nội dung song ngữ -----------------------------------------------
     Mọi chuỗi hiển thị đều viết dạng { vi: "…", en: "…" }.
     Muốn thêm ngôn ngữ: thêm khoá vào đây và vào assets/js/i18n.js.
     "ic" là id biểu tượng trong bộ sprite ở đầu index.html (không dùng emoji).
  ------------------------------------------------------------------------ */

  /* Tính năng Pro, hiển thị trong hộp thoại nâng cấp */
  FEATURES: [
    { ic: "i-grid",
      t: { vi: "Xem toàn bộ danh sách", en: "The full list" },
      d: { vi: "Tất cả chương trình cử nhân, thạc sĩ, tiến sĩ và khoá online. Bản miễn phí chỉ xem 50 chương trình có hạn gần nhất.",
           en: "Every bachelor's, master's, PhD and online programme. The free version shows only the 50 nearest deadlines." } },
    { ic: "i-file",
      t: { vi: "Xuất Excel (.xlsx)", en: "Excel export (.xlsx)" },
      d: { vi: "Toàn bộ 20 cột dữ liệu và cột đếm ngược, mở bằng Excel hoặc Google Sheets.",
           en: "All 20 data columns plus the countdown, opens in Excel or Google Sheets." } },
    { ic: "i-file",
      t: { vi: "Xuất PDF chuẩn in", en: "Print-ready PDF" },
      d: { vi: "Báo cáo dàn trang đẹp, giữ nguyên dấu tiếng Việt, in hoặc lưu PDF.",
           en: "A laid-out report that keeps Vietnamese diacritics, print it or save as PDF." } },
    { ic: "i-file",
      t: { vi: "Xuất Word (.doc)", en: "Word export (.doc)" },
      d: { vi: "Bản hồ sơ từng trường để chèn vào kế hoạch du học của bạn.",
           en: "A per-school write-up you can drop into your own application plan." } },
    { ic: "i-calendar",
      t: { vi: "Nhắc lịch iCal (.ics)", en: "Calendar reminders (.ics)" },
      d: { vi: "Nạp deadline vào Google hoặc Apple Calendar, tự báo trước 30, 14, 7 và 1 ngày.",
           en: "Load deadlines into Google or Apple Calendar with alerts 30, 14, 7 and 1 day ahead." } },
    { ic: "i-folder",
      t: { vi: "Bảng theo dõi hồ sơ", en: "Application board" },
      d: { vi: "Trạng thái từ Quan tâm tới Kết quả, kèm ghi chú riêng cho từng trường.",
           en: "Track each school from Interested through to the final result, with your own notes." } },
    { ic: "i-list-checks",
      t: { vi: "Checklist giấy tờ", en: "Document checklist" },
      d: { vi: "10 đầu mục hồ sơ cho từng trường, có thanh tiến độ riêng.",
           en: "Ten document items per school, each with its own progress bar." } },
    { ic: "i-columns",
      t: { vi: "So sánh không giới hạn", en: "Unlimited comparison" },
      d: { vi: "Đặt cạnh nhau tới 6 chương trình, tự tô đậm lựa chọn tốt nhất.",
           en: "Put up to six programmes side by side, the best value in each row is highlighted." } },
    { ic: "i-calculator",
      t: { vi: "Máy tính chi phí du học", en: "Cost calculator" },
      d: { vi: "Học phí cộng sinh hoạt phí nhân thời gian học, quy đổi EUR sang VND.",
           en: "Tuition plus living costs across the full course, converted from EUR to VND." } },
    { ic: "i-funnel",
      t: { vi: "Bộ lọc nâng cao", en: "Advanced filters" },
      d: { vi: "Lọc theo học phí, Top 50 QS, chỉ chương trình có ngày hạn cụ thể.",
           en: "Filter by tuition, QS top 50, or only programmes with an exact deadline." } },
    { ic: "i-star",
      t: { vi: "Danh sách không giới hạn", en: "Unlimited shortlist" },
      d: { vi: "Bản miễn phí lưu tối đa 5 trường, bản Pro không giới hạn.",
           en: "The free version saves five schools, Pro has no limit." } }
  ],

  /* Các đầu mục hồ sơ trong checklist */
  DOCS: [
    { vi: "Hộ chiếu còn hạn", en: "Valid passport" },
    { vi: "Bằng tốt nghiệp và bảng điểm (dịch công chứng)", en: "Degree and transcript (certified translation)" },
    { vi: "Chứng chỉ tiếng Anh (IELTS/TOEFL)", en: "English certificate (IELTS/TOEFL)" },
    { vi: "Chứng chỉ ngôn ngữ bản địa (nếu cần)", en: "Local language certificate (if required)" },
    { vi: "Portfolio / Sample of work", en: "Portfolio / sample of work" },
    { vi: "Thư động lực (SOP / Motivation letter)", en: "Statement of purpose / motivation letter" },
    { vi: "CV học thuật", en: "Academic CV" },
    { vi: "Thư giới thiệu #1", en: "Reference letter #1" },
    { vi: "Thư giới thiệu #2", en: "Reference letter #2" },
    { vi: "Chứng minh tài chính / học bổng", en: "Proof of funding or scholarship" }
  ],

  /* Trạng thái hồ sơ. "c" nằm trên thang trung tính đến xanh, không đụng màu deadline. */
  STATUSES: [
    { k: "interested", t: { vi: "Quan tâm",      en: "Interested" }, c: "#7d8676" },
    { k: "preparing",  t: { vi: "Đang chuẩn bị", en: "Preparing" },  c: "#5c8a4a" },
    { k: "submitted",  t: { vi: "Đã nộp",        en: "Submitted" },  c: "#1d7a46" },
    { k: "interview",  t: { vi: "Phỏng vấn",     en: "Interview" },  c: "#96761a" },
    { k: "offer",      t: { vi: "Trúng tuyển",   en: "Offer" },      c: "#17673a" },
    { k: "rejected",   t: { vi: "Từ chối",       en: "Rejected" },   c: "#bf3030" }
  ],

  /* Tỉ giá tham chiếu để quy đổi (cập nhật khi cần) */
  VND_PER_EUR: 29700,

  DISCLAIMER: {
    vi: "Dữ liệu được tổng hợp thủ công từ website các trường và bảng xếp hạng QS 2026, " +
        "có thể thay đổi bất cứ lúc nào. Trước khi nộp hồ sơ, hãy luôn kiểm tra lại hạn nộp, " +
        "học phí và yêu cầu đầu vào trên trang chính thức của trường. " +
        "Ứng dụng này là công cụ theo dõi, không phải nguồn thông tin pháp lý.",
    en: "This data was compiled by hand from university websites and the QS 2026 rankings, and can change " +
        "at any time. Before you apply, always re-check the deadline, tuition and entry requirements on the " +
        "university's own page. This app is a tracking tool, not a legal source of information."
  }
};

/* Cờ quốc gia (emoji) theo tên tiếng Việt trong bảng dữ liệu */
window.EMT_FLAGS = {
  "Vương quốc Anh": "🇬🇧", "Đức": "🇩🇪", "Pháp": "🇫🇷", "Ý": "🇮🇹", "Hà Lan": "🇳🇱",
  "Thụy Sĩ": "🇨🇭", "Bỉ": "🇧🇪", "Thụy Điển": "🇸🇪", "Đan Mạch": "🇩🇰", "Tây Ban Nha": "🇪🇸",
  "Áo": "🇦🇹", "Séc": "🇨🇿", "Phần Lan": "🇫🇮", "Na Uy": "🇳🇴", "Ireland": "🇮🇪",
  "Bồ Đào Nha": "🇵🇹", "Thổ Nhĩ Kỳ": "🇹🇷", "Hungary": "🇭🇺", "Hy Lạp": "🇬🇷",
  "Ba Lan": "🇵🇱", "Estonia": "🇪🇪", "Lithuania": "🇱🇹", "Litva": "🇱🇹",
  "Latvia": "🇱🇻", "Slovenia": "🇸🇮", "Croatia": "🇭🇷", "Slovakia": "🇸🇰", "Romania": "🇷🇴",
  "Serbia": "🇷🇸", "Luxembourg": "🇱🇺", "Malta": "🇲🇹", "Síp": "🇨🇾", "Iceland": "🇮🇸",
  "Toàn châu Âu": "🇪🇺"
};

/* Mã quốc gia dùng cho link Google Maps / tìm kiếm */
window.EMT_ISO = {
  "Vương quốc Anh": "UK", "Đức": "Germany", "Pháp": "France", "Ý": "Italy", "Hà Lan": "Netherlands",
  "Thụy Sĩ": "Switzerland", "Bỉ": "Belgium", "Thụy Điển": "Sweden", "Đan Mạch": "Denmark",
  "Tây Ban Nha": "Spain", "Áo": "Austria", "Séc": "Czechia", "Phần Lan": "Finland", "Na Uy": "Norway",
  "Ireland": "Ireland", "Bồ Đào Nha": "Portugal", "Thổ Nhĩ Kỳ": "Turkey", "Hungary": "Hungary",
  "Hy Lạp": "Greece", "Ba Lan": "Poland", "Estonia": "Estonia", "Lithuania": "Lithuania",
  "Latvia": "Latvia", "Slovenia": "Slovenia", "Croatia": "Croatia", "Slovakia": "Slovakia",
  "Romania": "Romania", "Serbia": "Serbia", "Luxembourg": "Luxembourg", "Malta": "Malta",
  "Síp": "Cyprus", "Iceland": "Iceland", "Toàn châu Âu": "Europe"
};
