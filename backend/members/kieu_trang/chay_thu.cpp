#ifndef DSA_MEMBERS_KIEU_TRANG_CHAY_THU_CPP
#define DSA_MEMBERS_KIEU_TRANG_CHAY_THU_CPP

#include <json.hpp>
#include "bang_bam.cpp"
#include "luu_tru.cpp"

namespace dsa::kieu_trang {

nlohmann::json order_to_json(const Order* order) {
    if (order == nullptr) return nullptr;

    nlohmann::json items = nlohmann::json::array();
    for (const OrderItem& item : order->items) {
        items.push_back({
            {"product_id", item.product_id},
            {"sku", item.sku},
            {"name", item.name},
            {"quantity", item.quantity}
        });
    }
    return {
        {"id", order->id},
        {"order_code", order->order_code},
        {"priority", priority_to_string(order->priority)},
        {"sequence_number", order->sequence_number},
        {"status", status_to_string(order->status)},
        {"created_at", order->created_at},
        {"items", items}
    };
}

nlohmann::json product_to_json(const Product* product) {
    if (product == nullptr) return nullptr;
    return {
        {"id", product->id},
        {"sku", product->sku},
        {"name", product->name},
        {"category", product->category},
        {"stock", product->stock},
        {"reorder_level", product->reorder_level},
        {"created_at", product->created_at},
        {"updated_at", product->updated_at}
    };
}

std::string read_optional_string(const nlohmann::json& input, const std::string& field) {
    if (!input.contains(field)) return "";
    if (!input[field].is_string()) {
        throw std::invalid_argument(field + " phải là chuỗi");
    }
    return input[field].get<std::string>();
}

nlohmann::json run_demo(const nlohmann::json& input) {
    if (!input.contains("data_dir") || !input["data_dir"].is_string()) {
        throw std::invalid_argument("Thiếu hoặc sai data_dir");
    }
    const std::string data_dir = input["data_dir"].get<std::string>();
    const std::string sku = read_optional_string(input, "sku");
    const std::string order_id = read_optional_string(input, "order_id");
    if (sku.empty() && order_id.empty()) {
        throw std::invalid_argument("Cần truyền sku hoặc order_id");
    }

    StorageData data = load_data(data_dir);

    HashTable<Product> product_table;
    for (const Product& product : data.products) {
        product_table.upsert(product.sku, product);
    }
    HashTable<Order> order_table;
    for (const Order& order : data.orders) {
        order_table.upsert(order.id, order);
    }

    nlohmann::json result = nlohmann::json::object();
    result["product_count"] = data.products.size();
    result["order_count"] = data.orders.size();
    if (!sku.empty()) result["product"] = product_to_json(product_table.find(sku));
    if (!order_id.empty()) result["order"] = order_to_json(order_table.find(order_id));
    return result;
}
} // namespace dsa::kieu_trang

#endif
