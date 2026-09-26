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
#ifdef _WIN32
#include <windows.h>
#endif

namespace dsa {

struct Module {
    const char* id;
    const char* name;
    const char* student_id;
    const char* task;
    DemoHandler demo;
};

const std::array<Module, 5> modules = {{
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

int read_port(int argc, char** argv) {
    if (argc > 2) throw std::invalid_argument("quá nhiều tham số");
    if (argc == 1) return 8080;
    std::size_t read = 0;
    const int port = std::stoi(argv[1], &read);
    if (read != std::string(argv[1]).size() || port < 1 || port > 65535)
        throw std::invalid_argument("cổng không hợp lệ");
    return port;
}

} // namespace

int main(int argc, char** argv) {
#ifdef _WIN32
    SetConsoleOutputCP(CP_UTF8);
#endif
    int port;
    try { port = read_port(argc, argv); }
    catch (...) {
        std::cerr << "Cách dùng: may_chu [cong: 1..65535]\n";
        return 1;
    }

    httplib::Server server;
    dsa::WarehouseService warehouse;
    server.new_task_queue = [] { return new httplib::ThreadPool(1); };
    server.set_payload_max_length(2 * 1024 * 1024);
    server.set_read_timeout(5, 0);

    server.Get("/api/health", [](const httplib::Request&, httplib::Response& response) {
        send(response, {200, {{"ok", true}, {"language", "C++"}, {"stage", "live"}}});
    });

    server.Post("/api/app", [&warehouse](const httplib::Request& request, httplib::Response& response) {
        try {
            const auto body = dsa::Json::parse(request.body, nullptr, false);
            if (body.is_discarded() || !body.is_object() || !body.contains("action")
                || !body["action"].is_string() || body["action"].empty())
                throw std::invalid_argument("Yêu cầu phải có action");
            const auto data = body.value("data", dsa::Json::object());
            const std::string action = body["action"].get<std::string>();
            send(response, {200, {{"ok", true}, {"data", warehouse.run(action, data)}}});
        } catch (const std::invalid_argument& error) {
            send(response, dsa::demo_error(400, "INVALID_INPUT", error.what()));
        } catch (const std::exception& error) {
            send(response, dsa::demo_error(500, "SERVER_ERROR", error.what()));
        }
    });

    server.Get("/api/modules", [](const httplib::Request&, httplib::Response& response) {
        dsa::Json list = dsa::Json::array();
        for (const auto& m : dsa::modules)
            list.push_back({{"id", m.id}, {"name", m.name}, {"studentId", m.student_id},
                            {"task", m.task}, {"entry", std::string("backend/members/") + m.id + "/chay_thu.cpp"}});
        send(response, {200, {{"ok", true}, {"modules", list}}});
    });

    server.Post(R"(/api/demo/([a-z_]+))", [](const httplib::Request& request, httplib::Response& response) {
        const std::string id = request.matches[1];
        for (const auto& m : dsa::modules) {
            if (id != m.id) continue;
            const auto input = dsa::Json::parse(request.body, nullptr, false);
            if (input.is_discarded()) send(response, dsa::demo_error(400, "INVALID_JSON", "JSON không hợp lệ.", id));
            else send(response, dsa::execute_demo(id, input, m.demo));
            return;
        }
        send(response, dsa::demo_error(404, "UNKNOWN_MEMBER", "Không có thành viên này.", id));
    });

    server.set_error_handler([](const httplib::Request&, httplib::Response& response) {
        if (response.body.empty()) send(response, dsa::demo_error(response.status, "HTTP_ERROR", "Đường dẫn không tồn tại."));
    });

    std::cout << "Backend C++: http://127.0.0.1:" << port << "\nCtrl+C để dừng.\n" << std::flush;
    if (server.listen("127.0.0.1", port)) return 0;
    std::cerr << "Không mở được cổng " << port << ".\n";
    return 1;
}
