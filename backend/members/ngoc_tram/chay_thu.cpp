#ifndef DSA_MEMBERS_NGOC_TRAM_CHAY_THU_CPP
#define DSA_MEMBERS_NGOC_TRAM_CHAY_THU_CPP

#include <json.hpp>

#include <climits>
#include <stdexcept>
#include <string>
#include <vector>

#include "danh_sach_gan_day.cpp"

namespace dsa::ngoc_tram
{

nlohmann::json run_demo(const nlohmann::json &du_lieu_vao)
{

    if (!du_lieu_vao.is_object())
    {
        throw std::invalid_argument("Dữ liệu vào phải là object JSON");
    }

    if (!du_lieu_vao.contains("capacity"))
    {
        throw std::invalid_argument("Thiếu trường capacity");
    }

    if (!du_lieu_vao["capacity"].is_number_integer())
    {
        throw std::invalid_argument("capacity phải là số nguyên");
    }

    long long capacity_ll = du_lieu_vao["capacity"].get<long long>();

    if (capacity_ll < 0)
    {
        throw std::invalid_argument("Capacity không được âm");
    }

    RecentList recent_list(static_cast<std::size_t>(capacity_ll));
    if (!du_lieu_vao.contains("updates"))
    {
        return nlohmann::json::array();
    }

    if (!du_lieu_vao["updates"].is_array())
    {
        throw std::invalid_argument("updates phải là mảng");
    }

    const auto &updates = du_lieu_vao["updates"];

    long long fake_timestamp = 1;

    for (const auto &item : updates)
    {
        if (!item.is_object())
        {
            throw std::invalid_argument("Mỗi update phải là object");
        }

        if (!item.contains("sku"))
        {
            throw std::invalid_argument("Update thiếu trường sku");
        }

        if (!item["sku"].is_string())
        {
            throw std::invalid_argument("sku phải là chuỗi");
        }

        std::string sku = item["sku"].get<std::string>();

        if (sku.empty())
        {
            throw std::invalid_argument("SKU không được rỗng");
        }

        std::string product_id = "demo-product-" + sku;

        if (item.contains("product_id"))
        {
            if (!item["product_id"].is_string())
            {
                throw std::invalid_argument("product_id phải là chuỗi");
            }

            product_id = item["product_id"].get<std::string>();
        }

        std::string name = "Demo Product " + sku;

        if (item.contains("name"))
        {
            if (!item["name"].is_string())
            {
                throw std::invalid_argument("name phải là chuỗi");
            }
            name = item["name"].get<std::string>();
        }

        int delta = 0;
        if (item.contains("delta"))
        {
            if (!item["delta"].is_number_integer())
            {
                throw std::invalid_argument(
                    "delta phải là số nguyên");
            }
            long long value = item["delta"].get<long long>();

            if (value < INT_MIN || value > INT_MAX)
            {
                throw std::invalid_argument("delta vượt phạm vi int");
            }

            delta = static_cast<int>(value);
        }

        int stock_after = 0;
        if (item.contains("stock_after"))
        {
            if (!item["stock_after"].is_number_integer())
            {
                throw std::invalid_argument("stock_after phải là số nguyên");
            }

            long long value = item["stock_after"].get<long long>();
            if (value < INT_MIN || value > INT_MAX)
            {
                throw std::invalid_argument("stock_after vượt phạm vi int");
            }
            stock_after = static_cast<int>(value);
        }

        std::string updated_at = std::to_string(fake_timestamp++);
        if (item.contains("updated_at"))
        {
            if (!item["updated_at"].is_string())
            {
                throw std::invalid_argument("updated_at phải là chuỗi");
            }
            updated_at = item["updated_at"].get<std::string>();
        }

        RecentUpdate update;

        update.product_id = product_id;
        update.sku = sku;
        update.name = name;
        update.delta = delta;
        update.stock_after = stock_after;
        update.updated_at = updated_at;

        recent_list.touch(update);
    }

    std::vector<RecentUpdate> snapshot = recent_list.snapshot();
    nlohmann::json result = nlohmann::json::array();
    for (const auto &update : snapshot)
    {
        result.push_back({
            {"product_id", update.product_id},
            {"sku", update.sku},
            {"name", update.name},
            {"delta", update.delta},
            {"stock_after", update.stock_after},
            {"updated_at", update.updated_at}
        });
    }
    return result;
}

} // namespace dsa::ngoc_tram
#endif
