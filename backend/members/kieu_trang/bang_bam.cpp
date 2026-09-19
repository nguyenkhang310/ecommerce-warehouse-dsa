#ifndef DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP
#define DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP

#include <cstddef>
#include <string>
#include <unordered_map>
#include <vector>

namespace dsa::kieu_trang {

template <typename Value>
class HashTable {
public:
    void upsert(const std::string& key, const Value& value) {
        data_[key] = value;
    }
    Value* find(const std::string& key) {
        const auto it = data_.find(key);
        return it == data_.end() ? nullptr : &it->second;
    }
    const Value* find(const std::string& key) const {
        const auto it = data_.find(key);
        return it == data_.end() ? nullptr : &it->second;
    }
    bool erase(const std::string& key) {
        return data_.erase(key) > 0;
    }
    std::size_t size() const {
        return data_.size();
    }
    std::vector<Value> values() const {
        std::vector<Value> result;
        result.reserve(data_.size());
        for (const auto& pair : data_) {
            result.push_back(pair.second);
        }
        return result;
    }

private:
    std::unordered_map<std::string, Value> data_;
};

} // namespace dsa::kieu_trang

#endif
