#include "../cay_tien_to.cpp"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

using namespace dsa::kim_ngan;

void require(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

int main() {
    try {
        Trie trie;
        require(trie.search_prefix("sa").empty(), "Cây rỗng phải trả kết quả rỗng");

        trie.insert("sam", "A");
        trie.insert("samsung", "B");
        trie.insert("samsung", "C");
        trie.insert("samsung", "C");
        require(trie.search_prefix("sam") == std::vector<std::string>({"A", "B", "C"}),
                "Tìm tiền tố hoặc loại trùng bị sai");

        trie.erase("sam", "A");
        require(trie.search_prefix("sam") == std::vector<std::string>({"B", "C"}),
                "Xóa từ ngắn đã làm mất nhánh dùng chung");

        trie.erase("samsung", "B");
        require(trie.search_prefix("samsung") == std::vector<std::string>({"C"}),
                "Xóa một SKU đã làm mất SKU còn lại");
        require(trie.search_prefix("khong-co").empty(), "Tiền tố không có phải trả rỗng");
        require(trie.search_prefix("").empty(), "Tiền tố rỗng phải trả rỗng");

        bool rejected = false;
        try {
            trie.insert("", "A");
        } catch (const std::invalid_argument&) {
            rejected = true;
        }
        require(rejected, "Term rỗng phải báo lỗi");

        std::cout << "ĐẠT: Trie thêm, tìm tiền tố, loại trùng và xóa\n";
        return 0;
    } catch (const std::exception& error) {
        std::cerr << "CHƯA ĐẠT: " << error.what() << '\n';
        return 1;
    }
}
