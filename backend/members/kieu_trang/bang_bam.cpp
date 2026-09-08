#ifndef DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP
#define DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP

#include "shared/bao_loi.cpp"
#include <cstddef>
#include <string>
#include <vector>

namespace dsa::kieu_trang {

// MC1: dùng template cho Product, Order và chỉ mục SKU đến nút của TP3.
// Kế hoạch cho phép std::unordered_map; tự cài nếu giảng viên yêu cầu.
template <typename Value>
class HashTable {
public:
    void upsert(const std::string& /*key*/, const Value& /*value*/) {
        todo("kieu_trang", "HashTable::upsert");
    }
    Value* find(const std::string& /*key*/) {
        todo("kieu_trang", "HashTable::find");
    }
    const Value* find(const std::string& /*key*/) const {
        todo("kieu_trang", "HashTable::find const");
    }
    bool erase(const std::string& /*key*/) {
        todo("kieu_trang", "HashTable::erase");
    }
    std::size_t size() const { todo("kieu_trang", "HashTable::size"); }
    std::vector<Value> values() const { todo("kieu_trang", "HashTable::values"); }

private:
    // TODO: thêm vùng lưu trữ; ghi rõ hiệu lực con trỏ sau thêm, xóa hoặc băm lại.
};

} // namespace dsa::kieu_trang

#endif
