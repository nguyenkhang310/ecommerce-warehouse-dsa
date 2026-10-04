// Kiểm tra nghiệp vụ thật: HTTP gọi cùng WarehouseService này.
#include "app/dich_vu.cpp"
#include <cassert>
#include <iostream>
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
    for (const auto* prefix : {"đèn", "ĐÈN", "đèn bàn", "bàn", "việt"}) {
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
    const auto extracted = run("order_extract");
    assert(extracted["orderCode"] == next["orderCode"]);
    assert(extracted["status"] == "completed");
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
    std::cout << "PASS: MC1, MC2/TP1, TP2, TP3, validation, benchmark và reset qua dịch vụ thật.\n";
}
