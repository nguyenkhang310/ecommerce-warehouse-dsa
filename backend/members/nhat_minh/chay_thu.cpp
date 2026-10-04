#ifndef DSA_MEMBERS_NHAT_MINH_CHAY_THU_CPP
#define DSA_MEMBERS_NHAT_MINH_CHAY_THU_CPP

#include <json.hpp>
#include <string>
#include <stdexcept>
#include "hang_doi_uu_tien.cpp"

namespace dsa::nhat_minh {

inline nlohmann::json run_demo(const nlohmann::json& du_lieu_vao) {
    if (!du_lieu_vao.is_object()) throw std::invalid_argument("Đầu vào phải là một đối tượng JSON.");

    PriorityQueue pq;
    if (du_lieu_vao.contains("orders") && du_lieu_vao["orders"].is_array()) {
        for (const auto& item : du_lieu_vao["orders"]) {
            if (!item.is_object()) throw std::invalid_argument("Mỗi phần tử trong 'orders' phải là một JSON Object.");
            std::string id = item.value("id", "");
            if (id.empty()) throw std::invalid_argument("Đơn hàng thiếu trường 'id'.");
            if (!item.contains("priority")) throw std::invalid_argument("Đơn hàng thiếu trường 'priority'.");

            std::string p = item["priority"].get<std::string>();
            Priority prio = (p == "urgent") ? Priority::urgent :
                            (p == "high")   ? Priority::high :
                            (p == "normal") ? Priority::normal :
                            throw std::invalid_argument("Mức ưu tiên không hợp lệ: '" + p + "'");

            Order ord;
            ord.id = id;
            ord.priority = prio;
            ord.sequence_number = item.value("sequence_number", 0ULL);
            pq.push(ord);
        }
    }

    nlohmann::json snapshot = nlohmann::json::array();
    for (const auto& ord : pq.snapshot()) {
        snapshot.push_back({
            {"id", ord.id},
            {"priority", ord.priority == Priority::urgent ? "urgent" : ord.priority == Priority::high ? "high" : "normal"},
            {"sequence_number", ord.sequence_number}
        });
    }

    nlohmann::json popped = nlohmann::json::array();
    while (!pq.empty()) {
        popped.push_back(pq.pop()->id);
    }

    return {
        {"ok", true},
        {"popped_order_ids", popped},
        {"snapshot", snapshot},
        {"count", popped.size()}
    };
}

} // namespace dsa::nhat_minh

#endif
