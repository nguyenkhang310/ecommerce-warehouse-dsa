# 0.3. HỒ SƠ ĐÓNG GÓP: BÙI NGUYỄN NGUYÊN KHANG – MSSV: 24133902

| Thông tin | Nội dung |
| --- | --- |
| Họ và tên | Bùi Nguyễn Nguyên Khang |
| MSSV | 24133902 |
| Phần kỹ thuật phụ trách chính | Merge Sort, Binary Search, Linear Search, benchmark và tích hợp kết quả lên frontend |
| Phần báo cáo phụ trách | Chương 1 – Đọc hiểu bài toán; Chương 6 – Giải thuật, đánh giá hiệu năng và giao diện demo |
| Phạm vi phối hợp | Dựng khung repo, kết nối frontend với backend C++, tích hợp module thành viên, rà soát và kiểm thử toàn hệ thống |
| Bằng chứng chính | Mã nguồn trong `backend/members/nguyen_khang`, trang Hiệu năng, dịch vụ benchmark, lịch sử Git và bộ kiểm thử ngày 04/10/2026 |

Hồ sơ này trình bày phần đóng góp cá nhân của Bùi Nguyễn Nguyên Khang theo các yêu cầu D1, D3, D4, D5, D6 và D7. Nội dung được viết dựa trên `Plan DSA.docx`, mã nguồn hiện tại và lịch sử phiên bản của dự án. Những phần do thành viên khác trực tiếp cài đặt được ghi rõ là nội dung phối hợp, tích hợp hoặc đánh giá chéo; không được tính thành phần cài đặt cá nhân của Nguyên Khang.

## 0.3.1. Báo cáo đọc – hiểu bài toán cá nhân (D1)

### 0.3.1.1. Cách tôi hiểu bối cảnh bài toán

Đề tài của nhóm là xây dựng phần lõi cho hệ thống quản lý kho và xử lý đơn hàng thương mại điện tử. Người sử dụng trực tiếp là nhân viên kho và nhân viên xử lý đơn, không phải khách hàng mua sắm. Vì vậy, hệ thống cần ưu tiên các thao tác được lặp lại nhiều trong quá trình vận hành: tìm đúng sản phẩm, cập nhật tồn kho, tìm đơn cần xử lý tiếp theo, gợi ý sản phẩm khi người dùng chỉ nhớ một phần mã và theo dõi các sản phẩm vừa được cập nhật.

Điểm quan trọng nhất tôi rút ra từ đề bài là nhóm không được chọn trước một cấu trúc dữ liệu rồi cố gắng tìm chức năng để sử dụng cấu trúc đó. Quy trình hợp lý phải đi theo chiều ngược lại: xác định thao tác nghiệp vụ, làm rõ yêu cầu về thứ tự và kiểu khóa, ước lượng tải sử dụng, sau đó mới chọn cấu trúc dữ liệu. Cách tiếp cận này là cơ sở để tôi viết Chương 1 và cũng là nguyên tắc dùng khi xây dựng phần đánh giá ở Chương 6.

Phạm vi của hệ thống được giới hạn ở quản lý dữ liệu kho và hàng đợi xử lý đơn. Hệ thống không phải một website bán hàng hoàn chỉnh, không xử lý thanh toán và không thay thế toàn bộ quy trình giao vận. Frontend có nhiệm vụ minh họa và hỗ trợ thao tác; các quyết định DSA phải được thực hiện trong backend C++.

### 0.3.1.2. Diễn giải các yêu cầu

Từ Plan, tôi hiểu năm yêu cầu nghiệp vụ như sau:

| Mã | Yêu cầu được hiểu trong bối cảnh đề tài | Tiêu chí quan sát được |
| --- | --- | --- |
| MC1 | Tìm chính xác một sản phẩm hoặc đơn hàng bằng mã định danh. Đây là bước mở đầu cho các thao tác xem chi tiết, cập nhật tồn kho và kiểm tra đơn. | Nhập một mã đầy đủ phải trả đúng một bản ghi hoặc kết luận không tồn tại; thời gian tra cứu không tăng tuyến tính trong trường hợp trung bình. |
| MC2 | Trong toàn bộ đơn đang chờ, lấy ra đơn có mức ưu tiên cao nhất để xử lý tiếp theo. | Đơn `urgent` đứng trước `high`, `high` đứng trước `normal`; sau khi lấy phần tử đầu, cấu trúc vẫn duy trì đúng thứ tự ưu tiên. |
| TP1 | Nếu nhiều đơn có cùng mức ưu tiên, đơn đến trước phải được xử lý trước. | Với cùng mức ưu tiên, `sequence_number` nhỏ hơn phải được lấy ra trước. |
| TP2 | Cho phép gợi ý sản phẩm khi nhân viên chỉ nhập một đoạn đầu của SKU hoặc tên. | Kết quả phải chứa các sản phẩm có chung tiền tố và không cần quét toàn bộ danh mục ở mỗi lần gợi ý. |
| TP3 | Giữ một danh sách ngắn các sản phẩm vừa cập nhật tồn kho gần nhất. | SKU vừa cập nhật được chuyển lên đầu; không tạo bản sao trùng; phần tử cũ nhất bị loại khi vượt giới hạn. |

MC1 và MC2 là yêu cầu bắt buộc của đề bài. TP1, TP2 và TP3 là ba yêu cầu nhóm phát hiện thêm từ bối cảnh vận hành kho. Ba yêu cầu bổ sung không lặp lại chức năng của MC1 hoặc MC2: TP1 bổ sung tính công bằng cho hàng đợi ưu tiên, TP2 giải quyết tìm kiếm khi người dùng không nhớ toàn bộ khóa, còn TP3 phục vụ kiểm tra lại các thay đổi mới nhất.

### 0.3.1.3. Xung đột nghiệp vụ cần giải quyết

