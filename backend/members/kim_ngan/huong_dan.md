# Dương Thị Kim Ngân — Trie, TP2

MSSV: **24133040**. Làm trong [cay_tien_to.cpp](cay_tien_to.cpp) và
[chay_thu.cpp](chay_thu.cpp). Xem [quy tắc chung](../../../README.md) và
[dữ liệu chính](../../data/huong_dan.md).

## Việc cần làm

1. Tự cài nút Trie, đường đi theo ký tự, tập SKU kết thúc tại nút và giải phóng bộ nhớ.
2. Hoàn thiện thêm/xóa/tìm tiền tố. Một tên có thể ứng với nhiều SKU;
   một SKU cũng có thể được lập chỉ mục bằng cả mã và tên.
3. Viết `run_demo`, cung cấp ví dụ cây nhỏ để vẽ và phối hợp Khang đo với quét tiền tố tuyến tính.

## Cách dùng các hàm

| Hàm | Đầu vào và kết quả |
| --- | --- |
| `insert(term, sku)` | Thêm cặp chuỗi–SKU; thêm lại cùng cặp không tạo kết quả trùng |
| `erase(term, sku)` | Xóa đúng cặp; không có thì không làm gì; giữ các từ dùng chung nhánh |
| `search_prefix(prefix)` | Trả vector SKU không trùng; không tìm thấy trả vector rỗng |

Quy ước đề xuất cho nhóm: chuỗi/SKU rỗng khi thêm là đầu vào sai; tìm tiền tố rỗng
trả vector rỗng để tránh trả toàn bộ danh mục. Ghi lại nếu nhóm đổi quy ước này.
Thứ tự SKU trong kết quả không bắt buộc; test so sánh tập kết quả.

Giữ nguyên SKU trong CSV. Chuẩn hóa **term và prefix bằng cùng một quy tắc**.
Nếu chọn không phân biệt hoa/thường, phải áp dụng nhất quán lúc thêm, xóa, tìm;
không dùng `tolower` từng byte để tuyên bố hỗ trợ đầy đủ Unicode tiếng Việt.
Có thể đi theo byte UTF-8 để khớp tiền tố chính xác, nhưng phải ghi rõ giới hạn xử lý hoa/thường.

Trie lưu SKU, còn `Product` thuộc Hash Table của Trang. Service dùng SKU trả về để lấy sản phẩm;
khi đổi tên hoặc xóa sản phẩm phải xóa chỉ mục cũ trước khi thêm chỉ mục mới.
Không dùng tìm kiếm chuỗi ở frontend hoặc quét toàn bộ sản phẩm để thay Trie.
Chèn/tìm đường đi phụ thuộc độ dài chuỗi; tìm tiền tố còn tốn duyệt cây con và trả kết quả,
không ghi chung rằng mọi truy vấn đều O(1).

## Kịch bản demo cần cài

Đầu vào cho `run_demo`:

```json
{"entries":[{"term":"samsung","sku":"A"},{"term":"sandisk","sku":"B"},{"term":"sony","sku":"C"}],"prefix":"sa","erase":{"term":"samsung","sku":"A"}}
```

Đọc entries, gọi `insert`, sau đó gọi `search_prefix`. Kết quả phải chứa đúng `A` và `B`.
Thêm thao tác xóa để demo xóa `samsung/A` rồi tìm lại chỉ còn `B`.
Trả SKU và dữ liệu mô tả cây bằng JSON nếu cần; sai đầu vào ném `std::invalid_argument`.

Chạy từ gốc repo: `npm run demo -- kim_ngan`. Có thể truyền JSON bằng
`npm run demo -- kim_ngan duong_dan/input.json` hoặc dán ở `/cpp`.
Sau khi sửa C++, build/start lại backend để web dùng bản mới.

## Lập luận Q1–Q4 cho TP2

1. **Có cần giữ thứ tự không?** Không cần sắp toàn bộ sản phẩm, nhưng phải giữ đúng đường đi
   của từng ký tự để tìm được mọi từ bắt đầu bằng tiền tố.
2. **Khóa và kiểu tải là gì?** Khóa là SKU hoặc tên sản phẩm. Thao tác chính là thêm lúc nạp
   dữ liệu và tìm nhiều lần theo tiền tố; xóa ít hơn khi sản phẩm ngừng kinh doanh.
3. **Có chấp nhận trường hợp xấu nhất không?** Có. Tìm đường đi tốn O(p) với p là độ dài tiền tố,
   sau đó còn phải duyệt cây con và trả các kết quả phù hợp.
4. **Yếu tố thực tế nào quan trọng?** Trie tốn nhiều bộ nhớ vì mỗi nút giữ các nhánh ký tự.
   Nhóm chấp nhận chi phí này ở quy mô 10.000 sản phẩm để đổi lấy tìm tiền tố trực tiếp.

## Các ca phải kiểm thử

| Ca thử | Kết quả cần kiểm tra |
| --- | --- |
| Cây rỗng, tiền tố không có | Vector rỗng |
| `sam` và `samsung`, xóa `sam` | `samsung` vẫn tồn tại |
| Một term, hai SKU | Trả đủ hai SKU; xóa một không mất SKU còn lại |
| Thêm lại đúng cặp | Không nhân đôi kết quả |
| Cùng SKU qua nhiều term | Một truy vấn không trả trùng SKU |
| Hoa/thường, UTF-8, chuỗi rỗng | Đúng quy ước đã ghi |
| 1.000/10.000 sản phẩm | Khớp quét tuyến tính dùng cùng quy tắc tiền tố |

Nạp `sku` và `name` từ `backend/data/data_chinh/san_pham.csv` khi loader của Trang xong.
Test riêng có `main()` đặt trong `kiem_thu/`, không include vào `chay_thu.cpp`.

Chạy test từ gốc repo:

```powershell
g++ -std=c++17 -Wall -Wextra -Wpedantic -I backend backend/members/kim_ngan/kiem_thu/kiem_tra.cpp -o backend/build/kiem_tra_kim_ngan.exe
./backend/build/kiem_tra_kim_ngan.exe
```

## Bàn giao

- Test, demo thật, mô tả chuẩn hóa chuỗi và cách xử lý cặp trùng/xóa nhánh dùng chung.
- Nếu dùng con trỏ: ghi cách hủy cây, tránh sao chép gây giải phóng hai lần.
- Đưa phần Q1–Q4 phía trên vào báo cáo, giải thích chi phí duyệt cây con và bộ nhớ.
- Chuẩn bị ví dụ vẽ từng bước; ghi debug, kết quả kiểm thử và nhật ký dùng công cụ.
