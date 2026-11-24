#include "controllers.hpp"
#include "http_helpers.hpp"

namespace textile::controllers {

void register_quality_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/quality").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto agg = database.query(
                    "SELECT COALESCE(SUM(total_inspected), 0) AS total_inspected, "
                    "COALESCE(SUM(passed_count), 0) AS total_passed, "
                    "COALESCE(SUM(rejected_count), 0) AS total_rejected "
                    "FROM Quality_Inspections");

                int total_inspected = agg.empty() ? 0 : agg[0].integer("total_inspected");
                int total_passed = agg.empty() ? 0 : agg[0].integer("total_passed");
                int total_rejected = agg.empty() ? 0 : agg[0].integer("total_rejected");
                double overall_defect_rate = total_inspected > 0
                    ? (static_cast<double>(total_rejected) / static_cast<double>(total_inspected)) * 100.0
                    : 0.0;

                auto rows = database.query(
                    "SELECT q.inspection_id, q.inspection_code, q.production_id, q.batch_number, "
                    "COALESCE(p.product_name, '') AS product_name, q.inspector_name, "
                    "q.total_inspected, q.passed_count, q.rejected_count, q.defect_rate_pct, "
                    "q.primary_defect_type, q.decision, DATE_FORMAT(q.inspection_date, '%Y-%m-%d') AS inspection_date, "
                    "COALESCE(q.remarks, '') AS remarks, q.is_sample_data "
                    "FROM Quality_Inspections q "
                    "LEFT JOIN Production_Orders p ON q.production_id = p.production_id "
                    "ORDER BY q.inspection_id DESC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["inspection_id"] = rows[i].integer("inspection_id");
                    arr[i]["inspection_code"] = rows[i].str("inspection_code");
                    arr[i]["production_id"] = rows[i].integer("production_id");
                    arr[i]["batch_number"] = rows[i].str("batch_number");
                    arr[i]["product_name"] = rows[i].str("product_name");
                    arr[i]["inspector_name"] = rows[i].str("inspector_name");
                    arr[i]["total_inspected"] = rows[i].integer("total_inspected");
                    arr[i]["passed_count"] = rows[i].integer("passed_count");
                    arr[i]["rejected_count"] = rows[i].integer("rejected_count");
                    arr[i]["defect_rate_pct"] = rows[i].dbl("defect_rate_pct");
                    arr[i]["primary_defect_type"] = rows[i].str("primary_defect_type");
                    arr[i]["decision"] = rows[i].str("decision");
                    arr[i]["inspection_date"] = rows[i].str("inspection_date");
                    arr[i]["remarks"] = rows[i].str("remarks");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                }

                crow::json::wvalue out;
                out["summary"]["total_inspected"] = total_inspected;
                out["summary"]["passed_products"] = total_passed;
                out["summary"]["rejected_products"] = total_rejected;
                out["summary"]["defect_rate_pct"] = overall_defect_rate;
                out["inspections"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/quality").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Only Administrator or Production Manager can record inspections");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string code = http::req_str(body, "inspection_code");
            int production_id = http::req_int(body, "production_id", 0);
            std::string inspector = http::req_str(body, "inspector_name", user->full_name);
            int total_inspected = http::req_int(body, "total_inspected", 0);
            int rejected_count = http::req_int(body, "rejected_count", 0);
            std::string defect_type = http::req_str(body, "primary_defect_type", "None");
            std::string decision = http::req_str(body, "decision", "Approved");
            std::string inspection_date = http::req_str(body, "inspection_date");
            std::string remarks = http::req_str(body, "remarks");

            if (code.empty() || production_id <= 0 || total_inspected <= 0 || rejected_count < 0 || rejected_count > total_inspected || inspection_date.empty()) {
                return http::err_res(400, "Valid inspection code, production batch, counts, and inspection date are required");
            }
            if (!http::is_valid_enum(decision, {"Approved", "Rejected", "Conditional Rework"})) {
                return http::err_res(400, "Invalid inspection decision");
            }

            int passed_count = total_inspected - rejected_count;
            double defect_rate = (static_cast<double>(rejected_count) / static_cast<double>(total_inspected)) * 100.0;

            try {
                auto batch_rows = database.query(
                    "SELECT batch_number FROM Production_Orders WHERE production_id = ? LIMIT 1",
                    {production_id});
                if (batch_rows.empty()) return http::err_res(404, "Referenced production batch not found");
                std::string batch_number = batch_rows[0].str("batch_number");

                auto res = database.execute(
                    "INSERT INTO Quality_Inspections (inspection_code, production_id, batch_number, inspector_name, "
                    "total_inspected, passed_count, rejected_count, defect_rate_pct, primary_defect_type, decision, "
                    "inspection_date, remarks, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {code, production_id, batch_number, inspector, total_inspected, passed_count,
                     rejected_count, defect_rate, defect_type, decision, inspection_date, remarks});

                if (decision == "Rejected") {
                    database.execute(
                        "UPDATE Production_Orders SET status='On Hold', is_sample_data=FALSE WHERE production_id=?",
                        {production_id});
                }

                http::log_activity(database, *user, "Quality", "Inspection Logged",
                                   code + " (" + decision + ") for " + batch_number);

                crow::json::wvalue out;
                out["inspection_id"] = static_cast<int>(res.last_insert_id);
                out["defect_rate_pct"] = defect_rate;
                out["passed_count"] = passed_count;
                out["message"] = "Quality inspection recorded";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Could not log inspection: ") + e.what());
            }
        });
}

} // namespace textile::controllers
