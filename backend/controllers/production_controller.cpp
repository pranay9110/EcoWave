#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"

namespace textile::controllers {

namespace {

void sync_production_stages(db::Database& database, int production_id, const std::string& current_stage, const std::string& status) {
    int target_idx = models::stage_index(current_stage);
    bool all_done = (status == "Completed");

    auto existing = database.query("SELECT COUNT(*) AS cnt FROM Production_Stages WHERE production_id = ?", {production_id});
    if (existing.empty() || existing[0].integer("cnt") == 0) {
        for (size_t i = 0; i < models::PRODUCTION_STAGES.size(); ++i) {
            int order = static_cast<int>(i) + 1;
            std::string st = "Pending";
            if (all_done || order < target_idx) st = "Completed";
            else if (order == target_idx && status != "Scheduled") st = "In Progress";

            database.execute(
                "INSERT INTO Production_Stages (production_id, stage_order, stage_name, stage_status, is_sample_data) "
                "VALUES (?, ?, ?, ?, FALSE)",
                {production_id, order, models::PRODUCTION_STAGES[i], st});
        }
    } else {
        for (size_t i = 0; i < models::PRODUCTION_STAGES.size(); ++i) {
            int order = static_cast<int>(i) + 1;
            std::string st = "Pending";
            if (all_done || order < target_idx) st = "Completed";
            else if (order == target_idx && status != "Scheduled") st = "In Progress";

            database.execute(
                "UPDATE Production_Stages SET stage_status = ?, is_sample_data = FALSE "
                "WHERE production_id = ? AND stage_order = ?",
                {st, production_id, order});
        }
    }
}

} // namespace

void register_production_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/production").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT p.production_id, p.batch_number, p.product_name, p.fabric_type, p.material_id, "
                    "COALESCE(m.material_name, 'Unassigned') AS material_name, "
                    "p.target_quantity, p.completed_quantity, p.material_used_kg, p.current_stage, "
                    "p.progress_pct, p.efficiency_pct, p.status, "
                    "DATE_FORMAT(p.start_date, '%Y-%m-%d') AS start_date, "
                    "DATE_FORMAT(p.due_date, '%Y-%m-%d') AS due_date, "
                    "COALESCE(DATE_FORMAT(p.completed_date, '%Y-%m-%d'), '') AS completed_date, "
                    "p.is_sample_data "
                    "FROM Production_Orders p "
                    "LEFT JOIN Materials m ON p.material_id = m.material_id "
                    "ORDER BY p.production_id DESC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    int pid = rows[i].integer("production_id");
                    arr[i]["production_id"] = pid;
                    arr[i]["batch_number"] = rows[i].str("batch_number");
                    arr[i]["product_name"] = rows[i].str("product_name");
                    arr[i]["fabric_type"] = rows[i].str("fabric_type");
                    arr[i]["material_id"] = rows[i].integer("material_id");
                    arr[i]["material_name"] = rows[i].str("material_name");
                    arr[i]["target_quantity"] = rows[i].integer("target_quantity");
                    arr[i]["completed_quantity"] = rows[i].integer("completed_quantity");
                    arr[i]["material_used_kg"] = rows[i].dbl("material_used_kg");
                    arr[i]["current_stage"] = rows[i].str("current_stage");
                    arr[i]["progress_pct"] = rows[i].dbl("progress_pct");
                    arr[i]["efficiency_pct"] = rows[i].dbl("efficiency_pct");
                    arr[i]["status"] = rows[i].str("status");
                    arr[i]["start_date"] = rows[i].str("start_date");
                    arr[i]["due_date"] = rows[i].str("due_date");
                    arr[i]["completed_date"] = rows[i].str("completed_date");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");

