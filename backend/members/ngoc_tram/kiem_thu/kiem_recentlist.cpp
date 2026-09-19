#include <cassert>
#include <iostream>
#include <string>
#include <vector>

#include "../danh_sach_gan_day.cpp"

using dsa::RecentUpdate;
using dsa::ngoc_tram::RecentList;

RecentUpdate make_update(
    const std::string& sku,
    int delta = 1,
    int stock_after = 100,
    const std::string& time = "2026-01-01"
) {
    RecentUpdate update;
    update.product_id = "P-" + sku;
    update.sku = sku;
    update.name = "Product " + sku;
    update.delta = delta;
    update.stock_after = stock_after;
    update.updated_at = time;
    return update;
}

std::vector<std::string> get_skus(const RecentList& list) {
    std::vector<std::string> result;

    for (const auto& update : list.snapshot()) {
        result.push_back(update.sku);
    }

    return result;
}

void assert_order(
    const RecentList& list,
    const std::vector<std::string>& expected
) {
    const auto actual = get_skus(list);
    assert(actual == expected);
}

void test_empty() {
    RecentList list(3);
    assert(list.size() == 0);
    assert(list.snapshot().empty());
}

void test_capacity_zero() {
    RecentList list(0);
    list.touch(make_update("A"));

    assert(list.size() == 0);
    assert(list.snapshot().empty());
}

void test_capacity_one() {
    RecentList list(1);

    list.touch(make_update("A"));
    assert_order(list, {"A"});

    list.touch(make_update("B"));
    assert_order(list, {"B"});

    list.touch(make_update("A"));
    assert_order(list, {"A"});
}

void test_touch_head_middle_tail() {
    RecentList list(3);

    list.touch(make_update("A"));
    list.touch(make_update("B"));
    list.touch(make_update("C"));

    assert_order(list, {"C", "B", "A"});

    list.touch(make_update("C"));
    assert_order(list, {"C", "B", "A"});

    list.touch(make_update("B", -2, 98, "2"));
    assert_order(list, {"B", "C", "A"});

    list.touch(make_update("A", -3, 97, "3"));
    assert_order(list, {"A", "B", "C"});
}

void test_update_payload_without_duplicate() {
    RecentList list(3);

    list.touch(make_update("A", 5, 105, "1"));
    list.touch(make_update("B", 2, 102, "2"));
    list.touch(make_update("A", -3, 102, "3"));

    assert(list.size() == 2);

    const auto snapshot = list.snapshot();

    assert(snapshot.size() == 2);
    assert(snapshot[0].sku == "A");
    assert(snapshot[0].delta == -3);
    assert(snapshot[0].stock_after == 102);
    assert(snapshot[0].updated_at == "3");
}

void test_multiple_evictions() {
    RecentList list(2);
    list.touch(make_update("A"));
    list.touch(make_update("B"));
    list.touch(make_update("C"));

    assert_order(list, {"C", "B"});

    list.touch(make_update("D"));
    
    assert_order(list, {"D", "C"});
    assert(list.size() == 2);
}

void test_touch_evicted_sku() {
    RecentList list(2);

    list.touch(make_update("A"));
    list.touch(make_update("B"));
    list.touch(make_update("C"));
    list.touch(make_update("A", -1, 99, "4"));

    assert_order(list, {"A", "C"});
    assert(list.size() == 2);
}

void test_snapshot_twice() {
    RecentList list(3);

    list.touch(make_update("A"));
    list.touch(make_update("B"));
    list.touch(make_update("C"));

    const auto first = list.snapshot();
    const auto second = list.snapshot();

    assert(first.size() == second.size());

    for (std::size_t i = 0; i < first.size(); ++i) {
        assert(first[i].sku == second[i].sku);
        assert(first[i].delta == second[i].delta);
        assert(first[i].stock_after == second[i].stock_after);
    }
    assert(list.size() == 3);
}

void test_repeated_operations() {
    RecentList list(3);

    for (int i = 0; i < 10000; ++i) {
        const std::string sku =
            "SKU-" + std::to_string(i % 10);
        list.touch(
            make_update(
                sku,
                -1,
                100 - i,
                std::to_string(i)
            )
        );

        assert(list.size() <= 3);
    }

    const auto snapshot = list.snapshot();

    for (std::size_t i = 0; i < snapshot.size(); ++i) {
        for (std::size_t j = i + 1; j < snapshot.size(); ++j) {
            assert(snapshot[i].sku != snapshot[j].sku);
        }
    }
}

int main() {
    std::cout << "Test 1: Danh sách rỗng... ";
    test_empty();
    std::cout << "ĐẠT\n";

    std::cout << "Test 2: Capacity 0... ";
    test_capacity_zero();
    std::cout << "ĐẠT\n";

    std::cout << "Test 3: Capacity 1... ";
    test_capacity_one();
    std::cout << "ĐẠT\n";

    std::cout << "Test 4: Chạm các Node head/middle/tail... ";
    test_touch_head_middle_tail();
    std::cout << "ĐẠT\n";

    std::cout << "Test 5: Cập nhật không nhân đôi SKU... ";
    test_update_payload_without_duplicate();
    std::cout << "ĐẠT\n";

    std::cout << "Test 6: Loại bỏ nhiều lần... ";
    test_multiple_evictions();
    std::cout << "ĐẠT\n";

    std::cout << "Test 7: Chạm lại các SKU đã bị loại... ";
    test_touch_evicted_sku();
    std::cout << "ĐẠT\n";

    std::cout << "Test 8: Gọi Snapshot hai lần... ";
    test_snapshot_twice();
    std::cout << "ĐẠT\n";

    std::cout << "Test 9: Thao tác thêm/xóa lặp lại nhiều lần... ";
    test_repeated_operations();
    std::cout << "ĐẠT\n";

    std::cout << "\n Tất cả ca kiểm thử RecentList đều đạt.\n";

    return 0;
}