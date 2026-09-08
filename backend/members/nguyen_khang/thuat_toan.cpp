#ifndef DSA_MEMBERS_NGUYEN_KHANG_THUAT_TOAN_CPP
#define DSA_MEMBERS_NGUYEN_KHANG_THUAT_TOAN_CPP

#include "shared/kieu_du_lieu.cpp"
#include <optional>
#include <string>
#include <vector>

namespace dsa::nguyen_khang {

// Chỉ dùng để nạp dữ liệu và đo đối chứng, không thay MC1/MC2/TP2/TP3.
void merge_sort_by_sku(std::vector<Product>& products);
// Binary Search cần đầu vào đã sắp theo SKU với cùng quy tắc so sánh.
std::optional<std::size_t> binary_search_by_sku(
    const std::vector<Product>& sorted_products, const std::string& sku);
std::optional<std::size_t> linear_search_by_sku(
    const std::vector<Product>& products, const std::string& sku);

std::vector<BenchmarkPoint> run_benchmark(
    const std::string& operation, const std::vector<std::size_t>& sizes,
    std::size_t iterations, bool warmup);

} // namespace dsa::nguyen_khang

#include "shared/bao_loi.cpp"

namespace dsa::nguyen_khang {

void merge_sort_by_sku(std::vector<Product>& /*products*/) {
    todo("nguyen_khang", "merge_sort_by_sku");
}
std::optional<std::size_t> binary_search_by_sku(
    const std::vector<Product>& /*sorted_products*/, const std::string& /*sku*/) {
    todo("nguyen_khang", "binary_search_by_sku");
}
std::optional<std::size_t> linear_search_by_sku(
    const std::vector<Product>& /*products*/, const std::string& /*sku*/) {
    todo("nguyen_khang", "linear_search_by_sku");
}
std::vector<BenchmarkPoint> run_benchmark(
    const std::string& /*operation*/, const std::vector<std::size_t>& /*sizes*/,
    std::size_t /*iterations*/, bool /*warmup*/) {
    // TODO: đo bằng steady_clock, cùng đầu vào, chạy khởi động và lặp; kiểm tra kết quả.
    todo("nguyen_khang", "run_benchmark");
}

} // namespace dsa::nguyen_khang

#endif
