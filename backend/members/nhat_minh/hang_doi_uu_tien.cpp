#ifndef DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP
#define DSA_MEMBERS_NHAT_MINH_HANG_DOI_UU_TIEN_CPP

#include "shared/kieu_du_lieu.cpp"
#include <optional>
#include <vector>
#include <utility>

namespace dsa::nhat_minh {

class PriorityQueue {
    std::vector<Order> data_;

    static bool is_higher(const Order& a, const Order& b) noexcept {
        return a.priority != b.priority ? a.priority > b.priority : a.sequence_number < b.sequence_number;
    }

    void sift_up(std::size_t i) {
        while (i > 0) {
            std::size_t p = (i - 1) / 2;
            if (!is_higher(data_[i], data_[p])) break;
            std::swap(data_[i], data_[p]);
            i = p;
        }
    }

    void sift_down(std::size_t i) {
        for (std::size_t n = data_.size();;) {
            std::size_t best = i, l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && is_higher(data_[l], data_[best])) best = l;
            if (r < n && is_higher(data_[r], data_[best])) best = r;
            if (best == i) break;
            std::swap(data_[i], data_[best]);
            i = best;
        }
    }

public:
    void push(const Order& order) {
        data_.push_back(order);
        sift_up(data_.size() - 1);
    }

    std::optional<Order> peek() const {
        return data_.empty() ? std::nullopt : std::make_optional(data_[0]);
    }

    std::optional<Order> pop() {
        if (data_.empty()) return std::nullopt;
        Order top = std::move(data_[0]);
        data_[0] = std::move(data_.back());
        data_.pop_back();
        if (!data_.empty()) sift_down(0);
        return top;
    }

    std::size_t size() const { return data_.size(); }
    bool empty() const { return data_.empty(); }
    std::vector<Order> snapshot() const { return data_; }
    void clear() { data_.clear(); }
};

} // namespace dsa::nhat_minh

#endif
