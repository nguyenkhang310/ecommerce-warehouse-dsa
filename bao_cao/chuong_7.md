# CHƯƠNG 7. KẾT LUẬN VÀ HƯỚNG PHÁT TRIỂN

Chương này tổng hợp những kết quả mà nhóm đã đạt được, đánh giá các giới hạn còn tồn tại và đề xuất hướng phát triển cho hệ thống quản lý kho và xử lý đơn hàng thương mại điện tử. Nội dung kết luận được đối chiếu với mã nguồn, dữ liệu và kết quả kiểm thử hiện tại. Vì đây là đồ án Cấu trúc dữ liệu và Giải thuật, tiêu chí đánh giá chính là sự phù hợp giữa yêu cầu nghiệp vụ với cấu trúc dữ liệu, tính đúng của thao tác, khả năng phân tích độ phức tạp và bằng chứng thực nghiệm; giao diện web đóng vai trò hỗ trợ quan sát và trình bày.

## 7.1. Kết quả đạt được

### 7.1.1. Hoàn thành các yêu cầu nghiệp vụ trong phạm vi đồ án

Hệ thống đã cài đặt và tích hợp đầy đủ năm yêu cầu được xác định trong Plan gồm MC1, MC2, TP1, TP2 và TP3. Mỗi yêu cầu được xử lý bằng một cấu trúc dữ liệu phù hợp với loại thao tác chính thay vì dùng một cấu trúc chung cho mọi tình huống.

**Bảng 7.1. Đối chiếu yêu cầu với kết quả triển khai**

| Mã | Yêu cầu | Giải pháp đã triển khai | Bằng chứng hoạt động |
| --- | --- | --- | --- |
| MC1 | Tra cứu chính xác sản phẩm hoặc đơn hàng theo mã | Hash Table ánh xạ SKU hoặc mã đơn sang bản ghi | Trang Sản phẩm, tìm kiếm mã đơn, trực quan bucket và test Hash Table |
| MC2 | Lấy đơn cần xử lý tiếp theo theo mức ưu tiên | Max-Heap lưu các đơn đang chờ | Trang Hàng đợi đơn, thao tác xem/lấy phần tử gốc và test Heap |
| TP1 | Giữ thứ tự đến trước trong cùng mức ưu tiên | Khóa so sánh kết hợp `priority` và `sequence_number` | Test nhiều đơn cùng mức xác nhận số thứ tự nhỏ được lấy trước |
| TP2 | Gợi ý sản phẩm theo tiền tố SKU hoặc tên | Trie lập chỉ mục theo chuỗi ký tự | Tìm kiếm gợi ý trên trang Sản phẩm và trực quan đường đi tiền tố |
| TP3 | Hiển thị danh sách sản phẩm vừa cập nhật | Danh sách liên kết đôi kết hợp bảng tra vị trí | Cập nhật tồn kho, chuyển SKU lên đầu, loại phần tử cuối khi đầy |

MC1 được xử lý bằng Hash Table vì nghiệp vụ chỉ cần tìm chính xác theo khóa và không yêu cầu duy trì thứ tự toàn phần. MC2 được xử lý bằng Max-Heap vì hệ thống liên tục cần phần tử có quyền ưu tiên cao nhất. TP2 cần tìm theo đoạn đầu chuỗi nên Trie phù hợp hơn Hash Table. TP3 cần thêm ở đầu, loại ở cuối và chuyển một phần tử đã có lên đầu, do đó RecentList kết hợp danh sách liên kết đôi với bảng tra vị trí.

Các yêu cầu đã được chạy chung trong một dịch vụ C++ thay vì tồn tại như các bài tập riêng lẻ. Một thao tác cập nhật kho đồng thời thay đổi sản phẩm trong Hash Table, ghi nhận biến động và cập nhật RecentList. Một đơn mới được lưu trong bảng tra cứu đơn và đưa vào Heap. Mức độ tích hợp này cho thấy cấu trúc dữ liệu được dùng trong nghiệp vụ thật của chương trình.

### 7.1.2. Cài đặt các cấu trúc dữ liệu và giải thuật cốt lõi

