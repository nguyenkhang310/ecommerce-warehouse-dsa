#ifndef DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP
#define DSA_MEMBERS_KIEU_TRANG_BANG_BAM_CPP

#include "shared/bao_loi.cpp"
#include <cstddef>
#include <string>
#include <vector>
#include <unordered_map>

namespace dsa::kieu_trang {

template <typename Value>
class HashTable {
public:
    void upsert(const std::string& key, const Value& value) {
        data[key]=value;
    }
    Value* find(const std::string& key) {
        auto it=data.find(key);
        if(it==data.end()){
            return nullptr;
        }
        return &it->second;
    }
    const Value* find(const std::string& key) const {
        auto it=data.find(key);
        if(it==data.end()){
            return nullptr;
        }
        return &it->second;
    }
    bool erase(const std::string& key) {
        return data.erase(key)>0;
    }
    std::size_t size() const { 
        return data.size();
    }
    std::vector<Value> values() const { 
        std::vector<Value> result;
        for(const auto& pair:data){
            result.push_back(pair.second);
        }
        return result;
    }

private:
    std::unordered_map<std::string, Value> data;};

} // namespace dsa::kieu_trang

#endif
