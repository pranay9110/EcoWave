#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"
#include <algorithm>
#include <cctype>

namespace textile::controllers {

void register_auth_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/auth/register").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string full_name = http::req_str(body, "full_name");
            std::string email = http::req_str(body, "email");
            std::string password = http::req_str(body, "password");
            std::string role = http::req_str(body, "role", "Production Manager");
            std::string department = http::req_str(body, "department", "Manufacturing Operations");

            std::transform(email.begin(), email.end(), email.begin(),
                           [](unsigned char c) { return std::tolower(c); });

            if (full_name.size() < 2 || email.find('@') == std::string::npos || password.size() < 6) {
                return http::err_res(400, "Provide valid full name, email address, and password (min 6 chars)");
            }
            if (!http::is_valid_enum(role, models::USER_ROLES)) {
                return http::err_res(400, "Invalid role. Must be Administrator, Production Manager, or Inventory Manager");
            }

            try {
                auto existing = database.query("SELECT user_id FROM Users WHERE email = ?", {email});
                if (!existing.empty()) {
                    return http::err_res(409, "An account with this email already exists");
                }

                std::string pw_hash = auth::hash_password(password);
                auto res = database.execute(
                    "INSERT INTO Users (full_name, email, password_hash, role, department, is_active, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, TRUE, FALSE)",
                    {full_name, email, pw_hash, role, department});

                auth::AuthUser user{static_cast<int>(res.last_insert_id), full_name, email, role};
                std::string token = auth::create_token(user, cfg.auth_secret);

                http::log_activity(database, user, "Authentication", "User Registered",
                                   full_name + " registered as " + role);

                crow::json::wvalue out;
                out["token"] = token;
                out["user"]["user_id"] = user.user_id;
                out["user"]["full_name"] = user.full_name;
                out["user"]["email"] = user.email;
                out["user"]["role"] = user.role;
                out["user"]["department"] = department;
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(500, std::string("Registration failed: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/auth/login").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string email = http::req_str(body, "email");
            std::string password = http::req_str(body, "password");
            std::transform(email.begin(), email.end(), email.begin(),
                           [](unsigned char c) { return std::tolower(c); });

            if (email.empty() || password.empty()) {
                return http::err_res(400, "Email and password are required");
            }

            try {
                auto rows = database.query(
                    "SELECT user_id, full_name, email, password_hash, role, department, is_active "
                    "FROM Users WHERE email = ? LIMIT 1",
                    {email});
                if (rows.empty()) {
                    return http::err_res(401, "Invalid email or password");
                }

                const auto& r = rows[0];
                if (!r.boolean("is_active", true)) {
                    return http::err_res(403, "User account is deactivated");
                }
                if (!auth::verify_password(password, r.str("password_hash"))) {
                    return http::err_res(401, "Invalid email or password");
                }

                auth::AuthUser user{r.integer("user_id"), r.str("full_name"), r.str("email"), r.str("role")};
                std::string token = auth::create_token(user, cfg.auth_secret);

                http::log_activity(database, user, "Authentication", "Sign In",
                                   user.full_name + " signed in (" + user.role + ")");

                crow::json::wvalue out;
                out["token"] = token;
                out["user"]["user_id"] = user.user_id;
                out["user"]["full_name"] = user.full_name;
                out["user"]["email"] = user.email;
                out["user"]["role"] = user.role;
                out["user"]["department"] = r.str("department");
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, std::string("Login error: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/auth/me").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT user_id, full_name, email, role, department FROM Users WHERE user_id = ? LIMIT 1",
                    {user->user_id});
                if (rows.empty()) return http::err_res(404, "User not found");

                const auto& r = rows[0];
                crow::json::wvalue out;
                out["user_id"] = r.integer("user_id");
                out["full_name"] = r.str("full_name");
                out["email"] = r.str("email");
                out["role"] = r.str("role");
                out["department"] = r.str("department");
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
