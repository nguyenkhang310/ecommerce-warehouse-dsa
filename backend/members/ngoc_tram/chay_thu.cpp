#ifndef DSA_MEMBERS_NGOC_TRAM_CHAY_THU_CPP
#define DSA_MEMBERS_NGOC_TRAM_CHAY_THU_CPP

#include <json.hpp>
#include <stdexcept>
#include <string>
#include <vector>
#include <climits>
#include "danh_sach_gan_day.cpp"

namespace dsa::ngoc_tram {

nlohmann::json run_demo(const nlohmann::json& du_lieu_vao) {
    if (!du_lieu_vao.is_object()) {
        throw std::invalid_argument("Dữ liệu vào phải là object JSON");
    }
    if (!du_lieu_vao.contains("capacity")) {
        throw std::invalid_argument("Thiếu trường capacity");
    }
    if (!du_lieu_vao["capacity"].is_number_integer()) {
        throw std::invalid_argument("capacity phải là số nguyên");
    }

    long long capacity_ll = du_lieu_vao["capacity"].get<long long>();
    if (capacity_ll < 0) {
        throw std::invalid_argument("Capacity không được âm");
    }

    RecentList rl(static_cast<std::size_t>(capacity_ll));

    if (du_lieu_vao.contains("updates")) {
        const auto& updates = du_lieu_vao["updates"];
        if (!updates.is_array()) {
            throw std::invalid_argument("updates phải là mảng");
        }

        long long fake_timestamp = 1;

        for (const auto& item : updates) {
            if (!item.is_object()) {
                throw std::invalid_argument("Mỗi update phải là object");
            }

            if (!item.contains("sku")) {
                throw std::invalid_argument("Update thiếu trường sku");
            }
            if (!item["sku"].is_string()) {
                throw std::invalid_argument("sku phải là chuỗi");
            }
            std::string sku = item["sku"].get<std::string>();
            if (sku.empty()) {
                throw std::invalid_argument("SKU không được rỗng");
            }

            int delta = 0;
            if (item.contains("delta")) {
                if (!item["delta"].is_number_integer()) {
                    throw std::invalid_argument("delta phải là số nguyên");
                }
                long long d = item["delta"].get<long long>();
                if (d < INT_MIN || d > INT_MAX) {
                    throw std::invalid_argument("delta vượt phạm vi int");
                }
                delta = static_cast<int>(d);
            }

            int stock_after = 0;
            if (item.contains("stock_after")) {
                if (!item["stock_after"].is_number_integer()) {
                    throw std::invalid_argument("stock_after phải là số nguyên");
                }
                long long s = item["stock_after"].get<long long>();
                if (s < INT_MIN || s > INT_MAX) {
                    throw std::invalid_argument("stock_after vượt phạm vi int");
                }
                stock_after = static_cast<int>(s);
            }

            RecentUpdate update;
            update.sku = sku;
            update.delta = delta;
            update.stock_after = stock_after;
            update.updated_at = std::to_string(fake_timestamp++);

            rl.touch(update);
        }
    }

    std::vector<RecentUpdate> snap = rl.snapshot();
    nlohmann::json result = nlohmann::json::array();

    for (const auto& u : snap) {
        result.push_back({
            {"sku", u.sku},
            {"delta", u.delta},
            {"stock_after", u.stock_after},
            {"updated_at", u.updated_at}
        });
    }

    return result;
}

} // namespace dsa::ngoc_tram

#endif
