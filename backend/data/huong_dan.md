# Dữ liệu dùng cho đồ án

**Dữ liệu chính: `backend/data/data_chinh/`.** Hai file dùng chung bộ khóa SKU.
Nguồn: [Global E-Commerce Dataset](https://www.kaggle.com/datasets/akrambelha/global-e-commerce-dataset-1m-records-20242026),
Akram Belhadi, phiên bản 1. Đây là dữ liệu mô phỏng, không phải giao dịch doanh nghiệp thật.
Giấy phép nguồn: [Apache 2.0](https://www.apache.org/licenses/LICENSE-2.0).

## Các thư mục

| Thư mục | Nội dung | Đưa vào Git? |
| --- | --- | --- |
| `data_chinh/` | 10.000 sản phẩm + 10.000 đơn chờ; dùng code/demo/benchmark | Có |
| `day_du/` | 993.867 sản phẩm + 1.000.123 giao dịch sau chuẩn hóa | Không |
| `goc/` | CSV nguồn khoảng 410 MB và thông tin Kaggle | Không |

Bản đầy đủ dùng để thử quy mô lớn hơn 10.000 bản ghi.
Các lần chạy thử 1.000/10.000 bản ghi lấy từ cùng bộ chính, không cần tạo thêm thư mục con.

## Tạo lại dữ liệu

[lam_sach.cpp](../../scripts/lam_sach.cpp) dùng thư viện chuẩn C++17. Chạy từ gốc repo:

```powershell
npm run data:setup
```

Node chỉ tải nguồn khi thiếu, kiểm tra SHA256 của phiên bản 1 và gọi g++.
C++ đọc nguồn, làm sạch và ghi lại hai bộ CSV cùng [thong_ke.csv](thong_ke.csv).
Nguồn đã tải thì chạy được offline; cần khoảng 1 GB dung lượng cho nguồn và kết quả.
Không chỉnh tay file sạch vì lần chạy sau sẽ tạo lại chúng.

Biên dịch trực tiếp khi đã có CSV nguồn:

```powershell
New-Item -ItemType Directory -Force backend/build | Out-Null
g++ -std=c++17 -O2 -finput-charset=UTF-8 -fexec-charset=UTF-8 scripts/lam_sach.cpp -o backend/build/lam_sach.exe
.\backend\build\lam_sach.exe
```

Luồng xử lý: `doc_csv` → chuẩn hóa/kiểm tra từng bản ghi → phân biệt khóa
→ cấp thứ tự đơn → ghi dữ liệu đầy đủ và bộ chính.
Có thể truyền `[nguon.csv] [thu_muc_ket_qua]` cho executable để thử một CSV nhỏ cùng schema;
bộ chính khi đó lấy tối đa 10.000 bản ghi theo dữ liệu có sẵn.

## Quy tắc làm sạch

1. Chỉ chọn 9 cột nguồn cần cho đồ án. Gom khoảng trắng, kiểm tra trường bắt buộc,
   số lượng nguyên dương, tồn kho nguyên không âm, mức ưu tiên và trạng thái hợp lệ.
   Ngày phải đúng định dạng nguồn `YYYY-MM-DD HH:MM:SS.ffffff` và đúng lịch, kể cả năm nhuận.
   Giữ microsecond, đổi dấu cách thành `T`, không tự gán múi giờ.
2. Gộp sản phẩm theo bộ ba `(product_id, product_name, category)`, không gộp chỉ vì trùng mã.
   SKU = mã nguồn + `-R` + số thứ tự bản ghi đầu tiên của bộ ba đó.
   Ví dụ sản phẩm xuất hiện đầu tiên ở bản ghi 27 có SKU `PRD-ABCD-R27`.
   Giữ `source_product_id` để đối chiếu; SKU ổn định khi dùng cùng nguồn và thứ tự bản ghi.
3. Lấy tồn kho ở giao dịch có ngày mới nhất; nếu bằng ngày thì bản ghi sau thắng.
   `created_at/updated_at` là lần quan sát đầu/cuối, không phải lịch sử nhập kho đã xác minh.
   `reorder_level=0` là mặc định vì nguồn không có trường này.
4. Mã đơn trùng chưa chứng minh giao dịch trùng: giữ mọi dòng hợp lệ, thêm `-R<số bản ghi>`
   từ lần trùng thứ hai. Giữ `source_order_id`, `source_status`, `source_row` để đối chiếu.
   `source_row` là thứ tự bản ghi CSV tính cả tiêu đề; ô nhiều dòng vẫn tính là một bản ghi.
   Mỗi dòng nguồn được dùng như một đơn một mặt hàng; không suy đoán đơn nhiều mặt hàng.
5. `Low/Medium/High` → `normal/high/urgent`, giữ đúng thứ tự ba mức.
   `urgent` chỉ là nhãn quy ước của đồ án. `Pending/Processing/Completed/Cancelled/Returned`
   → `queued/processing/completed/cancelled/returned`.
6. Sắp theo `(ngày, thứ tự bản ghi nguồn)` rồi cấp `sequence_number` từ 1.
   `std::sort` ở đây chỉ chuẩn bị đầu vào, không thay Merge Sort hoặc phép đo của Khang.
7. Bộ chính lấy 10.000 đơn `queued` sớm nhất, kèm sản phẩm theo thứ tự xuất hiện trong các đơn,
   rồi bổ sung sản phẩm theo thứ tự nguồn cho đủ 10.000. Đây là bộ thử chức năng, không phải mẫu ngẫu nhiên.
   Sản phẩm của 1.000 đơn đầu luôn nằm trong 1.000 sản phẩm đầu.

Lần chạy trên nguồn đã kiểm tra: **0 dòng lỗi**, **6.256 lần lặp sản phẩm được gộp**,
**8.193 lần lặp mã đơn được phân biệt**. Xem các số lượng tái tạo được ở `thong_ke.csv`.
Dòng sai dữ liệu bị đếm và bỏ; CSV hỏng cú pháp hoặc thiếu cột bắt buộc làm chương trình báo lỗi.
Các cột khách hàng, thanh toán, marketing không được xuất vì không phục vụ DSA.

## Nạp vào C++ của nhóm

CSV UTF-8 có tiêu đề; ô được đặt trong ngoặc kép, dấu `"` trong ô được ghi thành `""`.
Không tách cột bằng cách tìm dấu phẩy đơn thuần. Xem hướng dẫn của [Kiều Trang](../members/kieu_trang/huong_dan.md).

| File | Các cột theo thứ tự |
| --- | --- |
| `san_pham.csv` | `id, sku, name, category, stock, reorder_level, created_at, updated_at, source_product_id` |
| `don_hang.csv` | `id, order_code, priority, sequence_number, status, created_at, sku, quantity, source_order_id, source_status, source_row` |

Tám cột đầu của sản phẩm khớp `Product`; `id` bằng `sku` trong bộ này.
Mỗi dòng đơn tạo một `Order` có một `OrderItem`: `product_id=sku`, giữ nguyên SKU và quantity.
Tên mặt hàng có thể để trống khi đọc; service bổ sung từ Hash Table của Trang.
`note` để trống; các cột `source_*` chỉ dùng đối chiếu, chưa có trường tương ứng trong struct chung.
Chỉ đưa đơn `queued` vào Heap. RecentList lấy thao tác cập nhật do nhóm thực hiện lúc demo,
vì nguồn không có lịch sử cập nhật kho đáng tin cậy.

Hàm nạp dữ liệu: `kieu_trang::load_data(path)` trong `luu_tru.cpp`.
