#ifndef DSA_MEMBERS_NGUYEN_KHANG_THUAT_TOAN_CPP
#define DSA_MEMBERS_NGUYEN_KHANG_THUAT_TOAN_CPP

#include "shared/kieu_du_lieu.cpp"
#include <chrono>
#include <ctime>
#include <iomanip>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace dsa::nguyen_khang {
namespace {

using Clock = std::chrono::steady_clock;
volatile std::size_t benchmark_sink = 0;

// Trộn hai đoạn đã sắp xếp: [left, middle) và [middle, right).
void merge(std::vector<Product>& products, std::vector<Product>& temp,
           std::size_t left, std::size_t middle, std::size_t right) {
    std::size_t i = left, j = middle, k = left;

    while (i < middle && j < right) {
        if (products[i].sku <= products[j].sku) temp[k++] = products[i++];
        else temp[k++] = products[j++];
    }
    while (i < middle) temp[k++] = products[i++];
    while (j < right) temp[k++] = products[j++];
    for (std::size_t p = left; p < right; ++p) products[p] = temp[p];
}

void merge_sort(std::vector<Product>& products, std::vector<Product>& temp,
                std::size_t left, std::size_t right) {
    if (right - left <= 1) return;
    const std::size_t middle = left + (right - left) / 2;
    merge_sort(products, temp, left, middle);
    merge_sort(products, temp, middle, right);
    merge(products, temp, left, middle, right);
}

std::string utc_now() {
    const std::time_t now = std::time(nullptr);
    std::tm utc{};
#ifdef _WIN32
    gmtime_s(&utc, &now);
#else
    gmtime_r(&now, &utc);
#endif
    std::ostringstream text;
    text << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
    return text.str();
}

} // namespace

void merge_sort_by_sku(std::vector<Product>& products) {
    if (products.size() < 2) return;
    std::vector<Product> temp(products.size());
    merge_sort(products, temp, 0, products.size());
}

std::optional<std::size_t> binary_search_by_sku(
    const std::vector<Product>& products, const std::string& sku) {
    std::size_t left = 0, right = products.size();
    while (left < right) {
        const std::size_t middle = left + (right - left) / 2;
        if (products[middle].sku == sku) return middle;
        if (products[middle].sku < sku) left = middle + 1;
        else right = middle;
    }
    return std::nullopt;
}

std::optional<std::size_t> linear_search_by_sku(
    const std::vector<Product>& products, const std::string& sku) {
    for (std::size_t i = 0; i < products.size(); ++i)
        if (products[i].sku == sku) return i;
    return std::nullopt;
}

std::vector<BenchmarkPoint> run_benchmark(
    const std::string& operation, const std::vector<Product>& products,
    const std::vector<std::size_t>& sizes, std::size_t iterations, bool warmup) {
    if (operation != "search_sku") throw std::invalid_argument("operation hiện hỗ trợ: search_sku");
    if (iterations == 0) throw std::invalid_argument("iterations phải lớn hơn 0");
    if (sizes.empty()) throw std::invalid_argument("sizes không được rỗng");

    std::vector<BenchmarkPoint> results;
    for (const std::size_t size : sizes) {
        if (size == 0 || size > products.size())
            throw std::invalid_argument("size phải nằm trong dữ liệu đã nạp");

        std::vector<Product> original(products.begin(), products.begin() + size);
        std::vector<Product> sorted = original;

        const auto start = Clock::now();
        merge_sort_by_sku(sorted);
        const double preparation_ms =
            std::chrono::duration<double, std::milli>(Clock::now() - start).count();

        for (std::size_t i = 1; i < sorted.size(); ++i)
            if (sorted[i - 1].sku > sorted[i].sku)
                throw std::runtime_error("Merge Sort cho kết quả sai thứ tự");

        // Cả hai cách tìm dùng chung truy vấn: 4 lần có SKU thật, 1 lần không có.
        std::vector<std::string> queries;
        queries.reserve(iterations);
        for (std::size_t i = 0; i < iterations; ++i)
            queries.push_back(i % 5 == 0 ? "__SKU_KHONG_TON_TAI__"
                                          : original[(i * 37) % size].sku);

        if (warmup) {
            benchmark_sink = binary_search_by_sku(sorted, queries[0]).value_or(size);
            benchmark_sink = linear_search_by_sku(original, queries[0]).value_or(size);
        }

        std::size_t checksum = 0;
        auto search_start = Clock::now();
        for (const std::string& sku : queries)
            checksum += binary_search_by_sku(sorted, sku).value_or(size);
        const double binary_ms = std::chrono::duration<double, std::milli>(
            Clock::now() - search_start).count() / iterations;

        search_start = Clock::now();
        for (const std::string& sku : queries)
            checksum += linear_search_by_sku(original, sku).value_or(size);
        const double linear_ms = std::chrono::duration<double, std::milli>(
            Clock::now() - search_start).count() / iterations;
        benchmark_sink += checksum; // Tránh trình biên dịch bỏ phép đo.

        // Hai cách phải cùng tìm thấy hoặc cùng không tìm thấy từng SKU.
        for (const std::string& sku : queries) {
            const auto a = binary_search_by_sku(sorted, sku);
            const auto b = linear_search_by_sku(original, sku);
            if (a.has_value() != b.has_value() || (a && sorted[*a].sku != sku)
                || (b && original[*b].sku != sku))
                throw std::runtime_error("Binary Search và Linear Search cho kết quả khác nhau");
        }

        results.push_back({operation, size, iterations, preparation_ms,
                           binary_ms, linear_ms, utc_now()});
    }
    return results;
}

} // namespace dsa::nguyen_khang

#endif
