# Hồ Nhật Minh — Heap, MC2 + TP1

MSSV: **24133039**. Làm trong [hang_doi_uu_tien.cpp](hang_doi_uu_tien.cpp) và
[chay_thu.cpp](chay_thu.cpp). Xem [quy tắc chung](../../../README.md) và
[dữ liệu chính](../../data/huong_dan.md).

## Việc cần làm

1. Tự cài Heap bằng mảng/vector, hàm so sánh, đẩy lên và đẩy xuống.
   Theo Plan, không dùng `std::priority_queue`, `make_heap`, `push_heap`, `pop_heap` để thay phần tự cài.
2. Hoàn thiện các hàm của `PriorityQueue`, rồi mới viết phần đọc JSON/gọi hàm trong `run_demo`.
3. Trả snapshot để giao diện vẽ cây, phối hợp Khang đo `push`, `peek`, `pop` với cách quét tuyến tính.

## Cách dùng các hàm

| Hàm | Hành vi cần giữ | Độ phức tạp dự kiến |
| --- | --- | --- |
| `push(order)` | Thêm bản sao đơn vào Heap, giữ nguyên sequence | O(log n), khấu hao khi vector tăng dung lượng |
| `peek()` | Xem đơn đầu, không xóa; rỗng trả `std::nullopt` | O(1) |
| `pop()` | Lấy và xóa đơn đầu; rỗng trả `std::nullopt` | O(log n) |
| `size()` | Số đơn đang có | O(1) |
| `snapshot()` | Bản sao mảng Heap để vẽ, không đổi Heap | O(n) |

Khóa so sánh: **`urgent=3 > high=2 > normal=1`**, cùng mức thì
**`sequence_number` nhỏ hơn đi trước**. Sequence là thứ tự tạo đơn do service cấp,
hoặc đọc từ CSV; không cấp lại trong `push`. Service phải giữ sequence duy nhất khi tạo đơn mới.
Snapshot không phải danh sách đã sắp theo thứ tự `pop`; chỉ đảm bảo quan hệ cha/con của Heap.

Khi dùng dữ liệu thật, chỉ nạp đơn `queued` từ `backend/data/data_chinh/don_hang.csv`.
Service chịu trách nhiệm không thêm lại cùng mã đơn, kiểm tra tồn kho qua Hash Table,
đổi trạng thái và cập nhật kho/RecentList. Heap chỉ quản lý thứ tự ưu tiên.

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"orders":[{"id":"A","priority":"high","sequence_number":2},{"id":"B","priority":"urgent","sequence_number":5},{"id":"C","priority":"urgent","sequence_number":1},{"id":"D","priority":"normal","sequence_number":3}]}
```

Đọc mức ưu tiên sang enum, dựng `Order`, gọi `push` cho từng đơn rồi `pop` đến khi rỗng.
Kết quả mong đợi: `C → B → A → D`. Trả danh sách mã đơn và snapshot bằng JSON;
sai kiểu/mức ưu tiên/sequence thì ném `std::invalid_argument`.
Đây là ca thử thứ tự Heap tối thiểu; khi chạy nghiệp vụ phải có thêm các trường/mặt hàng của đơn.

Chạy từ gốc repo: `npm run demo -- nhat_minh`. Khi đã cài phần đầu vào,
truyền file bằng `npm run demo -- nhat_minh duong_dan/input.json` hoặc dán JSON ở `/cpp`.
Sửa C++ rồi build/start lại backend nếu dùng web; hướng dẫn lệnh ở README chung.

## Các ca phải kiểm thử

| Ca thử | Kết quả cần kiểm tra |
| --- | --- |
| Rỗng và một đơn | `peek/pop` rỗng an toàn; lấy một lần thì size bằng 0 |
| Nhiều mức ưu tiên | Thứ tự `C, B, A, D` như ví dụ |
| Cùng ưu tiên, chèn đảo sequence | Vẫn FIFO theo sequence, không theo lần chèn vào Heap |
| Gọi `peek` hai lần | Cùng mã đơn, size không đổi |
| Chèn/lấy xen kẽ | Quan hệ Heap đúng sau mỗi thao tác |
| 1.000 và 10.000 đơn | Kết quả khớp phép chọn tuyến tính dùng cùng comparator |

Đặt test C++ có `main()` riêng trong `kiem_thu/` nếu cần; không include test vào demo.
Không đưa đồng thời các `.cpp` đã include vào danh sách g++.

## Bàn giao

- Hàm đúng, test có đầu vào/kết quả mong đợi, demo trả kết quả thật.
- Ghi rõ comparator, cách biểu diễn snapshot và cách service cấp sequence.
- Viết Q1–Q4 cho MC2/TP1 theo mục 2 của Plan, giải thích giải quyết xung đột ở mục 3.
- Gửi Khang số đo thực tế; lưu ghi chú debug và nhật ký dùng công cụ theo yêu cầu môn học.
