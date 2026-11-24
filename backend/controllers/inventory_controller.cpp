#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"

namespace textile::controllers {

void register_inventory_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/inventory").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT i.inventory_id, i.sku, i.product_name, i.category, COALESCE(i.production_id, 0) AS production_id, "
                    "COALESCE(p.batch_number, 'Direct Stock') AS batch_number, "
                    "i.quantity, i.unit, i.reorder_threshold, i.warehouse_location, i.unit_price, i.stock_status, "
                    "i.is_sample_data, DATE_FORMAT(i.last_updated, '%Y-%m-%d') AS last_updated "
                    "FROM Inventory i "
                    "LEFT JOIN Production_Orders p ON i.production_id = p.production_id "
                    "ORDER BY i.inventory_id DESC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["inventory_id"] = rows[i].integer("inventory_id");
                    arr[i]["sku"] = rows[i].str("sku");
                    arr[i]["product_name"] = rows[i].str("product_name");
                    arr[i]["category"] = rows[i].str("category");
                    arr[i]["production_id"] = rows[i].integer("production_id");
                    arr[i]["batch_number"] = rows[i].str("batch_number");
                    arr[i]["quantity"] = rows[i].integer("quantity");
                    arr[i]["unit"] = rows[i].str("unit");
                    arr[i]["reorder_threshold"] = rows[i].integer("reorder_threshold");
                    arr[i]["warehouse_location"] = rows[i].str("warehouse_location");
                    arr[i]["unit_price"] = rows[i].dbl("unit_price");
                    arr[i]["stock_status"] = rows[i].str("stock_status");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                    arr[i]["last_updated"] = rows[i].str("last_updated");
                }
                crow::json::wvalue out;
                out["inventory"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/inventory").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string sku = http::req_str(body, "sku");
            std::string product_name = http::req_str(body, "product_name");
            std::string category = http::req_str(body, "category");
            int production_id = http::req_int(body, "production_id", 0);
            int quantity = http::req_int(body, "quantity", -1);
            std::string unit = http::req_str(body, "unit", "meters");
            int threshold = http::req_int(body, "reorder_threshold", 300);
            std::string location = http::req_str(body, "warehouse_location", "WH-A1");
            double unit_price = http::req_dbl(body, "unit_price", 12.50);

            if (sku.empty() || product_name.empty() || quantity < 0) {
                return http::err_res(400, "SKU, product name, and non-negative quantity are required");
            }
            if (!http::is_valid_enum(category, models::INVENTORY_CATEGORIES)) {
                return http::err_res(400, "Invalid inventory category");
            }

            std::string status = models::compute_inventory_status(quantity, threshold);
            db::ParamValue prod_param = nullptr;
            if (production_id > 0) prod_param = production_id;

            try {
                auto res = database.execute(
                    "INSERT INTO Inventory (sku, product_name, category, production_id, quantity, unit, "
                    "reorder_threshold, warehouse_location, unit_price, stock_status, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {sku, product_name, category, prod_param, quantity, unit, threshold, location, unit_price, status});

                http::log_activity(database, *user, "Inventory", "Stock Added",
                                   "Added " + product_name + " (" + sku + ") to " + location);

                crow::json::wvalue out;
                out["inventory_id"] = static_cast<int>(res.last_insert_id);
                out["stock_status"] = status;
                out["message"] = "Inventory item added";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Could not add inventory item: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/inventory/<int>").methods(crow::HTTPMethod::PUT)(
        [&database, &cfg](const crow::request& req, int inventory_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager"})) {
                return http::err_res(403, "Only Administrator or Inventory Manager can adjust warehouse stock");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            int quantity = http::req_int(body, "quantity", -1);
            int threshold = http::req_int(body, "reorder_threshold", 300);
            std::string location = http::req_str(body, "warehouse_location", "WH-A1");
            double unit_price = http::req_dbl(body, "unit_price", 12.50);

            if (quantity < 0) return http::err_res(400, "Non-negative quantity is required");
            std::string status = models::compute_inventory_status(quantity, threshold);

            try {
                auto res = database.execute(
                    "UPDATE Inventory SET quantity=?, reorder_threshold=?, warehouse_location=?, unit_price=?, "
                    "stock_status=?, is_sample_data=FALSE WHERE inventory_id=?",
                    {quantity, threshold, location, unit_price, status, inventory_id});
                if (res.affected_rows == 0) return http::err_res(404, "Inventory item not found");

                http::log_activity(database, *user, "Inventory", "Stock Adjusted",
                                   "Adjusted SKU #" + std::to_string(inventory_id) + " to " + std::to_string(quantity));

                crow::json::wvalue out;
                out["message"] = "Inventory updated";
                out["stock_status"] = status;
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
