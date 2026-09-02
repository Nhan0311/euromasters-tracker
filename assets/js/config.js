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

  /* ---- Key offline (dự phòng) -------------------------------------------
     Dùng khi Gumroad API không gọi được (chặn CORS / offline), hoặc khi bạn
     muốn tự phát key cho khách VIP. Sinh key bằng: python tools/genkey.py 10

     ⚠ SALT NÀY NẰM TRONG MÃ NGUỒN CÔNG KHAI — ai đọc được là tự sinh key được.
     Đây chỉ là lưới an toàn, KHÔNG phải lớp bảo vệ thật. Lớp bảo vệ thật là
     Gumroad. Khi Gumroad license đã chạy ổn, đặt ALLOW_OFFLINE_KEYS: false.
  ------------------------------------------------------------------------ */
  KEY_SALT: "euromasters-2026",
  ALLOW_OFFLINE_KEYS: true,

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
    { k: "interested", t: "Quan tâm",       c: "#64748b" },
    { k: "preparing",  t: "Đang chuẩn bị",  c: "#0d8ee0" },
    { k: "submitted",  t: "Đã nộp",         c: "#7c3aed" },
    { k: "interview",  t: "Phỏng vấn",      c: "#d97706" },
    { k: "offer",      t: "Trúng tuyển",    c: "#0f9d6e" },
    { k: "rejected",   t: "Từ chối",        c: "#e11d48" }
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
