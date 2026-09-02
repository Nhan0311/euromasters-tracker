# EuroMasters — Deadline Tracker

Web app tĩnh theo dõi **hạn nộp hồ sơ & hạn học bổng** của **282 chương trình thạc sĩ tại 22 quốc gia châu Âu** (QS Subject Rankings 2026), với đồng hồ đếm ngược thời gian thực, dòng thời gian, bảng lọc, và bộ tính năng Pro bán qua Gumroad.

Không cần build, không cần server — chỉ là HTML/CSS/JS thuần, chạy được trên **GitHub Pages** và nhúng thẳng vào **Google Sites**.

---

## 1. Có gì trong app

**Miễn phí**
- 282 chương trình · 10 nhóm ngành · 22 quốc gia
- Đếm ngược từng chương trình, tự theo múi giờ trình duyệt
- 4 chế độ xem: Khám phá (thẻ) · Dòng thời gian · Bảng · Hồ sơ của tôi
- Tìm kiếm không dấu, lọc theo ngành / quốc gia / ngôn ngữ / khoảng hạn nộp
- Chi tiết từng trường: học phí, sinh hoạt phí, học bổng, yêu cầu đầu vào, mô tả
- 9 liên kết tài liệu dựng sẵn cho mỗi trường (trang chương trình, admissions, học phí, học bổng, yêu cầu portfolio, brochure PDF, bản đồ, hồ sơ QS, review du học sinh Việt)
- Lưu tối đa 5 trường vào danh sách ★, so sánh 2 trường
- Xuất thử CSV 10 dòng
- Sáng/tối, responsive, có hiệu ứng chuyển động theo con trỏ

**Pro (mở bằng license key)**
| Tính năng | Mô tả |
|---|---|
| Excel `.xlsx` | 26 cột + sheet tóm tắt, autofilter, hyperlink website |
| PDF | Báo cáo dàn trang chuẩn in, giữ nguyên dấu tiếng Việt |
| Word `.doc` | Hồ sơ từng trường dạng bảng, mở bằng MS Word |
| iCal `.ics` | Nạp deadline vào Google/Apple Calendar, nhắc trước 30–14–7–1 ngày |
| CSV đầy đủ / JSON | Cho Google Sheets, Notion, Airtable, hoặc lập trình viên |
| Bảng theo dõi hồ sơ | 6 cột trạng thái: Quan tâm → Đang chuẩn bị → Đã nộp → Phỏng vấn → Trúng tuyển / Từ chối |
| Checklist giấy tờ | 10 đầu mục cho từng trường, có thanh tiến độ |
| Ghi chú cá nhân | Lưu riêng cho từng chương trình |
| So sánh tới 6 trường | Tự tô đậm lựa chọn tốt nhất mỗi tiêu chí |
| Máy tính chi phí | Học phí × số năm + sinh hoạt phí × số tháng, quy đổi EUR ↔ VND |
| Bộ lọc nâng cao | Học phí ≤ €5.000 · Top 50 QS · chỉ chương trình có ngày hạn cụ thể |
| Danh sách ★ không giới hạn | Bản miễn phí giới hạn 5 |

Mọi dữ liệu cá nhân (danh sách ★, trạng thái hồ sơ, ghi chú, license key) đều lưu trong `localStorage` của trình duyệt — **không có server, không gửi đi đâu**.

---

## 2. Cấu trúc thư mục

```
euromasters-tracker/
├── index.html                  ← trang duy nhất
├── assets/
│   ├── css/style.css           ← design system (tokens sáng/tối, motion)
│   └── js/
│       ├── config.js           ← ⚙ CHỈ CẦN SỬA FILE NÀY (Gumroad, giá, tính năng…)
│       ├── premium.js          ← xác thực license (Gumroad API + key offline)
│       ├── exporters.js        ← Excel / CSV / Word / PDF / iCal / JSON
│       └── app.js              ← logic chính: deadline, lọc, render, drawer
├── data/
│   ├── programs.json           ← dữ liệu đã chuẩn hoá (nguồn cho mọi thứ)
│   └── programs.js             ← bản `window.EMT_DATA = …` để chạy được cả từ file://
├── tools/
│   ├── build_data.py           ← Excel → JSON (bóc tách deadline tiếng Việt)
│   ├── genkey.py               ← sinh license key offline
│   ├── test.js                 ← test logic (58 assertion, không cần cài gì)
│   └── test-dom.js             ← test tích hợp DOM thật (90 assertion, cần jsdom)
└── .nojekyll                   ← để GitHub Pages phục vụ nguyên trạng
```

---

## 3. Chạy thử tại máy