                    auto st_rows = database.query(
                        "SELECT stage_order, stage_name, stage_status, COALESCE(operator_name, 'Shift Team') AS operator_name "
                        "FROM Production_Stages WHERE production_id = ? ORDER BY stage_order ASC",
                        {pid});
                    crow::json::wvalue stages = crow::json::wvalue::list();
                    for (size_t j = 0; j < st_rows.size(); ++j) {
                        stages[j]["stage_order"] = st_rows[j].integer("stage_order");
                        stages[j]["stage_name"] = st_rows[j].str("stage_name");
                        stages[j]["stage_status"] = st_rows[j].str("stage_status");
                        stages[j]["operator_name"] = st_rows[j].str("operator_name");
                    }
                    arr[i]["stages"] = std::move(stages);
                }

                crow::json::wvalue out;
                out["orders"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/production").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Only Administrator or Production Manager can create batches");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string batch_number = http::req_str(body, "batch_number");
            std::string product_name = http::req_str(body, "product_name");
            std::string fabric_type = http::req_str(body, "fabric_type");
            int material_id = http::req_int(body, "material_id", 0);
            int target_qty = http::req_int(body, "target_quantity", 0);
            int completed_qty = http::req_int(body, "completed_quantity", 0);
            double material_used = http::req_dbl(body, "material_used_kg", 0.0);
            std::string current_stage = http::req_str(body, "current_stage", "Raw Material Preparation");
            double efficiency_pct = http::req_dbl(body, "efficiency_pct", 92.0);
            std::string status = http::req_str(body, "status", "In Progress");
            std::string start_date = http::req_str(body, "start_date");
            std::string due_date = http::req_str(body, "due_date");

            if (batch_number.empty() || product_name.empty() || target_qty <= 0 || start_date.empty() || due_date.empty()) {
                return http::err_res(400, "Batch number, product name, positive target quantity, start date, and due date are required");
            }
            if (!http::is_valid_enum(current_stage, models::PRODUCTION_STAGES)) {
                return http::err_res(400, "Invalid production stage");
            }

            double progress_pct = models::compute_stage_progress(current_stage, status);
            if (status == "Completed") {
                completed_qty = target_qty;
                current_stage = "Final Delivery";
            }

            try {
                db::ParamValue mat_param = nullptr;
                if (material_id > 0) mat_param = material_id;

                auto res = database.execute(
                    "INSERT INTO Production_Orders (batch_number, product_name, fabric_type, material_id, "
                    "target_quantity, completed_quantity, material_used_kg, current_stage, progress_pct, "
                    "efficiency_pct, status, start_date, due_date, assigned_manager_id, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {batch_number, product_name, fabric_type, mat_param,
                     target_qty, completed_qty, material_used, current_stage, progress_pct,
                     efficiency_pct, status, start_date, due_date, user->user_id});

                int new_id = static_cast<int>(res.last_insert_id);
                sync_production_stages(database, new_id, current_stage, status);

                if (material_id > 0 && material_used > 0.0) {
                    database.execute(
                        "UPDATE Materials SET quantity = GREATEST(0, quantity - ?), "
                        "consumed_quantity = consumed_quantity + ?, "
                        "stock_status = CASE WHEN quantity - ? <= 0 THEN 'Out of Stock' "
                        "WHEN quantity - ? <= reorder_level THEN 'Low Stock' ELSE 'In Stock' END "
                        "WHERE material_id = ?",
                        {material_used, material_used, material_used, material_used, material_id});
                }

                http::log_activity(database, *user, "Production", "Batch Created",
                                   "Created " + batch_number + " (" + product_name + ")");

                crow::json::wvalue out;
                out["production_id"] = new_id;
                out["progress_pct"] = progress_pct;
                out["message"] = "Production batch created";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Failed to create batch: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/production/<int>").methods(crow::HTTPMethod::PUT)(
        [&database, &cfg](const crow::request& req, int production_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Only Administrator or Production Manager can update production batches");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string current_stage = http::req_str(body, "current_stage");
            std::string status = http::req_str(body, "status");
            int completed_qty = http::req_int(body, "completed_quantity", 0);
            int target_qty = http::req_int(body, "target_quantity", 0);
            double efficiency_pct = http::req_dbl(body, "efficiency_pct", 92.0);

            if (!http::is_valid_enum(current_stage, models::PRODUCTION_STAGES)) {
                return http::err_res(400, "Invalid production stage");
            }
            if (!http::is_valid_enum(status, {"Scheduled", "In Progress", "Completed", "On Hold"})) {
                return http::err_res(400, "Invalid production status");
            }

            if (current_stage == "Final Delivery" && status == "In Progress") {
                status = "Completed";
            }
            double progress_pct = models::compute_stage_progress(current_stage, status);
            if (status == "Completed" && target_qty > 0 && completed_qty < target_qty) {
                completed_qty = target_qty;
            }

            try {
                auto res = database.execute(
                    "UPDATE Production_Orders SET current_stage=?, status=?, completed_quantity=?, "
                    "progress_pct=?, efficiency_pct=?, "
                    "completed_date = CASE WHEN ? = 'Completed' THEN CURDATE() ELSE completed_date END, "
                    "is_sample_data = FALSE "
                    "WHERE production_id = ?",
                    {current_stage, status, completed_qty, progress_pct, efficiency_pct, status, production_id});
                if (res.affected_rows == 0) {
                    return http::err_res(404, "Production batch not found");
                }
                sync_production_stages(database, production_id, current_stage, status);
                http::log_activity(database, *user, "Production", "Stage Updated",
                                   "Batch #" + std::to_string(production_id) + " -> " + current_stage + " (" + status + ")");

                crow::json::wvalue out;
                out["message"] = "Production order updated";
                out["progress_pct"] = progress_pct;
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/production/<int>").methods(crow::HTTPMethod::DELETE)(
        [&database, &cfg](const crow::request& req, int production_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            try {
                auto res = database.execute("DELETE FROM Production_Orders WHERE production_id = ?", {production_id});
                if (res.affected_rows == 0) return http::err_res(404, "Production order not found");
                http::log_activity(database, *user, "Production", "Batch Deleted",
                                   "Deleted production batch ID #" + std::to_string(production_id));
                crow::json::wvalue out;
                out["message"] = "Production batch deleted";
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
