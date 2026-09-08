#ifndef DSA_SHARED_KET_QUA_CHAY_THU_CPP
#define DSA_SHARED_KET_QUA_CHAY_THU_CPP

#include "bao_loi.cpp"
#include <json.hpp>
#include <exception>
#include <string>

namespace dsa {

using Json = nlohmann::json;
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
    if (!input.is_object()) {
        return demo_error(400, "INVALID_INPUT", "Đầu vào phải là một đối tượng JSON.", member);
    }
    try {
        return {200, {{"ok", true}, {"member", member}, {"result", handler(input)}}};
    } catch (const NotImplemented& error) {
        auto result = demo_error(501, "NOT_IMPLEMENTED", error.what(), member);
        result.body["error"]["owner"] = error.owner;
        result.body["error"]["task"] = error.task;
        return result;
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
