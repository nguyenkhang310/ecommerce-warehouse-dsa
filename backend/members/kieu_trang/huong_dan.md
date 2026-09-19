# Nguyễn Thị Kiều Trang — Hash Table và lưu trữ, MC1

MSSV: **24133064**. Làm trong [bang_bam.cpp](bang_bam.cpp), [luu_tru.cpp](luu_tru.cpp)
và [chay_thu.cpp](chay_thu.cpp). Xem [quy tắc chung](../../../README.md) và
[schema dữ liệu](../../data/huong_dan.md).

## Việc cần làm

1. Hoàn thiện `HashTable<Value>` để dùng cho `Product`, `Order` và chỉ mục nút của RecentList.
   Plan cho phép `std::unordered_map`; nếu tự cài thì cần xử lý va chạm, hệ số tải và băm lại.
2. Hoàn thiện `load_data`/`save_data` chỉ đọc/ghi bản ghi.
3. Viết `run_demo`: đọc đầu vào, nạp bản ghi vào Hash Table, gọi các thao tác và trả JSON thật.

## Cách dùng Hash Table

| Hàm | Hành vi |
| --- | --- |
| `upsert(key, value)` | Chưa có thì thêm; đã có thì cập nhật, không tăng size |
| `find(key)` và bản `const` | Trả con trỏ đến giá trị; không có trả `nullptr` |
| `erase(key)` | Trả `true` nếu xóa được, `false` nếu không có |
| `size()` | Số khóa hiện tại |
| `values()` | Trả bản sao các giá trị; không cam kết thứ tự |

SKU dùng đúng chuỗi trong CSV, không tự đổi hoa/thường. Product tra bằng SKU; Order tra bằng mã đơn.
Khóa và mã định danh trong value phải thống nhất. Ghi rõ con trỏ từ `find` còn hợp lệ đến khi nào
khi cập nhật, xóa hoặc băm lại; không lưu con trỏ treo giữa các module.
Tra cứu/thêm/xóa của bảng băm dự kiến trung bình O(1), trường hợp xấu O(n); `values` là O(n).

## Cách đọc và ghi dữ liệu

`load_data(path)` nhận **thư mục**, mặc định nhóm dùng `backend/data/data_chinh`.
Đọc `san_pham.csv` và `don_hang.csv` thành `StorageData`, chưa xây chỉ mục hoặc chọn đơn ưu tiên.

- Đọc theo tên cột, hỗ trợ UTF-8, ô có dấu phẩy, ngoặc kép và xuống dòng.
  Có thể tham khảo hàm `doc_csv`/`ghi` trong `scripts/lam_sach.cpp`;
  không include cả file đó vì nó có `main()` riêng.
- Tám cột nghiệp vụ của sản phẩm ánh xạ vào `Product`; giữ riêng `id` và `sku` đúng như CSV.
- Mỗi dòng đơn thành một `Order` với một `OrderItem`; `product_id=sku`, giữ quantity,
  để tên mặt hàng trống nếu chưa có. Service dùng Hash Table bổ sung tên sau khi nạp.
- `normal/high/urgent` ánh xạ `Priority`; trạng thái gồm cả `returned` trong enum chung.
  Giữ `sequence_number` kiểu `uint64_t`, không cấp lại khi đọc; `note` mặc định rỗng.
- `source_*` là cột đối chiếu nguồn, không bắt buộc trong dữ liệu runtime vì struct chưa lưu chúng.
  Kiểm tra số, enum, trường bắt buộc; báo rõ file/bản ghi sai, không trả dữ liệu nạp dở.

`save_data(path, data)` ghi dữ liệu runtime vào thư mục riêng, ví dụ `backend/data/local/` đã được Git bỏ qua.
Không ghi đè CSV nguồn hoặc bộ chính. Lưu đủ trường nghiệp vụ để đọc lại được;
nếu nhóm dùng JSON cho runtime thì phải thống nhất định dạng và hướng dẫn lại tại đây.
Các cột đối chiếu nguồn của CSV gốc không thuộc cam kết lưu/đọc vòng của struct hiện tại.
Lưu trữ không làm MC1/MC2: không trả kết quả tìm SKU, sắp ưu tiên hoặc chạy benchmark ngay trong loader.

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"data_dir":"backend/data/data_chinh","sku":"COPY_SKU_TU_CSV"}
```

Thay chuỗi SKU bằng một mã có thật trong CSV. `run_demo` gọi `load_data`, nạp sản phẩm vào Hash Table,
rồi tra SKU. Trả số sản phẩm/đơn và bản ghi tìm thấy, hoặc `null` nếu không có.
Đầu vào sai ném `std::invalid_argument`; lỗi file ghi thông tin đủ để sửa đường dẫn.

Chạy từ gốc repo bằng `npm run demo -- kieu_trang duong_dan/input.json`
hoặc nhập JSON tại trang `/cpp`.
Web gửi đường dẫn đến backend chạy trên cùng máy; file chọn từ trình duyệt phải gửi nội dung
nếu sau này làm chức năng upload, không gửi một đường dẫn máy khách để server tự mở.

## Các ca phải kiểm thử

| Ca thử | Kết quả cần kiểm tra |
| --- | --- |
| Rỗng/không có khóa | `find=nullptr`, `erase=false` |
| Upsert cùng khóa hai lần | Size không tăng, giá trị mới thay giá trị cũ |
| Va chạm và tăng dung lượng | Không mất bản ghi; hành vi con trỏ đúng tài liệu |
| Xóa rồi thêm lại | Tra đúng giá trị mới |
| CSV có dấu phẩy/ngoặc kép/UTF-8 | Không lệch cột hoặc hỏng tên |
| Sai số, enum, thiếu file/cột | Báo lỗi rõ, không trả nửa bộ dữ liệu |
| Lưu rồi đọc lại thư mục runtime | Các trường nghiệp vụ giữ nguyên, kể cả sequence |
| Bộ chính | 10.000 Product, 10.000 Order, mỗi SKU đơn có Product tương ứng |

## Bàn giao

- Loader, bảng băm, test, quy tắc sử dụng con trỏ và demo thật.
- Phối hợp Ngân đồng bộ chỉ mục tên; Minh quản lý đơn; Trâm dùng chỉ mục vị trí nút.
- Viết Q1–Q4 của MC1 theo mục 2 của Plan; giải thích va chạm và chi phí trung bình/xấu nhất.
- Ghi kiểm thử, debug và nhật ký dùng công cụ. Test `main()` riêng đặt trong `kiem_thu/`.
