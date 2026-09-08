#ifndef DSA_MEMBERS_NGOC_TRAM_DANH_SACH_GAN_DAY_CPP
#define DSA_MEMBERS_NGOC_TRAM_DANH_SACH_GAN_DAY_CPP

#include "shared/kieu_du_lieu.cpp"
#include <vector>

namespace dsa::ngoc_tram {

// TP3: danh sách liên kết đôi và bảng băm tìm vị trí theo SKU.
class RecentList {
public:
    explicit RecentList(std::size_t capacity = 6) : capacity_(capacity) {}
    void touch(const RecentUpdate& update);
    std::vector<RecentUpdate> snapshot() const;
    std::size_t size() const;
    std::size_t capacity() const { return capacity_; }

private:
    std::size_t capacity_;
    // TODO: đầu/cuối danh sách, các nút và bảng băm SKU đến vị trí nút.
    // Quản lý cấp phát/giải phóng bộ nhớ nếu dùng con trỏ.
};

} // namespace dsa::ngoc_tram

#include "shared/bao_loi.cpp"

namespace dsa::ngoc_tram {

void RecentList::touch(const RecentUpdate& /*update*/) { todo("ngoc_tram", "RecentList::touch"); }
std::vector<RecentUpdate> RecentList::snapshot() const { todo("ngoc_tram", "RecentList::snapshot"); }
std::size_t RecentList::size() const { todo("ngoc_tram", "RecentList::size"); }

} // namespace dsa::ngoc_tram

#endif
