#ifndef DSA_MEMBERS_KIEU_TRANG_XU_LY_CSV_CPP
#define DSA_MEMBERS_KIEU_TRANG_XU_LY_CSV_CPP

#include "shared/kieu_du_lieu.cpp"

#include <fstream>
#include <iomanip>
#include <stdexcept>

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
} // namespace dsa::kieu_trang

#endif