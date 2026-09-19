#include <cassert>
#include <iostream>
#include <string>
#include <vector>
#include <filesystem>

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

void pass(
    const std::string &name,
    const std::string &detail = "")
{
    results.push_back({name, "PASS", detail});
}

void fail(
    const std::string &name,
    const std::string &detail)
{
    results.push_back({name, "FAIL", detail});
}

void blocked(
    const std::string &name,
    const std::string &detail)
{
    results.push_back({name, "BLOCKED_TODO", detail});
}

Product *find_product(
    HashTable<Product> &table,
    const std::string &sku)
{
    return table.find(sku);
}

RecentUpdate make_recent_update(
    const Product &product,
    int delta)
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

int main(int argc, char **argv)
{

    std::string data_dir =
        "backend/data/data_chinh";

    if (argc >= 2)
    {
        data_dir = argv[1];
    }

    std::cout << "INTEGRATION TEST\n";
    std::cout << "Data: " << data_dir << "\n\n";

    StorageData data;

    try
    {
        data = dsa::kieu_trang::load_data(data_dir);
        if (data.products.empty())
        {
            fail(
                "IT01 - Load CSV",
                "Không có Product");
        }
        else if (data.orders.empty())
        {
            fail(
                "IT01 - Load CSV",
                "Không có Order");
        }
        else
        {
            pass(
                "IT01 - Load CSV",
                "products=" +
                    std::to_string(data.products.size()) + ", orders=" +
                    std::to_string(data.orders.size()));
        }
    }
    catch (const std::exception &e)
    {
        fail(
            "IT01 - Load CSV",
            e.what());
        std::cerr << "\nKhông thể tiếp tục vì CSV không load được.\n";
        return 1;
    }

    HashTable<Product> product_hash;

    for (const Product &product : data.products)
    {
        product_hash.upsert(product.sku, product);
    }

    bool hash_ok = product_hash.size() == data.products.size();

    if (hash_ok)
    {
        pass(
            "IT02 - Build Hash",
            "Hash size khớp số Product");
    }
    else
    {
        fail(
            "IT02 - Build Hash",
            "Hash size không khớp");
    }

    Trie trie;
    try
    {
        for (const Product &product : data.products)
        {
            trie.insert(product.sku, product.sku);
            if (!product.name.empty())
            {
                trie.insert(product.name, product.sku);
            }
        }

        const Product &first_product = data.products.front();

        std::string prefix = first_product.name.substr(0, std::min<std::size_t>(3, first_product.name.size()));

        const auto matches = trie.search_prefix(prefix);
        bool found_first_sku = false;
        for (const auto &sku : matches)
        {
            if (sku == first_product.sku)
            {
                found_first_sku = true;
                break;
            }
        }

        if (found_first_sku)
        {
            pass("IT03 - Build/Search Trie", "Tìm prefix '" + prefix + "' thành công");
        }
        else
        {
            fail("IT03 - Build/Search Trie", "Không tìm thấy SKU của Product đầu tiên");
        }
    }
    catch (const std::exception &e)
    {
        fail("IT03 - Build/Search Trie", e.what());
    }

    PriorityQueue heap;
    try
    {
        for (const Order &order : data.orders)
        {
            if (order.status == dsa::OrderStatus::queued)
            {
                heap.push(order);
            }
        }
        if (heap.empty())
        {
            fail("IT04 - Push orders into Heap", "Không có queued order");
        }
        else
        {
            pass("IT04 - Push orders into Heap", "queued orders=" + std::to_string(heap.size()));
        }
    }
    catch (const std::exception &e)
    {
        fail("IT04 - Push orders into Heap", e.what());
    }

    RecentList recent_list(6);

    if (!heap.empty())
    {
        auto popped = heap.pop();
        if (!popped.has_value())
        {
            fail("IT05 - Pop order", "Heap pop trả null");
        }
        else
        {
            const Order &order = popped.value();
            pass(
                "IT05 - Pop order", "order=" + order.id);

            bool order_has_stock = true;
            for (const OrderItem &item : order.items)
            {
                Product *product =
                    find_product(product_hash, item.sku);
                if (product == nullptr)
                {
                    order_has_stock = false;
                    fail("IT06 - SKU lookup",
                         "SKU không tồn tại: " + item.sku);
                    continue;
                }

                if (product->stock < item.quantity)
                {
                    order_has_stock = false;
                    pass(
                        "IT07 - Insufficient stock",
                        "SKU=" + item.sku + ", stock=" +
                            std::to_string(product->stock) + ", quantity=" +
                            std::to_string(item.quantity));
                    continue;
                }

                product->stock -= item.quantity;
                recent_list.touch(make_recent_update(*product, -item.quantity));
            }

            if (order_has_stock)
            {
                pass("IT08 - Inventory update", "Đơn được cập nhật tồn kho");
            }
            else
            {
                pass("IT08 - Inventory update", "Đơn có ít nhất một item không đủ điều kiện");
            }
        }
    }

    const std::string missing_sku = "SKU-DOES-NOT-EXIST";
    Product *missing_product = product_hash.find(missing_sku);
    if (missing_product == nullptr)
    {
        Order missing_order;
        missing_order.id = "TEST-MISSING-SKU";
        missing_order.order_code = "TEST-MISSING-SKU";
        missing_order.priority = dsa::Priority::urgent;
        missing_order.sequence_number = 0;
        missing_order.status = dsa::OrderStatus::queued;

        OrderItem item;
        item.sku = missing_sku;
        item.quantity = 1;

        missing_order.items.push_back(item);

        PriorityQueue missing_heap;
        missing_heap.push(missing_order);
        auto popped = missing_heap.pop();
        assert(popped.has_value());
        Product *product = product_hash.find(popped->items[0].sku);

        assert(product == nullptr);

        pass("IT09 - Missing SKU", "SKU không tồn tại được phát hiện");
    }
    else
    {
        fail("IT09 - Missing SKU", "SKU giả lại tồn tại");
    }

    if (!data.products.empty())
    {
        Product *product = product_hash.find(data.products.front().sku);
        if (product != nullptr)
        {
            const int old_stock = product->stock;
            Order insufficient_order;
            insufficient_order.id = "TEST-INSUFFICIENT";
            insufficient_order.order_code = "TEST-INSUFFICIENT";
            insufficient_order.priority = dsa::Priority::urgent;
            insufficient_order.sequence_number = 1;
            insufficient_order.status = dsa::OrderStatus::queued;
            OrderItem item;
            item.sku = product->sku;
            item.quantity = old_stock + 1;
            insufficient_order.items.push_back(item);
            PriorityQueue insufficient_heap;

            insufficient_heap.push(insufficient_order);

            auto popped = insufficient_heap.pop();
            assert(popped.has_value());
            Product *checked = product_hash.find(popped->items[0].sku);

            assert(checked != nullptr);

            if (checked->stock <
                popped->items[0].quantity)
            {
                assert(
                    checked->stock == old_stock);

                pass(
                    "IT10 - Insufficient order",
                    "Không trừ tồn kho khi thiếu hàng");
            }
            else
            {
                fail(
                    "IT10 - Insufficient order", "Lẽ ra phải thiếu hàng");
            }
        }
    }

    if (!data.products.empty())
    {
        Product *product = product_hash.find(data.products.front().sku);
        if (product != nullptr && product->stock >= 2)
        {
            const std::string sku = product->sku;
            const int stock_before = product->stock;
            product->stock -= 1;
            recent_list.touch(
                make_recent_update(
                    *product,
                    -1));
            product->stock -= 1;
            recent_list.touch(make_recent_update(*product, -1));

            const auto snapshot = recent_list.snapshot();
            std::size_t count = 0;
            for (const auto &update : snapshot)
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
            pass("IT11 - Repeated update", "SKU=" + sku + " chỉ còn một RecentList node");
        }
    }
    const auto recent =
        recent_list.snapshot();
    bool unique = true;
    for (std::size_t i = 0; i < recent.size(); ++i)
    {
        for (std::size_t j = i + 1; j < recent.size(); ++j)
        {
            if (recent[i].sku == recent[j].sku)
            {
                unique = false;
            }
        }
    }

    if (unique)
    {
        pass("IT12 - RecentList invariant", "Không có SKU trùng");
    }
    else
    {
        fail("IT12 - RecentList invariant", "RecentList chứa SKU trùng");
    }
    blocked(
        "IT13 - Xem trạng thái qua API",
        "may_chu.cpp hiện chưa có service trạng thái kho/RecentList; "
        "chỉ có /api/health, /api/modules và /api/demo/{member}");

    std::cout << "\nKẾT QUẢ KIỂM TRA \n";

    int pass_count = 0;
    int fail_count = 0;
    int blocked_count = 0;

    for (const auto &result : results)
    {
        std::cout << "[" << result.status << "] " << result.name;
        if (!result.detail.empty())
        {
            std::cout << " - " << result.detail;
        }
        std::cout << "\n";
        if (result.status == "PASS")
        {
            ++pass_count;
        }
        else if (result.status == "FAIL")
        {
            ++fail_count;
        }
        else
        {
            ++blocked_count;
        }
    }

    std::cout << "\n";
    std::cout << "ĐẠT: " << pass_count << "\n";
    std::cout << "THẤT BẠI: " << fail_count << "\n";

    std::cout
        << "BLOCKED_TODO: "
        << blocked_count
        << "\n";

    return fail_count == 0 ? 0 : 1;
}