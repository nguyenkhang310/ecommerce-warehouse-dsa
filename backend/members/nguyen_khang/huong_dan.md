# Bùi Nguyễn Nguyên Khang — Giải thuật, benchmark và giao diện

MSSV: **24133902**. Làm trong [thuat_toan.cpp](thuat_toan.cpp) và [chay_thu.cpp](chay_thu.cpp).
Giao diện ở `giaodien/`, kết nối HTTP ở `giaodien/src/services/giao_tiep_cpp.ts`.
Xem [quy tắc chung](../../../README.md) và [dữ liệu chính](../../data/huong_dan.md).
Biểu đồ benchmark nhận kết quả đo trực tiếp từ dịch vụ C++.

## Việc cần làm

1. Tự cài Merge Sort theo SKU, Binary Search và Linear Search.
2. Cài phép đo C++ tại 1.000 và 10.000 bản ghi, lấy đúng cùng bộ đầu vào cho các phương án.
3. `run_demo` dùng để chạy riêng; dịch vụ chung nằm tại `backend/app/dich_vu.cpp`
   và giao diện gọi qua `giaodien/src/services/api.ts`.

## Cách dùng các hàm

| Hàm | Hành vi |
| --- | --- |
| `merge_sort_by_sku(products)` | Sắp vector tại chỗ theo SKU tăng dần, giữ đủ bản ghi; ổn định với khóa bằng nhau |
| `binary_search_by_sku(sorted_products, sku)` | Nhận vector đã sắp đúng comparator, trả vị trí hoặc `std::nullopt` |
| `linear_search_by_sku(products, sku)` | Tra cùng quy tắc SKU, trả vị trí hoặc `std::nullopt` |
| `run_benchmark(operation, products, sizes, iterations, warmup)` | Trả các `BenchmarkPoint` từ phép đo thật |

So sánh SKU chính xác, phân biệt hoa/thường theo dữ liệu CSV. Hai cách tìm có thể trả
vị trí khác nhau vì một vector đã sắp; kiểm tra bằng mã sản phẩm, không so sánh chỉ số máy móc.
Nếu test có SKU trùng, chấp nhận một vị trí hợp lệ và ghi rõ quy ước.
Mục tiêu: Merge Sort O(n log n), Binary Search O(log n), Linear Search O(n).
Không gọi `std::sort`, `lower_bound` hoặc `find` để thay ba hàm nhóm cần tự cài.

## Lập luận để báo cáo

1. **Vì sao dùng Merge Sort?** Đây là giải thuật chia để trị O(n log n), ổn định và phù hợp
   để chuẩn bị dữ liệu đã sắp cho Binary Search.
2. **Vì sao cần Binary Search?** Sau khi sắp, mỗi lần tìm loại bỏ một nửa khoảng tìm kiếm,
   đạt O(log n) thay vì quét lần lượt O(n).
3. **Vì sao vẫn cài Linear Search?** Linear Search là đối chứng đơn giản, chạy được trên dữ liệu
   chưa sắp và giúp số đo thực nghiệm thể hiện chênh lệch khi dữ liệu tăng.
4. **Chi phí cần nói rõ:** Binary Search nhanh hơn khi tìm nhiều lần, nhưng phải trả chi phí
   chuẩn bị Merge Sort. Vì vậy benchmark báo riêng `preparation_ms` và thời gian tìm trung bình.

## Đo hiệu năng thế nào?

1. Nạp `backend/data/data_chinh` bằng loader của Trang. Dùng 1.000 dòng đầu rồi 10.000 dòng;
   chuẩn bị truy vấn tìm thấy và không thấy, cùng danh sách truy vấn giữa hai cách làm.
2. Đo bằng `std::chrono::steady_clock`. Khởi động trước nếu `warmup=true`, không tính lần đó vào trung bình.
3. Tách thời gian đọc file, chuẩn bị/sắp dữ liệu và thời gian thao tác. Binary Search cần mảng đã sắp;
   báo riêng chi phí chuẩn bị. Với Merge Sort, sao chép đầu vào ban đầu trước mỗi lần đo.
