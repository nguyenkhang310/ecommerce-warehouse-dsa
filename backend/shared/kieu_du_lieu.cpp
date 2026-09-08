#ifndef DSA_SHARED_KIEU_DU_LIEU_CPP
#define DSA_SHARED_KIEU_DU_LIEU_CPP

#include <cstddef>
#include <cstdint>
#include <string>
#include <vector>

namespace dsa {

// Cùng quy ước với frontend: số lớn hơn có mức ưu tiên cao hơn.
enum class Priority { normal = 1, high = 2, urgent = 3 };
enum class OrderStatus { queued, processing, completed, cancelled, returned };

struct Product {
    std::string id;
    std::string sku;
    std::string name;
    std::string category;
    int stock = 0;
    int reorder_level = 0;
    std::string created_at;
    std::string updated_at;
};

struct OrderItem {
    std::string product_id;
    std::string sku;
    std::string name;
    int quantity = 0;
};

struct Order {
    std::string id;
    std::string order_code;
    Priority priority = Priority::normal;
    // Tăng dần khi tạo đơn, giữ nguyên khi nạp lại; cùng ưu tiên thì số nhỏ hơn đi trước.
    std::uint64_t sequence_number = 0;
    std::vector<OrderItem> items;
    OrderStatus status = OrderStatus::queued;
    std::string note;
    std::string created_at;
};

struct RecentUpdate {
    std::string product_id;
    std::string sku;
    std::string name;
    int delta = 0;
    int stock_after = 0;
    std::string updated_at;
};

// Dữ liệu thô để đọc/ghi; các chỉ mục tra cứu do từng thành viên cài đặt.
struct StorageData {
    std::vector<Product> products;
    std::vector<Order> orders;
};

struct BenchmarkPoint {
    std::string operation;
    std::size_t dataset_size = 0;
    std::size_t iterations = 0;
    double dsa_mean_ms = 0;
    double baseline_mean_ms = 0;
    std::string measured_at;
};

} // namespace dsa

#endif