Xung đột đáng chú ý nhất nằm giữa MC2 và TP1. Nếu chỉ so sánh mức ưu tiên, Heap có thể lấy đúng nhóm đơn gấp nhưng không bảo đảm thứ tự đến trước giữa các đơn có cùng mức. Nếu chỉ dùng hàng đợi FIFO, thứ tự đến được bảo toàn nhưng đơn thường đến trước có thể chặn đơn gấp đến sau.

Nhóm giải quyết bằng một khóa so sánh gồm hai thành phần. Thành phần thứ nhất là mức ưu tiên; thành phần thứ hai là số thứ tự tăng dần theo thời điểm tạo. Khi so sánh hai đơn, mức ưu tiên được xét trước. Nếu mức ưu tiên bằng nhau, đơn có số thứ tự nhỏ hơn được xem là có quyền xử lý trước. Nhờ đó, một Heap duy nhất đáp ứng đồng thời MC2 và TP1 mà không cần duy trì hai cấu trúc song song.

Theo tôi, đây là ví dụ rõ nhất cho việc cấu trúc dữ liệu phải phản ánh quy tắc nghiệp vụ. Độ phức tạp tốt chưa đủ; phép so sánh bên trong cấu trúc phải đúng với ý nghĩa “đơn nào nên được xử lý trước”.

### 0.3.1.4. Phạm vi dữ liệu và kiến trúc

Dữ liệu chính gồm 10.000 sản phẩm và 10.000 đơn hàng đã làm sạch. CSV chỉ đóng vai trò nguồn nạp ban đầu. Sau khi khởi động, dữ liệu được đưa vào các cấu trúc trong bộ nhớ C++. Các truy vấn nghiệp vụ không được thực hiện bằng cách tìm tắt trong file hoặc dùng câu lệnh cơ sở dữ liệu thay cho cấu trúc dữ liệu.

Tôi xác định ba tầng của hệ thống như sau:

1. **Tầng giao diện:** nhận thao tác, hiển thị dữ liệu và biểu đồ; không tự cài đặt logic Hash Table, Heap, Trie hoặc Recent List.
2. **Tầng lõi C++:** chứa cấu trúc dữ liệu, giải thuật và quy tắc nghiệp vụ; đây là nơi tạo ra kết quả thật.
3. **Tầng lưu trữ:** đọc và ghi dữ liệu, không tự trả lời các truy vấn MC1, MC2, TP1, TP2 hoặc TP3.

Việc tách tầng giúp phần web không che lấp nội dung DSA. Khi một biểu đồ xuất hiện trên frontend, số đo phải đến từ C++ và phải có thể chạy lại độc lập bằng terminal.

### 0.3.1.5. Phạm vi cá nhân sau khi đọc đề

Sau khi đối chiếu Plan với phân công nhóm, tôi nhận phần giải thuật và đánh giá hiệu năng, gồm:

- Tự cài đặt Merge Sort ổn định theo SKU.
- Tự cài đặt Binary Search trên dữ liệu đã sắp xếp.
- Cài Linear Search làm phương pháp đối chứng.
- Xây dựng phép đo có warmup, lặp nhiều lần, checksum và kiểm tra tính đúng.
- Đưa kết quả benchmark từ backend C++ lên trang Hiệu năng.
- Phối hợp tích hợp các module Hash Table, Heap, Trie và Recent List vào cùng giao diện.
- Viết Chương 1 để xác định đúng bài toán trước khi thiết kế và Chương 6 để trình bày giải thuật, số đo, cầu nối frontend–backend và kịch bản demo.

Kết quả đọc hiểu giúp tôi xác định frontend chỉ là công cụ quan sát. Phần đóng góp kỹ thuật bắt buộc phải có giải thuật, benchmark và bằng chứng kiểm thử trong C++.

## 0.3.2. Biện minh lựa chọn thiết kế kỹ thuật (D3)

### 0.3.2.1. Merge Sort cho bước chuẩn bị dữ liệu

Tôi chọn Merge Sort vì ba lý do. Thứ nhất, thuật toán thể hiện rõ phương pháp chia để trị được yêu cầu trong phần giải thuật. Thứ hai, thời gian tốt, trung bình và xấu nhất đều là `O(n log n)`, nên có thể giải thích xu hướng khi quy mô tăng mà không phụ thuộc vào trường hợp chọn phần tử chốt như Quick Sort. Thứ ba, bước trộn có thể giữ tính ổn định bằng cách lấy phần tử ở nửa trái trước khi hai SKU bằng nhau.

Mảng tạm làm Merge Sort cần bộ nhớ phụ `O(n)`. Tôi chấp nhận chi phí này vì dữ liệu chính có 10.000 sản phẩm, phù hợp với bộ nhớ của môi trường demo, đồng thời mã nguồn dễ đọc và dễ giải thích hơn các phương án tối ưu phức tạp. `std::stable_sort` chỉ được dùng làm đối chứng hiệu năng; không dùng để thay phần giải thuật nhóm phải tự cài.

Quick Sort từng là phương án có thể cân nhắc vì thường nhanh trong thực tế và dùng ít bộ nhớ phụ. Tuy nhiên, bản cài đặt cơ bản không ổn định và có trường hợp xấu `O(n²)`. Heap Sort có bảo đảm `O(n log n)` nhưng không ổn định và khó liên kết tự nhiên với bước trộn để giải thích chia để trị. Vì mục tiêu của phần này là học thuật, tính rõ ràng và khả năng bảo vệ, Merge Sort phù hợp hơn.

### 0.3.2.2. Binary Search và Linear Search

Binary Search được chọn để chứng minh lợi ích của dữ liệu đã sắp xếp. Sau mỗi lần so sánh, thuật toán loại bỏ một nửa khoảng còn lại, đạt `O(log n)`. Tôi cài bản lặp thay cho bản đệ quy để chỉ dùng bộ nhớ phụ `O(1)` và tránh thêm khung lời gọi hàm. Khoảng tìm kiếm được quản lý theo dạng nửa kín `[left, right)`, giúp xử lý mảng rỗng và giảm lỗi biên.