4. Không tính HTTP, JSON, in console hoặc vẽ biểu đồ vào thời gian DSA. Giữ kết quả trả về để kiểm tra
   sau phép đo, tránh công việc bị trình biên dịch loại bỏ vì không được sử dụng.
5. `iterations` phải dương; chỉ chấp nhận tên operation đã cài và kích thước đủ dữ liệu.
   Ghi trung bình đơn vị ms, số lần lặp, thời điểm, chế độ build và giới hạn của phép đo.

Các trường đã có trong `BenchmarkPoint`: `operation`, `dataset_size`, `iterations`,
`preparation_ms`, `dsa_mean_ms`, `baseline_mean_ms`, `measured_at`. Trong phép đo
`search_sku`, hai thời gian trung bình lần lượt là Binary Search và Linear Search.
Nếu chưa có phép đối chứng phù hợp cho một operation thì chưa trả điểm đo cho nó;
không lấy số 0 mặc định làm kết quả hoặc tự tạo tốc độ tăng giả.
Khi đo Heap/Trie/RecentList, dùng module thật của các thành viên và cùng quy tắc so sánh của chúng.

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"data_dir":"backend/data/data_chinh","operation":"search_sku","sizes":[1000,10000],"iterations":100,"warmup":true}
```

Đọc tham số, nạp dữ liệu, kiểm tra tính đúng của tìm kiếm, đo và trả các điểm benchmark.
Sai đầu vào ném `std::invalid_argument`. Khi nhóm đã cài parsing, chạy từ gốc repo:

```powershell
npm run demo -- nguyen_khang duong_dan/input.json --release
```

`operation` hiện hỗ trợ `search_sku`. Không truyền file thì đầu vào `{}` không đủ trường và sẽ báo lỗi.
`--release` dùng `-O2`; ghi lại compiler, máy và chế độ build khi trình bày số liệu.
Trang `/cpp` hiển thị JSON do executable C++ trả về, nhưng thời gian HTTP không phải benchmark.

Test riêng:

```powershell
g++ -std=c++17 -Wall -Wextra -Wpedantic -I backend backend/members/nguyen_khang/kiem_thu/kiem_tra.cpp -o backend/build/kiem_tra_nguyen_khang.exe
./backend/build/kiem_tra_nguyen_khang.exe
```

## Các ca phải kiểm thử

| Ca thử | Kết quả cần kiểm tra |
| --- | --- |
| Rỗng/một phần tử | Sort an toàn; tìm đúng hoặc nullopt |
| Dữ liệu đảo/thứ tự sẵn/trùng SKU | Sort đúng, không mất phần tử, giữ ổn định với khóa bằng nhau |
| Tìm đầu/giữa/cuối/không có | Kết quả khớp tra tuyến tính theo mã sản phẩm |
| Cỡ 1.000/10.000 | Cùng tập truy vấn giữa hai phương án, số lượng đầu vào đúng |
| Iterations=0, tên operation sai | Báo lỗi, không trả số đo giả |
| Chạy nhiều lần | Không tái sử dụng trạng thái đã bị thao tác trước đó làm sai phép so sánh |

## Bàn giao và nối web

- Giải thuật, test, demo và bảng số đo thật; test `main()` riêng đặt trong `kiem_thu/`.
- Dịch vụ giữ Hash/Trie/Heap/RecentList đồng bộ; giao diện chỉ gửi yêu cầu và hiển thị kết quả.
  Đọc `giaodien/AGENTS.md` trước khi sửa frontend.
- Ghi rõ phần chia để trị/tìm kiếm, chi phí chuẩn bị và lập luận kỹ thuật theo mục 2/5.1/6 của Plan.
- Lưu cấu hình đo, kết quả kiểm thử, ghi chú debug và nhật ký dùng công cụ.
