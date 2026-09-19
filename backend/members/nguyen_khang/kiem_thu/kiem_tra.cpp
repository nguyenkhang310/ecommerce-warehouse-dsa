#include "../thuat_toan.cpp"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using dsa::Product;
using namespace dsa::nguyen_khang;

Product product(const std::string& id, const std::string& sku) {
    Product value;
    value.id = id;
    value.sku = sku;
    return value;
}

void require(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

} // namespace

int main() {
    try {
        std::vector<Product> empty;
        merge_sort_by_sku(empty);
        require(!binary_search_by_sku(empty, "A"), "Tìm trên mảng rỗng phải thất bại");

        std::vector<Product> products = {
            product("1", "C"), product("2", "A"),
            product("3", "B"), product("4", "A")
        };
        merge_sort_by_sku(products);
        require(products[0].id == "2" && products[1].id == "4",
            "Merge Sort phải ổn định khi trùng SKU");
        require(products[0].sku == "A" && products[2].sku == "B"
            && products[3].sku == "C", "Merge Sort sắp sai thứ tự");

        require(binary_search_by_sku(products, "A").has_value(), "Không tìm thấy đầu mảng");
        require(binary_search_by_sku(products, "B").has_value(), "Không tìm thấy giữa mảng");
        require(binary_search_by_sku(products, "C").has_value(), "Không tìm thấy cuối mảng");
        require(!binary_search_by_sku(products, "X"), "Tìm nhầm SKU không tồn tại");
        require(linear_search_by_sku(products, "B").has_value(), "Linear Search tìm sai");

        std::vector<Product> sample;
        for (int i = 20; i >= 1; --i) {
            sample.push_back(product(std::to_string(i), "SKU-" + std::to_string(i)));
        }
        const auto points = run_benchmark("search_sku", sample, {10, 20}, 20, true);
        require(points.size() == 2 && points[1].dataset_size == 20,
            "Benchmark trả sai kích thước");

        bool rejected = false;
        try {
            run_benchmark("search_sku", sample, {10}, 0, false);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        require(rejected, "iterations bằng 0 phải báo lỗi");

        rejected = false;
        try {
            run_benchmark("khong_hop_le", sample, {10}, 10, false);
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        require(rejected, "operation sai phải báo lỗi");

        std::cout << "ĐẠT: Merge Sort, Binary Search, Linear Search và benchmark\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "CHƯA ĐẠT: " << error.what() << '\n';
        return 1;
    }
}
