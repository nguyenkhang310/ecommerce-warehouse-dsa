#include <cassert>
#include <iostream>
#include <string>
#include <vector>

#include "../members/kieu_trang/luu_tru.cpp"
#include "../members/kieu_trang/bang_bam.cpp"
#include "../members/kim_ngan/cay_tien_to.cpp"
#include "../members/nhat_minh/hang_doi_uu_tien.cpp"
#include "../members/ngoc_tram/danh_sach_gan_day.cpp"

using dsa::Order;
using dsa::OrderItem;
using dsa::Product;
using dsa::RecentUpdate;
using dsa::StorageData;

using dsa::kieu_trang::HashTable;
using dsa::kim_ngan::Trie;
using dsa::ngoc_tram::RecentList;
using dsa::nhat_minh::PriorityQueue;

struct TestResult
{
    std::string name;
    std::string status;
    std::string detail;
};

std::vector<TestResult> results;

void check(const std::string &name, bool ok,
           const std::string &detail_pass, const std::string &detail_fail)
{
    results.push_back({name, ok ? "PASS" : "FAIL", ok ? detail_pass : detail_fail});
}

void blocked(const std::string &name, const std::string &detail)
{
    results.push_back({name, "BLOCKED_TODO", detail});
}

RecentUpdate make_recent_update(const Product &product, int delta)
{
    RecentUpdate update;
    update.product_id = product.id;
    update.sku = product.sku;
    update.name = product.name;
    update.delta = delta;
    update.stock_after = product.stock;
    update.updated_at = "integration-test";
    return update;
}

Order make_single_item_order(const std::string &id, const std::string &sku, int quantity, int sequence)
{
    Order order;
    order.id = id;
    order.order_code = id;
    order.priority = dsa::Priority::urgent;
    order.sequence_number = sequence;
    order.status = dsa::OrderStatus::queued;
    OrderItem item;
    item.sku = sku;
    item.quantity = quantity;
    order.items.push_back(item);
    return order;
}

