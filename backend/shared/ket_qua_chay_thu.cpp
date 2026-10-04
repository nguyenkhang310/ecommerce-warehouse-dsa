#ifndef DSA_SHARED_KET_QUA_CHAY_THU_CPP
#define DSA_SHARED_KET_QUA_CHAY_THU_CPP

#include <json.hpp>
#include <exception>
#include <stdexcept>
#include <string>

namespace dsa {

using Json = nlohmann::json;
// Hàm demo của mỗi thành viên: nhận JSON đầu vào, trả JSON kết quả.
using DemoHandler = Json (*)(const Json&);

struct DemoResult {
    int status;
    Json body;
};

inline DemoResult demo_error(int status, const std::string& code,
                             const std::string& message, const std::string& member = "") {
    return {status, {{"ok", false}, {"member", member},
                     {"error", {{"code", code}, {"message", message}}}}};
}

inline DemoResult execute_demo(const std::string& member, const Json& input, DemoHandler handler) {
    try {
        if (!input.is_object()) {
            throw std::invalid_argument("Đầu vào phải là một đối tượng JSON.");
        }
        return {200, {{"ok", true}, {"member", member}, {"result", handler(input)}}};
    } catch (const Json::exception& error) {
        return demo_error(400, "INVALID_INPUT", error.what(), member);
    } catch (const std::invalid_argument& error) {
        return demo_error(400, "INVALID_INPUT", error.what(), member);
    } catch (const std::exception& error) {
        return demo_error(500, "DEMO_ERROR", error.what(), member);
    }
}

} // namespace dsa

#endif
