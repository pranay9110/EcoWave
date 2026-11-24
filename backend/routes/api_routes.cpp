#include "controllers.hpp"
#include "http_helpers.hpp"

namespace textile::routes {

void register_all_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/health").methods(crow::HTTPMethod::GET)(
        [&database](const crow::request&) {
            try {
                database.ensure_connected();
                crow::json::wvalue out;
                out["status"] = "ok";
                out["engine"] = "Crow C++17";
                out["database"] = "MySQL";
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    controllers::register_auth_routes(app, database, cfg);
    controllers::register_dashboard_routes(app, database, cfg);
    controllers::register_materials_routes(app, database, cfg);
    controllers::register_production_routes(app, database, cfg);
    controllers::register_machines_routes(app, database, cfg);
    controllers::register_quality_routes(app, database, cfg);
    controllers::register_inventory_routes(app, database, cfg);
    controllers::register_sustainability_routes(app, database, cfg);
    controllers::register_orders_routes(app, database, cfg);
    controllers::register_reports_routes(app, database, cfg);
}

} // namespace textile::routes
