#ifndef DSA_APP_DICH_VU_CPP
#define DSA_APP_DICH_VU_CPP

#include <json.hpp>
#include "members/kieu_trang/bang_bam.cpp"
#include "members/kieu_trang/luu_tru.cpp"
#include "members/nhat_minh/hang_doi_uu_tien.cpp"
#include "members/kim_ngan/cay_tien_to.cpp"
#include "members/ngoc_tram/danh_sach_gan_day.cpp"
#include "members/nguyen_khang/thuat_toan.cpp"

#include <algorithm>
#include <chrono>
#include <cctype>
#include <cmath>
#include <ctime>
#include <iomanip>
#include <optional>
#include <sstream>
#include <stdexcept>
#include <string>
#include <vector>

namespace dsa {

class WarehouseService {
public:
    WarehouseService() { load(); }
    nlohmann::json run(const std::string& action, const nlohmann::json& input);

private:
    StorageData data_;
    kieu_trang::HashTable<Product> products_;
    kieu_trang::HashTable<Order> orders_;
    nhat_minh::PriorityQueue queue_;
    kim_ngan::Trie sku_trie_;
    kim_ngan::Trie name_trie_;
    ngoc_tram::RecentList recent_{6};
    std::vector<StockMovement> movements_;
    std::vector<nlohmann::json> logs_;
    std::vector<nlohmann::json> benchmarks_;
    std::uint64_t next_sequence_ = 0;
    std::size_t trie_terms_ = 0;
    std::size_t trie_max_depth_ = 0;
    std::string last_load_at_;

