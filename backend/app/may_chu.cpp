#include <httplib.h>
#include "shared/ket_qua_chay_thu.cpp"
#include "members/nhat_minh/chay_thu.cpp"
#include "members/kim_ngan/chay_thu.cpp"
#include "members/kieu_trang/chay_thu.cpp"
#include "members/ngoc_tram/chay_thu.cpp"
#include "members/nguyen_khang/chay_thu.cpp"
#include "app/dich_vu.cpp"
#include <array>
#include <iostream>
#include <string>

namespace dsa {

struct Module {
    const char* id;
    const char* name;
    const char* student_id;
    const char* task;
    DemoHandler run;
};

inline const std::array<Module, 5> modules = {{
    {"nhat_minh", "Hồ Nhật Minh", "24133039", "Heap — MC2 + TP1", nhat_minh::run_demo},
    {"kim_ngan", "Dương Thị Kim Ngân", "24133040", "Trie — TP2", kim_ngan::run_demo},
    {"kieu_trang", "Nguyễn Thị Kiều Trang", "24133064", "Hash Table + lưu trữ — MC1", kieu_trang::run_demo},
    {"ngoc_tram", "Nguyễn Thị Ngọc Trâm", "24133066", "Recent List + kiểm thử — TP3", ngoc_tram::run_demo},
    {"nguyen_khang", "Bùi Nguyễn Nguyên Khang", "24133902", "Giải thuật + benchmark + frontend", nguyen_khang::run_demo},
}};

} // namespace dsa

namespace {

void send(httplib::Response& response, const dsa::DemoResult& result) {
    response.status = result.status;
    response.set_header("X-DSA-Runtime", "C++");
    response.set_content(result.body.dump(), "application/json; charset=utf-8");
}

} // namespace

int main(int argc, char** argv) {
    int port = 8080;
    try {
        if (argc > 2) throw std::invalid_argument("Quá nhiều tham số");
        if (argc == 2) {
            std::size_t consumed = 0;
            const std::string argument = argv[1];
            port = std::stoi(argument, &consumed);
            if (consumed != argument.size()) throw std::invalid_argument("Cổng không hợp lệ");
        }
        if (port < 1 || port > 65535) throw std::invalid_argument("Cổng không hợp lệ");
    } catch (const std::exception&) {
        std::cerr << "Cách dùng: may_chu [cong: 1..65535]\n";
        return 1;
    }

    httplib::Server server;
    dsa::WarehouseService warehouse;
    // Demo cục bộ, xử lý tuần tự để dễ gỡ lỗi.
    server.new_task_queue = [] { return new httplib::ThreadPool(1); };
    // Đóng kết nối rảnh để yêu cầu tiếp theo không phải chờ.
    server.set_keep_alive_max_count(1);
    server.set_payload_max_length(2 * 1024 * 1024);
    server.set_read_timeout(5, 0);

    server.Get("/api/health", [](const httplib::Request&, httplib::Response& response) {
        send(response, {200, {{"ok", true}, {"language", "C++"}, {"stage", "live"}}});
    });

    server.Post("/api/app", [&warehouse](const httplib::Request& request,
                                         httplib::Response& response) {
        try {
            const auto body = dsa::Json::parse(request.body, nullptr, false);
            if (body.is_discarded() || !body.is_object()
                || !body.contains("action") || !body["action"].is_string()) {
                throw std::invalid_argument("Yêu cầu phải có action");
            }
            const auto data = body.value("data", dsa::Json::object());
            send(response, {200, {{"ok", true},
                {"data", warehouse.run(body["action"].get<std::string>(), data)}}});
        } catch (const std::invalid_argument& error) {
            send(response, dsa::demo_error(400, "INVALID_INPUT", error.what()));
        } catch (const std::exception& error) {
            send(response, dsa::demo_error(500, "SERVER_ERROR", error.what()));
        }
    });

    server.Get("/api/modules", [](const httplib::Request&, httplib::Response& response) {
        auto entries = dsa::Json::array();
        for (const auto& module : dsa::modules) {
            entries.push_back({{"id", module.id}, {"name", module.name},
                {"studentId", module.student_id}, {"task", module.task},
                {"entry", std::string("backend/members/") + module.id + "/chay_thu.cpp"}});
        }
        send(response, {200, {{"ok", true}, {"modules", entries}}});
    });

    server.Post(R"(/api/demo/([a-z_]+))",
        [](const httplib::Request& request, httplib::Response& response) {
            const std::string member = request.matches[1];
            for (const auto& module : dsa::modules) {
                if (member != module.id) continue;
                const auto input = dsa::Json::parse(request.body, nullptr, false);
                if (input.is_discarded()) {
                    send(response, dsa::demo_error(400, "INVALID_JSON", "JSON không hợp lệ.", member));
                    return;
                }
                send(response, dsa::execute_demo(member, input, module.run));
                return;
            }
            send(response, dsa::demo_error(404, "UNKNOWN_MEMBER", "Không có thành viên này.", member));
        });

    server.set_error_handler([](const httplib::Request&, httplib::Response& response) {
        if (response.body.empty()) {
            send(response, dsa::demo_error(response.status, "HTTP_ERROR", "Yêu cầu HTTP không được xử lý."));
        }
    });

    std::cout << "DSA C++ server: http://127.0.0.1:" << port << "\n"
              << "Health: /api/health | Modules: /api/modules\n"
              << "Ctrl+C để dừng.\n" << std::flush;
    if (!server.listen("127.0.0.1", port)) {
        std::cerr << "Không mở được cổng " << port << ". Kiểm tra server đang chạy.\n";
        return 1;
    }
    return 0;
}
