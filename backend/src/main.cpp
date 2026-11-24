#include "crow_all.h"
#include "config.hpp"
#include "db.hpp"
#include <iostream>

namespace textile::routes {
void register_all_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg);
}

int main() {
    auto cfg = textile::AppConfig::load();
    std::cout << "[EcoWeave C++ Backend] Connecting to MySQL at "
              << cfg.db_host << ":" << cfg.db_port << " (" << cfg.db_name << ")..." << std::endl;

    textile::db::Database database(cfg);
    if (!database.connect()) {
        std::cerr << "[EcoWeave C++ Backend] Initial DB connection failed. Retrying bootstrap..." << std::endl;
    } else {
        database.bootstrap_if_empty();
        std::cout << "[EcoWeave C++ Backend] MySQL database connected & verified." << std::endl;
    }

    crow::SimpleApp app;
    app.loglevel(crow::LogLevel::Warning);

    textile::routes::register_all_routes(app, database, cfg);

    std::cout << "[EcoWeave C++ Backend] Crow REST API server listening on port "
              << cfg.server_port << std::endl;

    app.port(static_cast<uint16_t>(cfg.server_port)).multithreaded().run();
    return 0;
}