Nhóm đã tự cài đặt phần logic trung tâm của bốn cấu trúc dữ liệu: Hash Table, Max-Heap, Trie và RecentList. Trong đó, Heap và Trie là hai cấu trúc trung tâm được Plan xác định phải tự cài đặt; Hash Table và danh sách liên kết đôi cũng được nhóm triển khai để phục vụ trực tiếp MC1 và TP3.

Cần phân biệt giữa **tự cài đặt cấu trúc dữ liệu** và **không sử dụng bất kỳ thành phần nào của STL**. Mã nguồn vẫn dùng các container chuẩn làm vùng chứa hoặc công cụ hỗ trợ, nhưng không dùng cấu trúc có sẵn để thay thế toàn bộ bài toán:

| Cấu trúc | Phần nhóm tự cài đặt | STL được dùng hỗ trợ |
| --- | --- | --- |
| Max-Heap | Quy tắc so sánh, `sift_up`, `sift_down`, `push`, `peek`, `pop` | `std::vector` lưu mảng Heap |
| Trie | Nút, thêm nhánh, xóa nhánh, đi theo tiền tố, thu thập kết quả | `std::unordered_map` lưu nhánh và `std::unordered_set` loại trùng SKU |
| Hash Table | Hàm băm, bucket, separate chaining, upsert, find, erase và rehash | `std::vector` lưu danh sách bucket |
| RecentList | Nút liên kết đôi, nối/tháo nút, chuyển đầu, loại cuối và quản lý vòng đời | `std::unordered_map` ánh xạ SKU tới nút |

Nhóm không dùng `std::priority_queue` để thay Max-Heap và không dùng thư viện Trie có sẵn. Cách cài đặt hiện tại vừa đáp ứng mục tiêu học thuật, vừa giữ mã đủ ngắn để từng thành viên có thể trình bày và chỉnh sửa khi bảo vệ.

Bên cạnh bốn cấu trúc chính, nhóm còn cài đặt Merge Sort, Binary Search và Linear Search. Merge Sort chuẩn bị danh mục theo SKU; Binary Search minh họa việc thu hẹp một nửa không gian tìm kiếm; Linear Search làm phương pháp đối chứng. Ba giải thuật này tạo cầu nối giữa phân tích lý thuyết và phần benchmark ở Chương 6.

### 7.1.3. Giải quyết xung đột giữa mức ưu tiên và thời gian đến

Kết quả thiết kế nổi bật của đồ án là giải pháp cho xung đột giữa MC2 và TP1. Nếu Heap chỉ so sánh mức ưu tiên, các đơn cùng mức có thể được xử lý theo thứ tự không xác định. Nếu chỉ dùng hàng đợi FIFO, một đơn thường đến trước có thể chặn đơn gấp đến sau.

Nhóm giải quyết bằng một bộ so sánh kết hợp trên cùng một Heap. Hai đơn trước hết được so theo mức `urgent`, `high`, `normal`. Nếu cùng mức, đơn có `sequence_number` nhỏ hơn được xem là có quyền ưu tiên cao hơn. Nhờ đó:

- Đơn gấp luôn đứng trước đơn ít ưu tiên hơn.
- Các đơn trong cùng mức vẫn tuân theo thứ tự đến trước.
- Chương trình chỉ cần duy trì một Heap, không phải đồng bộ nhiều hàng đợi song song.
- `peek` giữ chi phí `O(1)`, còn `push` và `pop` giữ chi phí `O(log n)`.

Giải pháp này không thay đổi cấu trúc Heap mà thay đổi ý nghĩa của phép so sánh. Đây là ví dụ cho việc một cấu trúc dữ liệu chỉ hoạt động đúng nghiệp vụ khi khóa và quan hệ thứ tự được thiết kế đúng.

### 7.1.4. Xây dựng kiến trúc C++ và giao diện trực quan

Hệ thống đã tách được ba phần chính. Tầng lưu trữ đọc và ghi dữ liệu qua `san_pham.csv` và `don_hang.csv`. Tầng lõi C++ xây dựng các cấu trúc dữ liệu trong bộ nhớ và thực hiện nghiệp vụ. Tầng giao diện React gửi yêu cầu HTTP JSON và hiển thị kết quả.

