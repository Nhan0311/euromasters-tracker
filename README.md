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
- **Cảnh báo link hỏng**: 25 trang trường đã đổi đường dẫn được đánh dấu sẵn, app tự chuyển sang link tìm kiếm
- **Chia sẻ bộ lọc**: mọi bộ lọc đều nằm trên URL, bấm 🔗 để sao chép
- **Phím tắt**: `/` tìm · `1`–`4` đổi view · `?` bảng phím tắt · `Esc` đóng
- Sáng/tối (tông olive + cam), responsive, hiệu ứng chuyển động theo con trỏ, bẫy focus cho người dùng bàn phím

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
│   ├── programs.js             ← bản `window.EMT_DATA = …` để chạy được cả từ file://
│   └── link-status.json        ← trạng thái link, sống sót qua mỗi lần rebuild
├── tools/
│   ├── build_data.py           ← Excel → JSON (bóc tách deadline tiếng Việt)
│   ├── keyhash.py              ← sinh SHA-256 cho master key
│   ├── check_links.sh          ← kiểm tra 282 link còn sống không
│   ├── apply_linkcheck.py      ← gộp kết quả vào data/link-status.json
│   ├── test.js                 ← test logic (64 assertion, không cần cài gì)
│   └── test-dom.js             ← test tích hợp DOM thật (106 assertion, cần jsdom)
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
| `?country=` `?group=` `?lang=` `?win=` `?sort=` `?flags=` | | khôi phục nguyên bộ lọc — nút 🔗 tự tạo giúp bạn |

**Lưu ý quan trọng về khung nhúng:** Google Sites chạy nội dung trong iframe có sandbox, nên **việc tải file (.xlsx, .ics, .doc…) có thể bị chặn**. App sẽ báo lỗi kèm hướng dẫn, và nút **“Mở toàn màn hình ↗”** luôn hiển thị ở chế độ nhúng để người dùng sang tab riêng tải file. Nên ghi thêm một dòng hướng dẫn ngay dưới khung nhúng trên Google Sites.

---

## 6. Key Pro

Có **hai đường** mở khoá Pro, app thử theo thứ tự:

### 6.1 Master key — 1 key duy nhất của bạn

Dùng ngay được, không cần mạng, không cần cấu hình gì thêm. Key hiện tại:

```
HAIKTSDUHOCY2026
```

Chấp nhận cả chữ thường và dấu gạch (`haik-tsdu-hocy-2026` cũng vào).

Key **thô không nằm trong mã nguồn** — `config.js` chỉ chứa SHA-256 của nó, nên người mở DevTools
đọc file cũng không thấy key. Muốn đổi key khác:

```bash
python tools/keyhash.py "KEY-MOI-CUA-BAN"
# → dán chuỗi in ra vào MASTER_KEY_HASH trong assets/js/config.js
```

### 6.2 Gumroad — khi bắt đầu bán cho nhiều người

Sửa `assets/js/config.js`:

```js
GUMROAD_URL:        "https://haiktsduoihiennha.gumroad.com/l/mnnfbc",
GUMROAD_PERMALINK:  "mnnfbc",     // phần sau /l/
GUMROAD_PRODUCT_ID: "",           // tuỳ chọn, lấy ở trang Share của sản phẩm
MAX_USES: 5,                      // số thiết bị / 1 key (0 = không giới hạn)
```

Trong Gumroad: **Product → Settings → bật “Generate a license key per sale”**.
Mỗi đơn hàng sẽ có key riêng; app gọi `POST https://api.gumroad.com/v2/licenses/verify`
và **từ chối** key nếu đơn đã `refunded`, `chargebacked`, `disputed`, hết hạn subscription,
hoặc vượt `MAX_USES`. Ưu điểm so với master key: thu hồi được từng key, biết ai mua.

### 6.3 Về mức độ bảo vệ — nói thẳng

Đây là app tĩnh nên **việc kiểm tra key diễn ra trong trình duyệt và người rành kỹ thuật có thể vượt qua**
(sửa `localStorage`, hoặc chạy bản copy đã sửa). Với sản phẩm thông tin giá vừa phải thì mức này hợp lý —
đa số người mua trả tiền cho sự tiện lợi, không phải cho DRM. Khi doanh thu đủ lớn và muốn siết chặt:

1. Đặt endpoint nhỏ (Cloudflare Worker / Vercel Function) giữ Gumroad access token
2. App gọi endpoint đó thay vì gọi thẳng Gumroad; endpoint trả về **JWT ngắn hạn đã ký**
3. Chuyển phần dữ liệu giá trị cao (ví dụ toàn bộ cột học bổng & yêu cầu đầu vào) sang chỉ tải sau khi xác thực

Cách đó cần một server nhỏ — nằm ngoài phạm vi bản tĩnh hiện tại.

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

### Kiểm tra sức khoẻ link

Website các trường đổi đường dẫn liên tục. Chạy định kỳ (khuyến nghị 3–6 tháng/lần):

```bash
bash tools/check_links.sh > .linkcheck-results.tsv     # ~3 phút cho 282 link
python tools/apply_linkcheck.py .linkcheck-results.tsv # gộp vào data/link-status.json
python tools/build_data.py                             # nạp vào programs.json
```

Kết quả lần kiểm tra gần nhất: **233 link còn sống · 25 link chết (404) · 24 link bị site chặn bot**
(403/timeout — mở bằng trình duyệt thật vẫn vào được, app không cảnh báo nhóm này).

Với link chết, app **không xoá dữ liệu** mà đổi nút chính thành “Tìm trang mới ↗” trỏ tới tìm kiếm
Google theo tên trường + tên chương trình, đồng thời vẫn giữ link cũ ở dạng mờ để đối chiếu.
`data/link-status.json` được commit nên trạng thái này sống sót qua mọi lần dựng lại từ Excel.

---

## 8. Kiểm thử

```bash
node tools/test.js          # 64 assertion — deadline, lọc, xuất file, master key, SHA-256
npm install jsdom           # (một lần)
node tools/test-dom.js      # 106 assertion — DOM thật: click, lọc, drawer, gate Pro, xuất file,
                            #                 link hỏng, đồng bộ URL, phím tắt
```

Cả hai đều `exit 1` khi có lỗi, dùng được trong CI.

---

## 9. Tuỳ biến nhanh

Mọi thứ hay đổi đều nằm trong `assets/js/config.js`:

| Muốn đổi | Sửa |
|---|---|
| Master key Pro | `MASTER_KEY_HASH` (sinh bằng `python tools/keyhash.py`) |
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
