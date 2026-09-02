/* ==========================================================================
   EuroMasters — cấu hình. Sửa file này, không cần đụng vào app.js.
   ========================================================================== */
window.EMT_CONFIG = {
  brand: "EuroMasters",

  /* ---- Gumroad ----------------------------------------------------------
     GUMROAD_URL      : link bán hàng hiển thị trên nút "Mua key ↗"
     GUMROAD_PERMALINK: phần đuôi sau /l/ trong link Gumroad (ở đây là "mnnfbc")
     GUMROAD_PRODUCT_ID: (tuỳ chọn) product_id dạng dài của Gumroad.
        Gumroad khuyến nghị dùng product_id; nếu để trống app sẽ dùng permalink.
        Lấy tại: Gumroad → Product → Share → "Product ID" hoặc qua API /v2/products
     Đổi link mới sau này: chỉ cần sửa 2-3 dòng dưới đây.
  ------------------------------------------------------------------------ */
  GUMROAD_URL: "https://haiktsduoihiennha.gumroad.com/l/mnnfbc",
  GUMROAD_PERMALINK: "mnnfbc",
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
  MASTER_KEY_HASH: "9a1de218ba45c19dfa11e463081e8530b01c598e8b1abb48ff25a7e4f83aa462",

  /* Giới hạn bản miễn phí */
  FREE_SHORTLIST_MAX: 5,
  FREE_COMPARE_MAX: 2,

  /* Ngày cập nhật dữ liệu (hiển thị ở hero) */
  DATA_DATE: "09/2026",

  /* Tính năng Pro — hiển thị trong modal nâng cấp */
  FEATURES: [
    { ic: "📊", t: "Xuất Excel (.xlsx)", d: "Toàn bộ 20 cột dữ liệu + cột đếm ngược, mở bằng Excel / Google Sheets." },
    { ic: "🖨️", t: "Xuất PDF chuẩn in", d: "Báo cáo dàn trang đẹp, giữ nguyên dấu tiếng Việt, in hoặc lưu PDF." },
    { ic: "📝", t: "Xuất Word (.doc)", d: "Bản hồ sơ từng trường để chèn vào kế hoạch du học của bạn." },
    { ic: "📅", t: "Nhắc lịch iCal (.ics)", d: "Nạp deadline vào Google/Apple Calendar, tự báo trước 30–14–7–1 ngày." },
    { ic: "🗂️", t: "Bảng theo dõi hồ sơ", d: "Trạng thái Quan tâm → Đang chuẩn bị → Đã nộp → Kết quả, kèm ghi chú." },
    { ic: "✅", t: "Checklist giấy tờ", d: "10 đầu mục hồ sơ cho từng trường, có thanh tiến độ riêng." },
    { ic: "⚖️", t: "So sánh không giới hạn", d: "Đặt cạnh nhau tới 6 chương trình, tự tô đậm lựa chọn tốt nhất." },
    { ic: "💰", t: "Máy tính chi phí du học", d: "Học phí + sinh hoạt phí × thời gian học, quy đổi EUR/VND." },
    { ic: "🔍", t: "Bộ lọc nâng cao", d: "Lọc theo học phí, Top 50 QS, chỉ chương trình có ngày hạn cụ thể." },
    { ic: "★",  t: "Danh sách không giới hạn", d: "Bản miễn phí lưu tối đa 5 trường, bản Pro không giới hạn." }
  ],

  /* Các đầu mục hồ sơ trong checklist */
  DOCS: [
    "Hộ chiếu còn hạn",
    "Bằng tốt nghiệp + bảng điểm (dịch công chứng)",
    "Chứng chỉ tiếng Anh (IELTS/TOEFL)",
    "Chứng chỉ ngôn ngữ bản địa (nếu cần)",
    "Portfolio / Sample of work",
    "Thư động lực (SOP / Motivation letter)",
    "CV học thuật",
    "Thư giới thiệu #1",
    "Thư giới thiệu #2",
    "Chứng minh tài chính / học bổng"
  ],

  /* Trạng thái hồ sơ */
  STATUSES: [
    { k: "interested", t: "Quan tâm",       c: "#8a8f78" },
    { k: "preparing",  t: "Đang chuẩn bị",  c: "#7f9436" },
    { k: "submitted",  t: "Đã nộp",         c: "#c2691a" },
    { k: "interview",  t: "Phỏng vấn",      c: "#b8860b" },
    { k: "offer",      t: "Trúng tuyển",    c: "#3f7d4f" },
    { k: "rejected",   t: "Từ chối",        c: "#b03a1c" }
  ],

  /* Tỉ giá tham chiếu để quy đổi (cập nhật khi cần) */
  VND_PER_EUR: 28500,

  DISCLAIMER:
    "Dữ liệu được tổng hợp thủ công từ website các trường và bảng xếp hạng QS 2026, " +
    "có thể thay đổi bất cứ lúc nào. Trước khi nộp hồ sơ, hãy luôn kiểm tra lại hạn nộp, " +
    "học phí và yêu cầu đầu vào trên trang chính thức của trường (nút “Trang chương trình chính thức”). " +
    "Ứng dụng này là công cụ theo dõi, không phải nguồn thông tin pháp lý."
};

/* Cờ quốc gia (emoji) theo tên tiếng Việt trong bảng dữ liệu */
window.EMT_FLAGS = {
  "Vương quốc Anh": "🇬🇧", "Đức": "🇩🇪", "Pháp": "🇫🇷", "Ý": "🇮🇹", "Hà Lan": "🇳🇱",
  "Thụy Sĩ": "🇨🇭", "Bỉ": "🇧🇪", "Thụy Điển": "🇸🇪", "Đan Mạch": "🇩🇰", "Tây Ban Nha": "🇪🇸",
  "Áo": "🇦🇹", "Séc": "🇨🇿", "Phần Lan": "🇫🇮", "Na Uy": "🇳🇴", "Ireland": "🇮🇪",
  "Bồ Đào Nha": "🇵🇹", "Thổ Nhĩ Kỳ": "🇹🇷", "Hungary": "🇭🇺", "Hy Lạp": "🇬🇷",
  "Ba Lan": "🇵🇱", "Estonia": "🇪🇪", "Lithuania": "🇱🇹", "Litva": "🇱🇹"
};

/* Mã quốc gia dùng cho link Google Maps / tìm kiếm */
window.EMT_ISO = {
  "Vương quốc Anh": "UK", "Đức": "Germany", "Pháp": "France", "Ý": "Italy", "Hà Lan": "Netherlands",
  "Thụy Sĩ": "Switzerland", "Bỉ": "Belgium", "Thụy Điển": "Sweden", "Đan Mạch": "Denmark",
  "Tây Ban Nha": "Spain", "Áo": "Austria", "Séc": "Czechia", "Phần Lan": "Finland", "Na Uy": "Norway",
  "Ireland": "Ireland", "Bồ Đào Nha": "Portugal", "Thổ Nhĩ Kỳ": "Turkey", "Hungary": "Hungary",
  "Hy Lạp": "Greece", "Ba Lan": "Poland", "Estonia": "Estonia", "Lithuania": "Lithuania"
};