Backend sử dụng C++17, `cpp-httplib` và `nlohmann/json`. Frontend sử dụng React 19, TypeScript, TanStack Router, TanStack Query và Recharts. Vite chuyển tiếp các yêu cầu `/api` đến máy chủ C++ trong môi trường phát triển. Phản hồi có header `X-DSA-Runtime: C++`, giúp kiểm tra dữ liệu đang đến từ backend thật.

Phiên bản hiện tại có sáu màn hình web:

1. **Tổng quan:** tổng hợp số liệu kho, hàng đợi và trạng thái DSA.
2. **Sản phẩm:** tra cứu Hash Table, gợi ý Trie và cập nhật tồn kho.
3. **Hàng đợi đơn:** thêm đơn, xem ưu tiên và lấy đơn tiếp theo.
4. **Trực quan DSA:** quan sát Hash Table, Heap, Trie và RecentList.
5. **Hiệu năng:** cấu hình benchmark, xem bảng và biểu đồ.
6. **Dữ liệu & hệ thống:** kiểm tra số bản ghi, kết nối và nạp lại dữ liệu.

Frontend không còn sử dụng dữ liệu mô phỏng cho nghiệp vụ chính. Các màn hình dùng chung một trạng thái trong `WarehouseService`, nhờ đó thay đổi tại một màn hình được phản ánh ở màn hình liên quan. Máy chủ dùng tám worker và `std::shared_mutex`: nhiều yêu cầu chỉ đọc có thể chạy đồng thời, còn yêu cầu thay đổi dữ liệu được khóa riêng để tránh cập nhật chồng chéo.

### 7.1.5. Xây dựng dữ liệu và bằng chứng thực nghiệm

Nhóm đã chuẩn bị bộ dữ liệu chính gồm 10.000 sản phẩm và 10.000 đơn hàng. Dữ liệu được làm sạch từ nguồn thương mại điện tử, kiểm tra các cột bắt buộc, giá trị số, mã trùng, trạng thái đơn và liên kết SKU. Khi máy chủ khởi động, toàn bộ dữ liệu được nạp vào các cấu trúc trong bộ nhớ.

Benchmark được thực hiện tại các mốc 1.000, 5.000 và 10.000 bản ghi. Phép đo sử dụng `std::chrono::steady_clock`, có warmup, lặp nhiều lần, dùng checksum và tách thời gian thuật toán khỏi HTTP, JSON và render. Kết quả cho thấy:

- Binary Search tăng chậm hơn Linear Search khi quy mô tăng, sau khi dữ liệu đã được sắp xếp.
- Hash Table có lợi thế rõ so với quét tuần tự khi tra cứu chính xác.
- Heap có lợi thế rõ so với việc quét toàn bộ danh sách để tìm đơn ưu tiên.
- Trie có lợi thế với truy vấn tiền tố so với kiểm tra từng SKU.
- Merge Sort tự cài đặt đúng về thứ tự và tính ổn định nhưng chậm hơn `std::stable_sort` trong lần đo thực tế.

Việc giữ nguyên kết quả Merge Sort chậm hơn thư viện chuẩn thể hiện cách đánh giá trung thực. Mục tiêu của benchmark là kiểm chứng xu hướng và hiểu chi phí, không phải tạo ra kết quả mà mọi phương pháp tự cài đều thắng phương pháp đối chứng.

### 7.1.6. Kiểm thử và khả năng tái lập

Hệ thống có test riêng cho từng thành viên và test tích hợp dịch vụ. Lần chạy lại ngày 05/10/2026 xác nhận sáu chương trình kiểm thử đều đạt, gồm Hash Table/CSV, Trie, RecentList, giải thuật của Nguyên Khang, Heap và test tích hợp MC1–MC2–TP1–TP2–TP3.