```bash
# mở trực tiếp cũng được (data/programs.js không cần fetch)
start index.html

# hoặc chạy server tĩnh cho giống môi trường thật
python -m http.server 8000
# → http://localhost:8000
```

---

## 4. Đưa lên GitHub Pages

```bash
cd euromasters-tracker
git init -b main
git add .
git commit -m "EuroMasters deadline tracker"
gh repo create euromasters-tracker --public --source=. --push
gh api -X POST repos/:owner/euromasters-tracker/pages -f "source[branch]=main" -f "source[path]=/"
```

Hoặc thủ công: tạo repo trên github.com → push → **Settings → Pages → Source: `main` / `(root)` → Save**.

Sau ~1 phút, app chạy tại:

```
https://<tên-github>.github.io/euromasters-tracker/
```

> Mỗi lần sửa xong chỉ cần `git add . && git commit -m "..." && git push` — Pages tự cập nhật.

---

## 5. Nhúng vào Google Sites

1. Mở trang Google Sites → **Chèn → Nhúng → Theo URL**
2. Dán:
   ```
   https://<tên-github>.github.io/euromasters-tracker/?embed=1
   ```
3. Kéo khung nhúng cao **tối thiểu 900 px** (app có bộ lọc + lưới thẻ nên cần chiều cao).

`?embed=1` sẽ ẩn phần hero, thu gọn header và hiện nút **“Mở toàn màn hình ↗”**.
App cũng **tự nhận biết khi đang nằm trong iframe** nên nếu quên tham số vẫn hoạt động đúng.

Tham số URL khác:

| Tham số | Ví dụ | Tác dụng |
|---|---|---|
| `?embed=1` | | bật chế độ nhúng |
| `?embed=0` | | ép chế độ đầy đủ (dùng cho nút mở tab mới) |
| `?view=` | `?view=timeline` | mở thẳng chế độ xem: `cards` `timeline` `table` `tracker` |
| `?q=` | `?q=architecture` | mở với từ khoá tìm sẵn |

**Lưu ý quan trọng về khung nhúng:** Google Sites chạy nội dung trong iframe có sandbox, nên **việc tải file (.xlsx, .ics, .doc…) có thể bị chặn**. App sẽ báo lỗi kèm hướng dẫn, và nút **“Mở toàn màn hình ↗”** luôn hiển thị ở chế độ nhúng để người dùng sang tab riêng tải file. Nên ghi thêm một dòng hướng dẫn ngay dưới khung nhúng trên Google Sites.

---

## 6. Bán key trên Gumroad

### 6.1 Đổi link sản phẩm

Sửa `assets/js/config.js`:

```js
GUMROAD_URL:        "https://haiktsduoihiennha.gumroad.com/l/mnnfbc",
GUMROAD_PERMALINK:  "mnnfbc",     // phần sau /l/
GUMROAD_PRODUCT_ID: "",           // tuỳ chọn, xem 6.2
MAX_USES: 5,                      // số thiết bị / 1 key (0 = không giới hạn)
```

Đó là toàn bộ những gì cần đổi khi bạn có link mới.

### 6.2 Bật license key trên Gumroad

Trong trang sản phẩm Gumroad: **Product → Settings → bật “Generate a license key per sale”**.
Từ đó mỗi đơn hàng sẽ nhận một key; người mua dán key vào app → app gọi
`POST https://api.gumroad.com/v2/licenses/verify` để xác thực.

Gumroad khuyến nghị dùng `product_id` thay cho `product_permalink`. Nếu muốn dùng, lấy `product_id`
trong trang **Share** của sản phẩm rồi điền vào `GUMROAD_PRODUCT_ID`.

App tự kiểm tra và **từ chối** key nếu đơn đã `refunded`, `chargebacked`, `disputed`, hết hạn subscription, hoặc vượt `MAX_USES`.

### 6.3 Key offline (dự phòng & khách VIP)

Khi API Gumroad không gọi được (mạng chặn / CORS), hoặc khi bạn muốn tự phát key:

```bash
python tools/genkey.py 20          # in 20 key dạng XXXX-XXXX-XXXX-XXXX
python tools/genkey.py verify ABCD-EFGH-JKLM-NPQR
```

Key được xác thực bằng checksum FNV-1a với `KEY_SALT` trong `config.js`.
**Hãy đổi `KEY_SALT` thành chuỗi bí mật của riêng bạn trước khi phát hành**, rồi sinh lại key
(đổi salt sẽ làm mọi key cũ mất hiệu lực). Muốn tắt hẳn cơ chế này: `ALLOW_OFFLINE_KEYS: false`.

### 6.4 Về mức độ bảo vệ — nói thẳng

