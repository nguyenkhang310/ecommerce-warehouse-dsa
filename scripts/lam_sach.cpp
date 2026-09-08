// Chuẩn hóa dữ liệu kho và đơn hàng từ CSV Kaggle.
#include <algorithm>
#include <array>
#include <charconv>
#include <filesystem>
#include <fstream>
#include <iomanip>
#include <iostream>
#include <map>
#include <set>
#include <sstream>
#include <tuple>
#include <vector>
using namespace std;
namespace fs = std::filesystem;
using Dong = vector<string>;

// Đọc CSV có dấu phẩy, ngoặc kép, xuống dòng trong ô và CRLF.
bool doc_csv(istream& f, Dong& cot) {
    cot.clear();
    string o;
    bool trong = false, dong_ngoac = false, co_du_lieu = false;
    char c;
    while (f.get(c)) {
        co_du_lieu = true;
        if (trong) {
            if (c != '"') o += c;
            else if (f.peek() == '"') { o += '"'; f.get(); }
            else { trong = false; dong_ngoac = true; }
        } else if (c == ',' || c == '\n' || c == '\r') {
            cot.push_back(o); o.clear(); dong_ngoac = false;
            if (c == ',') continue;
            if (c == '\r' && f.peek() == '\n') f.get();
            return true;
        } else if (c == '"' && o.empty() && !dong_ngoac) trong = true;
        else if (dong_ngoac || c == '"') throw runtime_error("CSV sai dấu ngoặc kép.");
        else o += c;
    }
    if (trong || f.bad()) throw runtime_error("CSV chưa đóng ngoặc hoặc lỗi đọc file.");
    if (co_du_lieu) cot.push_back(o);
    return co_du_lieu;
}

string gon(const string& s) {
    istringstream f(s);
    string kq, tu;
    while (f >> tu) { if (!kq.empty()) kq += ' '; kq += tu; }
    return kq;
}

bool so_nguyen(const string& s, int& n) {
    auto [cuoi, loi] = from_chars(s.data(), s.data() + s.size(), n);
    return loi == errc{} && cuoi == s.data() + s.size();
}

// Nguồn phiên bản 1 dùng YYYY-MM-DD HH:MM:SS.ffffff, không có múi giờ.
bool ngay_hop_le(string& s) {
    if (s.size() != 26) return false;
    for (size_t i = 0; i < s.size(); ++i) {
        if (i == 4 || i == 7) { if (s[i] != '-') return false; }
        else if (i == 10) { if (s[i] != ' ' && s[i] != 'T') return false; }
        else if (i == 13 || i == 16) { if (s[i] != ':') return false; }
        else if (i == 19) { if (s[i] != '.') return false; }
        else if (s[i] < '0' || s[i] > '9') return false;
    }
    int nam = stoi(s.substr(0, 4)), thang = stoi(s.substr(5, 2)), ngay = stoi(s.substr(8, 2));
    array<int, 12> so_ngay = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (nam % 400 == 0 || (nam % 4 == 0 && nam % 100 != 0)) so_ngay[1] = 29;
    if (nam < 1 || thang < 1 || thang > 12 || ngay < 1 || ngay > so_ngay[thang - 1] ||
        stoi(s.substr(11, 2)) > 23 || stoi(s.substr(14, 2)) > 59 || stoi(s.substr(17, 2)) > 59) return false;
    s[10] = 'T';
    return true;
}

void ghi(ostream& f, const Dong& cot) {
    for (size_t i = 0; i < cot.size(); ++i)
        f << quoted(cot[i], '"', '"') << (i + 1 == cot.size() ? '\n' : ',');
}

ofstream mo_file(const fs::path& tep, const Dong& tieu_de) {
    fs::create_directories(tep.parent_path());
    ofstream f;
    f.exceptions(ios::failbit | ios::badbit);
    f.open(tep, ios::binary);
    ghi(f, tieu_de);
    return f;
}

struct SanPham { string sku, ten, nhom, dau, cuoi, ma_goc; int ton; };
struct DonHang { string ma, ma_goc, ngay, uu_tien, trang_thai, tt_goc; size_t dong, sp; int sl; };