Linear Search được cài vì đây là cách đối chứng trực tiếp nhất. Nó không cần sắp xếp, nhưng phải duyệt tuần tự và có trường hợp xấu `O(n)`. Cùng một danh sách truy vấn được dùng cho Binary Search và Linear Search để chênh lệch đo được đến từ thuật toán, không đến từ dữ liệu đầu vào khác nhau.

Binary Search không thay thế Hash Table trong nghiệp vụ MC1. Binary Search phù hợp để minh họa tìm kiếm trên mảng có thứ tự, còn Hash Table phù hợp hơn với tra cứu chính xác và cập nhật theo khóa trong hệ thống chính. Tôi giữ rõ ranh giới này để báo cáo không đưa ra kết luận rằng một giải thuật duy nhất giải quyết mọi loại truy vấn.

### 0.3.2.3. Thiết kế benchmark

Tôi chọn `std::chrono::steady_clock` vì đồng hồ này đơn điệu và phù hợp để đo khoảng thời gian. `system_clock` có thể thay đổi khi hệ điều hành điều chỉnh thời gian, nên không phù hợp bằng cho benchmark. Kết quả được đổi sang mili giây để thống nhất giữa C++, JSON và biểu đồ.

Thiết kế phép đo gồm các quyết định sau:

| Quyết định | Lý do |
| --- | --- |
| Đo tại 1.000, 5.000 và 10.000 bản ghi | Quan sát được xu hướng từ tập nhỏ đến toàn bộ dữ liệu chính. |
| Có warmup | Giảm ảnh hưởng của lần truy cập đầu tiên và đưa dữ liệu vào bộ nhớ đệm trước khi đo chính. |
| Lặp nhiều lần và lấy trung bình | Một thao tác riêng lẻ quá nhanh và dễ bị nhiễu; lặp lại tạo số đo ổn định hơn. |
| Dùng checksum `volatile` | Buộc kết quả phép tính có tác động quan sát được, hạn chế trình biên dịch loại bỏ đoạn mã đo. |
| Dùng cùng truy vấn | Bảo đảm hai phương pháp giải quyết cùng một công việc. |
| Tách thời gian chuẩn bị | Không cộng Merge Sort, đọc file, HTTP, JSON và render vào thời gian một lượt tìm kiếm. |
| Kiểm tra kết quả sau khi đo | Một phương pháp chạy nhanh nhưng trả sai không được xem là kết quả hợp lệ. |

Trong benchmark tìm kiếm, bốn trong mỗi năm truy vấn là SKU có thật và một truy vấn là SKU không tồn tại. Tỷ lệ này buộc thuật toán xử lý cả trường hợp thành công và thất bại. Các SKU có thật được lấy theo bước nhảy trong danh mục để không tập trung ở một vị trí thuận lợi.

Phương án đo toàn bộ thời gian từ lúc người dùng bấm nút đến lúc biểu đồ hiển thị đã không được chọn cho so sánh DSA. Số đo đó trộn lẫn thời gian HTTP, JSON và render React, khiến tác động của thuật toán bị che khuất. Thời gian đầu cuối vẫn có ý nghĩa với trải nghiệm người dùng, nhưng không trả lời đúng câu hỏi về độ phức tạp của cấu trúc dữ liệu.

### 0.3.2.4. Thiết kế kết nối React với C++

Frontend gửi HTTP JSON đến backend thay vì chạy lại thuật toán bằng TypeScript. `may_chu.cpp` chịu trách nhiệm nhận yêu cầu; `dich_vu.cpp` gọi các module DSA; `api.ts` gom các lời gọi ở phía React. Vite chuyển tiếp `/api` đến backend C++ tại cổng 8080 trong môi trường phát triển.

Tôi chọn cách kết nối này vì nó giữ đúng kiến trúc ba tầng của Plan. Giao diện có thể thay đổi mà không làm thay đổi cài đặt DSA, còn thuật toán C++ có thể chạy qua CLI để chứng minh không phụ thuộc vào React. Header `X-DSA-Runtime: C++` và API kiểm tra sức khỏe giúp xác nhận giao diện đang dùng backend thật.

Frontend mock từng tồn tại trong phiên bản đầu nhưng đã được loại bỏ khi tích hợp hoàn chỉnh. Dữ liệu trên các trang Tổng quan, Sản phẩm, Hàng đợi đơn, Trực quan DSA, Hiệu năng và Hệ thống hiện đến từ cùng trạng thái trong backend C++.

### 0.3.2.5. Quan hệ giữa thiết kế và hai chương báo cáo

Chương 1 trả lời câu hỏi “hệ thống cần giải quyết vấn đề gì” và xác định ranh giới giữa nghiệp vụ, cấu trúc dữ liệu và giao diện. Chương 6 trả lời câu hỏi “giải thuật được cài và đánh giá như thế nào”. Tôi viết hai chương này để tạo một mạch lập luận liên tục: yêu cầu thực tế dẫn đến thiết kế, thiết kế dẫn đến cài đặt, cài đặt được kiểm tra bằng số đo thật, và kết quả cuối cùng được trình bày qua giao diện.

## 0.3.3. Bảng đối soát đóng góp mã nguồn (D4)

### 0.3.3.1. Phần sở hữu kỹ thuật trực tiếp

