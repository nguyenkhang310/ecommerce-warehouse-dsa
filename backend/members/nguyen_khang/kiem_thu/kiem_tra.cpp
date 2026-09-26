#include "../thuat_toan.cpp"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {
using dsa::Product;
using namespace dsa::nguyen_khang;

void expect(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

Product make_product(const std::string& id, const std::string& sku) {
    Product product;
    product.id = id;
    product.sku = sku;
    return product;
}

template <typename Func>
bool rejects_with_invalid_argument(Func run) {
    try {
        run();
    } catch (const std::invalid_argument&) {
        return true;
    }
    return false;
}

void test_empty_input() {
    std::vector<Product> empty;
    merge_sort_by_sku(empty);
    expect(!binary_search_by_sku(empty, "A").has_value(), "Tìm trên mảng rỗng phải thất bại");
    expect(!linear_search_by_sku(empty, "A").has_value(), "Linear trên mảng rỗng phải thất bại");
}

void test_sort_stable() {
    std::vector<Product> products = {
        make_product("1", "C"), make_product("2", "A"),
        make_product("3", "B"), make_product("4", "A")
    };
    merge_sort_by_sku(products);
    expect(products[0].id == "2" && products[1].id == "4",
           "Merge Sort phải ổn định khi trùng SKU (2 đứng trước 4)");
    expect(products[0].sku == "A" && products[2].sku == "B" && products[3].sku == "C",
           "Merge Sort sắp sai thứ tự A,B,C");
}

void test_search_positions() {
    std::vector<Product> products = {
        make_product("2", "A"), make_product("4", "A"),
        make_product("3", "B"), make_product("1", "C")
    };
    expect(binary_search_by_sku(products, "A").has_value(), "Không tìm thấy đầu mảng (A)");
    expect(binary_search_by_sku(products, "B").has_value(), "Không tìm thấy giữa mảng (B)");
    expect(binary_search_by_sku(products, "C").has_value(), "Không tìm thấy cuối mảng (C)");
    expect(!binary_search_by_sku(products, "X").has_value(), "Tìm nhầm SKU không tồn tại (X)");
    expect(linear_search_by_sku(products, "B").has_value(), "Linear Search tìm sai (B)");
}

void test_benchmark_and_validation() {
    std::vector<Product> sample;
    for (int i = 20; i >= 1; --i)
        sample.push_back(make_product(std::to_string(i), "SKU-" + std::to_string(i)));
    const auto points = run_benchmark("search_sku", sample, {10, 20}, 20, true);
    expect(points.size() == 2 && points[1].dataset_size == 20, "Benchmark trả sai kích thước");
    expect(rejects_with_invalid_argument([&] { run_benchmark("search_sku", sample, {10}, 0, false); }),
           "iterations bằng 0 phải báo lỗi");
    expect(rejects_with_invalid_argument([&] { run_benchmark("ten_sai", sample, {10}, 10, false); }),
           "operation sai phải báo lỗi");
}
}

int main() {
    try {
        test_empty_input();
        test_sort_stable();
        test_search_positions();
        test_benchmark_and_validation();
        std::cout << "DAT: Merge Sort, Binary Search, Linear Search va benchmark\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "CHUA DAT: " << error.what() << '\n';
        return 1;
    }
}
