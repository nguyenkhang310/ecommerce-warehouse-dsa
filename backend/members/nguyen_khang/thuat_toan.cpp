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

// Phần của Khang: Merge Sort + Binary Search (đo thật), Linear Search (đối chứng).
// Chỉ dùng để nạp dữ liệu và đo đối chứng, không thay MC1/MC2/TP2/TP3.

namespace {

void merge_ranges(std::vector<Product>& products, std::vector<Product>& temporary,
                  std::size_t left, std::size_t middle, std::size_t right) {
    std::size_t first = left;
    std::size_t second = middle;
    std::size_t output = left;

    while (first < middle && second < right) {
        if (products[first].sku <= products[second].sku) {
            temporary[output++] = products[first++];
        } else {
            temporary[output++] = products[second++];
        }
    }
    while (first < middle) temporary[output++] = products[first++];
    while (second < right) temporary[output++] = products[second++];
    for (std::size_t i = left; i < right; ++i) products[i] = temporary[i];
}

void merge_sort_range(std::vector<Product>& products, std::vector<Product>& temporary,
                      std::size_t left, std::size_t right) {
    if (right - left <= 1) return;
    const std::size_t middle = left + (right - left) / 2;
    merge_sort_range(products, temporary, left, middle);
    merge_sort_range(products, temporary, middle, right);
    merge_ranges(products, temporary, left, middle, right);
}

std::string current_utc_time() {
    const std::time_t value = std::time(nullptr);
    std::tm utc{};
#ifdef _WIN32
    gmtime_s(&utc, &value);
#else
    gmtime_r(&value, &utc);
#endif
    std::ostringstream output;
    output << std::put_time(&utc, "%Y-%m-%dT%H:%M:%SZ");
    return output.str();
}

volatile std::size_t benchmark_sink = 0;

// Đo thời gian tìm trung bình một truy vấn (ms). Cộng dồn checksum để
// trình biên dịch không loại bỏ phép đo. Mọi cách tìm đều đo chung ở đây.
template <typename TimKiem>
double measure_search(TimKiem tim_kiem, const std::vector<std::string>& queries) {
    using Clock = std::chrono::steady_clock;
    std::size_t checksum = 0;
    const auto start = Clock::now();
    for (const std::string& query : queries) checksum += tim_kiem(query);
    benchmark_sink += checksum;
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count()
        / static_cast<double>(queries.size());
}

} // namespace

// Sắp tại chỗ theo SKU tăng dần. Ổn định: khóa bằng nhau giữ nguyên thứ tự cũ.
void merge_sort_by_sku(std::vector<Product>& products) {
    if (products.size() < 2) return;
    std::vector<Product> temporary(products.size());
    merge_sort_range(products, temporary, 0, products.size());
}

// Đầu vào phải đã sắp đúng quy tắc so sánh SKU. Trả vị trí hoặc rỗng.
std::optional<std::size_t> binary_search_by_sku(
    const std::vector<Product>& sorted_products, const std::string& sku) {
    std::size_t left = 0;
    std::size_t right = sorted_products.size();

    while (left < right) {
        const std::size_t middle = left + (right - left) / 2;
        if (sorted_products[middle].sku == sku) return middle;
        if (sorted_products[middle].sku < sku) left = middle + 1;
        else right = middle;
    }
    return std::nullopt;
}

// Đối chứng: quét lần lượt, chạy được trên dữ liệu chưa sắp.
std::optional<std::size_t> linear_search_by_sku(
    const std::vector<Product>& products, const std::string& sku) {
    for (std::size_t i = 0; i < products.size(); ++i) {
        if (products[i].sku == sku) return i;
    }
    return std::nullopt;
}

std::vector<BenchmarkPoint> run_benchmark(
    const std::string& operation, const std::vector<Product>& products,
    const std::vector<std::size_t>& sizes, std::size_t iterations, bool warmup) {
    if (operation != "search_sku") throw std::invalid_argument("operation hiện hỗ trợ: search_sku");
    if (iterations == 0) throw std::invalid_argument("iterations phải lớn hơn 0");
    if (sizes.empty()) throw std::invalid_argument("sizes không được rỗng");

    using Clock = std::chrono::steady_clock;
    std::vector<BenchmarkPoint> points;

    for (const std::size_t size : sizes) {
        if (size == 0 || size > products.size())
            throw std::invalid_argument("size phải nằm trong dữ liệu đã nạp");

        const auto end = products.begin() + static_cast<std::ptrdiff_t>(size);
        std::vector<Product> original(products.begin(), end);
        std::vector<Product> sorted = original;

        const auto sort_start = Clock::now();
        merge_sort_by_sku(sorted);
        const double preparation_ms =
            std::chrono::duration<double, std::milli>(Clock::now() - sort_start).count();
        for (std::size_t i = 1; i < sorted.size(); ++i) {
            if (sorted[i - 1].sku > sorted[i].sku)
                throw std::runtime_error("Merge Sort cho kết quả sai thứ tự");
        }

        // Cùng một bộ truy vấn cho cả hai cách: 4/5 tìm thấy, 1/5 không thấy.
        std::vector<std::string> queries;
        queries.reserve(iterations);
        for (std::size_t i = 0; i < iterations; ++i) {
            if (i % 5 == 0) queries.push_back("__SKU_KHONG_TON_TAI__");
            else queries.push_back(original[(i * 37) % size].sku);
        }

        if (warmup) {
            benchmark_sink = binary_search_by_sku(sorted, queries.front()).value_or(size);
            benchmark_sink = linear_search_by_sku(original, queries.front()).value_or(size);
        }

        const auto tim_nhi_phan = [&](const std::string& query) {
            return binary_search_by_sku(sorted, query).value_or(size);
        };
        const auto tim_tuyen_tinh = [&](const std::string& query) {
            return linear_search_by_sku(original, query).value_or(size);
        };
        const double binary_ms = measure_search(tim_nhi_phan, queries);
        const double linear_ms = measure_search(tim_tuyen_tinh, queries);

        for (const std::string& query : queries) {
            const auto binary = binary_search_by_sku(sorted, query);
            const auto linear = linear_search_by_sku(original, query);
            if (binary.has_value() != linear.has_value()
                || (binary && sorted[*binary].sku != query)
                || (linear && original[*linear].sku != query)) {
                throw std::runtime_error("Binary Search và Linear Search cho kết quả khác nhau");
            }
        }

        points.push_back({operation, size, iterations, preparation_ms,
                          binary_ms, linear_ms, current_utc_time()});
    }
    return points;
}

} // namespace dsa::nguyen_khang

#endif
