#pragma once

#include "config.hpp"
#include <mysql/mysql.h>
#include <mutex>
#include <string>
#include <vector>
#include <optional>
#include <unordered_map>
#include <stdexcept>
#include <variant>

namespace textile::db {

using ParamValue = std::variant<std::nullptr_t, int, long long, double, std::string>;

struct Row {
    std::unordered_map<std::string, std::optional<std::string>> cols;

    std::string str(const std::string& key, const std::string& def = "") const {
        auto it = cols.find(key);
        if (it == cols.end() || !it->second.has_value()) return def;
        return *it->second;
    }

    int integer(const std::string& key, int def = 0) const {
        auto it = cols.find(key);
        if (it == cols.end() || !it->second.has_value() || it->second->empty()) return def;
        try { return std::stoi(*it->second); } catch (...) { return def; }
    }

    double dbl(const std::string& key, double def = 0.0) const {
        auto it = cols.find(key);
        if (it == cols.end() || !it->second.has_value() || it->second->empty()) return def;
        try { return std::stod(*it->second); } catch (...) { return def; }
    }

    bool boolean(const std::string& key, bool def = false) const {
        auto it = cols.find(key);
        if (it == cols.end() || !it->second.has_value()) return def;
        const std::string& v = *it->second;
        return v == "1" || v == "true" || v == "TRUE";
    }
};

struct ExecResult {
    long long last_insert_id = 0;
    unsigned long long affected_rows = 0;
};

class Database {
public:
    explicit Database(AppConfig cfg);
    ~Database();

    Database(const Database&) = delete;
    Database& operator=(const Database&) = delete;

    bool connect();
    void ensure_connected();

    std::vector<Row> query(const std::string& sql, const std::vector<ParamValue>& params = {});
    ExecResult execute(const std::string& sql, const std::vector<ParamValue>& params = {});
    bool execute_script_file(const std::string& path);
    void bootstrap_if_empty();

private:
    AppConfig config_;
    MYSQL* conn_ = nullptr;
    std::mutex mutex_;
};

} // namespace textile::db
