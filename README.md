# EuroMasters - Deadline Tracker

**Một sản phẩm của Hai KTS dưới hiên nhà.**

Web app tĩnh theo dõi **hạn nộp hồ sơ và hạn học bổng** của **282 chương trình thạc sĩ tại 22 quốc gia châu Âu** (QS Subject Rankings 2026), với đồng hồ đếm ngược thời gian thực, dòng thời gian, bảng lọc, và bộ tính năng Pro bán qua Gumroad.

Giao diện **song ngữ Việt - Anh**, có **nền sáng và nền tối**, dựng riêng cho từng cỡ màn hình từ điện thoại 360px tới màn hình 2560px.

Không cần build, không cần server: chỉ là HTML/CSS/JS thuần, chạy được trên **GitHub Pages** và nhúng thẳng vào **Google Sites**.

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
- **Phím tắt**: `/` tìm, `1` tới `4` đổi view, `?` bảng phím tắt, `Esc` đóng
- **Song ngữ Việt - Anh**: đổi bằng một chạm, nhớ lựa chọn, chia sẻ được qua `?ui=en`
- **Nền sáng và nền tối**: theo cài đặt hệ thống, đổi tay được, nhớ lựa chọn
- Vừa vặn trên điện thoại, iPad, laptop và màn hình lớn (xem mục 11)

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
│   ├── css/style.css           ← design system (màu, bo góc, chữ, mọi điểm ngắt màn hình)
│   └── js/
│       ├── i18n.js             ← từ điển Việt/Anh + dịch tên nước, nhóm ngành, thời lượng học
│       ├── config.js           ← ⚙ CHỈ CẦN SỬA FILE NÀY (Gumroad, giá, tính năng…)
│       ├── premium.js          ← xác thực license (Gumroad API + key offline)
│       ├── exporters.js        ← Excel / CSV / Word / PDF / iCal / JSON
│       └── app.js              ← logic chính: deadline, lọc, render, drawer
├── data/
│   ├── programs.json           ← dữ liệu đã chuẩn hoá (nguồn cho mọi thứ)
│   ├── programs.js             ← bản `window.EMT_DATA = …` để chạy được cả từ file://
│   ├── link-status.json        ← trạng thái link, sống sót qua mỗi lần rebuild
│   └── link-overrides.json     ← URL sửa tay, thắng URL trong Excel (xem mục 8)
├── tools/
│   ├── build_data.py           ← Excel → JSON (bóc tách deadline tiếng Việt)
│   ├── keyhash.py              ← sinh SHA-256 cho master key
│   ├── check_links.js          ← kiểm tra link: mã HTTP, URL sau chuyển hướng, tiêu đề trang
│   ├── check_links.sh          ← bản cũ, chỉ xem mã HTTP (giữ lại để đối chiếu)
│   ├── apply_linkcheck.py      ← gộp kết quả bản .sh vào data/link-status.json
│   ├── shots.js                ← chụp ảnh giao diện ở 8 cỡ màn hình, báo lỗi tràn ngang
│   ├── test.js                 ← test logic (64 assertion, không cần cài gì)
│   └── test-dom.js             ← test tích hợp DOM thật (136 assertion, cần jsdom)
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
HAIKTSDUHOC2026
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
GUMROAD_URL:        "https://haiktsduoihiennha.gumroad.com/l/euromasters-pro",
GUMROAD_PERMALINK:  "euromasters-pro",   // phần sau /l/
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
node tools/test.js          # 64 assertion: deadline, lọc, xuất file, master key, SHA-256
npm install jsdom           # (một lần)
node tools/test-dom.js      # 136 assertion: DOM thật. Click, lọc, drawer, gate Pro, xuất file,
                            # link hỏng, đồng bộ URL, phím tắt, song ngữ, nền sáng tối,
                            # bộ lọc thu gọn, nhãn cột cho bảng trên điện thoại
```

Cả hai đều `exit 1` khi có lỗi, dùng được trong CI.

**Kiểm tra bố cục thật trên trình duyệt** (cần Chrome hoặc Edge):

```bash
node tools/shots.js shots    # chụp 8 cỡ màn hình × 2 nền, in ra cảnh báo nếu trang bị tràn ngang
```

Script nói chuyện thẳng với Chrome DevTools Protocol nên giả lập được đúng iPhone 360-430px,
điều mà cờ `--window-size` không làm được (Chrome trên Windows ép cửa sổ rộng tối thiểu ~500px).
Mỗi cỡ cho hai ảnh: `-fold` là khung nhìn đầu tiên, `-full` là toàn trang.

**Kiểm tra link của từng trường**:

```bash
node tools/check_links.js                  # quét toàn bộ, in báo cáo, chưa ghi vào dữ liệu
node tools/check_links.js --apply          # ghi vào data/link-status.json
node tools/check_links.js --only-dead      # chỉ kiểm tra lại những link từng hỏng
python tools/build_data.py                 # nạp lại vào programs.json
```

Ngoài mã HTTP, bản này còn đi theo chuyển hướng, đọc `<title>` trang đích và cảnh báo khi:
link bị đá về trang chủ, đổi tên miền, hoặc tiêu đề trang không dính gì tới tên trường và tên ngành.
Lỗi mạng tạm thời (timeout, TLS) **không** được phép gỡ một kết luận "hỏng" đã chắc chắn trước đó.

**Sửa một link sai**: đừng sửa thẳng vào `data/programs.json`, vì mỗi lần dựng lại từ Excel là mất.
Thêm một mục vào `data/link-overrides.json`, khoá là URL cũ trong Excel:

```json
"https://link-cu-trong-excel/...": {
  "to": "https://link-moi-da-kiem-tra/...",
  "school": "Tên trường",
  "reason": "vì sao phải đổi"
}
```

`tools/build_data.py` đọc file này sau khi đọc Excel nên link đã sửa sống sót qua mọi lần dựng lại.
Khi nào sửa được file Excel gốc thì xoá mục tương ứng ở đây.

Lần quét ngày 04/09/2026: 282 chương trình, **0 link hỏng**, 31 link không kiểm tra tự động được
(site chặn bot hoặc lỗi chứng chỉ TLS, mở bằng trình duyệt thật vẫn vào bình thường),
44 link đã được sửa qua `link-overrides.json`.

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

Chữ hiển thị của giao diện nằm trong `assets/js/i18n.js`. Mỗi khoá có một dòng `vi` và một dòng `en`.
Muốn thêm ngôn ngữ thứ ba: thêm một khoá vào `DICT` rồi thêm một nút vào `#langSeg` trong `index.html`.

