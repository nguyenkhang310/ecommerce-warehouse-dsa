#ifndef DSA_MEMBERS_KIEU_TRANG_CHAY_THU_CPP
#define DSA_MEMBERS_KIEU_TRANG_CHAY_THU_CPP

#include <json.hpp>
#include "bang_bam.cpp"
#include "luu_tru.cpp"

namespace dsa::kieu_trang {

nlohmann::json run_demo(const nlohmann::json& du_lieu_vao) {

    if (!du_lieu_vao.contains("data_dir") || !du_lieu_vao["data_dir"].is_string()) {
        throw std::invalid_argument("Thiếu hoặc sai data_dir");
    }
    std::string data_dir = du_lieu_vao["data_dir"].get<std::string>();
    if (!du_lieu_vao.contains("sku") || !du_lieu_vao["sku"].is_string()) {
        throw std::invalid_argument("Thiếu hoặc sai sku");
    }
    std::string sku = du_lieu_vao["sku"].get<std::string>();

    StorageData data = load_data(data_dir);

    HashTable<Product> product_table;
    for (const Product& product : data.products) {
        product_table.upsert(product.sku, product);
    }

    const Product* found_product = product_table.find(sku);

    nlohmann::json result;

    result["product_count"] = data.products.size();
    result["order_count"] = data.orders.size();

    if (found_product != nullptr) {
        result["product"] = {
            {"id", found_product->id},
            {"sku", found_product->sku},
            {"name", found_product->name},
            {"category", found_product->category},
            {"stock", found_product->stock},
            {"reorder_level", found_product->reorder_level},
            {"created_at", found_product->created_at},
            {"updated_at", found_product->updated_at}
        };
    }
    else {
        result["product"] = nullptr;
    }
    return result;
}
} // namespace dsa::kieu_trang

#endif
