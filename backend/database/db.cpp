#include "db.hpp"
#include <cstring>
#include <fstream>
#include <iostream>
#include <memory>
#include <sstream>

namespace textile::db {

namespace {

struct StmtGuard {
    MYSQL_STMT* stmt = nullptr;
    explicit StmtGuard(MYSQL* conn) { stmt = mysql_stmt_init(conn); }
    ~StmtGuard() {
        if (stmt) mysql_stmt_close(stmt);
    }
};

struct MetaGuard {
    MYSQL_RES* res = nullptr;
    explicit MetaGuard(MYSQL_RES* r) : res(r) {}
    ~MetaGuard() {
        if (res) mysql_free_result(res);
    }
};

void bind_parameters(MYSQL_STMT* stmt,
                     const std::vector<ParamValue>& params,
                     std::vector<MYSQL_BIND>& binds,
                     std::vector<long long>& int_bufs,
                     std::vector<double>& dbl_bufs,
                     std::vector<unsigned long>& str_lens,
                     std::vector<char>& is_nulls) {
    size_t n = params.size();
    if (n == 0) return;

    binds.assign(n, MYSQL_BIND{});
    int_bufs.assign(n, 0);
    dbl_bufs.assign(n, 0.0);
    str_lens.assign(n, 0);
    is_nulls.assign(n, 0);

    for (size_t i = 0; i < n; ++i) {
        std::memset(&binds[i], 0, sizeof(MYSQL_BIND));
        if (std::holds_alternative<std::nullptr_t>(params[i])) {
            is_nulls[i] = 1;
            binds[i].buffer_type = MYSQL_TYPE_NULL;
            binds[i].is_null = reinterpret_cast<decltype(binds[i].is_null)>(&is_nulls[i]);
        } else if (std::holds_alternative<int>(params[i])) {
            int_bufs[i] = std::get<int>(params[i]);
            binds[i].buffer_type = MYSQL_TYPE_LONGLONG;
            binds[i].buffer = &int_bufs[i];
        } else if (std::holds_alternative<long long>(params[i])) {
            int_bufs[i] = std::get<long long>(params[i]);
            binds[i].buffer_type = MYSQL_TYPE_LONGLONG;
            binds[i].buffer = &int_bufs[i];
        } else if (std::holds_alternative<double>(params[i])) {
            dbl_bufs[i] = std::get<double>(params[i]);
            binds[i].buffer_type = MYSQL_TYPE_DOUBLE;
            binds[i].buffer = &dbl_bufs[i];
        } else {
            const std::string& s = std::get<std::string>(params[i]);
            str_lens[i] = static_cast<unsigned long>(s.size());
            binds[i].buffer_type = MYSQL_TYPE_STRING;
            binds[i].buffer = const_cast<char*>(s.data());
            binds[i].buffer_length = str_lens[i];
            binds[i].length = &str_lens[i];
        }
    }

    if (mysql_stmt_bind_param(stmt, binds.data()) != 0) {
        throw std::runtime_error(std::string("mysql_stmt_bind_param failed: ") + mysql_stmt_error(stmt));
    }
}

} // namespace

Database::Database(AppConfig cfg) : config_(std::move(cfg)) {}

Database::~Database() {
    if (conn_) {
        mysql_close(conn_);
        conn_ = nullptr;
    }
}

bool Database::connect() {
    if (conn_) {
        mysql_close(conn_);
        conn_ = nullptr;
    }
    conn_ = mysql_init(nullptr);
    if (!conn_) return false;

    const char* sock = config_.db_socket.empty() ? nullptr : config_.db_socket.c_str();
    const char* host = config_.db_socket.empty() ? config_.db_host.c_str() : "localhost";

    if (!mysql_real_connect(conn_,
                            host,
                            config_.db_user.c_str(),
                            config_.db_password.c_str(),
                            config_.db_name.c_str(),
                            config_.db_port,
                            sock,
                            CLIENT_MULTI_STATEMENTS)) {
        std::cerr << "[DB] Connection error: " << mysql_error(conn_) << std::endl;
        mysql_close(conn_);
        conn_ = nullptr;
        return false;
    }
    mysql_set_character_set(conn_, "utf8mb4");
    return true;
}

void Database::ensure_connected() {
    if (!conn_ || mysql_ping(conn_) != 0) {
        if (!connect()) {
            throw std::runtime_error("Unable to connect to MySQL database");
        }
    }
}

std::vector<Row> Database::query(const std::string& sql, const std::vector<ParamValue>& params) {
    std::lock_guard<std::mutex> lock(mutex_);
    ensure_connected();

    StmtGuard sg(conn_);
    if (!sg.stmt) throw std::runtime_error("mysql_stmt_init failed");

    if (mysql_stmt_prepare(sg.stmt, sql.c_str(), static_cast<unsigned long>(sql.size())) != 0) {
        throw std::runtime_error(std::string("Prepare failed: ") + mysql_stmt_error(sg.stmt));
    }

    std::vector<MYSQL_BIND> param_binds;
    std::vector<long long> int_bufs;
    std::vector<double> dbl_bufs;
    std::vector<unsigned long> str_lens;
    std::vector<char> is_nulls;
    bind_parameters(sg.stmt, params, param_binds, int_bufs, dbl_bufs, str_lens, is_nulls);

    if (mysql_stmt_execute(sg.stmt) != 0) {
        throw std::runtime_error(std::string("Execute failed: ") + mysql_stmt_error(sg.stmt));
    }

    MetaGuard meta(mysql_stmt_result_metadata(sg.stmt));
    if (!meta.res) {
        return {};
    }

    unsigned int num_fields = mysql_num_fields(meta.res);
    MYSQL_FIELD* fields = mysql_fetch_fields(meta.res);

    std::vector<MYSQL_BIND> out_binds(num_fields);
    std::vector<std::vector<char>> buffers(num_fields, std::vector<char>(512));
    std::vector<unsigned long> lengths(num_fields, 0);
    std::vector<char> nulls(num_fields, 0);
    std::vector<char> errors(num_fields, 0);

    for (unsigned int i = 0; i < num_fields; ++i) {
        std::memset(&out_binds[i], 0, sizeof(MYSQL_BIND));
        out_binds[i].buffer_type = MYSQL_TYPE_STRING;
        out_binds[i].buffer = buffers[i].data();
        out_binds[i].buffer_length = static_cast<unsigned long>(buffers[i].size());
        out_binds[i].length = &lengths[i];
        out_binds[i].is_null = reinterpret_cast<decltype(out_binds[i].is_null)>(&nulls[i]);
        out_binds[i].error = reinterpret_cast<decltype(out_binds[i].error)>(&errors[i]);
    }

    if (mysql_stmt_bind_result(sg.stmt, out_binds.data()) != 0) {
        throw std::runtime_error(std::string("Bind result failed: ") + mysql_stmt_error(sg.stmt));
    }

    if (mysql_stmt_store_result(sg.stmt) != 0) {
        throw std::runtime_error(std::string("Store result failed: ") + mysql_stmt_error(sg.stmt));
    }

    std::vector<Row> rows;
    while (true) {
        int rc = mysql_stmt_fetch(sg.stmt);
        if (rc == MYSQL_NO_DATA) break;
        if (rc == 1) {
            throw std::runtime_error(std::string("Fetch failed: ") + mysql_stmt_error(sg.stmt));
        }

        Row row;
        for (unsigned int i = 0; i < num_fields; ++i) {
            std::string col_name = fields[i].name ? fields[i].name : ("col_" + std::to_string(i));
            if (nulls[i]) {
                row.cols[col_name] = std::nullopt;
            } else if (lengths[i] >= buffers[i].size()) {
                std::vector<char> large_buf(lengths[i] + 1, '\0');
                MYSQL_BIND single_bind{};
                unsigned long real_len = 0;
                char single_null = 0;
                single_bind.buffer_type = MYSQL_TYPE_STRING;
                single_bind.buffer = large_buf.data();
                single_bind.buffer_length = static_cast<unsigned long>(large_buf.size());
                single_bind.length = &real_len;
                single_bind.is_null = reinterpret_cast<decltype(single_bind.is_null)>(&single_null);
                mysql_stmt_fetch_column(sg.stmt, &single_bind, i, 0);
                row.cols[col_name] = std::string(large_buf.data(), real_len);
            } else {
                row.cols[col_name] = std::string(buffers[i].data(), lengths[i]);
            }
        }
        rows.push_back(std::move(row));
    }

    return rows;
}

ExecResult Database::execute(const std::string& sql, const std::vector<ParamValue>& params) {
    std::lock_guard<std::mutex> lock(mutex_);
    ensure_connected();

    StmtGuard sg(conn_);
    if (!sg.stmt) throw std::runtime_error("mysql_stmt_init failed");

    if (mysql_stmt_prepare(sg.stmt, sql.c_str(), static_cast<unsigned long>(sql.size())) != 0) {
        throw std::runtime_error(std::string("Prepare failed: ") + mysql_stmt_error(sg.stmt));
    }

    std::vector<MYSQL_BIND> param_binds;
    std::vector<long long> int_bufs;
    std::vector<double> dbl_bufs;
    std::vector<unsigned long> str_lens;
    std::vector<char> is_nulls;
    bind_parameters(sg.stmt, params, param_binds, int_bufs, dbl_bufs, str_lens, is_nulls);

    if (mysql_stmt_execute(sg.stmt) != 0) {
        throw std::runtime_error(std::string("Execute failed: ") + mysql_stmt_error(sg.stmt));
    }

    ExecResult res;
    res.last_insert_id = static_cast<long long>(mysql_stmt_insert_id(sg.stmt));
    res.affected_rows = static_cast<unsigned long long>(mysql_stmt_affected_rows(sg.stmt));
    return res;
}

bool Database::execute_script_file(const std::string& path) {
    std::ifstream ifs(path);
    if (!ifs.is_open()) return false;
    std::stringstream ss;
    ss << ifs.rdbuf();
    std::string sql = ss.str();
    if (sql.empty()) return false;

    std::lock_guard<std::mutex> lock(mutex_);
    ensure_connected();
    if (mysql_query(conn_, sql.c_str()) != 0) {
        std::cerr << "[DB] Script error (" << path << "): " << mysql_error(conn_) << std::endl;
        return false;
    }
    do {
        MYSQL_RES* r = mysql_store_result(conn_);
        if (r) mysql_free_result(r);
    } while (mysql_next_result(conn_) == 0);
    return true;
}

void Database::bootstrap_if_empty() {
    try {
        auto rows = query("SELECT COUNT(*) AS cnt FROM Users");
        if (!rows.empty() && rows[0].integer("cnt") > 0) {
            return;
        }
    } catch (...) {
        // Table may not exist yet; run schema script below
    }

    execute_script_file("database/schema.sql");
    execute_script_file("database/sample_data.sql");
}

} // namespace textile::db