Các ca thử bao phủ dữ liệu rỗng, phần tử trùng, tìm thấy và không tìm thấy, thứ tự ưu tiên, FIFO cùng mức, giới hạn RecentList, đọc–ghi CSV, đầu vào JSON sai, benchmark, reset và luồng nghiệp vụ chung. Test tích hợp còn kiểm tra tìm tiếng Việt có dấu, không dấu và NFD; kiểm tra lượng tồn kho sau khi lấy đơn; từ chối nguyên vẹn khi thiếu kho; đồng thời tạo lại dịch vụ để xác nhận sản phẩm và trạng thái đơn đã được nạp từ bản lưu. Các lệnh build, test, kiểm tra cầu kết nối và build frontend được đặt tại thư mục gốc để thành viên khác có thể chạy lại.

Kết quả kiểm thử cho thấy phiên bản hiện tại đáp ứng yêu cầu trong phạm vi dữ liệu và kịch bản đã kiểm tra. Điều này không đồng nghĩa phần mềm tuyệt đối không còn lỗi, nhưng tạo được bằng chứng cụ thể thay cho việc chỉ khẳng định bằng mô tả.

### 7.1.7. Hoàn thiện tính nhất quán của luồng nghiệp vụ

Trước khi hoàn thiện báo cáo, nhóm đã rà soát lại ba điểm có thể gây sai khi demo thực tế. Thứ nhất, dữ liệu thay đổi từ giao diện nay được lưu vào `backend/data/local`. Lần chạy sau, backend ưu tiên nạp bản làm việc này; thao tác reset mới khôi phục `data_chinh`. Khi lưu, hệ thống ghi xong và đóng cả hai file trong thư mục tạm trước khi đổi tên thư mục để thay bản làm việc. Nếu tiến trình bị ngắt giữa hai lần đổi tên, hệ thống khôi phục bản sao cũ ở lần khởi động kế tiếp; không nạp bản tạm vì bản này có thể chưa ghi xong. Cách này bảo vệ trước việc dừng tiến trình trong các bước đã kiểm thử, chưa thay thế cơ chế WAL và đồng bộ xuống thiết bị của một cơ sở dữ liệu.

Thứ hai, thao tác lấy đơn không còn chỉ đổi trạng thái. Backend đọc phần tử gốc bằng `peek`, cộng dồn nhu cầu theo SKU và kiểm tra đủ kho cho toàn bộ đơn trước khi sửa dữ liệu. Chỉ khi mọi mặt hàng đều hợp lệ, hệ thống mới tạo trạng thái kế tiếp, lưu snapshot, trừ tồn kho, ghi biến động, cập nhật RecentList, chuyển đơn sang `completed` và gọi `pop`. Nếu thiếu bất kỳ sản phẩm nào, ngoại lệ được trả về trước bước ghi nên Heap, tồn kho và trạng thái đơn đều được giữ nguyên.

Thứ ba, chuỗi dùng làm khóa Trie được chuyển về chữ thường, quy đổi chữ Việt sang dạng không dấu và loại các dấu kết hợp của NFD. Tên gốc vẫn được giữ nguyên để hiển thị. Vì cả bước lập chỉ mục và bước nhận truy vấn đều gọi cùng một hàm chuẩn hóa, `Bàn phím`, `BAN PHIM` và chuỗi tương đương ở dạng NFD đi đến cùng đường tìm kiếm.

## 7.2. Hạn chế của hệ thống

### 7.2.1. Cơ chế lưu snapshot còn tốn chi phí tuyến tính

Hệ thống hiện đã tự lưu được trạng thái sản phẩm và đơn hàng, nhưng mỗi thay đổi phải ghi lại toàn bộ hai file CSV. Với 10.000 sản phẩm và 10.000 đơn hàng, cách này vẫn đủ đơn giản và ổn định cho demo. Khi dữ liệu tăng lên hàng trăm nghìn hoặc hàng triệu bản ghi, thời gian ghi sẽ tăng theo kích thước dữ liệu dù thao tác nghiệp vụ chỉ thay đổi một đối tượng.