Màu sắc, bo góc, đổ bóng: khối `:root` và `html[data-theme="dark"]` ở đầu `assets/css/style.css`.

---

## 10. Design system và cách co giãn theo màn hình

Bốn quy ước đã khoá, sửa gì cũng phải theo (ghi ngay đầu `style.css`):

| Quy ước | Nội dung |
|---|---|
| Màu | **Một** màu thương hiệu duy nhất (`--accent`, xanh lá). Dải vàng, cam, đỏ chỉ mang nghĩa "còn bao nhiêu thời gian", không dùng để trang trí. |
| Bo góc | nút và ô nhập 10px, thẻ và khung 16px, sheet 24px, chip bo tròn. |
| Chữ | `Be Vietnam Pro` cho mọi thứ (font Việt, đủ dấu), `JetBrains Mono` cho con số và phím tắt. |
| Cỡ chữ | luôn dùng `clamp()`, không đặt cỡ cố định. |

Biểu tượng là một bộ sprite SVG nằm ngay đầu `index.html`, nét dày 1.7 đồng đều.
Giao diện không dùng emoji; riêng cờ quốc gia vẫn là emoji vì đó là **dữ liệu**, không phải biểu tượng giao diện.

**Từng cỡ màn hình:**

| Bề rộng | Thay đổi |
|---|---|
| ≥ 1181px | Hero chia hai cột: nội dung bên trái, thẻ đếm ngược hạn gần nhất bên phải. Chọn chế độ xem nằm trong thanh trên cùng. |
| 900 - 1180px | Hero về một cột. Lưới thẻ tự rút số cột. |
| ≤ 899px | Chọn chế độ xem **rời xuống thanh cố định dưới đáy**, vừa tầm ngón cái. Nút chia sẻ và phím tắt ẩn đi. |
| ≤ 719px | Bộ lọc thu vào sau nút "Bộ lọc" có huy hiệu đếm. Dải chip cuộn ngang. **Bảng xếp lại thành danh sách thẻ** thay vì cuộn ngang. Ngăn kéo chi tiết và hộp thoại trượt lên từ đáy. Nút Xuất rút về biểu tượng. |
| ≤ 479px | Chỉ giữ dấu hiệu thương hiệu, nhãn nút Pro ẩn đi. |
| Màn hình cảm ứng | Mọi vùng chạm tối thiểu 44px (`@media (pointer: coarse)`). |
| Máy tính bảng có tai thỏ | Chừa `env(safe-area-inset-*)` cho thanh dưới đáy, thanh so sánh và toast. |

Hai điểm dễ vấp, đã xử lý và ghi chú ngay trong CSS:

1. `backdrop-filter` biến phần tử thành **khối chứa** cho con `position: fixed`. Giữ nó trên thanh
   trên cùng thì thanh điều hướng đáy sẽ dính vào đáy thanh trên cùng thay vì đáy màn hình.
   Trên di động thanh trên cùng dùng nền đặc.
2. Lớp phủ trượt (toast, thanh so sánh) được ẩn bằng `visibility` chứ không chỉ bằng `transform`,
   vì khi có khoảng cách đáy thì dịch 200% chiều cao vẫn chưa đủ để ra khỏi màn hình.

---

## 11. Về Hai KTS dưới hiên nhà

EuroMasters nằm trong bộ công cụ của **Hai KTS dưới hiên nhà**, hai kiến trúc sư viết về nghề,
về học và về việc sống chậm. Ghi chú thương hiệu xuất hiện ở chân trang, trong hộp thoại Pro,
trong thẻ `meta` của trang, và trong phần chân của mọi file Excel, Word, PDF mà app xuất ra.

Cửa hàng: <https://haiktsduoihiennha.gumroad.com>

---

## 12. Miễn trừ trách nhiệm

Dữ liệu được tổng hợp thủ công từ website các trường và bảng xếp hạng QS 2026, **có thể thay đổi bất cứ lúc nào**.
Trước khi nộp hồ sơ, luôn kiểm tra lại hạn nộp, học phí và yêu cầu đầu vào trên trang chính thức của trường
(nút “Trang chương trình chính thức” trong app). Ứng dụng là công cụ theo dõi, không phải nguồn thông tin pháp lý.
