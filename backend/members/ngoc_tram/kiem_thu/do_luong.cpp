// Run: 
//   g++ -std=c++17 -O2 -I ../../ do_luong_ngoc_tram.cpp -o do_luong
//   ./do_luong

#include "../danh_sach_gan_day.cpp"
#include <algorithm>
#include <chrono>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>

using namespace dsa;
using namespace dsa::ngoc_tram;

class BaselineList {
public:
    explicit BaselineList(std::size_t capacity) : capacity_(capacity) {}

    void touch(const RecentUpdate& update) {
        auto it = std::find_if(items_.begin(), items_.end(),
                                [&](const RecentUpdate& u) { return u.sku == update.sku; });
        if (it != items_.end()) items_.erase(it);
        items_.insert(items_.begin(), update);
        if (items_.size() > capacity_) items_.pop_back();
    }

private:
    std::size_t capacity_;
    std::vector<RecentUpdate> items_;
};

RecentUpdate mk(const std::string& sku) {
    RecentUpdate u;
    u.sku = sku;
    return u;
}

template <typename Fn>
double do_thoi_gian_ms(Fn fn) {
    auto bat_dau = std::chrono::steady_clock::now();
    fn();
    auto ket_thuc = std::chrono::steady_clock::now();
    return std::chrono::duration<double, std::milli>(ket_thuc - bat_dau).count();
}

int main() {
    std::vector<std::size_t> cac_kich_thuoc = {100, 1000, 10000, 50000};

    std::cout << "so_luong_sku | touch RecentList (ms/lan) | touch Baseline (ms/lan)\n";
    std::cout << "-------------|---------------------------|-------------------------\n";
    std::cout << std::fixed << std::setprecision(6);

    for (std::size_t n : cac_kich_thuoc) {
        std::vector<std::string> skus;
        for (std::size_t i = 0; i < n; ++i) skus.push_back("SKU" + std::to_string(i));

        RecentList rl(n);
        BaselineList bl(n);
        for (const auto& sku : skus) { rl.touch(mk(sku)); bl.touch(mk(sku)); }

        double thoi_gian_rl = do_thoi_gian_ms([&] {
            for (const auto& sku : skus) rl.touch(mk(sku));
        }) / n; 

        std::size_t so_lan_bl = std::min(n, static_cast<std::size_t>(2000));
        double thoi_gian_bl = do_thoi_gian_ms([&] {
            for (std::size_t i = 0; i < so_lan_bl; ++i) bl.touch(mk(skus[i]));
        }) / so_lan_bl;

        std::cout << n << " | " << thoi_gian_rl << " | " << thoi_gian_bl << "\n";
    }

    return 0;
}