Cơ chế đổi thư mục tạm giúp hạn chế file dở dang và giữ lại bản cũ để phục hồi, nhưng chưa có nhật ký giao dịch theo từng thao tác như WAL. Lịch sử biến động kho, nhật ký thao tác và lịch sử benchmark vẫn là dữ liệu phục vụ phiên chạy, chưa được lưu lâu dài. Đây là giới hạn của mô hình snapshot CSV, không phải lỗi mất trạng thái sản phẩm hoặc đơn hàng như phiên bản trước.

### 7.2.2. Chuẩn hóa chuỗi tập trung vào tiếng Việt

Chức năng tìm kiếm hiện xử lý được chữ hoa, chữ thường, tiếng Việt có dấu, không dấu, NFC và NFD. Quy tắc được cài bằng bảng ký tự tiếng Việt ngắn gọn để mã nguồn dễ trình bày và không phải thêm thư viện ngoài.

Giải pháp này chưa phải bộ chuẩn hóa Unicode tổng quát. Các bảng chữ cái khác, ký tự ghép đặc biệt hoặc quy tắc case folding của ngôn ngữ khác có thể chưa được quy đổi tương đương. Trie vẫn lưu đường đi theo byte UTF-8; cách này đúng với khóa đã chuẩn hóa nhưng số node và độ sâu được tính theo byte chứ không phải số ký tự người dùng nhìn thấy.

### 7.2.3. Các thao tác ghi vẫn được tuần tự hóa

Máy chủ dùng `ThreadPool(8)` và `std::shared_mutex`. Các yêu cầu chỉ đọc như dashboard, danh sách sản phẩm, tra cứu hàng đợi và trực quan cấu trúc có thể giữ khóa đọc chung và chạy đồng thời. API demo dùng dữ liệu cục bộ nên không cần khóa trạng thái của `WarehouseService`. Benchmark có mutex riêng cho lịch sử và có thể chạy song song với yêu cầu đọc.

Các thao tác thêm sản phẩm, cập nhật tồn kho, tạo đơn, lấy đơn và reset vẫn phải giữ khóa ghi độc quyền. Đây là lựa chọn an toàn vì một giao dịch có thể thay đổi đồng thời vector dữ liệu, Hash Table, Heap, Trie, RecentList và file CSV. Khi số lượng người dùng tăng, một lần ghi snapshot hoặc benchmark đang giữ khóa đọc có thể khiến yêu cầu ghi phải chờ.

### 7.2.4. Chính sách xử lý đơn thiếu kho còn đơn giản

Khi đơn ở gốc Heap thiếu tồn kho, hệ thống trả lỗi và giữ nguyên đơn để có thể xử lý lại sau khi nhập thêm hàng. Cách này bảo đảm không trừ kho một phần và không tự ý bỏ qua đơn ưu tiên cao. Tuy nhiên, hệ thống chưa có trạng thái `waiting_stock`, thao tác hủy đơn hoặc chính sách cho phép tạm hoãn đơn thiếu hàng để xử lý đơn khác.

Trong phạm vi đồ án, hành vi giữ nguyên là dễ giải thích và bảo toàn thứ tự ưu tiên. Trong hệ thống vận hành thật, người quản lý cần thêm quyền quyết định giữ chỗ, tạm hoãn hoặc hủy đơn để một đơn thiếu hàng không nằm ở gốc Heap quá lâu.

### 7.2.5. Phạm vi benchmark còn giới hạn

Kết quả hiện được đo trên một số môi trường phát triển và tập dữ liệu tối đa 10.000 sản phẩm, 10.000 đơn hàng. Chương trình báo thời gian trung bình nhưng chưa ghi độ lệch chuẩn, khoảng tin cậy, trung vị hoặc các phân vị như P95 và P99. Thứ tự chạy các phương pháp cũng có thể chịu ảnh hưởng của bộ nhớ đệm.

Những giá trị dưới `0,001 ms` dễ dao động theo CPU, compiler và tác vụ nền. Vì vậy, hệ số nhanh hơn trong Chương 6 có giá trị minh họa cho lần đo, không phải cam kết cố định trên mọi phần cứng và mọi dữ liệu.

### 7.2.6. Chưa có các chức năng vận hành ở mức sản phẩm thực tế

