#ifndef DSA_MEMBERS_NHAT_MINH_CHAY_THU_CPP
#define DSA_MEMBERS_NHAT_MINH_CHAY_THU_CPP

#include <json.hpp>
#include <string>
#include <vector>
#include <stdexcept>
#include "hang_doi_uu_tien.cpp"

namespace dsa::nhat_minh {

static Priority parse_priority_level(const std::string& priority_str) {
    if (priority_str == "urgent") return Priority::urgent;
    if (priority_str == "high") return Priority::high;
    if (priority_str == "normal") return Priority::normal;
    throw std::invalid_argument("Mức ưu tiên không hợp lệ: '" + priority_str + "'");
}

static Order extract_single_order(const nlohmann::json& json_item) {
    if (!json_item.is_object()) {
        throw std::invalid_argument("Mỗi phần tử trong 'orders' phải là một JSON Object.");
    }

    Order order;
    order.id = json_item.value("id", "");
    if (order.id.empty()) {
        throw std::invalid_argument("Đơn hàng thiếu trường 'id'.");
    }

    if (!json_item.contains("priority")) {
        throw std::invalid_argument("Đơn hàng thiếu trường 'priority'.");
    }
    order.priority = parse_priority_level(json_item["priority"].get<std::string>());

    if (json_item.contains("sequence_number")) {
        order.sequence_number = json_item["sequence_number"].get<std::uint64_t>();
    } else {
        order.sequence_number = 0;
    }

    return order;
}

static void populate_queue_from_json(const nlohmann::json& input_json, PriorityQueue& queue) {
    if (!input_json.is_object()) {
        throw std::invalid_argument("Đầu vào phải là một đối tượng JSON.");
    }

    if (!input_json.contains("orders") || !input_json["orders"].is_array()) {
        return;
    }

    const auto& orders_array = input_json["orders"];
    for (const auto& item : orders_array) {
        Order order = extract_single_order(item);
        queue.push(order);
    }
}

static nlohmann::json build_snapshot_json(const PriorityQueue& queue) {
    nlohmann::json snapshot_array = nlohmann::json::array();
    const std::vector<Order> current_snapshot = queue.snapshot();

    for (const auto& order : current_snapshot) {
        std::string prio_str;
        switch (order.priority) {
            case Priority::urgent: prio_str = "urgent"; break;
            case Priority::high: prio_str = "high"; break;
            case Priority::normal: prio_str = "normal"; break;
        }

        snapshot_array.push_back({
            {"id", order.id},
            {"priority", prio_str},
            {"sequence_number", order.sequence_number}
        });
    }

    return snapshot_array;
}

static nlohmann::json process_and_pop_all_orders(PriorityQueue& queue) {
    nlohmann::json popped_ids = nlohmann::json::array();

    while (!queue.empty()) {
        std::optional<Order> top_order = queue.pop();
        if (top_order.has_value()) {
            popped_ids.push_back(top_order->id);
        }
    }

    return popped_ids;
}

nlohmann::json run_demo(const nlohmann::json& du_lieu_vao) {
    PriorityQueue priority_queue;

    populate_queue_from_json(du_lieu_vao, priority_queue);
    nlohmann::json heap_snapshot = build_snapshot_json(priority_queue);
    nlohmann::json popped_order_ids = process_and_pop_all_orders(priority_queue);

    return {
        {"ok", true},
        {"popped_order_ids", popped_order_ids},
        {"snapshot", heap_snapshot},
        {"count", popped_order_ids.size()}
    };
}

} // namespace dsa::nhat_minh

#endif
