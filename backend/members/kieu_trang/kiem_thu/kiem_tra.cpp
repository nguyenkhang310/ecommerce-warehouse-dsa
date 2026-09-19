#include "../bang_bam.cpp"
#include "../luu_tru.cpp"

#include <filesystem>
#include <iostream>
#include <stdexcept>
#include <string>

using namespace dsa;
using namespace dsa::kieu_trang;

void require(bool condition, const std::string& message) {
    if (!condition) throw std::runtime_error(message);
}

int main() {
    const std::filesystem::path folder =
        std::filesystem::temp_directory_path() / "dsa_kieu_trang_test";
    try {
        HashTable<Product> table;
        Product first_product;
        first_product.id = "1";
        first_product.sku = "SKU-A";
        first_product.name = "Tên cũ";
        table.upsert("SKU-A", first_product);
        first_product.name = "Tên mới";
        table.upsert("SKU-A", first_product);
        require(table.size() == 1, "Upsert cùng khóa không được tăng size");
        require(table.find("SKU-A")->name == "Tên mới", "Upsert chưa cập nhật value");
        require(table.find("KHONG_CO") == nullptr, "Find phải trả nullptr khi thiếu khóa");
        require(table.erase("SKU-A") && !table.erase("SKU-A"), "Erase trả kết quả sai");

        StorageData input;
        input.products.push_back(Product{"P1", "SKU-1", "Bàn phím", "Điện tử", 10, 2,
                                         "2026-01-01", "2026-01-02"});
        Order order;
        order.id = "O1";
        order.order_code = "O1";
        order.priority = Priority::high;
        order.sequence_number = 7;
        order.status = OrderStatus::queued;
        order.created_at = "2026-01-03";
        order.items.push_back(OrderItem{"P1", "SKU-1", "", 2});
        order.items.push_back(OrderItem{"P1", "SKU-1", "", 1});
        input.orders.push_back(order);

        std::filesystem::remove_all(folder);
        save_data(folder, input);
        const StorageData output = load_data(folder);
        require(output.products.size() == 1 && output.products[0].id == "P1",
                "Đọc lại sản phẩm không đúng");
        require(output.orders.size() == 1 && output.orders[0].items.size() == 2,
                "Đọc lại đơn nhiều sản phẩm không đúng");
        require(output.orders[0].sequence_number == 7, "Không giữ sequence_number");

        std::filesystem::remove_all(folder);
        std::cout << "ĐẠT: Hash Table và đọc/ghi CSV\n";
        return 0;
    } catch (const std::exception& error) {
        std::filesystem::remove_all(folder);
        std::cerr << "CHƯA ĐẠT: " << error.what() << '\n';
        return 1;
    }
}
