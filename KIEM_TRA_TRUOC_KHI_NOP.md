# Kết quả rà soát trước khi nộp — 04/10/2026

## Kết luận và yêu cầu cấu trúc dữ liệu

Mã nguồn có ít nhất hai cấu trúc trung tâm tự cài đặt, có dùng thật trong nghiệp vụ.
Hai cấu trúc chọn trong Plan là **Heap và Trie**; ngoài ra còn có Hash Table và danh sách liên kết đôi.

| Cấu trúc | Bằng chứng cài đặt | Dùng ở đâu |
| --- | --- | --- |
| Heap | `backend/members/nhat_minh/hang_doi_uu_tien.cpp`: `sift_up`, `sift_down`, `push`, `pop` | MC2 + TP1: ưu tiên cao trước, cùng mức thì sequence nhỏ trước |
| Trie | `backend/members/kim_ngan/cay_tien_to.cpp`: nút, thêm/xóa nhánh, duyệt tiền tố | TP2: tìm tên/SKU |
| Hash Table | `backend/members/kieu_trang/bang_bam.cpp`: djb2, bucket, va chạm, rehash | MC1: tìm sản phẩm/đơn theo mã |
| Danh sách liên kết đôi | `backend/members/ngoc_tram/danh_sach_gan_day.cpp`: nút `prev/next`, chuyển đầu, loại cuối | TP3: sản phẩm cập nhật gần đây |

`vector` là vùng chứa cho Hash/Heap. Trie dùng `unordered_map/set` hỗ trợ nhánh và loại trùng;
RecentList dùng `unordered_map` tra vị trí. Không dùng `std::priority_queue` thay Heap,
không dùng thư viện Trie. Khi bảo vệ phải phân biệt phần tự viết với phần dùng STL.
Nếu quy định gốc cấm cả STL hỗ trợ thì cần đối chiếu lại với thầy; Plan hiện không diễn giải chi tiết đến mức đó.

## Các lỗi đã sửa tại chỗ

- JSON số thập phân/số quá lớn bị thu hẹp thành số tồn kho hoặc số lượng sai; phép cộng tồn kho có nguy cơ tràn `int`.
- Cập nhật kho với `note` sai kiểu: trước đây đã đổi tồn kho rồi mới báo lỗi. Nay kiểm tra đầu vào trước khi sửa dữ liệu.
- Không cho nhập kho âm, xuất kho dương hoặc cập nhật 0; đơn lỗi không tiêu thụ số thứ tự.
- Tách từ bằng byte làm mất chữ Việt có dấu; nay giữ UTF-8, hỗ trợ hoa/thường chữ Việt dựng sẵn và tiền tố cả tên.
- Trực quan Trie xuất từng byte thành chuỗi JSON không hợp lệ khi gặp chữ Việt; nay gom ký tự và đọc đường đi từ Trie thật.
- Giá trị băm 64 bit mất chính xác khi sang JavaScript `Number`; nay truyền chuỗi để hiển thị đủ chữ số.
- Nhật ký trùng ID khi đầy 60 mục; số phép so sánh tra đơn trước đây luôn ghi 0/1 dù có va chạm.
- Một worker HTTP bị kết nối keep-alive chiếm giữ; nay có 8 worker và mutex bảo vệ nghiệp vụ dùng chung.
- Benchmark sai đầu vào không còn ghi một phần lịch sử; quét tiền tố đối chứng dùng dữ liệu đã chuẩn hóa giống Trie.
- Tìm kiếm giao diện không còn bỏ gợi ý khi tiền tố vô tình giống định dạng SKU đầy đủ; phân trang sản phẩm tự điều chỉnh khi số trang giảm.
- Loại mục test “API chưa tồn tại” lỗi thời, thay bằng test gọi dịch vụ thật; sửa README/hướng dẫn đang nhắc trang `/cpp` không có.

Không thêm module nghiệp vụ hoặc thư viện phụ thuộc. Bộ test tích hợp được rút ngắn và dùng trực tiếp service hiện có.

## Kiểm tra đã thực hiện

- Build backend C++17 với `-Wall -Wextra -Wpedantic`.
- 5 bộ test thành viên + test tích hợp service, chạy với AddressSanitizer và UndefinedBehaviorSanitizer.
- 55.000 thao tác ngẫu nhiên đối chiếu Hash/Heap/Trie/RecentList với mô hình chuẩn; kiểm tra Merge Sort ổn định và kết quả tìm kiếm. Chương trình thử bổ sung nằm ở thư mục tạm, không đưa thêm vào mã nộp.
- HTTP: các API nghiệp vụ, 5 API demo, dữ liệu lỗi, reset, cập nhật đồng thời; 5 demo CLI cũng chạy được.
- Frontend: TypeScript, ESLint, production build.
- Dữ liệu: 10.000 sản phẩm, 10.000 đơn; không trùng ID/SKU/mã đơn/sequence, không thiếu SKU tham chiếu, tồn kho không âm, số lượng dương.
- Script làm sạch: thử CSV nhỏ có dấu phẩy/ngoặc kép, mã trùng, ngày sai, sắp thứ tự và lấy tồn kho mới nhất. Không tải lại bộ nguồn 410 MB.

