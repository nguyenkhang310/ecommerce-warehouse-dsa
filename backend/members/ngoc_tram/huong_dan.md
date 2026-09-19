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

## Lập luận Q1–Q4 cho TP3

1. **Có cần giữ thứ tự không?** Có. Phần tử mới cập nhật nằm ở đầu, phần tử cũ nhất nằm cuối
   và bị loại khi danh sách vượt giới hạn.
2. **Khóa và kiểu tải là gì?** SKU là khóa để nhận biết sản phẩm đã có. Tải chính là cập nhật
   lặp lại, đưa nút lên đầu và đôi lúc xóa nút cuối.
3. **Có chấp nhận trường hợp xấu nhất không?** Cần thao tác ổn định vì cập nhật kho xảy ra thường xuyên.
   Bảng băm tìm nút trung bình O(1), danh sách liên kết đôi tháo và gắn nút O(1).
4. **Yếu tố thực tế nào quan trọng?** Danh sách có dung lượng nhỏ cố định. Đổi lại một bảng băm
   phụ giúp tránh quét danh sách và bảo đảm mỗi SKU chỉ xuất hiện một lần.

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"capacity":3,"updates":[{"sku":"A","delta":1,"stock_after":11},{"sku":"B","delta":2,"stock_after":12},{"sku":"C","delta":3,"stock_after":13},{"sku":"B","delta":-1,"stock_after":11},{"sku":"D","delta":4,"stock_after":14}]}
```

Điền các trường nhận diện/thời gian còn lại khi dựng `RecentUpdate`. Sau ba cập nhật đầu:
`C, B, A`; cập nhật lại B: `B, C, A`; thêm D: **`D, B, C`**, A đã bị loại.
B chỉ xuất hiện một lần, giữ `delta=-1` và `stock_after=11`.
Trả snapshot bằng JSON; sai kiểu/capacity âm/SKU rỗng thì ném `std::invalid_argument`.

Chạy từ gốc repo: `npm run demo -- ngoc_tram`. Có thể lưu JSON trên thành
`input_mau.json`, rồi chạy `npm run demo -- ngoc_tram backend/members/ngoc_tram/input_mau.json`.
Một file mẫu nhỏ, ổn định thì đưa lên GitHub; file thử tạm và output chạy không cần đưa lên.
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
Module và demo nằm trong thư mục `ngoc_tram`. Test riêng đặt trong thư mục con
`ngoc_tram/kiem_thu/`, không include vào demo. Kiểm thử tích hợp dùng nhiều module
thì đặt tại `backend/kiem_thu/` để cả nhóm cùng sửa, không để riêng trong module TP3.

## Nhật ký debug

| Đầu vào gây lỗi | Nguyên nhân | Cách sửa | Kết quả chạy lại |
| --- | --- | --- | --- |
| `stock_after=-1` | Demo mới kiểm tra phạm vi `int`, chưa chặn tồn kho âm | Kiểm tra `stock_after < 0` và ném `invalid_argument` | Backend trả lỗi 400 đúng quy ước |
| Cập nhật `B` hai lần | Có nguy cơ tạo hai nút hoặc giữ dữ liệu cũ | Dùng bảng băm tìm nút, ghi đè payload rồi đưa nút lên đầu | Test giữ đúng một `B` với dữ liệu mới |
| Thêm quá capacity | Nút cuối và khóa băm có thể lệch nhau | `evict_tail` xóa cả liên kết, khóa băm và vùng nhớ | Test capacity 1/2 và lặp 10.000 lần đều đạt |

## Bàn giao

- Module, demo, test riêng và bảng test tích hợp có trạng thái đạt/chưa đạt cụ thể.
- Đưa phần Q1–Q4 phía trên vào báo cáo; giải thích vì sao cần DLL kèm bảng băm.
- Bổ sung nhật ký debug khi phát hiện lỗi mới theo đúng bốn cột đã dùng ở trên.
- Gửi Khang số liệu đo thật; lưu nhật ký dùng công cụ theo yêu cầu của môn.
