#include "../hang_doi_uu_tien.cpp"
#include <cassert>
#include <iostream>
#include <vector>
#include <string>

using namespace dsa;
using namespace dsa::nhat_minh;

static void test_empty_and_single_element() {
    PriorityQueue pq;

    assert(pq.empty() == true);
    assert(pq.size() == 0);
    assert(pq.peek().has_value() == false);
    assert(pq.pop().has_value() == false);

    Order single_order;
    single_order.id = "ORD-1";
    single_order.priority = Priority::high;
    single_order.sequence_number = 100;

    pq.push(single_order);
    assert(pq.empty() == false);
    assert(pq.size() == 1);

    auto peek_res = pq.peek();
    assert(peek_res.has_value() && peek_res->id == "ORD-1");

    auto pop_res = pq.pop();
    assert(pop_res.has_value() && pop_res->id == "ORD-1");
    assert(pq.empty() == true);
    assert(pq.size() == 0);
}

static void test_priority_ordering() {
    PriorityQueue pq;

    pq.push({"A", "A", Priority::high, 2, {}, OrderStatus::queued, "", ""});
    pq.push({"B", "B", Priority::urgent, 5, {}, OrderStatus::queued, "", ""});
    pq.push({"C", "C", Priority::urgent, 1, {}, OrderStatus::queued, "", ""});
    pq.push({"D", "D", Priority::normal, 3, {}, OrderStatus::queued, "", ""});

    std::vector<std::string> expected = {"C", "B", "A", "D"};
    std::vector<std::string> actual;

    while (!pq.empty()) {
        actual.push_back(pq.pop()->id);
    }

    assert(actual == expected);
}

static void test_same_priority_fifo() {
    PriorityQueue pq;

    pq.push({"ORD-S3", "CODE", Priority::high, 3, {}, OrderStatus::queued, "", ""});
    pq.push({"ORD-S1", "CODE", Priority::high, 1, {}, OrderStatus::queued, "", ""});
    pq.push({"ORD-S2", "CODE", Priority::high, 2, {}, OrderStatus::queued, "", ""});

    assert(pq.pop()->id == "ORD-S1");
    assert(pq.pop()->id == "ORD-S2");
    assert(pq.pop()->id == "ORD-S3");
}

static void test_interleaved_push_pop() {
    PriorityQueue pq;

    pq.push({"O1", "O1", Priority::normal, 1, {}, OrderStatus::queued, "", ""});
    pq.push({"O2", "O2", Priority::urgent, 2, {}, OrderStatus::queued, "", ""});

    assert(pq.pop()->id == "O2");

    pq.push({"O3", "O3", Priority::high, 3, {}, OrderStatus::queued, "", ""});
    
    assert(pq.pop()->id == "O3");
    assert(pq.pop()->id == "O1");
    assert(pq.empty());
}

static void test_snapshot() {
    PriorityQueue pq;

    pq.push({"X", "X", Priority::urgent, 10, {}, OrderStatus::queued, "", ""});
    pq.push({"Y", "Y", Priority::high, 20, {}, OrderStatus::queued, "", ""});

    auto snap = pq.snapshot();
    assert(snap.size() == 2);
    assert(pq.size() == 2);
}

int main() {
    test_empty_and_single_element();
    test_priority_ordering();
    test_same_priority_fifo();
    test_interleaved_push_pop();
    test_snapshot();

    std::cout << "All unit tests passed successfully.\n";
    return 0;
}
