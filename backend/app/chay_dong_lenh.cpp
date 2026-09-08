#include "chay_thu.cpp" // Đường dẫn nạp file được chọn theo thành viên khi biên dịch.
#include "shared/ket_qua_chay_thu.cpp"
#include <fstream>
#include <iostream>
#include <string>

#define DSA_STRING_IMPL(value) #value
#define DSA_STRING(value) DSA_STRING_IMPL(value)

int main(int argc, char** argv) {
    if (argc > 2) {
        std::cerr << "Cách dùng: chay_thu_thanh_vien [du_lieu_mau.json]\n";
        return 1;
    }
    dsa::Json input = dsa::Json::object();
    if (argc == 2) {
        std::ifstream file(argv[1]);
        if (!file) {
            std::cerr << "Không mở được file: " << argv[1] << "\n";
            return 1;
        }
        input = dsa::Json::parse(file, nullptr, false);
        if (input.is_discarded()) {
            std::cerr << "JSON không hợp lệ.\n";
            return 1;
        }
    }
    const auto result = dsa::execute_demo(
        DSA_STRING(DSA_MEMBER), input, dsa::DSA_MEMBER::run_demo);
    std::cout << result.body.dump(2) << "\n";
    // 2 = chưa cài đặt; 1 = lỗi; 0 = chạy thử thành công.
    return result.status == 200 ? 0 : result.status == 501 ? 2 : 1;
}
