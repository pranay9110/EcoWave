#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"

namespace textile::controllers {

void register_materials_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/suppliers").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT supplier_id, supplier_code, supplier_name, contact_person, email, phone, "
                    "country, sustainability_cert, rating, is_sample_data FROM Suppliers ORDER BY supplier_id ASC");
                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["supplier_id"] = rows[i].integer("supplier_id");
                    arr[i]["supplier_code"] = rows[i].str("supplier_code");
                    arr[i]["supplier_name"] = rows[i].str("supplier_name");
                    arr[i]["contact_person"] = rows[i].str("contact_person");
                    arr[i]["email"] = rows[i].str("email");
                    arr[i]["phone"] = rows[i].str("phone");
                    arr[i]["country"] = rows[i].str("country");
                    arr[i]["sustainability_cert"] = rows[i].str("sustainability_cert");
                    arr[i]["rating"] = rows[i].dbl("rating");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                }
                crow::json::wvalue out;
                out["suppliers"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/materials").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT m.material_id, m.material_code, m.material_name, m.category, m.quantity, "
                    "m.consumed_quantity, m.unit, m.reorder_level, m.unit_cost, m.recycled_content_pct, "
                    "m.supplier_id, s.supplier_name, s.sustainability_cert, m.stock_status, m.is_sample_data, "
                    "DATE_FORMAT(m.updated_at, '%Y-%m-%d') AS updated_date "
                    "FROM Materials m "
                    "JOIN Suppliers s ON m.supplier_id = s.supplier_id "
                    "ORDER BY m.material_id DESC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["material_id"] = rows[i].integer("material_id");
                    arr[i]["material_code"] = rows[i].str("material_code");
                    arr[i]["material_name"] = rows[i].str("material_name");
                    arr[i]["category"] = rows[i].str("category");
                    arr[i]["quantity"] = rows[i].dbl("quantity");
                    arr[i]["consumed_quantity"] = rows[i].dbl("consumed_quantity");
                    arr[i]["unit"] = rows[i].str("unit");
                    arr[i]["reorder_level"] = rows[i].dbl("reorder_level");
                    arr[i]["unit_cost"] = rows[i].dbl("unit_cost");
                    arr[i]["recycled_content_pct"] = rows[i].dbl("recycled_content_pct");
                    arr[i]["supplier_id"] = rows[i].integer("supplier_id");
                    arr[i]["supplier_name"] = rows[i].str("supplier_name");
                    arr[i]["sustainability_cert"] = rows[i].str("sustainability_cert");
                    arr[i]["stock_status"] = rows[i].str("stock_status");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                    arr[i]["updated_date"] = rows[i].str("updated_date");
                }
                crow::json::wvalue out;
                out["materials"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/materials").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string material_code = http::req_str(body, "material_code");
            std::string material_name = http::req_str(body, "material_name");
            std::string category = http::req_str(body, "category");
            double quantity = http::req_dbl(body, "quantity", -1.0);
            double consumed_quantity = http::req_dbl(body, "consumed_quantity", 0.0);
            std::string unit = http::req_str(body, "unit", "kg");
            double reorder_level = http::req_dbl(body, "reorder_level", 500.0);
            double unit_cost = http::req_dbl(body, "unit_cost", 0.0);
            double recycled_pct = http::req_dbl(body, "recycled_content_pct", 0.0);
            int supplier_id = http::req_int(body, "supplier_id", 1);

            if (material_code.empty() || material_name.empty() || quantity < 0.0) {
                return http::err_res(400, "Material code, name, and non-negative quantity are required");
            }
            if (!http::is_valid_enum(category, models::MATERIAL_CATEGORIES)) {
                return http::err_res(400, "Invalid material category");
            }

            std::string status = models::compute_material_stock_status(quantity, reorder_level);
            try {
                auto res = database.execute(
                    "INSERT INTO Materials (material_code, material_name, category, quantity, consumed_quantity, "
                    "unit, reorder_level, unit_cost, recycled_content_pct, supplier_id, stock_status, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {material_code, material_name, category, quantity, consumed_quantity,
                     unit, reorder_level, unit_cost, recycled_pct, supplier_id, status});

                http::log_activity(database, *user, "Materials", "Material Added",
                                   "Added " + material_name + " (" + material_code + ")");

                crow::json::wvalue out;
                out["material_id"] = static_cast<int>(res.last_insert_id);
                out["stock_status"] = status;
                out["message"] = "Material added successfully";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Could not add material: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/materials/<int>").methods(crow::HTTPMethod::PUT)(
        [&database, &cfg](const crow::request& req, int material_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string material_name = http::req_str(body, "material_name");
            std::string category = http::req_str(body, "category");
            double quantity = http::req_dbl(body, "quantity", -1.0);
            double consumed_quantity = http::req_dbl(body, "consumed_quantity", 0.0);
            std::string unit = http::req_str(body, "unit", "kg");
            double reorder_level = http::req_dbl(body, "reorder_level", 500.0);
            double unit_cost = http::req_dbl(body, "unit_cost", 0.0);
            double recycled_pct = http::req_dbl(body, "recycled_content_pct", 0.0);
            int supplier_id = http::req_int(body, "supplier_id", 1);

            if (material_name.empty() || quantity < 0.0) {
                return http::err_res(400, "Valid material name and non-negative quantity are required");
            }
            if (!http::is_valid_enum(category, models::MATERIAL_CATEGORIES)) {
                return http::err_res(400, "Invalid material category");
            }

            std::string status = models::compute_material_stock_status(quantity, reorder_level);
            try {
                auto res = database.execute(
                    "UPDATE Materials SET material_name=?, category=?, quantity=?, consumed_quantity=?, "
                    "unit=?, reorder_level=?, unit_cost=?, recycled_content_pct=?, supplier_id=?, "
                    "stock_status=?, is_sample_data=FALSE WHERE material_id=?",
                    {material_name, category, quantity, consumed_quantity,
                     unit, reorder_level, unit_cost, recycled_pct, supplier_id, status, material_id});
                if (res.affected_rows == 0) {
                    return http::err_res(404, "Material not found");
                }
                http::log_activity(database, *user, "Materials", "Material Updated",
                                   "Updated " + material_name + " stock to " + std::to_string(static_cast<int>(quantity)) + " " + unit);
                crow::json::wvalue out;
                out["message"] = "Material updated";
                out["stock_status"] = status;
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/materials/<int>").methods(crow::HTTPMethod::DELETE)(
        [&database, &cfg](const crow::request& req, int material_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager"})) {
                return http::err_res(403, "Only Administrator or Inventory Manager can delete materials");
            }

            try {
                auto res = database.execute("DELETE FROM Materials WHERE material_id = ?", {material_id});
                if (res.affected_rows == 0) {
                    return http::err_res(404, "Material not found");
                }
                http::log_activity(database, *user, "Materials", "Material Deleted",
                                   "Deleted material ID #" + std::to_string(material_id));
                crow::json::wvalue out;
                out["message"] = "Material deleted";
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