| Tệp hoặc khu vực | Đóng góp chính | Bằng chứng có thể kiểm tra |
| --- | --- | --- |
| `backend/members/nguyen_khang/thuat_toan.cpp` | Cài Merge Sort ổn định, Binary Search, Linear Search; sinh truy vấn; đo thời gian; warmup; checksum; kiểm tra kết quả và tạo `BenchmarkPoint`. | Các hàm `merge_sort_by_sku`, `binary_search_by_sku`, `linear_search_by_sku`, `run_benchmark`. |
| `backend/members/nguyen_khang/chay_thu.cpp` | Đọc và kiểm tra đầu vào JSON, nạp dữ liệu chính, gọi benchmark và trả kết quả có cấu trúc để chạy độc lập. | Hàm `run_demo`, kiểm tra `data_dir`, `operation`, `sizes`, `iterations`, `warmup`. |
| `backend/members/nguyen_khang/kiem_thu/kiem_tra.cpp` | Kiểm thử mảng rỗng, tính ổn định, tìm đầu/giữa/cuối, tìm không tồn tại và dữ liệu benchmark không hợp lệ. | Chương trình test riêng in `DAT: Merge Sort, Binary Search, Linear Search va benchmark`. |
| `backend/members/nguyen_khang/huong_dan.md` | Ghi phạm vi bàn giao, cách gọi hàm, nguyên tắc benchmark, ca kiểm thử và cách demo. | Tài liệu nằm cùng module cá nhân. |
| `giaodien/src/routes/performance.tsx` | Giao diện cấu hình và hiển thị benchmark: phép đo, quy mô, lượt lặp, warmup, biểu đồ và bảng kết quả. | Route `/performance`, dữ liệu lấy qua `benchmarkApi`. |
| `giaodien/src/services/api.ts` | Cầu gọi `/api/app`, xử lý lỗi kết nối và API benchmark ở frontend. | `benchmarkApi.run`, `benchmarkApi.getHistory`, xuất CSV/JSON. |
| `bao_cao/chuong_6.md` | Viết phần giải thuật, phương pháp đo, kết quả thật, kết nối C++–React, màn hình demo và kịch bản bảo vệ. | File Chương 6 trong thư mục báo cáo. |
| Nội dung Chương 1 của báo cáo | Đọc hiểu bối cảnh, diễn giải MC1–MC2 và TP1–TP3, phạm vi hệ thống và kiến trúc ba tầng. | Nội dung bám Mục 1 và Mục 4 trong `Plan DSA.docx`. |

### 0.3.3.2. Phần tích hợp và phối hợp

| Tệp hoặc khu vực | Vai trò của Nguyên Khang | Ranh giới đóng góp |
| --- | --- | --- |
| `backend/app/dich_vu.cpp` | Tích hợp Hash Table, Heap, Trie, Recent List và giải thuật vào một trạng thái nghiệp vụ; xây dựng các phép benchmark dùng trên web. | Cấu trúc lõi của từng thành viên vẫn thuộc người phụ trách tương ứng. |
| `backend/app/may_chu.cpp` | Nối dịch vụ với HTTP, cung cấp `/api/app`, `/api/modules`, `/api/demo/:id`, `/api/health`. | Không nhận là tác giả các module DSA được máy chủ gọi. |
| `scripts/quan_ly_cpp.mjs` | Chuẩn hóa lệnh tải thư viện, biên dịch C++17, chạy backend, frontend và demo thành viên. | Script hỗ trợ build; không thay thế logic C++. |
| `scripts/kiem_tra_ket_noi.mjs` | Kiểm tra cầu HTTP/JSON, API nghiệp vụ, module demo và dữ liệu lỗi. | Đây là kiểm thử tích hợp, không phải kiểm thử đơn vị của từng cấu trúc. |
| `giaodien/src/routes/*` và các component dùng chung | Chuyển giao diện từ dữ liệu mô phỏng sang backend C++ thật, rút gọn màn hình và hỗ trợ chế độ bảo vệ. | Nội dung DSA hiển thị đến từ module thành viên. |
| README và hướng dẫn nhóm | Mô tả cách chạy, kiến trúc, dữ liệu và phân công để thành viên có thể tiếp tục làm việc. | Tài liệu hỗ trợ nhóm, không được tính thay phần kỹ thuật cá nhân của các bạn. |

### 0.3.3.3. Đối soát qua lịch sử Git

Lịch sử Git sử dụng hai tên tác giả `Nguyen Khang` và `ngkhang310`, cùng liên quan đến tài khoản của tôi. Một số mốc chính:

| Commit | Ngày | Nội dung đối soát |
| --- | --- | --- |
| `a7e81ef` | 09/09/2026 | Dựng khung repo, dữ liệu chính, module thành viên, máy chủ, script build và hướng dẫn ban đầu. |
| `2c4f218` | 19/09/2026 | Rà soát và hoàn thiện việc tích hợp module của các thành viên. |
| `5c63544` | 20/09/2026 | Kết nối dữ liệu backend C++ thật với frontend, bổ sung giải thuật, test và trang Hiệu năng. |
| `19f3632` | 20/09/2026 | Sửa tình trạng chạy lại file backend đã build cũ. |
| `f00407e` | 27/09/2026 | Rút gọn phần backend và module Nguyên Khang để dễ đọc, dễ báo cáo. |
| `9ed670c` | 27/09/2026 | Loại bỏ màn hình và thành phần frontend thừa, làm gọn giao diện. |
| `87a3107` | 27/09/2026 | Sửa cấu hình C++ và cảnh báo kiểu dữ liệu trong phần benchmark. |
| `6adcc0f` | 04/10/2026 | Rà soát cuối, bổ sung kiểm tra dữ liệu lỗi và hoàn thiện tích hợp trước khi nộp. |

Lịch sử commit được dùng để truy vết quá trình thay đổi, không dùng số dòng code làm thước đo duy nhất. Đóng góp được đánh giá theo chức năng hoàn chỉnh, khả năng kiểm thử và khả năng giải thích khi bảo vệ.

## 0.3.4. Nhật ký gỡ lỗi và kiểm thử thực nghiệm (D5)