Máy chủ chỉ lắng nghe trên `127.0.0.1`, chưa có xác thực người dùng, phân quyền nhân viên, mã hóa HTTPS, sao lưu, giám sát hoặc cơ chế chống gửi yêu cầu lặp. Nhật ký thao tác hiện nằm trong bộ nhớ và giới hạn số mục, nên không thể dùng làm nhật ký kiểm toán dài hạn.

Phần trực quan DSA được thiết kế cho mục đích học tập. Nó hiển thị ảnh chụp trạng thái cần thiết để giải thích, không phải công cụ quan sát toàn bộ hàng chục nghìn nút cùng lúc. Các giới hạn này phù hợp với phạm vi môn học nhưng cần được nêu rõ để tránh mô tả hệ thống như một sản phẩm đã sẵn sàng triển khai thực tế.

## 7.3. Hướng phát triển

Các hướng phát triển sau kế thừa phần đã hoàn thành. Trọng tâm không còn là sửa lỗi mất dữ liệu hoặc trừ kho, mà là nâng cơ chế hiện có từ quy mô demo lên quy mô vận hành lớn hơn.

**Bảng 7.2. Lộ trình phát triển đề xuất**

| Mức ưu tiên | Hướng phát triển | Mục tiêu |
| --- | --- | --- |
| Ưu tiên 1 | Ghi thay đổi tăng dần và lưu lịch sử | Giảm chi phí ghi, giữ được nhật ký phục hồi và kiểm toán |
| Ưu tiên 1 | Chính sách cho đơn thiếu kho | Cho phép giữ chỗ, tạm hoãn hoặc hủy đơn rõ ràng |
| Ưu tiên 2 | Chuẩn hóa Unicode tổng quát | Mở rộng tìm kiếm ra ngoài phạm vi tiếng Việt |
| Ưu tiên 2 | Đồng bộ hạt mịn | Giảm thời gian chờ giữa thao tác đọc và ghi độc lập |
| Ưu tiên 3 | Mở rộng phương pháp benchmark | Tăng độ tin cậy và khả năng tái lập số liệu |
| Ưu tiên 3 | Bổ sung chức năng vận hành | Xác thực, phân quyền, kiểm toán và triển khai an toàn |

### 7.3.1. Chuyển từ snapshot toàn bộ sang ghi thay đổi tăng dần

Phiên bản hiện tại tạo snapshot an toàn sau từng thay đổi. Bước nâng cấp phù hợp là bổ sung Write-Ahead Logging. Trước khi đổi trạng thái trong bộ nhớ, hệ thống ghi một bản mô tả thao tác có số thứ tự và checksum. Khi khởi động lại, chương trình nạp snapshot gần nhất rồi phát lại các bản ghi hợp lệ chưa được gộp.

Snapshot chỉ cần tạo sau một số lượng thao tác hoặc một khoảng thời gian thay vì sau mọi lần cập nhật. Các bản ghi biến động kho và nhật ký người dùng cũng có thể được lưu trong cùng cơ chế này. Nhờ đó, chi phí một thao tác thường gần với lượng dữ liệu thật sự thay đổi thay vì tỷ lệ với toàn bộ tập CSV.

Một hướng khác là dùng SQLite làm tầng lưu trữ bền vững. Cơ sở dữ liệu chịu trách nhiệm giao dịch và phục hồi; sau khi nạp, các truy vấn MC1, MC2, TP1, TP2 và TP3 vẫn đi qua Hash Table, Heap, Trie và RecentList để giữ đúng mục tiêu DSA của đồ án.

### 7.3.2. Bổ sung chính sách xử lý đơn thiếu kho

Giao dịch trừ kho nguyên tử đã được triển khai. Bước tiếp theo là mở rộng vòng đời đơn với các trạng thái như `waiting_stock` hoặc `cancelled`. Khi đơn gốc thiếu hàng, người dùng có thể chọn một trong ba cách:

1. Giữ đơn ở gốc và nhập thêm hàng rồi thử lại.
2. Chuyển đơn sang danh sách chờ kho và tiếp tục lấy đơn kế tiếp.
3. Hủy đơn có xác nhận và ghi rõ lý do.

