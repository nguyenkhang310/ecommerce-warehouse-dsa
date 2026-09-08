# Quản lý kho và đơn hàng

Đồ án Cấu trúc dữ liệu và Giải thuật: tra cứu sản phẩm, xử lý đơn theo ưu tiên,
tìm tiền tố và theo dõi cập nhật tồn kho. Backend C++17, giao diện React + TypeScript.

## Chạy dự án

Yêu cầu: Node.js 22.12+ và g++ hỗ trợ C++17. Chạy lệnh tại gốc repo.

Cài giao diện lần đầu:

```powershell
npm --prefix giaodien install
```

Terminal backend:

```powershell
npm run backend:build
npm run backend:start
```

Terminal giao diện:

```powershell
npm run frontend:dev
```

Mở địa chỉ Vite in ra, vào **Demo C++** (`/cpp`).
Sau khi sửa C++, dừng backend bằng Ctrl+C rồi build và start lại.
Build lần đầu tự tải thư viện HTTP/JSON vào `backend/thu_vien/`.
Backend mặc định dùng cổng 8080; cấu hình proxy tại `giaodien/vite.config.ts`.

## Phân công

Theo [Plan DSA.docx](Plan%20DSA.docx). Mỗi thư mục thành viên có code chức năng,
`chay_thu.cpp` và `huong_dan.md` mô tả hàm, đầu vào và kiểm thử.

| Thành viên | MSSV | Hướng dẫn | Phụ trách |
| --- | --- | --- | --- |
| Hồ Nhật Minh | 24133039 | [nhat_minh](backend/members/nhat_minh/huong_dan.md) | Heap, MC2 + TP1 |
| Dương Thị Kim Ngân | 24133040 | [kim_ngan](backend/members/kim_ngan/huong_dan.md) | Trie, TP2 |
| Nguyễn Thị Kiều Trang | 24133064 | [kieu_trang](backend/members/kieu_trang/huong_dan.md) | Hash Table, CSV/JSON, MC1 |
| Nguyễn Thị Ngọc Trâm | 24133066 | [ngoc_tram](backend/members/ngoc_tram/huong_dan.md) | RecentList, kiểm thử, TP3 |
| Bùi Nguyễn Nguyên Khang | 24133902 | [nguyen_khang](backend/members/nguyen_khang/huong_dan.md) | Merge Sort, tìm kiếm, benchmark, giao diện |

Chạy riêng một thành viên:

```powershell
npm run demo -- kieu_trang
```

Có thể truyền thêm đường dẫn JSON: `npm run demo -- kieu_trang duong_dan/input.json`.
Không truyền file thì đầu vào là `{}`. Dùng `--release` khi đo hiệu năng.

## Cấu trúc

| Thư mục | Nội dung |
| --- | --- |
| `backend/members/` | Module của từng thành viên |
| `backend/app/` | Điểm vào máy chủ HTTP và chương trình dòng lệnh |
| `backend/shared/` | Kiểu dữ liệu, báo lỗi và phản hồi demo dùng chung |
| `backend/data/data_chinh/` | Dữ liệu dùng để code, demo và benchmark |
| `scripts/` | Build C++, làm sạch dữ liệu, kiểm tra kết nối |
| `giaodien/` | Giao diện web |

Thư viện tải về và kết quả build được Git bỏ qua, đồng thời ẩn trong Explorer của VS Code.
Cấu hình hiển thị nằm trong `.vscode/settings.json`.

## Dữ liệu

Bộ chính gồm [10.000 sản phẩm](backend/data/data_chinh/san_pham.csv) và
[10.000 đơn chờ](backend/data/data_chinh/don_hang.csv), có đủ liên kết SKU.
Lấy 1.000 hoặc 10.000 dòng đầu để thử hai quy mô. Nguồn, schema và quy tắc chuẩn hóa
nằm trong [hướng dẫn dữ liệu](backend/data/huong_dan.md).

Tạo lại dữ liệu bằng [lam_sach.cpp](scripts/lam_sach.cpp):

```powershell
npm run data:setup
```

Lệnh tải nguồn nếu thiếu, kiểm tra SHA256 rồi biên dịch và chạy chương trình C++.
Bản đầy đủ nằm trong `backend/data/day_du/`, nguồn ở `backend/data/goc/`;
hai thư mục này không đưa vào Git.

## Tích hợp và kiểm thử

`/cpp → giao_tiep_cpp.ts → /api → may_chu.cpp → chay_thu.cpp`.

Các module thuật toán và loader đang chờ triển khai. Hàm chưa hoàn thiện trả
`NOT_IMPLEMENTED` (HTTP 501 hoặc mã thoát executable 2).
Trang `/cpp` đã gọi C++; các màn hình nghiệp vụ hiện dùng `mockApiAdapter.ts`.

- Kiểu dữ liệu chung: [kieu_du_lieu.cpp](backend/shared/kieu_du_lieu.cpp).
  File chức năng được `#include` vào điểm vào; không biên dịch thêm cùng file đó để tránh định nghĩa trùng.
- Heap ưu tiên `urgent > high > normal`; cùng mức thì sequence nhỏ hơn đi trước.
- Lưu trữ đọc/ghi bản ghi; service điều phối Hash, Trie, Heap và RecentList.
  Khi tích hợp web, đổi adapter từng màn hình sang API C++ và dùng số đo thực tế.
- Test có `main()` riêng đặt trong `kiem_thu/` của thành viên, biên dịch riêng.
  Các ca cụ thể và yêu cầu bàn giao nằm trong hướng dẫn từng người.

Sau khi build backend:

```powershell
npm run check:bridge
npm run frontend:build
npm --prefix giaodien run typecheck
npm --prefix giaodien run lint
```

`check:bridge` kiểm tra HTTP/JSON; test thuật toán chạy riêng theo từng module.