### 0.3.4.1. Chiến lược kiểm thử

Tôi chia kiểm thử thành ba mức. Mức thứ nhất kiểm tra riêng giải thuật cá nhân bằng dữ liệu nhỏ, giúp xác định lỗi biên. Mức thứ hai kiểm tra dịch vụ tích hợp với các cấu trúc của cả nhóm. Mức thứ ba chạy backend thật với dữ liệu chính để đo hiệu năng và kiểm tra đường truyền HTTP/JSON.

Nguyên tắc của tôi là kiểm tra tính đúng trước khi đo tốc độ. Benchmark chỉ được chấp nhận khi dữ liệu sau Merge Sort có thứ tự và Binary Search cùng Linear Search thống nhất về trạng thái tìm thấy của từng SKU.

### 0.3.4.2. Ma trận kiểm thử phần cá nhân

| Ca kiểm thử | Mục đích | Kết quả mong đợi |
| --- | --- | --- |
| Vector rỗng | Kiểm tra điều kiện biên | Merge Sort không lỗi; hai cách tìm trả không có kết quả. |
| Dữ liệu có SKU trùng | Kiểm tra tính ổn định | Hai phần tử bằng SKU giữ nguyên thứ tự tương đối ban đầu. |
| SKU ở đầu, giữa và cuối | Kiểm tra cập nhật biên Binary Search | Tất cả vị trí đều được tìm thấy. |
| SKU không tồn tại | Kiểm tra đường thất bại | Binary Search và Linear Search cùng trả không có kết quả. |
| Hai quy mô benchmark | Kiểm tra cấu trúc kết quả | Trả đủ số điểm và đúng `dataset_size`. |
| `iterations = 0` | Kiểm tra đầu vào | Ném `std::invalid_argument`, không trả số đo giả. |
| Tên phép đo sai | Kiểm tra đầu vào | Từ chối operation chưa được hỗ trợ. |

### 0.3.4.3. Kết quả chạy lại ngày 04/10/2026

Tôi chạy `python backend/kiem_thu/run_test.py` trên Windows tại thư mục gốc. Script biên dịch bằng C++17 với `-O1`, `-Wall`, `-Wextra`, `-Wpedantic`, sau đó chạy năm bộ test thành viên và một test tích hợp.

Kết quả cuối:

- Test Hash Table và CSV: đạt.
- Test Trie: đạt.
- Chín nhóm ca thử Recent List: đạt.
- Test Merge Sort, Binary Search, Linear Search và benchmark của Nguyên Khang: đạt.
- Test Heap: đạt.
- Test tích hợp MC1, MC2/TP1, TP2, TP3, kiểm tra đầu vào, benchmark và reset qua dịch vụ thật: đạt.
- Tổng cộng: `PASS: 6 chương trình kiểm thử`.

Lần chạy đầu tiên cho thấy sáu chương trình đều đạt nhưng script Python trả mã lỗi ở dòng tổng kết vì bảng mã `cp1258` của Windows không in được một ký tự tiếng Việt. Tôi bổ sung cấu hình UTF-8 cho `stdout` trong `backend/kiem_thu/run_test.py` và chạy lại. Lần thứ hai kết thúc với mã thoát 0. Đây là lỗi của bộ chạy test, không phải lỗi giải thuật, nhưng vẫn cần sửa để quy trình kiểm tra tự động báo đúng trạng thái.

### 0.3.4.4. Nhật ký gỡ lỗi

| Thời điểm | Hiện tượng | Nguyên nhân xác định | Cách xử lý | Bằng chứng/kết quả |
| --- | --- | --- | --- | --- |
| 20/09/2026 | Sửa C++ nhưng khi chạy dự án vẫn thấy hành vi của bản cũ. | Script chỉ biên dịch khi chưa có file thực thi, nên file `may_chu.exe` cũ tiếp tục được dùng. | Cho lệnh `npm run dev` biên dịch backend release trước khi khởi động. | Commit `19f3632`; tránh đọc file build cũ. |
| 20/09/2026 | Frontend hiển thị được nhưng logic còn nằm trong dữ liệu mô phỏng TypeScript. | Giao diện và backend chưa dùng chung trạng thái. | Loại mock, tạo `api.ts`, tích hợp `dich_vu.cpp` và chuyển các màn hình sang `/api/app`. | Commit `5c63544`; dữ liệu giao diện đến từ C++. |
| 27/09/2026 | Backend và phần cá nhân quá dài, khó giải thích trong báo cáo. | Có nhiều lớp trung gian và đoạn lặp không cần thiết. | Rút gọn module, gom xử lý chung nhưng giữ nguyên logic và test. | Commit `f00407e`, số dòng giảm và test vẫn đạt. |
| 27/09/2026 | Trình biên dịch cảnh báo khi cộng `size_t` vào iterator. | Kiểu độ dài vector và `difference_type` của iterator không hoàn toàn giống nhau. | Điều chỉnh phép chuyển kiểu/cách tạo đoạn dữ liệu và rà lại cấu hình IntelliSense. | Commit `87a3107`; build với cảnh báo nghiêm ngặt. |
| 03/10/2026 | Bảng số liệu mẫu trong nội dung báo cáo không khớp mã nguồn và môi trường thật. | Nội dung ban đầu ghi sai phiên bản g++, sai tên hàm và dùng số benchmark chưa chạy. | Đo lại trực tiếp, xác nhận g++ 14.2.0, dùng đúng hàm `merge`, ghi số liệu thật và nêu trung thực Merge Sort chậm hơn `std::stable_sort`. | `bao_cao/chuong_6.md` và kết quả backend C++. |
| 04/10/2026 | Test chạy đạt nhưng Python trả mã thoát 1 ở dòng tổng kết. | `stdout` dùng `cp1258`, không mã hóa được toàn bộ chuỗi tiếng Việt. | Cấu hình `stdout` UTF-8 trong `run_test.py`, chạy lại toàn bộ sáu chương trình. | Lần chạy lại kết thúc mã 0. |
| 04/10/2026 | Dữ liệu lỗi có nguy cơ làm thay đổi trạng thái hoặc thu hẹp số ngoài phạm vi. | Một số trường JSON được đọc trước khi kiểm tra đầy đủ kiểu và giới hạn. | Kiểm tra đầu vào trước khi cập nhật; bổ sung ca số thập phân, số quá lớn, `note` sai kiểu và cập nhật đồng thời. | Commit `6adcc0f`; test tích hợp đạt. |

