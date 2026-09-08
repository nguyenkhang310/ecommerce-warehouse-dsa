#ifndef DSA_MEMBERS_KIEU_TRANG_LUU_TRU_CPP
#define DSA_MEMBERS_KIEU_TRANG_LUU_TRU_CPP

#include "shared/kieu_du_lieu.cpp"
#include <filesystem>

namespace dsa::kieu_trang {

// path là thư mục chứa san_pham.csv và don_hang.csv (backend/data/data_chinh hoặc day_du).
// Schema và cách ghép OrderItem được ghi tại backend/data/huong_dan.md.
// Lưu trữ chỉ đọc/ghi bản ghi, không tìm SKU, sắp xếp hay chọn đơn ưu tiên.
StorageData load_data(const std::filesystem::path& path);
void save_data(const std::filesystem::path& path, const StorageData& data);

} // namespace dsa::kieu_trang

#include "shared/bao_loi.cpp"

namespace dsa::kieu_trang {

StorageData load_data(const std::filesystem::path& /*path*/) {
    todo("kieu_trang", "load_data CSV/JSON");
}
void save_data(const std::filesystem::path& /*path*/, const StorageData& /*data*/) {
    todo("kieu_trang", "save_data CSV/JSON");
}

} // namespace dsa::kieu_trang

#endif
