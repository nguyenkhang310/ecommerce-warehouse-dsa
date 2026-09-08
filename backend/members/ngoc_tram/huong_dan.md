# Nguyễn Thị Ngọc Trâm — RecentList và kiểm thử, TP3

MSSV: **24133066**. Làm trong [danh_sach_gan_day.cpp](danh_sach_gan_day.cpp) và
[chay_thu.cpp](chay_thu.cpp). Xem [quy tắc chung](../../../README.md) và
[dữ liệu chính](../../data/huong_dan.md).

## Việc cần làm

1. Cài danh sách liên kết đôi và bảng băm `SKU → vị trí nút`.
   Plan cho phép STL; nếu tự cấp phát nút thì bổ sung hủy danh sách và quy tắc sao chép an toàn.
2. Hoàn thiện `touch`, `snapshot`, `size`; viết kịch bản thao tác trong `run_demo`.
3. Khi các module có cài đặt, tổ chức kiểm thử tích hợp và ghi nhật ký debug của nhóm.
   Bộ kiểm tra HTTP có sẵn chỉ kiểm tra kết nối, chưa kiểm chứng thuật toán.

## Cách dùng các hàm

| Hàm | Hành vi |
| --- | --- |
| `RecentList(capacity)` | Giới hạn số SKU, mặc định 6; đề xuất capacity=0 thì luôn rỗng |
| `touch(update)` | SKU mới thêm đầu; SKU đã có cập nhật nội dung và đưa nút lên đầu |
| `snapshot()` | Bản sao các cập nhật từ mới nhất đến cũ nhất |
| `size()` | Số SKU đang giữ, luôn không vượt capacity |
| `capacity()` | Trả giới hạn đã cấu hình |

Khi vượt giới hạn, xóa cả nút cuối và khóa tương ứng trong bảng băm.
Mỗi SKU chỉ có một nút. `delta`, `stock_after`, `updated_at` là giá trị của **lần cập nhật mới nhất**,
không tự cộng dồn các lần `touch` cùng SKU. Thứ tự là lần gọi cập nhật, không sắp chuỗi thời gian lại.
Service tính tồn kho hợp lệ rồi truyền `RecentUpdate`; RecentList không tự sửa kho hoặc xử lý đơn.

Tìm vị trí bằng bảng băm, không quét danh sách. `touch` dự kiến trung bình O(1);
snapshot O(k) với k là số phần tử giữ lại. Sau mọi thay đổi, hai chiều liên kết và chỉ mục phải khớp.
Chỉ giữ tham chiếu/iterator theo đúng hiệu lực của cách cài đặt, nhất là sau khi xóa nút.

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"capacity":3,"updates":[{"sku":"A","delta":1,"stock_after":11},{"sku":"B","delta":2,"stock_after":12},{"sku":"C","delta":3,"stock_after":13},{"sku":"B","delta":-1,"stock_after":11},{"sku":"D","delta":4,"stock_after":14}]}
```

Điền các trường nhận diện/thời gian còn lại khi dựng `RecentUpdate`. Sau ba cập nhật đầu:
`C, B, A`; cập nhật lại B: `B, C, A`; thêm D: **`D, B, C`**, A đã bị loại.
B chỉ xuất hiện một lần, giữ `delta=-1` và `stock_after=11`.
Trả snapshot bằng JSON; sai kiểu/capacity âm/SKU rỗng thì ném `std::invalid_argument`.

Chạy từ gốc repo: `npm run demo -- ngoc_tram`. Sau khi cài parsing,
dùng `npm run demo -- ngoc_tram duong_dan/input.json` hoặc dán JSON tại `/cpp`.
Sửa C++ rồi build/start lại backend khi dùng web.

## Các ca phải kiểm thử

| Ca thử | Kết quả cần kiểm tra |
| --- | --- |
| Rỗng, capacity 0/1 | Đúng quy ước, không truy cập nút không tồn tại |
| Chạm lại nút đầu/giữa/cuối | Đưa lên đầu, không nhân đôi SKU, cập nhật đúng payload |
| Vượt giới hạn nhiều lần | Nút cuối và khóa băm cùng bị xóa |
| Chạm lại SKU từng bị loại | Tạo nút hợp lệ, không dùng địa chỉ cũ |
| Snapshot hai lần | Không làm thay đổi trạng thái |
| Thêm/xóa lặp lại lâu | Không rò rỉ, không con trỏ treo; kiểm tra hai chiều liên kết |

Nguồn Kaggle không có lịch sử nhập kho đã xác minh. Lấy SKU từ `backend/data/data_chinh/san_pham.csv`
và tạo thao tác cập nhật có kiểm soát lúc demo, không biến các ngày giao dịch thành lịch sử RecentList.

Khi service chung có đủ module, kiểm thử chuỗi: nạp CSV → tạo Hash/Trie → đưa đơn chờ vào Heap
→ lấy đơn → kiểm tra tồn kho → cập nhật Hash và RecentList → xem lại dữ liệu qua API.
Kiểm tra cả đơn thiếu hàng, SKU không có và cập nhật lặp. Ghi rõ trường hợp nào còn bị chặn bởi TODO.
Test `main()` riêng đặt trong `kiem_thu/`, không include vào demo.

## Bàn giao

- Module, demo, test riêng và bảng test tích hợp có trạng thái đạt/chưa đạt cụ thể.
- Viết phần lập luận TP3 theo Q1–Q4 mục 2 của Plan; giải thích vì sao cần DLL kèm bảng băm.
- Nhật ký debug ghi đầu vào gây lỗi, nguyên nhân, cách sửa và kết quả chạy lại.
- Gửi Khang số liệu đo thật; lưu nhật ký dùng công cụ theo yêu cầu của môn.
