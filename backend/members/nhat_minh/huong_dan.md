# Báo cáo & Hướng dẫn Module Hồ Nhật Minh — Heap, MC2 + TP1

MSSV: **24133039**.  
Phụ trách: **Cấu trúc dữ liệu Hàng đợi ưu tiên (Max-Heap)** trong [hang_doi_uu_tien.cpp](hang_doi_uu_tien.cpp) và kịch bản demo trong [chay_thu.cpp](chay_thu.cpp).

---

## 1. Thiết kế Kiến trúc & Tách biệt Mô-đun

Mã nguồn được thiết kế tỉ mỉ theo tiêu chuẩn môn học Cấu trúc dữ liệu & Giải thuật (DSA):
- **Cực kỳ ngắn gọn ở điểm vào (`main` / `run_demo`)**: Đóng vai trò điều phối các hàm mô-đun.
- **Tách biệt hoàn toàn các hàm chức năng**: Mỗi hàm thực hiện duy nhất 1 nhiệm vụ.
- **Tối ưu hóa hiệu năng**:
  - Dùng con trỏ hằng `const Order*` và tham chiếu để so sánh, hoán đổi bằng `Order*` mà không gây sao chép dữ liệu thừa.
  - Sử dụng phép toán dịch bit `parent = (i - 1) / 2`, `left = (i << 1) + 1`, `right = (i << 1) + 2` để tính toán chỉ số cây nhanh chóng.

---

## 2. Bảng phân tích các hàm và Độ phức tạp thuật toán

| Tên hàm | Chức năng chi tiết | Độ phức tạp DSA |
| --- | --- | --- |
| `push(order)` | Chèn bản sao đơn hàng vào cuối mảng và vun lên (`sift_up`) | $O(\log N)$ |
| `peek()` | Xem đơn ưu tiên nhất ở gốc mà không xóa | $O(1)$ |
| `pop()` | Lấy đơn gốc ra, đưa đơn cuối lên gốc và vun xuống (`sift_down`) | $O(\log N)$ |
| `size()` | Trả về số lượng đơn hàng hiện tại trong Heap | $O(1)$ |
| `empty()` | Kiểm tra Heap rỗng | $O(1)$ |
| `snapshot()` | Trả về bản sao mảng Heap để vẽ cây nhị phân ở Frontend | $O(N)$ |
| `compare_orders(a, b)` | So sánh ưu tiên: `urgent > high > normal`, trùng thì theo `sequence_number` nhỏ hơn | $O(1)$ |
| `sift_up(index)` | Thuật toán Vun lên từ nút lá | $O(\log N)$ |
| `sift_down(index)` | Thuật toán Vun xuống từ nút gốc | $O(\log N)$ |

---

## 3. Lý thuyết Bàn giao & Giải đáp Q1–Q4 (Nhiệm vụ MC2 + TP1)

- **Q1: Biểu diễn Heap bằng Mảng**: Cây nhị phân hoàn chỉnh được đánh số nút từ gốc $i=0$. Với nút $i$, con trái là $2i+1$, con phải là $2i+2$, nút cha là $\lfloor (i-1)/2 \rfloor$.
- **Q2: Thuật toán Vun lên / Vun xuống**:
  - `sift_up`: So sánh nút với cha, tráo đổi và đi lên đến khi thỏa tính chất Max-Heap.
  - `sift_down`: So sánh nút với 2 con, chọn con lớn nhất để tráo đổi và đi xuống đến khi đạt vị trí hợp lệ.
- **Q3: Xử lý Xung đột Tie-breaker**:
  - Khi 2 đơn hàng có cùng `priority`, so sánh `sequence_number`. Đơn nào có sequence nhỏ hơn sẽ được ưu tiên xuất trước (đảm bảo tính FIFO cho các đơn cùng mức ưu tiên).
- **Q4: Ưu và Nhược điểm của Heap**:
  - *Ưu điểm*: Lấy đơn ưu tiên cao nhất với $O(1)$ và chèn/xóa trong $O(\log N)$, vượt trội so với Mảng/Danh sách liên kết chưa sắp xếp ($O(N)$ để tìm max).
  - *Nhược điểm*: Không tìm kiếm ngẫu nhiên theo mã đơn $O(1)$ như Hash Table.

---

## 4. Kiểm thử & Chạy chương trình

### A. Chạy demo trực tiếp từ dự án CLI:
```powershell
npm run demo -- nhat_minh
```

### B. Biên dịch và chạy Unit Test độc lập:
```powershell
g++ -std=c++17 -Wall -Wextra -I backend -I backend/thu_vien backend/members/nhat_minh/kiem_thu/test_heap.cpp -o backend/build/test_heap
./backend/build/test_heap
```

### C. Chạy server C++ và tích hợp Web:
```powershell
npm run backend:build
npm run backend:start
```
Mở giao diện web ở trang demo C++ (`/cpp`), chọn **Hồ Nhật Minh — Heap — MC2 + TP1**.
