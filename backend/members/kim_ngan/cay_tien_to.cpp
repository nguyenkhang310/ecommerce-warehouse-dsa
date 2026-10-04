#ifndef DSA_MEMBERS_KIM_NGAN_CAY_TIEN_TO_CPP
#define DSA_MEMBERS_KIM_NGAN_CAY_TIEN_TO_CPP

#include <algorithm>
#include <memory>
#include <stdexcept>
#include <string>
#include <unordered_map>
#include <unordered_set>
#include <vector>
#include <utility>

namespace dsa::kim_ngan {

class Trie {
public:
    Trie();
    ~Trie();

    Trie(const Trie&) = delete;
    Trie& operator=(const Trie&) = delete;
    Trie(Trie&&) noexcept = default;
    Trie& operator=(Trie&&) noexcept = default;

    void insert(const std::string& term, const std::string& sku);
    void erase(const std::string& term, const std::string& sku);
    std::vector<std::string> search_prefix(const std::string& prefix) const;
    std::vector<std::pair<std::string, bool>> prefix_path(const std::string& prefix) const;

private:
    struct Node {
        std::unordered_map<unsigned char, std::unique_ptr<Node>> children;
        std::unordered_set<std::string> skus;
    };

    static bool erase_from(Node& node, const std::string& term,
                           std::size_t position, const std::string& sku);
    static void collect_skus(const Node& node,
                             std::unordered_set<std::string>& result);

    std::unique_ptr<Node> root_;
};

} // namespace dsa::kim_ngan

namespace dsa::kim_ngan {

Trie::Trie() : root_(std::make_unique<Node>()) {}

Trie::~Trie() = default;

void Trie::insert(const std::string& term, const std::string& sku) {
    if (term.empty() || sku.empty()) {
        throw std::invalid_argument("term và sku không được rỗng");
    }
    if (term.size() > 512) throw std::invalid_argument("term không được dài quá 512 byte UTF-8");

    Node* current = root_.get();
    for (const unsigned char character : term) {
        auto& child = current->children[character];
        if (!child) child = std::make_unique<Node>();
        current = child.get();
    }
    current->skus.insert(sku);
}

void Trie::erase(const std::string& term, const std::string& sku) {
    if (term.empty() || sku.empty()) return;
    erase_from(*root_, term, 0, sku);
}

std::vector<std::string> Trie::search_prefix(const std::string& prefix) const {
    if (prefix.empty()) return {};

    const Node* current = root_.get();
    for (const unsigned char character : prefix) {
        const auto child = current->children.find(character);
        if (child == current->children.end()) return {};
        current = child->second.get();
    }

    std::unordered_set<std::string> unique_skus;
    collect_skus(*current, unique_skus);
    std::vector<std::string> matches(unique_skus.begin(), unique_skus.end());
    std::sort(matches.begin(), matches.end());
    return matches;
}

std::vector<std::pair<std::string, bool>> Trie::prefix_path(const std::string& prefix) const {
    std::vector<std::pair<std::string, bool>> result;
    const Node* current = root_.get();
    std::string character;
    for (std::size_t i = 0; i < prefix.size(); ++i) {
        const auto child = current->children.find(static_cast<unsigned char>(prefix[i]));
        if (child == current->children.end()) break;
        current = child->second.get();
        character += prefix[i];
        // Trie dùng byte; giao diện gom đủ một ký tự UTF-8 trước khi xuất JSON.
        if (i + 1 == prefix.size() || (static_cast<unsigned char>(prefix[i + 1]) & 0xc0) != 0x80) {
            result.push_back({character, !current->skus.empty()});
            character.clear();
        }
    }
    return result;
}

bool Trie::erase_from(Node& node, const std::string& term,
                      std::size_t position, const std::string& sku) {
    if (position == term.size()) {
        if (node.skus.erase(sku) == 0) return false;
    } else {
        const auto child = node.children.find(static_cast<unsigned char>(term[position]));
        if (child == node.children.end()) return false;
        if (erase_from(*child->second, term, position + 1, sku)) {
            node.children.erase(child);
        }
    }
    return node.skus.empty() && node.children.empty();
}

void Trie::collect_skus(const Node& node,
                        std::unordered_set<std::string>& result) {
    result.insert(node.skus.begin(), node.skus.end());
    for (const auto& [character, child] : node.children) {
        (void)character;
        collect_skus(*child, result);
    }
}

} // namespace dsa::kim_ngan

#endif
