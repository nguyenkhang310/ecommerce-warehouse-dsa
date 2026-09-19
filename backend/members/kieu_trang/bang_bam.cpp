#ifndef DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP
#define DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP

#include <cstddef>
#include <cstdint>
#include <string>
#include <utility>
#include <vector>

namespace dsa::kieu_trang {

template <typename Value>
class HashTable {
public:
    explicit HashTable(std::size_t bucket_count = 64)
        : buckets_(bucket_count == 0 ? 1 : bucket_count) {}

    void upsert(const std::string& key, const Value& value) {
        auto& bucket = buckets_[bucket_index(key)];
        for (auto& entry : bucket) {
            if (entry.first == key) {
                entry.second = value;
                return;
            }
        }
        bucket.push_back({key, value});
        ++size_;
        if (load_factor() > 0.75) rehash(buckets_.size() * 2);
    }

    Value* find(const std::string& key) {
        auto& bucket = buckets_[bucket_index(key)];
        for (auto& entry : bucket) {
            if (entry.first == key) return &entry.second;
        }
        return nullptr;
    }

    const Value* find(const std::string& key) const {
        const auto& bucket = buckets_[bucket_index(key)];
        for (const auto& entry : bucket) {
            if (entry.first == key) return &entry.second;
        }
        return nullptr;
    }

    bool erase(const std::string& key) {
        auto& bucket = buckets_[bucket_index(key)];
        for (auto it = bucket.begin(); it != bucket.end(); ++it) {
            if (it->first == key) {
                bucket.erase(it);
                --size_;
                return true;
            }
        }
        return false;
    }

    std::size_t size() const { return size_; }
    std::size_t bucket_count() const { return buckets_.size(); }
    double load_factor() const {
        return static_cast<double>(size_) / static_cast<double>(buckets_.size());
    }

    std::uint64_t hash_value(const std::string& key) const {
        std::uint64_t hash = 5381;
        for (const unsigned char character : key) hash = hash * 33 + character;
        return hash;
    }

    std::size_t bucket_index(const std::string& key) const {
        return static_cast<std::size_t>(hash_value(key) % buckets_.size());
    }

    std::vector<Value> bucket_values(std::size_t index) const {
        std::vector<Value> result;
        if (index >= buckets_.size()) return result;
        for (const auto& entry : buckets_[index]) result.push_back(entry.second);
        return result;
    }

    std::vector<Value> values() const {
        std::vector<Value> result;
        result.reserve(size_);
        for (const auto& bucket : buckets_) {
            for (const auto& entry : bucket) result.push_back(entry.second);
        }
        return result;
    }

private:
    std::vector<std::vector<std::pair<std::string, Value>>> buckets_;
    std::size_t size_ = 0;

    void rehash(std::size_t new_count) {
        auto old_buckets = std::move(buckets_);
        buckets_.assign(new_count, {});
        size_ = 0;
        for (const auto& bucket : old_buckets) {
            for (const auto& entry : bucket) upsert(entry.first, entry.second);
        }
    }
};

} // namespace dsa::kieu_trang

#endif