### 0.3.4.5. Kiểm thử hiệu năng và giới hạn kết luận

Benchmark thật được chạy trên các mốc 1.000, 5.000 và 10.000 bản ghi. Kết quả chi tiết được trình bày trong Chương 6. Các xu hướng chính là Binary Search tăng chậm hơn Linear Search; Hash Table, Heap và Trie có lợi thế rõ so với quét tuần tự; Merge Sort tự cài đặt đúng `O(n log n)` nhưng chậm hơn `std::stable_sort` trong lần đo.

Tôi không xem một lần chạy là bằng chứng tuyệt đối cho mọi máy. Kết quả phụ thuộc CPU, bộ nhớ đệm, trình biên dịch và tác vụ nền. Những số đo rất nhỏ có thể dao động, nên kết luận dựa vào xu hướng theo quy mô, độ phức tạp và chênh lệch đủ lớn. Phép đo hiện dùng giá trị trung bình, chưa báo cáo độ lệch chuẩn hoặc khoảng tin cậy; đây là giới hạn được ghi rõ trong Chương 6.

## 0.3.5. Đánh giá chéo kỹ thuật – Peer Review (D6)

### 0.3.5.1. Mục tiêu và phạm vi rà soát

Theo phân công đánh giá chéo, tôi đánh giá phần của **Nguyễn Thị Kiều Trang**, gồm Hash Table phục vụ MC1 và tầng đọc/ghi CSV. Việc rà soát tập trung vào bốn câu hỏi: cấu trúc có đúng yêu cầu tra cứu theo mã hay không, cách xử lý va chạm và mở rộng bảng có hợp lý hay không, tầng lưu trữ có giữ đúng ranh giới với tầng nghiệp vụ hay không, và các trường hợp lỗi dữ liệu đã được kiểm tra hay chưa.

Các module Heap, Trie và Recent List vẫn được tôi đọc để thực hiện tích hợp, nhưng không được ghi là nội dung Peer Review chính trong D6. Bằng chứng review phần Kiều Trang nằm trong commit `2c4f218` ngày 19/09/2026, bộ test riêng của Kiều Trang, test tích hợp và đợt rà soát cuối ngày 04/10/2026.

### 0.3.5.2. Nội dung được đánh giá

| Thành phần của Kiều Trang | Nội dung kiểm tra | Kết quả đánh giá |
| --- | --- | --- |
| `bang_bam.cpp` | Hàm băm, cách chọn bucket, xử lý va chạm, thêm/cập nhật, tìm, xóa và rehash. | Đúng vai trò MC1; có đủ các thao tác cơ bản và không dùng `std::unordered_map` để thay toàn bộ Hash Table. |
| `xu_ly_csv.cpp` | Đọc trường có dấu phẩy hoặc ngoặc kép, xử lý `""`, xuống dòng Windows, UTF-8 BOM, số nguyên và cột bắt buộc. | Bộ phân tích CSV xử lý đúng các trường hợp cần thiết của dữ liệu chính và báo lỗi khi cấu trúc dòng không hợp lệ. |
| `luu_tru.cpp` | Nạp sản phẩm, gộp nhiều dòng sản phẩm của cùng đơn, kiểm tra tồn kho, số lượng, priority, status và ghi dữ liệu trở lại CSV. | Tầng lưu trữ thực hiện đúng nhiệm vụ đọc/ghi, không dùng file để trả lời trực tiếp nghiệp vụ MC1. |
| `chay_thu.cpp` | Kiểm tra `data_dir`, `sku`, `order_id`; tạo bảng sản phẩm và bảng đơn; trả kết quả tìm kiếm. | Demo thể hiện được Hash Table hoạt động độc lập với giao diện web. |
| `kiem_thu/kiem_tra.cpp` | Upsert cùng khóa, tìm thiếu khóa, xóa, ghi–đọc lại sản phẩm và đơn có nhiều dòng sản phẩm. | Test bao phủ hành vi chính và xác nhận dữ liệu không mất sau vòng ghi–đọc. |

### 0.3.5.3. Phân tích kỹ thuật Hash Table của Kiều Trang

Hash Table dùng một vector các bucket. Mỗi bucket là danh sách các cặp khóa–giá trị, tức phương pháp separate chaining. Hàm `hash_value` bắt đầu từ giá trị 5381 và cập nhật theo công thức nhân 33 rồi cộng byte tiếp theo của khóa. Chỉ số bucket được tính bằng phần dư của giá trị băm cho số bucket.

Khi `upsert`, module duyệt bucket tương ứng. Nếu khóa đã tồn tại, giá trị được cập nhật và kích thước bảng không tăng. Nếu chưa có, cặp mới được thêm vào bucket. Khi hệ số tải vượt `0,75`, số bucket được nhân đôi và toàn bộ phần tử được băm lại. Cách làm này giữ cho độ dài trung bình của mỗi chuỗi va chạm không tăng quá cao. `find` và `erase` cũng chỉ duyệt bucket của khóa thay vì toàn bộ bảng.

Trong điều kiện hàm băm phân bố khóa hợp lý, thao tác thêm, tìm và xóa có thời gian trung bình `O(1)`. Trường hợp xấu nhất vẫn có thể đạt `O(n)` nếu nhiều khóa va chạm vào cùng một bucket. Vì vậy, khi bảo vệ không nên phát biểu Hash Table “luôn luôn O(1)”; phải nói rõ đây là độ phức tạp trung bình.

