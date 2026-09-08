#ifndef DSA_SHARED_BAO_LOI_CPP
#define DSA_SHARED_BAO_LOI_CPP

#include <stdexcept>
#include <string>

namespace dsa {

// Gắn lỗi chưa triển khai với thành viên và hàm tương ứng.
class NotImplemented : public std::logic_error {
public:
    std::string owner;
    std::string task;

    NotImplemented(const std::string& member, const std::string& operation)
        : std::logic_error("Chưa triển khai: " + operation),
          owner(member), task(operation) {}
};

[[noreturn]] inline void todo(const std::string& owner, const std::string& task) {
    throw NotImplemented(owner, task);
}

} // namespace dsa

#endif
