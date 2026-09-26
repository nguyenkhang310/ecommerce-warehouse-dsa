#ifndef DSA_MEMBERS_NGUYEN_KHANG_CHAY_THU_CPP
#define DSA_MEMBERS_NGUYEN_KHANG_CHAY_THU_CPP

#include <json.hpp>
#include <stdexcept>
#include <string>
#include <vector>
#include "members/kieu_trang/luu_tru.cpp"
#include "thuat_toan.cpp"

namespace dsa::nguyen_khang {
namespace {

std::string read_required_string(const nlohmann::json& input, const char* key) {
    if (!input.contains(key) || !input[key].is_string())
        throw std::invalid_argument(std::string(key) + " phải là chuỗi");
    return input[key].get<std::string>();
}

std::size_t read_required_positive_int(const nlohmann::json& input, const char* key) {
    if (!input.contains(key) || !input[key].is_number_integer()
        || input[key].get<long long>() <= 0)
        throw std::invalid_argument(std::string(key) + " phải là số nguyên dương");
    return static_cast<std::size_t>(input[key].get<long long>());
}

std::vector<std::size_t> read_required_sizes(const nlohmann::json& input) {
    if (!input.contains("sizes") || !input["sizes"].is_array())
        throw std::invalid_argument("sizes phải là mảng");
    std::vector<std::size_t> sizes;
    for (const auto& item : input["sizes"]) {
        if (!item.is_number_integer() || item.get<long long>() <= 0)
            throw std::invalid_argument("mỗi size phải là số nguyên dương");
        sizes.push_back(static_cast<std::size_t>(item.get<long long>()));
    }
    return sizes;
}
}

nlohmann::json run_demo(const nlohmann::json& input) {
    if (!input.is_object()) throw std::invalid_argument("Đầu vào phải là object JSON");

    const std::string data_dir = read_required_string(input, "data_dir");
    const std::string operation = read_required_string(input, "operation");
    const std::vector<std::size_t> sizes = read_required_sizes(input);
    const std::size_t iterations = read_required_positive_int(input, "iterations");
    bool warmup = true;
    if (input.contains("warmup")) {
        if (!input["warmup"].is_boolean())
            throw std::invalid_argument("warmup phải là true hoặc false");
        warmup = input["warmup"].get<bool>();
    }

    const StorageData data = kieu_trang::load_data(data_dir);

    const auto points = run_benchmark(operation, data.products, sizes, iterations, warmup);
    nlohmann::json point_list = nlohmann::json::array();
    for (const BenchmarkPoint& point : points) {
        point_list.push_back({
            {"operation", point.operation},
            {"dataset_size", point.dataset_size},
            {"iterations", point.iterations},
            {"preparation_ms", point.preparation_ms},
            {"dsa_mean_ms", point.dsa_mean_ms},
            {"baseline_mean_ms", point.baseline_mean_ms},
            {"measured_at", point.measured_at}
        });
    }
    return {
        {"algorithm", "Binary Search"},
        {"baseline", "Linear Search"},
        {"product_count", data.products.size()},
        {"points", point_list}
    };
}

}

#endif
