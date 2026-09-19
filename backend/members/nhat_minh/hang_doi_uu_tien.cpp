#ifndef DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP
#define DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP

#include "shared/kieu_du_lieu.cpp"
#include <cstddef>
#include <optional>
#include <vector>
#include <utility>

namespace dsa::nhat_minh {

class PriorityQueue {
public:
    PriorityQueue() = default;
    ~PriorityQueue() = default;

    void push(const Order& order);
    std::optional<Order> peek() const;
    std::optional<Order> pop();
    std::size_t size() const;
    bool empty() const;
    std::vector<Order> snapshot() const;
    void clear();

private:
    std::vector<Order> heap_data_;

    static std::size_t get_parent_index(std::size_t child_index) noexcept {
        return (child_index - 1) / 2;
    }

    static std::size_t get_left_child_index(std::size_t parent_index) noexcept {
        return (parent_index << 1) + 1;
    }

    static std::size_t get_right_child_index(std::size_t parent_index) noexcept {
        return (parent_index << 1) + 2;
    }

    static bool compare_orders(const Order* first, const Order* second) noexcept {
        if (first->priority != second->priority) {
            return static_cast<int>(first->priority) > static_cast<int>(second->priority);
        }
        return first->sequence_number < second->sequence_number;
    }

    static void swap_nodes(Order* first_ptr, Order* second_ptr) noexcept {
        Order temp = std::move(*first_ptr);
        *first_ptr = std::move(*second_ptr);
        *second_ptr = std::move(temp);
    }

    void sift_up(std::size_t current_index);
    void sift_down(std::size_t current_index);
};

inline void PriorityQueue::push(const Order& order) {
    heap_data_.push_back(order);
    sift_up(heap_data_.size() - 1);
}

inline std::optional<Order> PriorityQueue::peek() const {
    if (heap_data_.empty()) {
        return std::nullopt;
    }
    return heap_data_[0];
}

inline std::optional<Order> PriorityQueue::pop() {
    if (heap_data_.empty()) {
        return std::nullopt;
    }

    Order top_order = std::move(heap_data_[0]);

    Order* root_ptr = &heap_data_[0];
    Order* last_ptr = &heap_data_[heap_data_.size() - 1];
    *root_ptr = std::move(*last_ptr);

    heap_data_.pop_back();

    if (!heap_data_.empty()) {
        sift_down(0);
    }

    return top_order;
}

inline std::size_t PriorityQueue::size() const {
    return heap_data_.size();
}

inline bool PriorityQueue::empty() const {
    return heap_data_.empty();
}

inline std::vector<Order> PriorityQueue::snapshot() const {
    return heap_data_;
}

inline void PriorityQueue::clear() {
    heap_data_.clear();
}

inline void PriorityQueue::sift_up(std::size_t current_index) {
    while (current_index > 0) {
        std::size_t parent_idx = get_parent_index(current_index);

        Order* current_node = &heap_data_[current_index];
        Order* parent_node = &heap_data_[parent_idx];

        if (compare_orders(current_node, parent_node)) {
            swap_nodes(current_node, parent_node);
            current_index = parent_idx;
        } else {
            break;
        }
    }
}

inline void PriorityQueue::sift_down(std::size_t current_index) {
    const std::size_t total_size = heap_data_.size();

    while (true) {
        std::size_t highest_priority_idx = current_index;
        std::size_t left_child_idx = get_left_child_index(current_index);
        std::size_t right_child_idx = get_right_child_index(current_index);

        if (left_child_idx < total_size) {
            const Order* left_ptr = &heap_data_[left_child_idx];
            const Order* highest_ptr = &heap_data_[highest_priority_idx];
            if (compare_orders(left_ptr, highest_ptr)) {
                highest_priority_idx = left_child_idx;
            }
        }

        if (right_child_idx < total_size) {
            const Order* right_ptr = &heap_data_[right_child_idx];
            const Order* highest_ptr = &heap_data_[highest_priority_idx];
            if (compare_orders(right_ptr, highest_ptr)) {
                highest_priority_idx = right_child_idx;
            }
        }

        if (highest_priority_idx != current_index) {
            swap_nodes(&heap_data_[current_index], &heap_data_[highest_priority_idx]);
            current_index = highest_priority_idx;
        } else {
            break;
        }
    }
}

} // namespace dsa::nhat_minh

#endif