    void load();
    void add_log(const std::string& level, const std::string& source,
                 const std::string& message);
    nlohmann::json dashboard() const;
    nlohmann::json products(const nlohmann::json& input) const;
    nlohmann::json lookup_product(const std::string& raw_sku);
    nlohmann::json search_prefix(const std::string& raw_prefix,
                                 const std::string& field) const;
    nlohmann::json create_product(const nlohmann::json& input);
    nlohmann::json update_stock(const nlohmann::json& input);
    nlohmann::json queue_summary() const;
    nlohmann::json queue_orders(const nlohmann::json& input) const;
    nlohmann::json lookup_order(const std::string& raw_code) const;
    nlohmann::json enqueue(const nlohmann::json& input);
    nlohmann::json extract_next();
    nlohmann::json heap_snapshot() const;
    nlohmann::json hash_snapshot(std::size_t limit, const std::string& key) const;
    nlohmann::json trie_snapshot(const std::string& prefix,
                                 const std::string& field) const;
    nlohmann::json recent_snapshot() const;
    nlohmann::json run_benchmarks(const nlohmann::json& input);
};

namespace {

using Json = nlohmann::json;
using Clock = std::chrono::steady_clock;
volatile std::size_t benchmark_sink = 0;

std::string lower(std::string value) {
    for (char& character : value) {
        character = static_cast<char>(std::tolower(static_cast<unsigned char>(character)));
    }
    return value;
}

std::string upper(std::string value) {
    for (char& character : value) {
        character = static_cast<char>(std::toupper(static_cast<unsigned char>(character)));
    }
    return value;
}

std::vector<std::string> words(const std::string& value) {
    std::vector<std::string> result;
    std::string word;
    for (const unsigned char character : lower(value)) {
        if (std::isalnum(character)) word.push_back(static_cast<char>(character));
        else if (!word.empty()) {
            result.push_back(word);
            word.clear();
        }
    }
    if (!word.empty()) result.push_back(word);
    return result;
}

std::string now_utc() {
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

std::time_t parse_utc(const std::string& value) {
    if (value.size() < 19) return 0;
    std::tm time{};
    std::istringstream input(value.substr(0, 19));
    input >> std::get_time(&time, "%Y-%m-%dT%H:%M:%S");
    if (input.fail()) return 0;
#ifdef _WIN32
    return _mkgmtime(&time);
#else
    return timegm(&time);
#endif
}

std::string priority_text(Priority priority) {
    if (priority == Priority::urgent) return "urgent";
    if (priority == Priority::high) return "high";
    return "normal";
}

Priority parse_priority(const std::string& value) {
    if (value == "urgent") return Priority::urgent;
    if (value == "high") return Priority::high;
    if (value == "normal") return Priority::normal;
    throw std::invalid_argument("Mức ưu tiên không hợp lệ");
}

std::string status_text(OrderStatus status) {
    if (status == OrderStatus::queued) return "queued";
    if (status == OrderStatus::processing) return "processing";
    if (status == OrderStatus::completed) return "completed";
    return "cancelled";
}

std::string stock_status(const Product& product) {
    if (product.stock == 0) return "out_of_stock";
    if (product.reorder_level > 0 && product.stock <= product.reorder_level) {
        return "low_stock";
    }
    return "in_stock";
}

Json product_json(const Product& product) {
    return {
        {"id", product.id}, {"sku", product.sku}, {"name", product.name},
        {"category", product.category}, {"stock", product.stock},
        {"reorderLevel", product.reorder_level}, {"status", stock_status(product)},
        {"createdAt", product.created_at}, {"updatedAt", product.updated_at}
    };
}

Json movement_json(const StockMovement& movement) {
    return {
        {"id", movement.id}, {"productId", movement.product_id},
        {"sku", movement.sku}, {"delta", movement.delta},
        {"stockAfter", movement.stock_after}, {"reason", movement.reason},
        {"note", movement.note}, {"createdAt", movement.created_at}
    };
}

Json recent_json(const RecentUpdate& update) {
    return {
        {"productId", update.product_id}, {"sku", update.sku},
        {"name", update.name}, {"delta", update.delta},
        {"stockAfter", update.stock_after}, {"updatedAt", update.updated_at}
    };
}

Json order_json(const Order& order,
                const kieu_trang::HashTable<Product>& products) {
    Json items = Json::array();
    int total = 0;
    for (const OrderItem& item : order.items) {
        const Product* product = products.find(item.sku);
        items.push_back({
            {"productId", product ? product->id : item.product_id},
            {"sku", item.sku},
            {"name", product ? product->name : item.name},
            {"quantity", item.quantity}
        });
        total += item.quantity;
    }
    return {
        {"id", order.id}, {"orderCode", order.order_code},
        {"priority", priority_text(order.priority)},
        {"priorityValue", static_cast<int>(order.priority)},
        {"sequenceNumber", order.sequence_number}, {"items", items},
        {"totalQuantity", total}, {"status", status_text(order.status)},
        {"note", order.note}, {"createdAt", order.created_at}
    };
}

bool higher_priority(const Order& first, const Order& second) {
    if (first.priority != second.priority) {
        return static_cast<int>(first.priority) > static_cast<int>(second.priority);
    }
    return first.sequence_number < second.sequence_number;
}

std::vector<Order> ordered_queue(nhat_minh::PriorityQueue queue,
                                 std::size_t limit = static_cast<std::size_t>(-1)) {
    std::vector<Order> result;
    while (!queue.empty() && result.size() < limit) {
        result.push_back(*queue.pop());
    }
    return result;
}

double elapsed_ms(Clock::time_point start) {
    return std::chrono::duration<double, std::milli>(Clock::now() - start).count();
}

double rounded_ms(double value) {
    return std::max(0.000001, std::round(value * 1000000.0) / 1000000.0);
}

} // namespace

void WarehouseService::load() {
    data_ = kieu_trang::load_data("backend/data/data_chinh");
    products_ = kieu_trang::HashTable<Product>();
    orders_ = kieu_trang::HashTable<Order>();
    queue_.clear();
    sku_trie_ = kim_ngan::Trie();
    name_trie_ = kim_ngan::Trie();
    recent_ = ngoc_tram::RecentList(6);
    movements_.clear();
    logs_.clear();
    benchmarks_.clear();
    next_sequence_ = 0;
    trie_terms_ = 0;
    trie_max_depth_ = 0;

    for (const Product& product : data_.products) {
        products_.upsert(product.sku, product);
        const std::string sku = lower(product.sku);
        sku_trie_.insert(sku, product.sku);
        ++trie_terms_;
        trie_max_depth_ = std::max(trie_max_depth_, sku.size());
        for (const std::string& word : words(product.name)) {
            name_trie_.insert(word, product.sku);
            ++trie_terms_;
            trie_max_depth_ = std::max(trie_max_depth_, word.size());
        }
    }
    for (const Order& order : data_.orders) {
        orders_.upsert(order.order_code, order);
        if (order.status == OrderStatus::queued) queue_.push(order);
        next_sequence_ = std::max(next_sequence_, order.sequence_number);
    }
    last_load_at_ = now_utc();
    add_log("info", "storage", "Đã nạp data_chinh vào các cấu trúc C++.");
}

void WarehouseService::add_log(const std::string& level, const std::string& source,
                               const std::string& message) {
    logs_.insert(logs_.begin(), Json{
        {"id", "log-" + std::to_string(std::time(nullptr)) + "-" + std::to_string(logs_.size())},
        {"at", now_utc()}, {"level", level}, {"source", source}, {"message", message}
    });
    if (logs_.size() > 60) logs_.resize(60);
}

nlohmann::json WarehouseService::dashboard() const {
    long long total_stock = 0;
    std::size_t low_stock = 0;
    std::size_t added_this_month = 0;
    const std::time_t month_ago = std::time(nullptr) - 30 * 24 * 60 * 60;
    for (const Product& product : data_.products) {
        total_stock += product.stock;
        if (stock_status(product) != "in_stock") ++low_stock;
        if (parse_utc(product.created_at) >= month_ago) ++added_this_month;
    }
    int inbound_today = 0;
    const std::string today = now_utc().substr(0, 10);
    for (const StockMovement& movement : movements_) {
        if (movement.created_at.substr(0, 10) == today
            && movement.reason == "inbound" && movement.delta > 0) {
            inbound_today += movement.delta;
        }
    }
    const Json counts = queue_summary();
    const auto next = queue_.peek();
    return {
        {"totalProducts", products_.size()}, {"totalStock", total_stock},
        {"lowStockCount", low_stock}, {"pendingOrders", queue_.size()},
        {"urgentOrders", counts["urgent"]}, {"productsAddedThisMonth", added_this_month},
        {"inboundToday", inbound_today},
        {"dsaHealth", {
            {"hashKeys", products_.size()}, {"hashLoadFactor", products_.load_factor()},
            {"heapNodes", queue_.size()},
            {"heapNext", next ? next->order_code : "—"},
            {"trieTerms", trie_terms_}, {"trieMaxDepth", trie_max_depth_},
            {"recentUsed", recent_.size()}, {"recentCapacity", recent_.capacity()}
        }}
    };
}

nlohmann::json WarehouseService::products(const nlohmann::json& input) const {
    const std::string category = input.value("category", "all");
    const std::string status = input.value("status", "all");
    Json result = Json::array();
    for (const Product& product : data_.products) {
        if (category != "all" && product.category != category) continue;
        if (status != "all" && stock_status(product) != status) continue;
        result.push_back(product_json(product));
    }
    return result;
}

nlohmann::json WarehouseService::lookup_product(const std::string& raw_sku) {
    const std::string sku = upper(raw_sku);
    const auto start = Clock::now();
    const Product* product = products_.find(sku);
    const double duration = elapsed_ms(start);
    const std::size_t bucket = products_.bucket_index(sku);
    std::size_t comparisons = 0;
    for (const Product& entry : products_.bucket_values(bucket)) {
        ++comparisons;
        if (entry.sku == sku) break;
    }
    add_log(product ? "success" : "warning", "hash_table",
            "Tra cứu SKU " + sku + " tại ngăn #" + std::to_string(bucket) + ".");
    return {
        {"product", product ? product_json(*product) : Json(nullptr)},
        {"trace", {
            {"input", raw_sku}, {"hashValue", products_.hash_value(sku)},
            {"bucketIndex", bucket}, {"comparisons", comparisons},
            {"elapsedMs", duration}, {"complexity", "Trung bình O(1)"},
            {"found", product != nullptr}
        }}
    };
}

nlohmann::json WarehouseService::search_prefix(const std::string& raw_prefix,
                                                const std::string& field) const {
    const std::string prefix = lower(raw_prefix);
    const auto start = Clock::now();
    std::vector<std::string> matches;
    if (!prefix.empty()) {
        if (field == "sku") matches = sku_trie_.search_prefix(prefix);
        else if (field == "name") matches = name_trie_.search_prefix(prefix);
        else {
            matches = sku_trie_.search_prefix(prefix);
            const auto names = name_trie_.search_prefix(prefix);
            for (const std::string& sku : names) {
                if (std::find(matches.begin(), matches.end(), sku) == matches.end()) {
                    matches.push_back(sku);
                }
            }
        }
    }
    const double duration = elapsed_ms(start);
    Json entries = Json::array();
    for (const std::string& sku : matches) {
        if (entries.size() == 8) break;
        if (const Product* product = products_.find(sku)) entries.push_back(product_json(*product));
    }
    return {{"entries", entries}, {"elapsedMs", duration}, {"matches", matches.size()}};
}

nlohmann::json WarehouseService::create_product(const nlohmann::json& input) {
    const std::string sku = upper(input.value("sku", ""));
    const std::string name = input.value("name", "");
    const std::string category = input.value("category", "");
    const int stock = input.value("stock", -1);
    const int reorder = input.value("reorderLevel", -1);
    if (sku.empty() || name.empty() || category.empty() || stock < 0 || reorder < 0) {
        throw std::invalid_argument("Thông tin sản phẩm chưa hợp lệ");
    }
    if (products_.find(sku)) throw std::invalid_argument("SKU đã tồn tại");

    Product product;
    product.id = "PRD-NEW-" + std::to_string(data_.products.size() + 1);
    product.sku = sku;
    product.name = name;
    product.category = category;
    product.stock = stock;
    product.reorder_level = reorder;
    product.created_at = now_utc();
    product.updated_at = product.created_at;
    data_.products.push_back(product);
    products_.upsert(sku, product);
    sku_trie_.insert(lower(sku), sku);
    ++trie_terms_;
    trie_max_depth_ = std::max(trie_max_depth_, sku.size());
    for (const std::string& word : words(name)) {
        name_trie_.insert(word, sku);
        ++trie_terms_;
        trie_max_depth_ = std::max(trie_max_depth_, word.size());
    }
    add_log("success", "hash_table", "Đã thêm sản phẩm " + sku + ".");
    return product_json(product);
}

nlohmann::json WarehouseService::update_stock(const nlohmann::json& input) {
    const std::string sku = upper(input.value("sku", ""));
    const int delta = input.value("delta", 0);
    const std::string reason = input.value("reason", "adjustment");
    Product* product = products_.find(sku);
    if (!product) throw std::invalid_argument("Không tìm thấy sản phẩm " + sku);
    if (product->stock + delta < 0) throw std::invalid_argument("Tồn kho không được âm");
    if (reason != "inbound" && reason != "outbound" && reason != "adjustment") {
        throw std::invalid_argument("Lý do cập nhật không hợp lệ");
    }

    const auto before = recent_.snapshot();
    const bool moved = std::any_of(before.begin(), before.end(), [&](const RecentUpdate& update) {
        return update.sku == sku;
    });
    std::string evicted;
    if (!moved && before.size() == recent_.capacity() && !before.empty()) {
        evicted = before.back().sku;
    }

    product->stock += delta;
    product->updated_at = now_utc();
    for (Product& stored : data_.products) {
        if (stored.sku == sku) {
            stored = *product;
            break;
        }
    }
    StockMovement movement;
    movement.id = "MOV-" + std::to_string(movements_.size() + 1);
    movement.product_id = product->id;
    movement.sku = sku;
    movement.delta = delta;
    movement.stock_after = product->stock;
    movement.reason = reason;
    movement.note = input.value("note", "");
    movement.created_at = product->updated_at;
    movements_.insert(movements_.begin(), movement);

    RecentUpdate update;
    update.product_id = product->id;
    update.sku = sku;
    update.name = product->name;
    update.delta = delta;
    update.stock_after = product->stock;
    update.updated_at = product->updated_at;
    recent_.touch(update);
    add_log("success", "recent_list", "Đã cập nhật tồn kho " + sku + ".");
    return {
        {"product", product_json(*product)}, {"movement", movement_json(movement)},
        {"movedToFront", moved}, {"evicted", evicted.empty() ? Json(nullptr) : Json(evicted)}
    };
}

nlohmann::json WarehouseService::queue_summary() const {
    std::size_t urgent = 0, high = 0, normal = 0;
    double urgent_wait = 0, high_wait = 0, normal_wait = 0;
    const std::time_t now = std::time(nullptr);
    for (const Order& order : queue_.snapshot()) {
        const double wait = std::max(0.0, std::difftime(now, parse_utc(order.created_at)) / 60.0);
        if (order.priority == Priority::urgent) { ++urgent; urgent_wait += wait; }
        else if (order.priority == Priority::high) { ++high; high_wait += wait; }
        else { ++normal; normal_wait += wait; }
    }
    return {
        {"urgent", urgent}, {"high", high}, {"normal", normal},
        {"avgWaitMinutes", {
            {"urgent", urgent ? static_cast<long long>(urgent_wait / urgent) : 0},
            {"high", high ? static_cast<long long>(high_wait / high) : 0},
            {"normal", normal ? static_cast<long long>(normal_wait / normal) : 0}
        }}
    };
}

nlohmann::json WarehouseService::queue_orders(const nlohmann::json& input) const {
    const std::string filter = input.value("priority", "all");
    Json result = Json::array();
    for (const Order& order : ordered_queue(queue_)) {
        if (filter != "all" && priority_text(order.priority) != filter) continue;
        result.push_back(order_json(order, products_));
    }
    return result;
}

nlohmann::json WarehouseService::lookup_order(const std::string& raw_code) const {
    const std::string code = upper(raw_code);
    const auto start = Clock::now();
    const Order* order = orders_.find(code);
    const double duration = elapsed_ms(start);
    const std::size_t bucket = orders_.bucket_index(code);
    return {
        {"order", order ? order_json(*order, products_) : Json(nullptr)},
        {"trace", {
            {"input", raw_code}, {"hashValue", orders_.hash_value(code)},
            {"bucketIndex", bucket}, {"comparisons", order ? 1 : 0},
            {"elapsedMs", duration}, {"complexity", "Trung bình O(1)"},
            {"found", order != nullptr}
        }}
    };
}

nlohmann::json WarehouseService::enqueue(const nlohmann::json& input) {
    const std::string code = upper(input.value("orderCode", ""));
    if (code.empty() || orders_.find(code)) throw std::invalid_argument("Mã đơn không hợp lệ hoặc đã tồn tại");
    if (!input.contains("items") || !input["items"].is_array() || input["items"].empty()) {
        throw std::invalid_argument("Đơn hàng phải có sản phẩm");
    }
    Order order;
    order.id = "ORD-NEW-" + std::to_string(data_.orders.size() + 1);
    order.order_code = code;
    order.priority = parse_priority(input.value("priority", ""));
    order.sequence_number = ++next_sequence_;
    order.status = OrderStatus::queued;
    order.note = input.value("note", "");
    order.created_at = now_utc();
    for (const auto& value : input["items"]) {
        const std::string sku = upper(value.value("sku", ""));
        const int quantity = value.value("quantity", 0);
        const Product* product = products_.find(sku);
        if (!product || quantity <= 0) throw std::invalid_argument("Sản phẩm hoặc số lượng không hợp lệ");
        order.items.push_back({product->id, sku, product->name, quantity});
    }
    data_.orders.push_back(order);
    orders_.upsert(code, order);
    queue_.push(order);
    add_log("success", "priority_heap", "Đã thêm đơn " + code + " vào Heap.");
    return order_json(order, products_);
}

nlohmann::json WarehouseService::extract_next() {
    const auto next = queue_.pop();
    if (!next) return nullptr;
    Order order = *next;
    order.status = OrderStatus::completed;
    orders_.upsert(order.order_code, order);
    for (Order& stored : data_.orders) {
        if (stored.order_code == order.order_code) {
            stored.status = order.status;
            break;
        }
    }
    add_log("success", "priority_heap", "Đã xử lý đơn " + order.order_code + ".");
    return order_json(order, products_);
}

nlohmann::json WarehouseService::heap_snapshot() const {
    Json nodes = Json::array();
    const auto snapshot = queue_.snapshot();
    for (std::size_t index = 0; index < snapshot.size(); ++index) {
        const Order& order = snapshot[index];
        nodes.push_back({
            {"index", index}, {"orderCode", order.order_code},
            {"priority", priority_text(order.priority)},
            {"priorityValue", static_cast<int>(order.priority)},
            {"sequenceNumber", order.sequence_number}
        });
    }
    return {{"nodes", nodes}, {"size", snapshot.size()}};
}

nlohmann::json WarehouseService::hash_snapshot(std::size_t limit, const std::string& key) const {
    Json result = Json::array();
    const std::optional<std::size_t> selected = key.empty()
        ? std::nullopt
        : std::optional<std::size_t>(products_.bucket_index(upper(key)));
    auto append_bucket = [&](std::size_t index) {
        const auto values = products_.bucket_values(index);
        if (values.empty()) return;
        Json entries = Json::array();
        for (const Product& product : values) {
            entries.push_back({{"sku", product.sku}, {"name", product.name}});
        }
        result.push_back({{"index", index}, {"entries", entries}});
    };
    if (selected) append_bucket(*selected);
    for (std::size_t index = 0; index < products_.bucket_count() && result.size() < limit; ++index) {
        if (selected && index == *selected) continue;
        append_bucket(index);
    }
    return result;
}

nlohmann::json WarehouseService::trie_snapshot(const std::string& raw_prefix,
                                                const std::string& field) const {
    const std::string prefix = lower(raw_prefix);
    const Json search = search_prefix(prefix, field);
    Json suggestions = Json::array();
    for (const auto& product : search["entries"]) {
        suggestions.push_back({{"sku", product["sku"]}, {"name", product["name"]}});
    }
    Json nodes = Json::array();
    if (!suggestions.empty()) {
        std::string parent = "root";
        std::string path;
        for (std::size_t index = 0; index < prefix.size(); ++index) {
            path += prefix[index];
            nodes.push_back({
                {"id", path}, {"parentId", parent},
                {"char", std::string(1, prefix[index])}, {"depth", index + 1},
                {"isWord", false}, {"onPath", true}
            });
            parent = path;
        }
    }
    return {
        {"nodes", nodes}, {"suggestions", suggestions},
        {"prefixLength", prefix.size()}, {"matches", search["matches"]}
    };
}

nlohmann::json WarehouseService::recent_snapshot() const {
    Json items = Json::array();
    Json map = Json::array();
    const auto updates = recent_.snapshot();
    for (std::size_t index = 0; index < updates.size(); ++index) {
        items.push_back(recent_json(updates[index]));
        map.push_back({{"key", updates[index].sku}, {"position", index}});
    }
    return {{"items", items}, {"map", map}, {"capacity", recent_.capacity()}};
}

nlohmann::json WarehouseService::run_benchmarks(const nlohmann::json& input) {
    const std::string operation = input.value("operation", "");
    const int iterations = input.value("iterations", 0);
    const bool warmup = input.value("warmup", true);
    if (iterations <= 0 || iterations > 1000) {
        throw std::invalid_argument("Số lần lặp phải từ 1 đến 1000");
    }
    if (!input.contains("sizes") || !input["sizes"].is_array()) {
        throw std::invalid_argument("Thiếu danh sách kích thước");
    }
    Json points = Json::array();
    for (const auto& size_value : input["sizes"]) {
        const std::size_t size = size_value.get<std::size_t>();
        const std::size_t available = operation == "heap_extract" ? data_.orders.size() : data_.products.size();
        if (size == 0 || size > available) throw std::invalid_argument("Kích thước vượt dữ liệu đã nạp");
        double dsa_ms = 0;
        double baseline_ms = 0;

        if (operation == "hash_lookup") {
            kieu_trang::HashTable<Product> table;
            for (std::size_t i = 0; i < size; ++i) table.upsert(data_.products[i].sku, data_.products[i]);
            if (warmup) benchmark_sink += table.find(data_.products[0].sku) != nullptr;
            auto start = Clock::now();
            for (int i = 0; i < iterations; ++i) {
                const std::string& sku = data_.products[(static_cast<std::size_t>(i) * 37) % size].sku;
                benchmark_sink += table.find(sku) != nullptr;
            }
            dsa_ms = elapsed_ms(start) / iterations;
            start = Clock::now();
            for (int i = 0; i < iterations; ++i) {
                const std::string& sku = data_.products[(static_cast<std::size_t>(i) * 37) % size].sku;
                for (std::size_t j = 0; j < size; ++j) {
                    if (data_.products[j].sku == sku) { benchmark_sink += j; break; }
                }
            }
            baseline_ms = elapsed_ms(start) / iterations;
        } else if (operation == "trie_prefix") {
            kim_ngan::Trie trie;
            for (std::size_t i = 0; i < size; ++i) trie.insert(lower(data_.products[i].sku), data_.products[i].sku);
            const std::string prefix = lower(data_.products[size / 2].sku.substr(0, 8));
            if (warmup) benchmark_sink += trie.search_prefix(prefix).size();
            auto start = Clock::now();
            for (int i = 0; i < iterations; ++i) benchmark_sink += trie.search_prefix(prefix).size();
            dsa_ms = elapsed_ms(start) / iterations;
            start = Clock::now();
            for (int i = 0; i < iterations; ++i) {
                for (std::size_t j = 0; j < size; ++j) {
                    benchmark_sink += lower(data_.products[j].sku).rfind(prefix, 0) == 0;
                }
            }
            baseline_ms = elapsed_ms(start) / iterations;
        } else if (operation == "heap_extract") {
            nhat_minh::PriorityQueue base_heap;
            std::vector<Order> base_orders(data_.orders.begin(), data_.orders.begin() + static_cast<std::ptrdiff_t>(size));
            for (const Order& order : base_orders) base_heap.push(order);
            if (warmup) { auto copy = base_heap; benchmark_sink += copy.pop().has_value(); }
            for (int i = 0; i < iterations; ++i) {
                auto heap = base_heap;
                const auto start = Clock::now();
                benchmark_sink += heap.pop().has_value();
                dsa_ms += elapsed_ms(start);
                auto list = base_orders;
                const auto linear_start = Clock::now();
                std::size_t best = 0;
                for (std::size_t j = 1; j < list.size(); ++j) {
                    if (higher_priority(list[j], list[best])) best = j;
                }
                list.erase(list.begin() + static_cast<std::ptrdiff_t>(best));
                benchmark_sink += list.size();
                baseline_ms += elapsed_ms(linear_start);
            }
            dsa_ms /= iterations;
            baseline_ms /= iterations;
        } else if (operation == "initial_load") {
            std::vector<Product> sample(data_.products.begin(), data_.products.begin() + static_cast<std::ptrdiff_t>(size));
            if (warmup) { auto copy = sample; nguyen_khang::merge_sort_by_sku(copy); }
            for (int i = 0; i < iterations; ++i) {
                auto dsa_copy = sample;
                const auto start = Clock::now();
                nguyen_khang::merge_sort_by_sku(dsa_copy);
                dsa_ms += elapsed_ms(start);
                auto standard_copy = sample;
                const auto standard_start = Clock::now();
                std::stable_sort(standard_copy.begin(), standard_copy.end(),
                    [](const Product& a, const Product& b) { return a.sku < b.sku; });
                baseline_ms += elapsed_ms(standard_start);
                benchmark_sink += dsa_copy.size() + standard_copy.size();
            }
            dsa_ms /= iterations;
            baseline_ms /= iterations;
        } else {
            throw std::invalid_argument("Phép đo không hợp lệ");
        }

        Json point = {
            {"operation", operation}, {"datasetSize", size}, {"iterations", iterations},
            {"dsaMeanMs", rounded_ms(dsa_ms)},
            {"baselineMeanMs", rounded_ms(baseline_ms)},
            {"measuredAt", now_utc()}, {"mode", "live"}
        };
        points.push_back(point);
        benchmarks_.insert(benchmarks_.begin(), point);
    }
    if (benchmarks_.size() > 60) benchmarks_.resize(60);
    add_log("info", "benchmark", "Đã đo " + operation + " bằng C++.");
    return points;
}

nlohmann::json WarehouseService::run(const std::string& action, const nlohmann::json& input) {
    if (!input.is_object()) throw std::invalid_argument("data phải là object JSON");
    if (action == "dashboard") return dashboard();
    if (action == "products") return products(input);
    if (action == "product_lookup") return lookup_product(input.value("sku", ""));
    if (action == "product_search") return search_prefix(input.value("prefix", ""), input.value("field", "auto"));
    if (action == "product_detail") {
        const Product* product = products_.find(upper(input.value("sku", "")));
        if (!product) throw std::invalid_argument("Không tìm thấy sản phẩm");
        Json movements = Json::array();
        for (const StockMovement& movement : movements_) {
            if (movement.product_id == product->id) movements.push_back(movement_json(movement));
        }
        return {{"product", product_json(*product)}, {"movements", movements}};
    }
    if (action == "product_create") return create_product(input);
    if (action == "stock_update") return update_stock(input);
    if (action == "recent") {
        Json items = recent_snapshot()["items"];
        const std::size_t limit = input.value("limit", 6U);
        while (items.size() > limit) items.erase(items.end() - 1);
        return items;
    }
    if (action == "queue_summary") return queue_summary();
    if (action == "queue") return queue_orders(input);
    if (action == "order_lookup") return lookup_order(input.value("orderCode", ""));
    if (action == "next_orders") {
        Json result = Json::array();
        for (const Order& order : ordered_queue(queue_, input.value("limit", 5U))) {
            result.push_back(order_json(order, products_));
        }
        return result;
    }
    if (action == "order_enqueue") return enqueue(input);
    if (action == "order_extract") return extract_next();
    if (action == "heap") return heap_snapshot();
    if (action == "logs") return logs_;
    if (action == "hash") return hash_snapshot(input.value("limit", 24U), input.value("key", ""));
    if (action == "trie") return trie_snapshot(input.value("prefix", ""), input.value("field", "sku"));
    if (action == "recent_snapshot") return recent_snapshot();
    if (action == "benchmark_run") return run_benchmarks(input);
    if (action == "benchmark_history") return benchmarks_;
    if (action == "reset") { load(); return true; }
    if (action == "ping") return {{"ok", true}};
    if (action == "health") {
        return {
            {"coreApiUrl", "/api/app"}, {"connected", true}, {"mode", "live"},
            {"storageType", "CSV data_chinh → bộ nhớ C++"}, {"lastLoadAt", last_load_at_},
            {"productCount", products_.size()}, {"orderCount", orders_.size()},
            {"heapSize", queue_.size()}, {"trieTerms", trie_terms_},
            {"recentCapacity", recent_.capacity()}, {"latencyMs", 0}
        };
    }
    throw std::invalid_argument("Thao tác không tồn tại");
}

} // namespace dsa

#endif
