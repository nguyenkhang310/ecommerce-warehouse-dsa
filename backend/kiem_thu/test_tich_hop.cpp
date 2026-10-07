// Kiểm tra nghiệp vụ thật: HTTP gọi cùng WarehouseService này.
#include "app/dich_vu.cpp"
#include <cassert>
#include <filesystem>
#include <iostream>
#include <unordered_map>
#include <unordered_set>

int main() {
    using Json = nlohmann::json;
    dsa::WarehouseService service;
    const auto run = [&](const std::string& action, const Json& data = Json::object()) {
        return service.run(action, data);
    };
    const auto rejects = [&](const std::string& action, const Json& data) {
        bool rejected = false;
        try { run(action, data); }
        catch (const std::invalid_argument&) { rejected = true; }
        catch (const Json::exception&) { rejected = true; }
        assert(rejected);
    };

    assert(run("health")["productCount"] == 10000);
    assert(run("health")["orderCount"] == 10000);
    const std::string sku = "AUDIT-VI";
    const Json product = {{"sku", sku}, {"name", "ĐÈN Bàn Việt"},
                          {"category", "Test"}, {"stock", 5}, {"reorderLevel", 1}};
    for (const Json& invalid : {Json(1.5), Json(-1), Json(4294967297LL),
                               Json(18446744073709551615ULL), Json("5"), Json(nullptr)}) {
        auto input = product;
        input["stock"] = invalid;
        rejects("product_create", input);
    }
    assert(run("health")["productCount"] == 10000);
    run("product_create", product);
    rejects("product_create", product);
    assert(run("product_lookup", {{"sku", " audit-vi "}})["product"]["stock"] == 5);
    for (const auto* prefix : {"đèn bàn việt", "ĐÈN BÀN VIỆT", "den ban viet",
                               u8"đèn bàn việt"}) {
        assert(run("product_search", {{"prefix", prefix}, {"field", "name"}})["matches"] == 1);
    }
    auto trie = run("trie", {{"prefix", "ĐÈN"}, {"field", "name"}});
    assert(Json::parse(trie.dump())["nodes"].size() == 3); // UTF-8 phải xuất JSON hợp lệ.
    assert(trie["nodes"][2]["isWord"] == true);

    const auto before = run("product_detail", {{"sku", sku}});
    rejects("stock_update", {{"sku", sku}, {"delta", 1}, {"note", 42}});
    rejects("stock_update", {{"sku", sku}, {"delta", 2147483647}});
    rejects("stock_update", {{"sku", sku}, {"delta", -6}});
    rejects("stock_update", {{"sku", sku}, {"delta", 1.5}});
    rejects("stock_update", {{"sku", sku}, {"delta", -1}, {"reason", "inbound"}});
    assert(run("product_detail", {{"sku", sku}}) == before);
    assert(run("recent").empty());
    run("stock_update", {{"sku", sku}, {"delta", 2}, {"reason", "inbound"}});
    run("stock_update", {{"sku", sku}, {"delta", -1}, {"reason", "outbound"}});
    assert(run("recent").size() == 1);
    assert(run("recent")[0]["stockAfter"] == 6);
    assert(run("product_detail", {{"sku", sku}})["movements"].size() == 2);

    const auto next = run("next_orders", {{"limit", 1}})[0];
    std::unordered_map<std::string, int> stock_before, ordered_quantity;
    for (const auto& item : next["items"]) {
        const std::string item_sku = item["sku"];
        ordered_quantity[item_sku] += item["quantity"].get<int>();
        stock_before[item_sku] = run("product_lookup", {{"sku", item_sku}})["product"]["stock"];
    }
    const auto extracted = run("order_extract");
    assert(extracted["orderCode"] == next["orderCode"]);
    assert(extracted["status"] == "completed");
    for (const auto& [item_sku, quantity] : ordered_quantity) {
        const int stock_after = run("product_lookup", {{"sku", item_sku}})["product"]["stock"];
        assert(stock_after == stock_before[item_sku] - quantity);
    }
    assert(run("order_lookup", {{"orderCode", next["orderCode"]}})["order"]["status"] == "completed");
    assert(run("heap")["size"] == 9999);
    const Json order = {{"orderCode", "AUDIT-ORDER"}, {"priority", "urgent"},
                        {"items", Json::array({{{"sku", sku}, {"quantity", 1}}})}};
    auto invalid_order = order;
    invalid_order["items"][0]["quantity"] = 1.5;
    std::uint64_t max_sequence = 0;
    const auto heap = run("heap");
    for (const auto& node : heap["nodes"]) {
        max_sequence = std::max(max_sequence, node["sequenceNumber"].get<std::uint64_t>());
    }
    rejects("order_enqueue", invalid_order);
    assert(run("order_enqueue", order)["sequenceNumber"] == max_sequence + 1);
    rejects("order_enqueue", order);
    assert(run("heap")["size"] == 10000);

    for (int i = 0; i < 100; ++i) run("product_lookup", {{"sku", sku}});
    std::unordered_set<std::string> ids;
    for (const auto& log : run("logs")) assert(ids.insert(log["id"]).second);
    for (const auto* action : {"recent", "next_orders", "hash"}) rejects(action, {{"limit", -1}});
    rejects("benchmark_run", {{"operation", "hash_lookup"}, {"iterations", 1}, {"sizes", {10, -1}}});
    assert(run("benchmark_history").empty());
    for (const auto* operation : {"hash_lookup", "heap_extract", "trie_prefix", "initial_load"}) {
        const auto points = run("benchmark_run", {{"operation", operation}, {"iterations", 2},
                                                  {"sizes", {1000}}, {"warmup", true}});
        assert(points.size() == 1 && points[0]["dsaMeanMs"].get<double>() > 0);
    }
    assert(run("benchmark_history").size() == 4);
    run("reset");
    assert(run("health")["productCount"] == 10000 && run("heap")["size"] == 10000);
    assert(run("product_lookup", {{"sku", sku}})["product"].is_null());
    assert(run("recent").empty() && run("benchmark_history").empty());

    const std::filesystem::path saved_path = "backend/build/kiem_thu/du_lieu_luu";
    std::filesystem::remove_all(saved_path);
    dsa::StorageData saved;
    saved.products.push_back({"P1", "SKU-LUU", "Sản phẩm lưu", "Test", 3, 1,
                              "2026-01-01T00:00:00Z", "2026-01-01T00:00:00Z"});
    saved.orders.push_back({"O1", "DON-LUU", dsa::Priority::urgent, 1,
                            {{"P1", "SKU-LUU", "Sản phẩm lưu", 1},
                             {"P1", "SKU-LUU", "Sản phẩm lưu", 1}},
                            dsa::OrderStatus::queued, "Giao sáng, gọi trước", "2026-01-01T00:00:00Z"});
    dsa::kieu_trang::save_data(saved_path, saved);
    {
        dsa::WarehouseService persistent(true, saved_path);
        assert(persistent.run("order_extract", Json::object())["orderCode"] == "DON-LUU");
    }
    {
        dsa::WarehouseService reloaded(true, saved_path);
        assert(reloaded.run("product_lookup", {{"sku", "SKU-LUU"}})["product"]["stock"] == 1);
        assert(reloaded.run("order_lookup", {{"orderCode", "DON-LUU"}})["order"]["status"] == "completed");
        assert(reloaded.run("order_lookup", {{"orderCode", "DON-LUU"}})["order"]["note"] == saved.orders[0].note);
        assert(reloaded.run("heap", Json::object())["size"] == 0);
    }
    saved.products[0].stock = 1;
    dsa::kieu_trang::save_data(saved_path, saved);
    {
        dsa::WarehouseService insufficient(true, saved_path);
        bool rejected = false;
        try { insufficient.run("order_extract", Json::object()); }
        catch (const std::invalid_argument&) { rejected = true; }
        assert(rejected);
        assert(insufficient.run("product_lookup", {{"sku", "SKU-LUU"}})["product"]["stock"] == 1);
        assert(insufficient.run("heap", Json::object())["size"] == 1);
    }
    // Ngắt giữa hai lần đổi tên: phải dùng bản cũ, không dùng bản mới ghi dở.
    const std::filesystem::path backup = saved_path.string() + "_cu";
    const std::filesystem::path pending = saved_path.string() + "_moi";
    std::filesystem::rename(saved_path, backup);
    std::filesystem::create_directories(pending);
    std::ofstream(pending / "san_pham.csv") << "id,sku\n";
    std::ofstream(pending / "don_hang.csv") << "id,order_code\n";
    {
        dsa::WarehouseService recovered(true, saved_path);
        assert(recovered.run("product_lookup", {{"sku", "SKU-LUU"}})["product"]["stock"] == 1);
        assert(recovered.run("heap", Json::object())["size"] == 1);
        recovered.run("stock_update", {{"sku", "SKU-LUU"}, {"delta", 2}});
        assert(recovered.run("order_extract", Json::object())["status"] == "completed");
    }
    assert(dsa::kieu_trang::load_data(saved_path).products[0].stock == 1);
    std::filesystem::remove_all(saved_path);
    std::cout << "PASS: MC1, MC2/TP1, TP2, TP3, validation, benchmark và reset qua dịch vụ thật.\n";
}