Đây là app tĩnh, nên **việc kiểm tra key diễn ra trong trình duyệt và người rành kỹ thuật có thể vượt qua**
(mở DevTools, sửa `localStorage`, hoặc chạy bản copy). Với sản phẩm thông tin giá vừa phải thì mức này là hợp lý —
đa số người mua sẽ trả tiền cho tiện lợi. Nếu sau này doanh thu đủ lớn và bạn muốn siết chặt, hướng đi là:

1. Đặt một endpoint nhỏ (Cloudflare Worker / Vercel Function) giữ Gumroad access token
2. App gọi endpoint đó thay vì gọi thẳng Gumroad, endpoint trả về **dữ liệu Pro đã ký (JWT ngắn hạn)**
3. Chuyển phần dữ liệu giá trị cao (ví dụ toàn bộ cột học bổng & yêu cầu) sang chỉ trả về sau khi xác thực

Cách đó đòi hỏi một server nhỏ — nằm ngoài phạm vi bản tĩnh hiện tại.

---

## 7. Cập nhật dữ liệu từ Excel

Khi bạn sửa file Excel nguồn:

```bash
pip install openpyxl
python tools/build_data.py "đường/dẫn/tới/file.xlsx"
```

Script đọc 5 sheet chương trình, chuẩn hoá 20 cột, rồi ghi `data/programs.json` + `data/programs.js`.

**Phần khó nhất là bóc tách hạn nộp** — cột “Hạn nộp hồ sơ” là văn bản tự do tiếng Việt.
Script nhận diện được các dạng:

| Dạng trong Excel | Kết quả |
|---|---|
| `15/1 hàng năm` | lặp hằng năm → luôn đếm ngược tới 15/1 kế tiếp |
| `31/5/2026` | ngày cụ thể |
| `1/12/2025 - 2/1/2026` | cửa sổ nộp, lấy ngày chốt |
| `khoảng tháng 3 hàng năm` | ước lượng → lấy ngày cuối tháng, gắn nhãn “ngày ước lượng” |
| `Không có hạn cố định / rolling` | hiển thị “Nhận hồ sơ quanh năm” |
| `Không rõ` | hiển thị “Chưa rõ ngày — theo dõi web trường” |

Kết quả bóc tách hiện tại: **106 ngày cụ thể · 38 cửa sổ · 85 ước lượng theo tháng · 28 rolling · 25 chưa rõ**.

Nếu một chương trình có ngày ghi rõ năm nhưng **đã trôi qua**, app hiển thị ngày cùng kỳ của chu kỳ sau
và gắn nhãn rõ ràng **“ước tính đợt sau”**, kèm cảnh báo trong bảng chi tiết. Ngày nguyên văn từ nguồn
luôn được hiển thị bên dưới để đối chiếu.

---

## 8. Kiểm thử

```bash
node tools/test.js          # 58 assertion — logic deadline, lọc, xuất file, license
npm install jsdom           # (một lần)
node tools/test-dom.js      # 90 assertion — DOM thật: click, lọc, drawer, gate Pro, xuất file
```

Cả hai đều `exit 1` khi có lỗi, dùng được trong CI.

---

## 9. Tuỳ biến nhanh

Mọi thứ hay đổi đều nằm trong `assets/js/config.js`:

| Muốn đổi | Sửa |
|---|---|
| Link Gumroad | `GUMROAD_URL`, `GUMROAD_PERMALINK` |
| Số trường lưu được ở bản free | `FREE_SHORTLIST_MAX` |
| Số trường so sánh ở bản free | `FREE_COMPARE_MAX` |
| Danh sách tính năng Pro hiển thị | `FEATURES` |
| Các đầu mục checklist giấy tờ | `DOCS` |
| Các trạng thái hồ sơ | `STATUSES` |
| Tỉ giá quy đổi VND | `VND_PER_EUR` |
| Ngày cập nhật hiển thị ở hero | `DATA_DATE` |
| Miễn trừ trách nhiệm | `DISCLAIMER` |

Màu sắc, bo góc, đổ bóng: khối `:root` và `html[data-theme="dark"]` ở đầu `assets/css/style.css`.

---

## 10. Miễn trừ trách nhiệm

Dữ liệu được tổng hợp thủ công từ website các trường và bảng xếp hạng QS 2026, **có thể thay đổi bất cứ lúc nào**.
Trước khi nộp hồ sơ, luôn kiểm tra lại hạn nộp, học phí và yêu cầu đầu vào trên trang chính thức của trường
(nút “Trang chương trình chính thức” trong app). Ứng dụng là công cụ theo dõi, không phải nguồn thông tin pháp lý.