Điểm tôi đánh giá tốt là module tự cài đặt đầy đủ logic bucket, va chạm và rehash nhưng vẫn giữ mã ngắn. Hash Table được dùng cho cả sản phẩm và đơn hàng thông qua template, tránh viết hai phiên bản giống nhau. Tầng lưu trữ được tách sang `luu_tru.cpp` và `xu_ly_csv.cpp`, đúng yêu cầu kiến trúc trong Plan.

Điểm cần lưu ý khi tích hợp là `hash_value` trả số nguyên 64 bit. JavaScript `Number` không biểu diễn chính xác mọi số nguyên 64 bit, nên giá trị này phải được đổi thành chuỗi trước khi đưa lên giao diện. Ngoài ra, con trỏ trả về từ `find` chỉ nên dùng trong lúc bảng không bị thay đổi; một lần rehash có thể làm thay đổi vị trí lưu trữ. Dịch vụ hiện đọc giá trị ngay và không giữ con trỏ qua thao tác cập nhật khác.

Bộ test của Kiều Trang xác nhận upsert cùng khóa không làm tăng `size`, tìm khóa không tồn tại trả `nullptr`, xóa lần thứ hai trả thất bại và dữ liệu sản phẩm/đơn hàng được giữ sau vòng ghi–đọc CSV. Trong lần chạy ngày 04/10/2026, test riêng in `ĐẠT: Hash Table và đọc/ghi CSV`; test tích hợp MC1 cũng đạt.

### 0.3.5.4. Giá trị học được từ Peer Review

Qua phần của Kiều Trang, tôi hiểu rõ hơn sự khác nhau giữa cấu trúc lõi và toàn bộ nghiệp vụ. Một lần `find` trong Hash Table có thời gian trung bình `O(1)`, nhưng toàn bộ API còn có bước đọc JSON, tạo phản hồi và cập nhật các cấu trúc liên quan. Vì vậy, không được gọi toàn bộ API là `O(1)` chỉ dựa vào một thao tác bên trong.

Tôi cũng hiểu rằng tầng lưu trữ phải dừng ở việc chuyển đổi giữa CSV và kiểu dữ liệu C++. Việc tra cứu theo SKU phải đi qua Hash Table sau khi dữ liệu đã được nạp. Peer Review này giúp phần frontend và benchmark của tôi hiển thị đúng chỉ số bucket, va chạm và hệ số tải, đồng thời không biến thao tác đọc file thành lời giải thay cho MC1.

Kết luận đánh giá: phần Hash Table và lưu trữ của Kiều Trang đáp ứng đúng phạm vi MC1, có kiểm tra đầu vào và có test ghi–đọc. Những lưu ý về số băm 64 bit, hiệu lực con trỏ sau rehash và cách phát biểu độ phức tạp đã được đưa vào phần tích hợp và nội dung bảo vệ.

## 0.3.6. Nhật ký ứng dụng AI và Phản tư cá nhân (D7)

### 0.3.6.1. Nguyên tắc sử dụng AI

Tôi sử dụng AI như công cụ hỗ trợ phân tích, rà soát, đề xuất cách tổ chức mã và soạn bản nháp tài liệu. Tôi không xem câu trả lời của AI là bằng chứng kỹ thuật. Mọi đoạn mã hoặc nội dung được giữ lại phải được đối chiếu với Plan, đọc lại bằng hiểu biết cá nhân, build và kiểm thử trên repo.

Các nguyên tắc tôi áp dụng:

1. Không dùng số benchmark do AI ước lượng; chỉ lấy số từ chương trình chạy thật.
2. Không để AI thay thế phần giải thích cá nhân; tôi phải trình bày được từng quyết định khi bảo vệ.
3. Không nhận phần cài đặt của thành viên khác thành đóng góp của mình.
4. Ưu tiên mã ngắn, dễ đọc và đúng phạm vi Plan; loại bỏ file hoặc lớp trung gian không cần thiết.
5. Kiểm tra lại tên file, tên hàm, route, phiên bản compiler và dữ liệu trước khi đưa vào báo cáo.

### 0.3.6.2. Nhật ký sử dụng công cụ

| Thời gian | Mục đích sử dụng AI | Kết quả được dùng | Cách tôi kiểm chứng |
| --- | --- | --- | --- |
| 29/08–09/09/2026 | Phân tích repo frontend ban đầu và dựng khung C++ cho năm thành viên. | Cấu trúc `backend/members`, `backend/app`, `shared`, script build và hướng dẫn. | Đối chiếu bảng phân công Plan, kiểm tra từng module có điểm vào riêng và build được. |
| 09/09/2026 | Hỗ trợ tổ chức quá trình tải, làm sạch và rút gọn dữ liệu Kaggle. | Script làm sạch C++, dữ liệu chính 10.000 sản phẩm và 10.000 đơn. | Kiểm tra SHA256 nguồn, schema, số dòng, khóa trùng và liên kết SKU. |
| 19–20/09/2026 | Rà soát module thành viên và nối frontend với backend thật. | API chung, test cầu kết nối, loại bỏ dữ liệu mô phỏng. | Chạy test module, API và kiểm tra trạng thái thay đổi dùng chung trong C++. |
| 20–27/09/2026 | Rút gọn mã để sinh viên dễ đọc và dễ báo cáo. | Module Nguyên Khang, dịch vụ và giao diện ít file hơn. | So sánh hành vi trước/sau, build với cảnh báo và chạy test lại. |
| 03/10/2026 | Soạn Chương 6 và kiểm tra số liệu benchmark. | Bản báo cáo giải thuật, phương pháp đo, kết quả và kịch bản demo. | Chạy backend C++, xác nhận g++ 14.2.0, dữ liệu 10.000 bản ghi và tính lại hệ số so sánh. |
| 04/10/2026 | Rà soát cuối, xây dựng hồ sơ đóng góp và chạy lại kiểm thử. | Bảng đối soát D1–D7, bổ sung bằng chứng test và sửa mã hóa bộ chạy test. | Đọc Git history, đối chiếu từng file và chạy đủ sáu chương trình kiểm thử với mã thoát 0. |

