#ifndef DSA_MEMBERS_KIEU_TRANG_LUU_TRU_CPP
#define DSA_MEMBERS_KIEU_TRANG_LUU_TRU_CPP

#include "shared/kieu_du_lieu.cpp"
#include <filesystem>
#include <stdexcept>
#include <fstream>
#include <iomanip>
#include <unordered_map>
#include <utility>

namespace dsa::kieu_trang {

StorageData load_data(const std::filesystem::path& path);
void save_data(const std::filesystem::path& path, const StorageData& data);
} // namespace dsa::kieu_trang

namespace dsa::kieu_trang {

using CsvRow = std::vector<std::string>;

bool doc_csv(std::istream& f, CsvRow& columns) {
    columns.clear();
    std::string field;
    bool in_quotes = false;
    bool closed_quote = false;
    bool has_data = false;
    char c;
    while (f.get(c)) {
        has_data = true;
        if (in_quotes) {
            if (c != '"') {
                field += c;
            }
            else if (f.peek() == '"') {
                field += '"';
                f.get();
            }
            else {
                in_quotes = false;
                closed_quote = true;
            }
        }
        else if (c == ',' || c == '\n' || c == '\r') {
            columns.push_back(field);
            field.clear();
            closed_quote = false;
            if (c == ',') {
                continue;
            }
            if (c == '\r' && f.peek() == '\n') {
                f.get();
            }
            return true;
        }
        else if (c == '"' && field.empty() && !closed_quote) {
            in_quotes = true;
        }
        else if (closed_quote || c == '"') {
            throw std::runtime_error("CSV sai dấu ngoặc kép.");
        }
        else {
            field += c;
        }
    }
    if (in_quotes || f.bad()) {
        throw std::runtime_error("CSV chưa đóng ngoặc hoặc lỗi đọc file.");
    }
    if (has_data) {
        columns.push_back(field);
    }
    return has_data;
}

void ghi_csv(std::ostream& f, const CsvRow& columns) {
    for (std::size_t i = 0; i < columns.size(); ++i) {
        f << std::quoted(columns[i], '"', '"');
        if (i + 1 == columns.size()) {
            f << '\n';
        } else {
            f << ',';
        }
    }
}

std::string priority_to_string(Priority priority) {
    if (priority == Priority::normal) {
        return "normal";
    }
    if (priority == Priority::high) {
        return "high";
    }
    if (priority == Priority::urgent) {
        return "urgent";
    }
    throw std::runtime_error("Priority không hợp lệ");
}

std::string status_to_string(OrderStatus status) {
    if (status == OrderStatus::queued) {
        return "queued";
    }
    if (status == OrderStatus::processing) {
        return "processing";
    }
    if (status == OrderStatus::completed) {
        return "completed";
    }
    if (status == OrderStatus::cancelled) {
        return "cancelled";
    }
    if (status == OrderStatus::returned) {
        return "returned";
    }

    throw std::runtime_error("OrderStatus không hợp lệ");
}

std::size_t find_column(const CsvRow& header, const std::string& name) {
    for (std::size_t i = 0; i < header.size(); ++i) {
        if (header[i] == name) {
            return i;
        }
    }
    throw std::runtime_error("Thiếu cột: " + name);
}

void remove_utf8_bom(CsvRow& header) {
    if (!header.empty() && header[0].size() >= 3) {
        unsigned char c1 = static_cast<unsigned char>(header[0][0]);
        unsigned char c2 = static_cast<unsigned char>(header[0][1]);
        unsigned char c3 = static_cast<unsigned char>(header[0][2]);

        if (c1 == 0xEF && c2 == 0xBB && c3 == 0xBF) {
            header[0].erase(0, 3);
        }
    }
}

void require_field(
    const std::string& value,
    const std::string& file,
    std::size_t record,
    const std::string& field
) {
    if (value.empty()) {
        throw std::runtime_error(
            file + " - bản ghi " + std::to_string(record)
            + ": trường " + field + " không được rỗng"
        );
    }
}

void require_columns(
    const CsvRow& row,
    const CsvRow& header,
    const std::string& file,
    std::size_t record
) {
    if (row.size() != header.size()) {
        throw std::runtime_error(
            file + " - bản ghi " + std::to_string(record)
            + ": số cột không hợp lệ"
        );
    }
}

int parse_int(
    const std::string& value,
    const std::string& file,
    std::size_t record,
    const std::string& field
) {
    try {
        std::size_t pos;
        int number = std::stoi(value, &pos);

        if (pos != value.size()) {
            throw std::runtime_error("invalid");
        }
        return number;
    }
    catch (...) {
        throw std::runtime_error(
            file + " - bản ghi " + std::to_string(record)
            + ": trường " + field + " không phải số hợp lệ"
        );
    }
}

std::uint64_t parse_uint64(
    const std::string& value,
    const std::string& file,
    std::size_t record,
    const std::string& field
) {
    if (!value.empty() && value[0] == '-') {
        throw std::runtime_error(
            file + " - bản ghi " + std::to_string(record)
            + ": trường " + field + " không được âm"
        );
    }
    try {
        std::size_t pos;
        unsigned long long number = std::stoull(value, &pos);
        if (pos != value.size()) {
            throw std::runtime_error("invalid");
        }
        return static_cast<std::uint64_t>(number);
    }
    catch (...) {
        throw std::runtime_error(
            file + " - bản ghi " + std::to_string(record)
            + ": trường " + field + " không phải số hợp lệ"
        );
    }
}

StorageData load_data(const std::filesystem::path& path) {

    std::filesystem::path product_file=path/"san_pham.csv";
    std::filesystem::path order_file=path/"don_hang.csv";

     if (!std::filesystem::exists(product_file)) {
        throw std::runtime_error("Không tìm thấy file san_pham.csv");
    }
    if (!std::filesystem::exists(order_file)) {
        throw std::runtime_error("Không tìm thấy file don_hang.csv");
    }

    std::ifstream product_stream(product_file, std::ios::binary);
    std::ifstream order_stream(order_file, std::ios::binary);

    if (!product_stream.is_open()) {
        throw std::runtime_error("Không thể mở file san_pham.csv");
    }
    if (!order_stream.is_open()) {
        throw std::runtime_error("Không thể mở file don_hang.csv");
    }

    StorageData data;

    CsvRow product_header;
    if (!doc_csv(product_stream, product_header)) {
        throw std::runtime_error("File san_pham.csv rỗng");
    }

    remove_utf8_bom(product_header);

    std::size_t col_id = find_column(product_header, "id");
    std::size_t col_sku = find_column(product_header, "sku");
    std::size_t col_name = find_column(product_header, "name");
    std::size_t col_category = find_column(product_header, "category");
    std::size_t col_stock = find_column(product_header, "stock");
    std::size_t col_reorder = find_column(product_header, "reorder_level");
    std::size_t col_created = find_column(product_header, "created_at");
    std::size_t col_updated = find_column(product_header, "updated_at");

    CsvRow row;
    std::size_t product_record = 1;
    while (doc_csv(product_stream, row)) {

         ++product_record;
        require_columns(
            row,
            product_header,
            "san_pham.csv",
            product_record
        );

        require_field(row[col_id], "san_pham.csv", product_record, "id");
        require_field(row[col_sku], "san_pham.csv", product_record, "sku");
        require_field(row[col_name], "san_pham.csv", product_record, "name");
        require_field(row[col_category], "san_pham.csv", product_record, "category");
        require_field(row[col_stock], "san_pham.csv", product_record, "stock");
        require_field(row[col_reorder], "san_pham.csv", product_record, "reorder_level");

        require_field(row[col_created], "san_pham.csv", product_record, "created_at");
        require_field(row[col_updated], "san_pham.csv", product_record, "updated_at");

        Product product;
        product.id = row[col_id];
        product.sku = row[col_sku];
        product.name = row[col_name];
        product.category = row[col_category];
        product.stock = parse_int(
            row[col_stock],
            "san_pham.csv",
            product_record,
            "stock"
        );
        product.reorder_level = parse_int(
            row[col_reorder],
            "san_pham.csv",
            product_record,
            "reorder_level"
        );
        if (product.stock < 0) {
            throw std::runtime_error(
                "san_pham.csv - bản ghi " + std::to_string(product_record)
                + ": stock không được âm"
            );
        }
        if (product.reorder_level < 0) {
            throw std::runtime_error(
                "san_pham.csv - bản ghi " + std::to_string(product_record)
                + ": reorder_level không được âm"
            );
        }
        product.created_at = row[col_created];
        product.updated_at = row[col_updated];
        data.products.push_back(product);
    }

    CsvRow order_header;

    if (!doc_csv(order_stream, order_header)) {
        throw std::runtime_error("File don_hang.csv rỗng");
    }

    remove_utf8_bom(order_header);

    std::size_t order_col_id = find_column(order_header, "id");
    std::size_t order_col_code = find_column(order_header, "order_code");
    std::size_t order_col_priority = find_column(order_header, "priority");
    std::size_t order_col_sequence = find_column(order_header, "sequence_number");
    std::size_t order_col_status = find_column(order_header, "status");
    std::size_t order_col_created = find_column(order_header, "created_at");
    std::size_t order_col_sku = find_column(order_header, "sku");
    std::size_t order_col_quantity = find_column(order_header, "quantity");


    std::size_t order_record = 1;
    std::unordered_map<std::string, std::size_t> order_positions;

    while (doc_csv(order_stream, row)) {
         ++order_record;

        require_columns(
            row,
            order_header,
            "don_hang.csv",
            order_record
        );

        require_field(row[order_col_id], "don_hang.csv", order_record, "id");
        require_field(row[order_col_code], "don_hang.csv", order_record, "order_code");
        require_field(row[order_col_priority], "don_hang.csv", order_record, "priority");
        require_field(row[order_col_sequence], "don_hang.csv", order_record, "sequence_number");
        require_field(row[order_col_status], "don_hang.csv", order_record, "status");
        require_field(row[order_col_created], "don_hang.csv", order_record, "created_at");
        require_field(row[order_col_sku], "don_hang.csv", order_record, "sku");
        require_field(row[order_col_quantity], "don_hang.csv", order_record, "quantity");

        Order order;
        OrderItem item;

        item.sku = row[order_col_sku];
        item.product_id = item.sku;

        item.name = "";
        item.quantity = parse_int(
            row[order_col_quantity],
            "don_hang.csv",
            order_record,
            "quantity"
        );

        if (item.quantity <= 0) {
            throw std::runtime_error(
                "don_hang.csv - bản ghi " + std::to_string(order_record)
                + ": quantity phải lớn hơn 0"
            );
        }

        order.id = row[order_col_id];
        order.order_code = row[order_col_code];
        order.created_at = row[order_col_created];

        if (row[order_col_priority] == "normal") {
            order.priority = Priority::normal;
        }
        else if (row[order_col_priority] == "high") {
            order.priority = Priority::high;
        }
        else if (row[order_col_priority] == "urgent") {
            order.priority = Priority::urgent;
        }
        else {
             throw std::runtime_error(
                "don_hang.csv - bản ghi " + std::to_string(order_record)
                + ": priority không hợp lệ: " + row[order_col_priority]
            );
        }

        if (row[order_col_status] == "queued") {
            order.status = OrderStatus::queued;
        }
        else if (row[order_col_status] == "processing") {
            order.status = OrderStatus::processing;
        }
        else if (row[order_col_status] == "completed") {
            order.status = OrderStatus::completed;
        }
        else if (row[order_col_status] == "cancelled") {
            order.status = OrderStatus::cancelled;
        }
        else if (row[order_col_status] == "returned") {
            order.status = OrderStatus::returned;
        }
        else {
             throw std::runtime_error(
                "don_hang.csv - bản ghi " + std::to_string(order_record)
                + ": status không hợp lệ: " + row[order_col_status]
            );
        }

        order.sequence_number = parse_uint64(
            row[order_col_sequence],
            "don_hang.csv",
            order_record,
            "sequence_number"
        );
        order.note = "";

        const auto [position, inserted] = order_positions.emplace(
            order.id, data.orders.size()
        );
        if (inserted) {
            order.items.push_back(std::move(item));
            data.orders.push_back(std::move(order));
        }
        else {
            Order& existing = data.orders[position->second];
            if (existing.order_code != order.order_code
                || existing.priority != order.priority
                || existing.sequence_number != order.sequence_number
                || existing.status != order.status
                || existing.created_at != order.created_at) {
                throw std::runtime_error(
                    "don_hang.csv - bản ghi " + std::to_string(order_record)
                    + ": cùng id nhưng khác thông tin đơn hàng"
                );
            }
            existing.items.push_back(std::move(item));
        }
    }
    return data;
}
void save_data(const std::filesystem::path& path, const StorageData& data) {

    std::filesystem::create_directories(path);

    std::filesystem::path product_file = path / "san_pham.csv";
    std::filesystem::path order_file = path / "don_hang.csv";

    std::ofstream product_stream(product_file, std::ios::binary);
    std::ofstream order_stream(order_file, std::ios::binary);

    if (!product_stream.is_open()) {
        throw std::runtime_error("Không thể ghi file san_pham.csv");
    }

    if (!order_stream.is_open()) {
        throw std::runtime_error("Không thể ghi file don_hang.csv");
    }

    ghi_csv(product_stream, {
        "id",
        "sku",
        "name",
        "category",
        "stock",
        "reorder_level",
        "created_at",
        "updated_at"
    });

    for (const Product& product : data.products) {
        ghi_csv(product_stream, {
            product.id,
            product.sku,
            product.name,
            product.category,
            std::to_string(product.stock),
            std::to_string(product.reorder_level),
            product.created_at,
            product.updated_at
        });
    }

    ghi_csv(order_stream, {
        "id",
        "order_code",
        "priority",
        "sequence_number",
        "status",
        "created_at",
        "sku",
        "quantity"
    });

    for (const Order& order : data.orders) {
        if (order.items.empty()) {
            throw std::runtime_error(
                "Không thể ghi đơn " + order.id + ": đơn hàng không có sản phẩm"
            );
        }
        for (const OrderItem& item : order.items) {
            ghi_csv(order_stream, {
                order.id,
                order.order_code,
                priority_to_string(order.priority),
                std::to_string(order.sequence_number),
                status_to_string(order.status),
                order.created_at,
                item.sku,
                std::to_string(item.quantity)
            });
        }
    }
}
} // namespace dsa::kieu_trang

#endif
