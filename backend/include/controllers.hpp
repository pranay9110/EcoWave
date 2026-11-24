#pragma once

#include "crow_all.h"
#include "config.hpp"
#include "db.hpp"

namespace textile::controllers {

void register_auth_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_dashboard_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_materials_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_production_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_machines_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_quality_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_inventory_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_sustainability_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_orders_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);
void register_reports_routes(crow::SimpleApp& app, db::Database& db, const AppConfig& cfg);

} // namespace textile::controllers