### 0.3.6.3. Những nội dung AI đưa ra nhưng phải sửa hoặc loại bỏ

Trong quá trình làm, một số nội dung gợi ý ban đầu không khớp repo thực tế. Ví dụ, bản mô tả từng ghi trình biên dịch `g++ 16.2.1`, tên hàm `merge_ranges`, tốc độ Hash nhanh hơn 700 lần và giao diện có bảy màn hình gồm `/cpp`. Khi kiểm tra lại, môi trường Windows đang dùng g++ 14.2.0, hàm hiện tại là `merge`, số benchmark phải đo lại và frontend chỉ còn sáu màn hình; demo thành viên chạy bằng CLI hoặc API.

Tôi đã loại các thông tin sai khỏi Chương 6 thay vì giữ lại vì chúng có vẻ đẹp hoặc thuận lợi cho báo cáo. Trường hợp Merge Sort tự viết chậm hơn `std::stable_sort` cũng được giữ nguyên và giải thích đúng nguyên nhân. Kinh nghiệm này cho thấy AI có thể tạo ra nội dung mạch lạc nhưng không bảo đảm nội dung đó khớp trạng thái hiện tại của dự án.

### 0.3.6.4. Phản tư cá nhân

Phần tôi học được rõ nhất là sự khác nhau giữa độ phức tạp lý thuyết và thời gian chạy thực tế. Trước khi làm benchmark, tôi dễ tập trung vào kết luận `O(log n)` nhanh hơn `O(n)`. Sau khi đo, tôi hiểu rằng Binary Search còn có chi phí sắp xếp, phép đo rất nhỏ chịu ảnh hưởng của bộ nhớ đệm, và hai thuật toán cùng bậc vẫn có thể chênh lệch lớn do chất lượng cài đặt. Vì vậy, một bảng số liệu chỉ có ý nghĩa khi ghi rõ cách chuẩn bị, cách đo và giới hạn kết luận.

Tôi cũng hiểu rõ hơn vai trò của tích hợp. Một module có thể đúng khi chạy riêng nhưng vẫn gây lỗi khi ghép chung do kiểu JSON, trạng thái dùng chung, mã hóa UTF-8, số nguyên vượt phạm vi hoặc nhiều kết nối đồng thời. Việc xây dựng frontend buộc tôi phải hiểu hợp đồng đầu vào–đầu ra của Hash Table, Heap, Trie và Recent List, thay vì chỉ biết phần giải thuật của mình.

AI giúp tôi tăng tốc các công việc lặp lại như tìm file liên quan, đề xuất cấu trúc tài liệu và rà soát trường hợp biên. Hạn chế lớn nhất là AI có thể suy diễn từ phiên bản cũ, dùng số liệu mẫu hoặc viết thêm cấu trúc không cần thiết. Cách sử dụng phù hợp nhất với tôi là yêu cầu AI tạo một bản có thể kiểm tra, sau đó dùng mã nguồn, Git và test để quyết định giữ, sửa hoặc loại bỏ.

Sau dự án, tôi có thể tự giải thích Merge Sort, Binary Search, Linear Search, quy trình benchmark và luồng React–C++. Tôi cũng có thể giải thích phần Hash Table của Kiều Trang, gồm hàm băm, bucket, xử lý va chạm, rehash và ranh giới giữa tầng lưu trữ với tầng lõi. Đây là tiêu chí quan trọng hơn việc chỉ hoàn thành giao diện hoặc tạo ra nhiều dòng mã.

### 0.3.6.5. Cam kết trách nhiệm cá nhân

Tôi chịu trách nhiệm đối với phần nội dung và mã nguồn được liệt kê trong hồ sơ này. AI chỉ là công cụ hỗ trợ; quyết định thiết kế, việc lựa chọn nội dung cuối cùng, kiểm thử và giải thích khi bảo vệ thuộc trách nhiệm của tôi. Nếu số liệu hoặc mô tả không khớp chương trình tại thời điểm nộp, tôi phải cập nhật lại từ kết quả chạy thật thay vì viện dẫn đầu ra của công cụ.

## Phụ lục: vị trí bằng chứng

| Loại bằng chứng | Vị trí |
| --- | --- |
| Kế hoạch và phân công | `Plan DSA.docx`, Mục 1, 4, 5.1, 6, 7, 11 và 12 |
| Giải thuật cá nhân | `backend/members/nguyen_khang/thuat_toan.cpp` |
| Demo cá nhân | `backend/members/nguyen_khang/chay_thu.cpp` |
| Test cá nhân | `backend/members/nguyen_khang/kiem_thu/kiem_tra.cpp` |
| Hướng dẫn cá nhân | `backend/members/nguyen_khang/huong_dan.md` |
| Benchmark tích hợp | `backend/app/dich_vu.cpp` |
| Máy chủ HTTP C++ | `backend/app/may_chu.cpp` |
| Trang Hiệu năng | `giaodien/src/routes/performance.tsx` |
| Cầu frontend–backend | `giaodien/src/services/api.ts` |
| Test toàn hệ thống | `backend/kiem_thu/run_test.py`, `backend/kiem_thu/test_tich_hop.cpp`, `scripts/kiem_tra_ket_noi.mjs` |
| Báo cáo Chương 6 | `bao_cao/chuong_6.md` |
| Đối soát Git | Các commit được liệt kê tại Mục 0.3.3.3 |
