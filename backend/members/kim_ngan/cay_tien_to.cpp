#ifndef DSA_MEMBERS_KIM_NGAN_CAY_TIEN_TO_CPP
#define DSA_MEMBERS_KIM_NGAN_CAY_TIEN_TO_CPP

#include <string>
#include <vector>

namespace dsa::kim_ngan {

// TP2: tự cài nút và đường đi theo ký tự.
class Trie {
public:
    void insert(const std::string& term, const std::string& sku);
    void erase(const std::string& term, const std::string& sku);
    std::vector<std::string> search_prefix(const std::string& prefix) const;

private:
    // TODO: nút gốc, nút con, danh sách SKU tại nút kết thúc.
    // Thống nhất UTF-8 và hoa/thường trước khi lập chỉ mục tên tiếng Việt.
};

} // namespace dsa::kim_ngan

#include "shared/bao_loi.cpp"

namespace dsa::kim_ngan {

void Trie::insert(const std::string& /*term*/, const std::string& /*sku*/) {
    todo("kim_ngan", "Trie::insert");
}
void Trie::erase(const std::string& /*term*/, const std::string& /*sku*/) {
    todo("kim_ngan", "Trie::erase");
}
std::vector<std::string> Trie::search_prefix(const std::string& /*prefix*/) const {
    todo("kim_ngan", "Trie::search_prefix");
}

} // namespace dsa::kim_ngan

#endif
