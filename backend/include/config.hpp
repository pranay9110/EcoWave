#pragma once

#include <cstdlib>
#include <string>
#include <openssl/rand.h>
#include <sstream>
#include <iomanip>

namespace textile {

struct AppConfig {
    std::string db_host;
    unsigned int db_port;
    std::string db_user;
    std::string db_password;
    std::string db_name;
    std::string db_socket;
    int server_port;
    std::string auth_secret;
    std::string cors_origin;

    static std::string get_env(const char* key, const std::string& fallback) {
        const char* val = std::getenv(key);
        if (val != nullptr && std::string(val).length() > 0) {
            return std::string(val);
        }
        return fallback;
    }

    static std::string generate_runtime_secret() {
        unsigned char buf[32];
        if (RAND_bytes(buf, sizeof(buf)) == 1) {
            std::ostringstream oss;
            for (unsigned char b : buf) {
                oss << std::hex << std::setw(2) << std::setfill('0') << static_cast<int>(b);
            }
            return oss.str();
        }
        return "ephemeral_runtime_fallback_key_change_in_production";
    }

    static AppConfig load() {
        AppConfig cfg;
        cfg.db_host = get_env("DB_HOST", "127.0.0.1");
        cfg.db_port = static_cast<unsigned int>(std::stoi(get_env("DB_PORT", "3306")));
        cfg.db_user = get_env("DB_USER", "textile_user");
        cfg.db_password = get_env("DB_PASSWORD", "textile_pass");
        cfg.db_name = get_env("DB_NAME", "sustainable_textile_db");
        cfg.db_socket = get_env("DB_SOCKET", "");
        cfg.server_port = std::stoi(get_env("BACKEND_PORT", "8081"));
        cfg.auth_secret = get_env("AUTH_SECRET", "");
        if (cfg.auth_secret.empty()) {
            static const std::string runtime_secret = generate_runtime_secret();
            cfg.auth_secret = runtime_secret;
        }
        cfg.cors_origin = get_env("CORS_ORIGIN", "http://localhost:3000");
        return cfg;
    }
};

} // namespace textile