int main(int argc, char** argv) try {
    if (argc > 3) throw runtime_error("Cách dùng: lam_sach [nguon.csv] [thu_muc_ket_qua]");
    fs::path nguon = argc > 1 ? argv[1] : "backend/data/goc/nguon.csv";
    fs::path dich = argc > 2 ? argv[2] : "backend/data";
    ifstream f(nguon, ios::binary);
    if (!f) throw runtime_error("Không mở được nguồn. Chạy npm run data:setup để tải.");
    string bom(3, '\0');
    f.read(bom.data(), 3);
    if (bom != "\xEF\xBB\xBF") { f.clear(); f.seekg(0); }
    Dong tieu_de, cot;
    if (!doc_csv(f, tieu_de)) throw runtime_error("CSV rỗng.");
    Dong can = {"order_id", "order_date", "product_id", "product_name", "category",
                "stock_quantity", "quantity", "order_priority", "order_status"};
    vector<size_t> vi_tri;
    for (const auto& ten : can) {
        if (count(tieu_de.begin(), tieu_de.end(), ten) != 1) throw runtime_error("Thiếu/trùng cột: " + ten);
        vi_tri.push_back(find(tieu_de.begin(), tieu_de.end(), ten) - tieu_de.begin());
    }
    const map<string, string> uu_tien = {{"Low", "normal"}, {"Medium", "high"}, {"High", "urgent"}};
    const map<string, string> trang_thai = {{"Pending", "queued"}, {"Processing", "processing"},
        {"Completed", "completed"}, {"Cancelled", "cancelled"}, {"Returned", "returned"}};
    vector<SanPham> sp;
    vector<DonHang> don;
    map<tuple<string, string, string>, size_t> khoa_sp;
    set<string> ma_don;
    size_t dong = 0, loi = 0, lap_sp = 0, lap_don = 0;
    while (doc_csv(f, cot)) {
        ++dong;
        Dong r;
        if (cot.size() == tieu_de.size()) for (auto i : vi_tri) r.push_back(gon(cot[i]));
        int ton = 0, sl = 0;
        if (r.size() != can.size() || any_of(r.begin(), r.end(), [](const auto& s) { return s.empty(); }) ||
            !ngay_hop_le(r[1]) || !so_nguyen(r[5], ton) || ton < 0 || !so_nguyen(r[6], sl) || sl <= 0 ||
            !uu_tien.count(r[7]) || !trang_thai.count(r[8])) {
            if (++loi <= 3) cerr << "Bỏ bản ghi " << dong << ": thiếu/sai trường dữ liệu.\n";
            continue;
        }
        // Cùng mã, tên, nhóm mới là cùng sản phẩm. Hậu tố là bản ghi xuất hiện đầu tiên.
        auto [it, moi] = khoa_sp.emplace(make_tuple(r[2], r[3], r[4]), sp.size());
        if (moi) sp.push_back({r[2] + "-R" + to_string(dong), r[3], r[4], r[1], r[1], r[2], ton});
        else {
            ++lap_sp;
            auto& p = sp[it->second];
            p.dau = min(p.dau, r[1]);
            if (r[1] >= p.cuoi) { p.cuoi = r[1]; p.ton = ton; }
        }
        string ma = r[0];
        if (ma_don.count(ma)) { ++lap_don; ma += "-R" + to_string(dong); }
        if (!ma_don.insert(ma).second) throw runtime_error("Va chạm mã đơn; cần kiểm tra nguồn.");
        don.push_back({ma, r[0], r[1], uu_tien.at(r[7]), trang_thai.at(r[8]), r[8], dong, it->second, sl});
    }
    if (don.empty()) throw runtime_error("Không có bản ghi hợp lệ; chưa ghi dữ liệu đầu ra.");
    // Cấp sequence theo ngày tạo; cùng ngày thì giữ thứ tự bản ghi nguồn.
    sort(don.begin(), don.end(), [](const auto& a, const auto& b) { return tie(a.ngay, a.dong) < tie(b.ngay, b.dong); });
    const Dong cot_sp = {"id", "sku", "name", "category", "stock", "reorder_level", "created_at", "updated_at", "source_product_id"};
    const Dong cot_don = {"id", "order_code", "priority", "sequence_number", "status", "created_at", "sku", "quantity", "source_order_id", "source_status", "source_row"};
    auto sp_day_du = mo_file(dich / "day_du/san_pham.csv", cot_sp);
    auto don_day_du = mo_file(dich / "day_du/don_hang.csv", cot_don);
    auto sp_chinh = mo_file(dich / "data_chinh/san_pham.csv", cot_sp);
    auto don_chinh = mo_file(dich / "data_chinh/don_hang.csv", cot_don);
    vector<size_t> chon_sp;
    set<size_t> da_chon;
    size_t so_don_chinh = 0;
    for (size_t i = 0; i < don.size(); ++i) {
        const auto& d = don[i];
        Dong r = {d.ma, d.ma, d.uu_tien, to_string(i + 1), d.trang_thai, d.ngay,
            sp[d.sp].sku, to_string(d.sl), d.ma_goc, d.tt_goc, to_string(d.dong + 1)};
        ghi(don_day_du, r);
        if (d.trang_thai == "queued" && so_don_chinh < 10000) {
            ghi(don_chinh, r); ++so_don_chinh;
            if (da_chon.insert(d.sp).second) chon_sp.push_back(d.sp);
        }
    }
    // Xếp sản phẩm theo lần xuất hiện trong đơn mẫu: cắt 1.000 dòng vẫn đủ SKU.
    for (size_t i = 0; i < sp.size() && chon_sp.size() < 10000; ++i)
        if (da_chon.insert(i).second) chon_sp.push_back(i);
    auto dong_sp = [](const SanPham& p) -> Dong {
        return {p.sku, p.sku, p.ten, p.nhom, to_string(p.ton), "0", p.dau, p.cuoi, p.ma_goc};
    };
    for (const auto& p : sp) ghi(sp_day_du, dong_sp(p));
    for (auto i : chon_sp) ghi(sp_chinh, dong_sp(sp[i]));
    sp_day_du.close(); don_day_du.close(); sp_chinh.close(); don_chinh.close();
    auto bao_cao = mo_file(dich / "thong_ke.csv", {"chi_so", "so_luong"});
    for (const auto& [ten, n] : vector<pair<string, size_t>>{{"dong_nguon", dong}, {"dong_loi", loi},
         {"dong_sp_lap", lap_sp}, {"ma_don_duoc_phan_biet", lap_don}, {"san_pham_day_du", sp.size()},
         {"don_hang_day_du", don.size()}, {"san_pham_chinh", chon_sp.size()}, {"don_hang_chinh", so_don_chinh}}) {
        ghi(bao_cao, {ten, to_string(n)});
        cout << ten << ": " << n << '\n';
    }
    bao_cao.close();
    return 0;
} catch (const exception& e) {
    cerr << "Lỗi: " << e.what() << '\n';
    return 1;
}
