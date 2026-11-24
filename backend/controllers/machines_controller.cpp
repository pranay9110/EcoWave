#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"

namespace textile::controllers {

void register_machines_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/machines").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT machine_id, machine_code, machine_name, machine_type, plant_zone, status, "
                    "operating_hours, utilization_pct, downtime_hours, energy_rating_kw, "
                    "COALESCE(DATE_FORMAT(last_maintenance_date, '%Y-%m-%d'), '') AS last_maintenance_date, "
                    "COALESCE(DATE_FORMAT(next_maintenance_date, '%Y-%m-%d'), '') AS next_maintenance_date, "
                    "is_sample_data "
                    "FROM Machines ORDER BY machine_id ASC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["machine_id"] = rows[i].integer("machine_id");
                    arr[i]["machine_code"] = rows[i].str("machine_code");
                    arr[i]["machine_name"] = rows[i].str("machine_name");
                    arr[i]["machine_type"] = rows[i].str("machine_type");
                    arr[i]["plant_zone"] = rows[i].str("plant_zone");
                    arr[i]["status"] = rows[i].str("status");
                    arr[i]["operating_hours"] = rows[i].dbl("operating_hours");
                    arr[i]["utilization_pct"] = rows[i].dbl("utilization_pct");
                    arr[i]["downtime_hours"] = rows[i].dbl("downtime_hours");
                    arr[i]["energy_rating_kw"] = rows[i].dbl("energy_rating_kw");
                    arr[i]["last_maintenance_date"] = rows[i].str("last_maintenance_date");
                    arr[i]["next_maintenance_date"] = rows[i].str("next_maintenance_date");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                }

                auto maint_rows = database.query(
                    "SELECT mm.maintenance_id, mm.machine_id, m.machine_code, m.machine_name, "
                    "mm.maintenance_type, mm.description, mm.technician_name, mm.downtime_hours, "
                    "mm.cost_usd, DATE_FORMAT(mm.scheduled_date, '%Y-%m-%d') AS scheduled_date, "
                    "COALESCE(DATE_FORMAT(mm.completed_date, '%Y-%m-%d'), '') AS completed_date, "
                    "mm.status, mm.is_sample_data "
                    "FROM Machine_Maintenance mm "
                    "JOIN Machines m ON mm.machine_id = m.machine_id "
                    "ORDER BY mm.maintenance_id DESC");

                crow::json::wvalue maint_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < maint_rows.size(); ++i) {
                    maint_arr[i]["maintenance_id"] = maint_rows[i].integer("maintenance_id");
                    maint_arr[i]["machine_id"] = maint_rows[i].integer("machine_id");
                    maint_arr[i]["machine_code"] = maint_rows[i].str("machine_code");
                    maint_arr[i]["machine_name"] = maint_rows[i].str("machine_name");
                    maint_arr[i]["maintenance_type"] = maint_rows[i].str("maintenance_type");
                    maint_arr[i]["description"] = maint_rows[i].str("description");
                    maint_arr[i]["technician_name"] = maint_rows[i].str("technician_name");
                    maint_arr[i]["downtime_hours"] = maint_rows[i].dbl("downtime_hours");
                    maint_arr[i]["cost_usd"] = maint_rows[i].dbl("cost_usd");
                    maint_arr[i]["scheduled_date"] = maint_rows[i].str("scheduled_date");
                    maint_arr[i]["completed_date"] = maint_rows[i].str("completed_date");
                    maint_arr[i]["status"] = maint_rows[i].str("status");
                    maint_arr[i]["is_sample_data"] = maint_rows[i].boolean("is_sample_data");
                }

                crow::json::wvalue out;
                out["machines"] = std::move(arr);
                out["maintenance"] = std::move(maint_arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/machines").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Only Administrator or Production Manager can register machines");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string code = http::req_str(body, "machine_code");
            std::string name = http::req_str(body, "machine_name");
            std::string mtype = http::req_str(body, "machine_type");
            std::string zone = http::req_str(body, "plant_zone", "Zone A");
            std::string status = http::req_str(body, "status", "Running");
            double hours = http::req_dbl(body, "operating_hours", 0.0);
            double util = http::req_dbl(body, "utilization_pct", 85.0);
            double downtime = http::req_dbl(body, "downtime_hours", 0.0);
            double energy_kw = http::req_dbl(body, "energy_rating_kw", 45.0);
            std::string next_maint = http::req_str(body, "next_maintenance_date", "2026-12-30");

            if (code.empty() || name.empty()) {
                return http::err_res(400, "Machine code and machine name are required");
            }
            if (!http::is_valid_enum(mtype, models::MACHINE_TYPES) ||
                !http::is_valid_enum(status, models::MACHINE_STATUSES)) {
                return http::err_res(400, "Invalid machine type or status");
            }

            try {
                auto res = database.execute(
                    "INSERT INTO Machines (machine_code, machine_name, machine_type, plant_zone, status, "
                    "operating_hours, utilization_pct, downtime_hours, energy_rating_kw, last_maintenance_date, "
                    "next_maintenance_date, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), ?, FALSE)",
                    {code, name, mtype, zone, status, hours, util, downtime, energy_kw, next_maint});

                http::log_activity(database, *user, "Machines", "Machine Registered",
                                   "Registered " + name + " (" + code + ")");

                crow::json::wvalue out;
                out["machine_id"] = static_cast<int>(res.last_insert_id);
                out["message"] = "Machine registered";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Could not register machine: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/machines/<int>").methods(crow::HTTPMethod::PUT)(
        [&database, &cfg](const crow::request& req, int machine_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string status = http::req_str(body, "status");
            double hours = http::req_dbl(body, "operating_hours", 0.0);
            double util = http::req_dbl(body, "utilization_pct", 0.0);
            double downtime = http::req_dbl(body, "downtime_hours", 0.0);
            std::string next_maint = http::req_str(body, "next_maintenance_date", "2026-12-30");

            if (!http::is_valid_enum(status, models::MACHINE_STATUSES)) {
                return http::err_res(400, "Invalid machine status");
            }

            try {
                auto res = database.execute(
                    "UPDATE Machines SET status=?, operating_hours=?, utilization_pct=?, downtime_hours=?, "
                    "next_maintenance_date=?, is_sample_data=FALSE WHERE machine_id=?",
                    {status, hours, util, downtime, next_maint, machine_id});
                if (res.affected_rows == 0) return http::err_res(404, "Machine not found");

                http::log_activity(database, *user, "Machines", "Status Updated",
                                   "Machine #" + std::to_string(machine_id) + " set to " + status);
                crow::json::wvalue out;
                out["message"] = "Machine updated";
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/machines/maintenance").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            int machine_id = http::req_int(body, "machine_id", 0);
            std::string mtype = http::req_str(body, "maintenance_type", "Preventive");
            std::string desc = http::req_str(body, "description");
            std::string tech = http::req_str(body, "technician_name");
            double downtime = http::req_dbl(body, "downtime_hours", 0.0);
            double cost = http::req_dbl(body, "cost_usd", 0.0);
            std::string sched_date = http::req_str(body, "scheduled_date");
            std::string status = http::req_str(body, "status", "Scheduled");

            if (machine_id <= 0 || desc.empty() || tech.empty() || sched_date.empty()) {
                return http::err_res(400, "Machine, description, technician, and scheduled date are required");
            }

            try {
                auto res = database.execute(
                    "INSERT INTO Machine_Maintenance (machine_id, maintenance_type, description, technician_name, "
                    "downtime_hours, cost_usd, scheduled_date, status, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {machine_id, mtype, desc, tech, downtime, cost, sched_date, status});

                if (mtype == "Breakdown Repair") {
                    database.execute(
                        "UPDATE Machines SET status='Breakdown', downtime_hours = downtime_hours + ?, is_sample_data=FALSE WHERE machine_id=?",
                        {downtime, machine_id});
                } else if (status == "In Progress") {
                    database.execute(
                        "UPDATE Machines SET status='Under Maintenance', downtime_hours = downtime_hours + ?, is_sample_data=FALSE WHERE machine_id=?",
                        {downtime, machine_id});
                }

                http::log_activity(database, *user, "Machines", mtype,
                                   mtype + " logged for Machine #" + std::to_string(machine_id) + ": " + desc);

                crow::json::wvalue out;
                out["maintenance_id"] = static_cast<int>(res.last_insert_id);
                out["message"] = "Maintenance record logged";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