Lệnh chạy lại từ gốc dự án:

```sh
npm run backend:build
python3 backend/kiem_thu/run_test.py --sanitize
npm run check:bridge
npm --prefix giaodien run typecheck
npm --prefix giaodien run lint
npm run frontend:build
```

Windows có thể dùng `python` và bỏ `--sanitize` nếu compiler không hỗ trợ.

## Phạm vi và việc còn cần hoàn tất trước nộp

- Theo MC2 trong Plan, nút xử lý lấy đơn khỏi Heap và đánh dấu đã xử lý trong demo; **không tự trừ tồn kho**. Nhập/xuất kho thực hiện riêng ở màn hình Sản phẩm.
- Thay đổi chỉ nằm trong bộ nhớ; reset hoặc khởi động lại backend nạp CSV gốc. Hàm lưu CSV có trong module lưu trữ nhưng web chưa gọi chức năng lưu.
- Tìm kiếm hỗ trợ chữ Việt dựng sẵn (NFC), chưa tự chuẩn hóa Unicode dạng dấu tách (NFD) hoặc bỏ dấu.
- Độ phức tạp hiển thị là của cấu trúc lõi; toàn bộ API còn sao chép, duyệt vector, xuất JSON. Không gọi cả API cập nhật kho là O(1).
- Trực quan Trie hiển thị đường đi của tiền tố, không phải toàn bộ cây; hình Heap là 15 nút đầu của mảng Heap, không phải 15 đơn đã sắp thứ tự.
- Công cụ trình duyệt trong phiên rà soát không kết nối được: **chưa xác nhận bằng thao tác trực tiếp/screenshot** bố cục desktop/mobile và mọi tương tác giao diện. Cần một lượt demo thủ công trên máy sẽ bảo vệ.
- Chưa chạy trực tiếp trên Windows. Các kiểm tra ở trên thực hiện trên macOS arm64, Apple clang 17, Node 22.22.2.
- Trong thư mục hiện tại chưa thấy báo cáo cuối hoàn chỉnh, bài đọc hiểu/phản tư cá nhân, nhật ký công cụ đầy đủ, đánh giá kỹ thuật/đóng góp chéo và xác nhận quy mô với giảng viên như checklist Plan yêu cầu. Kiểm tra các tài liệu nhóm lưu ở nơi khác; không tự tạo minh chứng cá nhân thay thành viên.
- Việc các ca thử đạt không chứng minh phần mềm tuyệt đối không còn bug.

## Số đo kiểm tra bổ sung

Đo 04/10/2026, C++17 `-O2`, Apple clang 17/arm64, 100 lần lặp, bật warmup.
Đơn vị ms/thao tác; loại thời gian HTTP/render và chuẩn bị cấu trúc khỏi phép đo.
Đây là một lần đo tại máy kiểm tra, không phải cam kết hiệu năng hay số đo tổng quát mọi dữ liệu.

| Phép đo | n | DSA (ms) | Đối chứng (ms) |
| --- | ---: | ---: | ---: |
| Hash / quét mã | 1000 | 0.000044 | 0.002004 |
| Hash / quét mã | 5000 | 0.000045 | 0.007686 |
| Hash / quét mã | 10000 | 0.000037 | 0.007650 |
| Heap / quét + xóa vector | 1000 | 0.000490 | 0.017054 |
| Heap / quét + xóa vector | 5000 | 0.000596 | 0.083761 |
| Heap / quét + xóa vector | 10000 | 0.000725 | 0.168770 |
| Trie / quét tiền tố | 1000 | 0.000225 | 0.010437 |
| Trie / quét tiền tố | 5000 | 0.000221 | 0.052886 |
| Trie / quét tiền tố | 10000 | 0.000227 | 0.106160 |
| Merge Sort / std::stable_sort | 1000 | 1.189601 | 0.201386 |
| Merge Sort / std::stable_sort | 5000 | 7.307409 | 1.339572 |
| Merge Sort / std::stable_sort | 10000 | 15.774833 | 2.896919 |

Merge Sort tự viết chậm hơn thư viện trong lần đo này; không sửa số liệu để tạo kết luận nhanh hơn. Hash benchmark dùng một tập truy vấn có thật, Trie dùng một tiền tố cố định mỗi quy mô. Cần giải thích giới hạn mẫu đo; bảng RecentList cũ dùng capacity tăng theo n, khác capacity 6 của ứng dụng.