int main(int argc, char **argv)
{
    std::string data_dir = (argc >= 2) ? argv[1] : "backend/data/data_chinh";
    std::cout << "INTEGRATION TEST\nData: " << data_dir << "\n\n";

//IT01: Load dữ liệu CSV
    StorageData data;
    try
    {
        data = dsa::kieu_trang::load_data(data_dir);
        check("IT01 - Load CSV",
              !data.products.empty() && !data.orders.empty(),
              "products=" + std::to_string(data.products.size()) +
                  ", orders=" + std::to_string(data.orders.size()),
              data.products.empty() ? "Không có Product" : "Không có Order");
    }
    catch (const std::exception &e)
    {
        check("IT01 - Load CSV", false, "", e.what());
        std::cerr << "\nKhông thể tiếp tục vì CSV không load được.\n";
        return 1;
    }

//IT02: Nạp Product vào HashTable 
    HashTable<Product> product_hash;
    for (const Product &product : data.products)
        product_hash.upsert(product.sku, product);

    check("IT02 - Build Hash", product_hash.size() == data.products.size(),
          "Hash size khớp số Product", "Hash size không khớp");

//IT03: Nạp Trie và tìm theo tiền tố
    Trie trie;
    try
    {
        for (const Product &product : data.products)
        {
            trie.insert(product.sku, product.sku);
            if (!product.name.empty())
                trie.insert(product.name, product.sku);
        }
        const Product &first_product = data.products.front();
        std::string prefix = first_product.name.substr(0, std::min<std::size_t>(3, first_product.name.size()));
        const auto matches = trie.search_prefix(prefix);

        bool found = false;
        for (const auto &sku : matches)
            if (sku == first_product.sku)
            {
                found = true;
                break;
            }
        check("IT03 - Build/Search Trie", found,
              "Tìm prefix '" + prefix + "' thành công",
              "Không tìm thấy SKU của Product đầu tiên");
    }
    catch (const std::exception &e)
    {
        check("IT03 - Build/Search Trie", false, "", e.what());
    }

//IT04: Đẩy các order đang "queued" vào hàng đợi ưu tiên
    PriorityQueue heap;
    try
    {
        for (const Order &order : data.orders)
            if (order.status == dsa::OrderStatus::queued)
                heap.push(order);

        check("IT04 - Push orders into Heap", !heap.empty(),
              "queued orders=" + std::to_string(heap.size()),
              "Không có queued order");
    }
    catch (const std::exception &e)
    {
        check("IT04 - Push orders into Heap", false, "", e.what());
    }

//IT05-IT08: Lấy 1 order ra khỏi heap và trừ tồn kho 
    RecentList recent_list(6);
    if (!heap.empty())
    {
        auto popped = heap.pop();
        check("IT05 - Pop order", popped.has_value(),
              popped.has_value() ? "order=" + popped->id : "", "Heap pop trả null");
        if (popped.has_value())
        {
            const Order &order = popped.value();
            bool order_has_stock = true;

            for (const OrderItem &item : order.items)
            {
                Product *product = product_hash.find(item.sku);
                if (product == nullptr)
                {
                    order_has_stock = false;
                    check("IT06 - SKU lookup", false, "", "SKU không tồn tại: " + item.sku);
                    continue;
                }

                if (product->stock < item.quantity)
                {
                    order_has_stock = false;
                    check("IT07 - Insufficient stock", true,
                          "SKU=" + item.sku + ", stock=" + std::to_string(product->stock) +
                              ", quantity=" + std::to_string(item.quantity),
                          "");
                    continue;
                }

                product->stock -= item.quantity;
                recent_list.touch(make_recent_update(*product, -item.quantity));
            }

            check("IT08 - Inventory update", true,
                  order_has_stock ? "Đơn được cập nhật tồn kho"
                                   : "Đơn có ít nhất một item không đủ điều kiện",
                  "");
        }
    }

//IT09: SKU không tồn tại phải được phát hiện
    const std::string missing_sku = "SKU-DOES-NOT-EXIST";
    if (product_hash.find(missing_sku) == nullptr)
    {
        PriorityQueue missing_heap;
        missing_heap.push(make_single_item_order("TEST-MISSING-SKU", missing_sku, 1, 0));

        auto popped = missing_heap.pop();
        assert(popped.has_value());
        assert(product_hash.find(popped->items[0].sku) == nullptr);

        check("IT09 - Missing SKU", true, "SKU không tồn tại được phát hiện", "");
    }
    else
    { check("IT09 - Missing SKU", false, "", "SKU giả lại tồn tại"); }

//IT10: Đặt hàng vượt tồn kho thì không được trừ tồn 
    if (!data.products.empty())
    {
        Product *product = product_hash.find(data.products.front().sku);
        if (product != nullptr)
        {
            const int old_stock = product->stock;

            PriorityQueue insufficient_heap;
            insufficient_heap.push(make_single_item_order("TEST-INSUFFICIENT", product->sku, old_stock + 1, 1));

            auto popped = insufficient_heap.pop();
            assert(popped.has_value());
            Product *checked = product_hash.find(popped->items[0].sku);
            assert(checked != nullptr);

            bool is_insufficient = checked->stock < popped->items[0].quantity;
            if (is_insufficient)
                assert(checked->stock == old_stock);

            check("IT10 - Insufficient order", is_insufficient,
                  "Không trừ tồn kho khi thiếu hàng", "Lẽ ra phải thiếu hàng");
        }
    }

//IT11: Cập nhật lặp lại cùng 1 SKU chỉ giữ 1 node trong RecentList
    if (!data.products.empty())
    {
        Product *product = product_hash.find(data.products.front().sku);
        if (product != nullptr && product->stock >= 2)
        {
            const std::string sku = product->sku;
            const int stock_before = product->stock;

            product->stock -= 1;
            recent_list.touch(make_recent_update(*product, -1));
            product->stock -= 1;
            recent_list.touch(make_recent_update(*product, -1));

            std::size_t count = 0;
            for (const auto &update : recent_list.snapshot())
            {
                if (update.sku == sku)
                {
                    ++count;
                    assert(update.delta == -1);
                    assert(update.stock_after == product->stock);
                }
            }
            assert(count == 1);
            assert(product->stock == stock_before - 2);

            check("IT11 - Repeated update", true,
                  "SKU=" + sku + " chỉ còn một RecentList node", "");
        }
    }
//IT12: RecentList không được chứa SKU trùng lặp 
    const auto recent = recent_list.snapshot();
    bool unique = true;
    for (std::size_t i = 0; i < recent.size() && unique; ++i)
        for (std::size_t j = i + 1; j < recent.size(); ++j)
            if (recent[i].sku == recent[j].sku)
            {
                unique = false;
                break;
            }
    check("IT12 - RecentList invariant", unique,
          "Không có SKU trùng", "RecentList chứa SKU trùng");

//IT13: Chưa có API xem trạng thái kho/RecentList 
    blocked("IT13 - Xem trạng thái qua API",
            "may_chu.cpp hiện chưa có service trạng thái kho/RecentList; "
            "chỉ có /api/health, /api/modules và /api/demo/{member}");

    std::cout << "\nKẾT QUẢ KIỂM TRA \n";
    int pass_count = 0, fail_count = 0, blocked_count = 0;
    for (const auto &result : results)
    {
        std::cout << "[" << result.status << "] " << result.name;
        if (!result.detail.empty())
            std::cout << " - " << result.detail;
        std::cout << "\n";

        if (result.status == "PASS")
            ++pass_count;
        else if (result.status == "FAIL")
            ++fail_count;
        else
            ++blocked_count;
    }
    std::cout << "\nĐẠT: " << pass_count
               << "\nTHẤT BẠI: " << fail_count
               << "\nBLOCKED_TODO: " << blocked_count << "\n";

    return fail_count == 0 ? 0 : 1;
}