Nếu bổ sung giữ chỗ tồn kho, số lượng khả dụng phải được phân biệt với số lượng thực tế. Mỗi yêu cầu xử lý nên có mã giao dịch duy nhất để thao tác gửi lại do mất mạng không trừ kho hai lần. Các quyết định tạm hoãn hoặc hủy phải được lưu cùng người thực hiện và thời điểm.

Bộ test tương lai cần bao phủ việc chuyển trạng thái qua lại, nhiều đơn cùng giữ chỗ một SKU, nhập bổ sung sau khi chờ, gửi lặp cùng yêu cầu và khôi phục sau khi máy chủ dừng giữa giao dịch.

### 7.3.3. Mở rộng chuẩn hóa Unicode

Hàm chuẩn hóa hiện tại đủ cho bảng chữ cái tiếng Việt và có lợi thế là ngắn, dễ đọc. Nếu dữ liệu mở rộng sang nhiều quốc gia, hệ thống nên dùng thư viện Unicode có hỗ trợ normalization và case folding theo chuẩn thay vì tiếp tục mở rộng bảng ký tự thủ công.

Thiết kế hai giá trị vẫn được giữ: tên gốc dùng để hiển thị, khóa chuẩn hóa dùng để lập chỉ mục. Khi thay đổi quy tắc, toàn bộ sản phẩm phải được lập chỉ mục lại để dữ liệu cũ và truy vấn mới không dùng hai chuẩn khác nhau.

Test nên tiếp tục bao phủ NFC, NFD, chữ hoa, chữ thường, có dấu và không dấu; sau khi mở rộng cần thêm ký tự Latin ngoài tiếng Việt và các bảng chữ cái khác mà bộ dữ liệu thật sử dụng.

### 7.3.4. Thu nhỏ phạm vi khóa ghi

Việc phân loại đọc–ghi bằng `std::shared_mutex` đã loại bỏ tình trạng mọi API phải xếp hàng tuần tự. Để tăng thêm thông lượng, có thể tách khóa theo nhóm trạng thái:

- Khóa sản phẩm và Hash Table sản phẩm.
- Khóa đơn hàng và Heap.
- Khóa RecentList và lịch sử biến động.
- Khóa riêng cho lưu snapshot hoặc ghi WAL.

Khi một giao dịch cần cả sản phẩm và đơn hàng, chương trình phải lấy khóa theo thứ tự cố định để tránh deadlock. Snapshot cần nhận được một ảnh trạng thái nhất quán; vì vậy không thể đơn giản bỏ toàn bộ khóa để đổi lấy tốc độ.

Trước và sau khi thay đổi, cần chạy test nhiều luồng để kiểm tra mất cập nhật, đọc trạng thái dở dang, deadlock và thời gian đáp ứng khi benchmark chạy song song với tra cứu và cập nhật kho.

### 7.3.5. Nâng cấp phương pháp đánh giá hiệu năng

Benchmark có thể được mở rộng theo hướng sau:

- Chạy nhiều phiên độc lập thay vì chỉ một phiên có nhiều vòng lặp.
- Báo trung bình, trung vị, độ lệch chuẩn, giá trị nhỏ nhất, lớn nhất và P95.
- Xáo trộn hoặc luân phiên thứ tự DSA và đối chứng để giảm thiên lệch do bộ nhớ đệm.
- Tăng dữ liệu lên 50.000, 100.000 hoặc 1.000.000 bản ghi khi phần cứng cho phép.
- Đo riêng chi phí xây dựng cấu trúc, tra cứu, cập nhật và bộ nhớ sử dụng.
- Lưu cấu hình compiler, hệ điều hành, CPU, thời điểm đo và commit Git cùng kết quả.

Trang Hiệu năng có thể cho phép so sánh nhiều lần chạy và xuất file kết quả kèm metadata. Khi đó, báo cáo có thể phân biệt rõ độ phức tạp lý thuyết, thời gian trung bình và độ ổn định của phép đo.

