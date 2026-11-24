#pragma once

#include "crow_all.h"
#include "auth.hpp"
#include "db.hpp"
#include <string>
#include <vector>
#include <optional>

namespace textile::http {

inline crow::response json_res(int status, const crow::json::wvalue& body) {
    crow::response res(status);
    res.set_header("Content-Type", "application/json");
    res.write(body.dump());
    return res;
}

inline crow::response err_res(int status, const std::string& message) {
    crow::json::wvalue w;
    w["error"] = message;
    w["status"] = status;
    return json_res(status, w);
}

inline std::optional<auth::AuthUser> authenticate(const crow::request& req, const AppConfig& cfg) {
    std::string header = req.get_header_value("Authorization");
    if (header.empty()) return std::nullopt;
    return auth::verify_token(header, cfg.auth_secret);
}

inline bool is_valid_enum(const std::string& val, const std::vector<std::string>& allowed) {
    for (const auto& item : allowed) {
        if (val == item) return true;
    }
    return false;
}

inline std::string req_str(const crow::json::rvalue& body, const std::string& key, const std::string& def = "") {
    if (!body.has(key)) return def;
    if (body[key].t() == crow::json::type::String) return std::string(body[key].s());
    return def;
}

inline double req_dbl(const crow::json::rvalue& body, const std::string& key, double def = 0.0) {
    if (!body.has(key)) return def;
    if (body[key].t() == crow::json::type::Number) return body[key].d();
    if (body[key].t() == crow::json::type::String) {
        try { return std::stod(std::string(body[key].s())); } catch (...) { return def; }
    }
    return def;
}

inline int req_int(const crow::json::rvalue& body, const std::string& key, int def = 0) {
    if (!body.has(key)) return def;
    if (body[key].t() == crow::json::type::Number) return static_cast<int>(body[key].i());
    if (body[key].t() == crow::json::type::String) {
        try { return std::stoi(std::string(body[key].s())); } catch (...) { return def; }
    }
    return def;
}

inline void log_activity(db::Database& database,
                         const auth::AuthUser& user,
                         const std::string& module_name,
                         const std::string& action_type,
                         const std::string& description) {
    try {
        database.execute(
            "INSERT INTO Activity_Logs (user_id, actor_name, module_name, action_type, description, is_sample_data) "
            "VALUES (?, ?, ?, ?, ?, FALSE)",
            {user.user_id, user.full_name, module_name, action_type, description});
    } catch (...) {
        // Non-blocking audit log write
    }
}

} // namespace textile::http
