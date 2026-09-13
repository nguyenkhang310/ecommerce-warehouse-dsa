#ifndef DSA_MEMBERS_KIM_NGAN_CHAY_THU_CPP
#define DSA_MEMBERS_KIM_NGAN_CHAY_THU_CPP

#include <json.hpp>
#include "cay_tien_to.cpp"
#include "shared/bao_loi.cpp"
#include <stdexcept>

namespace dsa::kim_ngan {

nlohmann::json run_demo(const nlohmann::json& du_lieu_vao) {
    if (!du_lieu_vao.contains("entries") || !du_lieu_vao["entries"].is_array()) {
        throw std::invalid_argument("entries phải là một mảng");
    }
    if (!du_lieu_vao.contains("prefix") || !du_lieu_vao["prefix"].is_string()) {
        throw std::invalid_argument("prefix phải là chuỗi");
    }

    Trie trie;
    for (const auto& entry : du_lieu_vao["entries"]) {
        if (!entry.is_object() || !entry.contains("term") || !entry.contains("sku") ||
            !entry["term"].is_string() || !entry["sku"].is_string()) {
            throw std::invalid_argument("mỗi entry cần term và sku là chuỗi");
        }
        trie.insert(entry["term"].get<std::string>(), entry["sku"].get<std::string>());
    }

    const std::string prefix = du_lieu_vao["prefix"].get<std::string>();
    const auto matches_before_erase = trie.search_prefix(prefix);
    trie.erase("samsung", "A");
    const auto matches_after_erase = trie.search_prefix(prefix);

    return {
        {"prefix", prefix},
        {"matchesBeforeErase", matches_before_erase},
        {"matchesAfterErase", matches_after_erase},
        {"erased", {{"term", "samsung"}, {"sku", "A"}}},
    };
}

} // namespace dsa::kim_ngan

#endif
