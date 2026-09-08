#ifndef DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP
#define DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP

#include "shared/kieu_du_lieu.cpp"
#include <optional>
#include <vector>

namespace dsa::nhat_minh {

// MC2 + TP1: tự cài Heap, không dùng std::priority_queue hoặc make_heap.
class PriorityQueue {
public:
    void push(const Order& order);
    std::optional<Order> peek() const;
    std::optional<Order> pop();
    std::size_t size() const;
    std::vector<Order> snapshot() const;

private:
    // TODO: thêm mảng lưu Heap, hàm đẩy lên, đẩy xuống và so sánh.
    // Khóa: priority giảm dần, sequence_number tăng dần.
};

} // namespace dsa::nhat_minh

#include "shared/bao_loi.cpp"

namespace dsa::nhat_minh {

void PriorityQueue::push(const Order& /*order*/) { todo("nhat_minh", "PriorityQueue::push"); }
std::optional<Order> PriorityQueue::peek() const { todo("nhat_minh", "PriorityQueue::peek"); }
std::optional<Order> PriorityQueue::pop() { todo("nhat_minh", "PriorityQueue::pop"); }
std::size_t PriorityQueue::size() const { todo("nhat_minh", "PriorityQueue::size"); }
std::vector<Order> PriorityQueue::snapshot() const { todo("nhat_minh", "PriorityQueue::snapshot"); }

} // namespace dsa::nhat_minh

#endif
