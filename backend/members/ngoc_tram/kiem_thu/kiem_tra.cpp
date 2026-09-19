#include "../danh_sach_gan_day.cpp"

#include <iostream>
#include <stdexcept>
#include <string>
#include <vector>

namespace {

using dsa::RecentUpdate;
using dsa::ngoc_tram::RecentList;

RecentUpdate tao_cap_nhat(const std::string& sku, int delta, int ton_kho) {
    RecentUpdate update;
    update.sku = sku;
    update.delta = delta;
    update.stock_after = ton_kho;
    return update;
}

void kiem_tra(bool dieu_kien, const std::string& thong_bao) {
    if (!dieu_kien) {
        throw std::runtime_error(thong_bao);
    }
}

} // namespace

int main() {
    try {
        RecentList rong(0);
        rong.touch(tao_cap_nhat("A", 1, 10));
        kiem_tra(rong.size() == 0, "capacity 0 phải luôn rỗng");

        RecentList danh_sach(3);
        danh_sach.touch(tao_cap_nhat("A", 1, 11));
        danh_sach.touch(tao_cap_nhat("B", 2, 12));
        danh_sach.touch(tao_cap_nhat("C", 3, 13));
        danh_sach.touch(tao_cap_nhat("B", -1, 11));
        danh_sach.touch(tao_cap_nhat("D", 4, 14));

        const auto ket_qua = danh_sach.snapshot();
        kiem_tra(ket_qua.size() == 3, "kích thước phải bằng 3");
        kiem_tra(ket_qua[0].sku == "D" && ket_qua[1].sku == "B"
            && ket_qua[2].sku == "C", "thứ tự phải là D, B, C");
        kiem_tra(ket_qua[1].delta == -1 && ket_qua[1].stock_after == 11,
            "B phải giữ dữ liệu cập nhật mới nhất");

        RecentList ban_sao = danh_sach;
        ban_sao.touch(tao_cap_nhat("E", 1, 15));
        kiem_tra(danh_sach.snapshot()[0].sku == "D", "bản sao không được đổi bản gốc");

        bool da_bao_loi = false;
        try {
            danh_sach.touch(tao_cap_nhat("", 1, 10));
        }
        catch (const std::invalid_argument&) {
            da_bao_loi = true;
        }
        kiem_tra(da_bao_loi, "SKU rỗng phải báo lỗi");

        std::cout << "ĐẠT: kiểm thử RecentList\n";
        return 0;
    }
    catch (const std::exception& error) {
        std::cerr << "CHƯA ĐẠT: " << error.what() << '\n';
        return 1;
    }
}