### 7.3.6. Hoàn thiện khả năng triển khai và vận hành

Nếu tiếp tục phát triển thành ứng dụng sử dụng thật, hệ thống cần bổ sung tài khoản, xác thực, phân quyền theo vai trò, HTTPS, kiểm tra nguồn yêu cầu và giới hạn tần suất. Nhật ký cần được lưu bền vững, có mã người thực hiện và không cho phép sửa tùy ý.

Cần thêm cơ chế cấu hình cổng, đường dẫn dữ liệu và số worker bằng biến môi trường hoặc file cấu hình. Quy trình CI có thể tự động build backend, chạy test, kiểm tra TypeScript, lint và build frontend trên mỗi thay đổi. Việc đóng gói bằng container có thể giúp thống nhất phiên bản compiler và thư viện giữa các máy.

Các chức năng mở rộng này chỉ nên được triển khai sau khi phần lõi dữ liệu có giao dịch và phục hồi ổn định. Nếu bổ sung quá sớm, hệ thống có thể có nhiều tính năng bề mặt nhưng vẫn mất dữ liệu hoặc tạo trạng thái không nhất quán.

## 7.4. Kết luận chung

Đồ án cho thấy việc chọn cấu trúc dữ liệu cần bắt đầu từ bản chất thao tác. Tra cứu chính xác theo khóa dẫn đến Hash Table; lấy phần tử ưu tiên lặp lại dẫn đến Heap; tìm theo tiền tố dẫn đến Trie; danh sách cập nhật gần đây dẫn đến danh sách liên kết đôi kết hợp bảng tra vị trí. Merge Sort, Binary Search và Linear Search giúp làm rõ vai trò của bước chuẩn bị dữ liệu và sự khác nhau giữa `O(log n)` với `O(n)`.

Quy trình bốn câu hỏi Q1–Q4 giúp nhóm không lựa chọn cấu trúc chỉ vì quen thuộc hoặc dễ cài. Nhu cầu giữ thứ tự, loại khóa, tải sử dụng, khả năng chấp nhận trường hợp xấu và các yếu tố phi tiệm cận đều ảnh hưởng đến quyết định. Giải pháp khóa so sánh kết hợp của Heap chứng minh rằng đôi khi xung đột nghiệp vụ có thể được giải quyết bằng cách thiết kế đúng quan hệ thứ tự thay vì bổ sung thêm nhiều cấu trúc.

Sự kết hợp giữa backend C++17 và frontend React tạo ra một môi trường demo rõ ràng: giảng viên có thể thực hiện thao tác, quan sát trạng thái cấu trúc và xem số liệu đo từ chương trình thật. Tuy nhiên, giá trị chính của đồ án không nằm ở hình thức giao diện mà ở khả năng giải thích vì sao một kết quả xuất hiện và cấu trúc dữ liệu nào đã tạo ra kết quả đó.

Trong phạm vi học phần, hệ thống đã đạt các mục tiêu chính: năm yêu cầu nghiệp vụ hoạt động, các cấu trúc trung tâm được cài đặt và tích hợp, dữ liệu đủ lớn để thực nghiệm, benchmark được lấy từ C++, và bộ kiểm thử có thể chạy lại. Trạng thái sản phẩm và đơn hàng đã được tự lưu; xử lý đơn bảo đảm kiểm tra đủ kho trước khi thay đổi; tìm kiếm tiếng Việt chấp nhận có dấu, không dấu, NFC và NFD; nhiều yêu cầu đọc có thể chạy đồng thời.

Hướng phát triển quan trọng nhất là thay cơ chế snapshot toàn bộ bằng lưu thay đổi tăng dần và nhật ký phục hồi khi quy mô dữ liệu tăng. Các cấu trúc dữ liệu hiện có vẫn giữ vai trò tăng tốc trong bộ nhớ, còn WAL hoặc cơ sở dữ liệu chịu trách nhiệm giao dịch, kiểm toán và phục hồi. Đây là bước nối tiếp hợp lý giữa kiến thức Cấu trúc dữ liệu và Giải thuật với yêu cầu của một hệ thống phần mềm thực tế.
