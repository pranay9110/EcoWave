#include "controllers.hpp"
#include "http_helpers.hpp"
#include <sstream>

namespace textile::controllers {

namespace {

std::string csv_escape(const std::string& val) {
    std::string out = "\"";
    for (char c : val) {
        if (c == '"') out += "\"\"";
        else out += c;
    }
    out += "\"";
    return out;
}

} // namespace

void register_reports_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/reports").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            std::string rtype = "daily_production";
            if (req.url_params.get("type") != nullptr) {
                rtype = req.url_params.get("type");
            }
            std::string format = "json";
            if (req.url_params.get("format") != nullptr) {
                format = req.url_params.get("format");
            }

            try {
                std::vector<std::string> headers;
                std::vector<std::vector<std::string>> rows_data;

                if (rtype == "daily_production") {
                    headers = {"Batch Number", "Product", "Start Date", "Stage", "Target Qty", "Completed Qty", "Efficiency %", "Status", "Origin"};
                    auto rows = database.query(
                        "SELECT batch_number, product_name, DATE_FORMAT(start_date, '%Y-%m-%d') AS sdate, "
                        "current_stage, target_quantity, completed_quantity, efficiency_pct, status, is_sample_data "
                        "FROM Production_Orders ORDER BY start_date DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("batch_number"), r.str("product_name"), r.str("sdate"), r.str("current_stage"),
                            std::to_string(r.integer("target_quantity")), std::to_string(r.integer("completed_quantity")),
                            r.str("efficiency_pct"), r.str("status"), r.boolean("is_sample_data") ? "Sample" : "Live"
                        });
                    }
                } else if (rtype == "weekly_production") {
                    headers = {"ISO Week", "Batches", "Target Output", "Completed Output", "Avg Efficiency %"};
                    auto rows = database.query(
                        "SELECT CONCAT(YEAR(start_date), '-W', LPAD(WEEK(start_date, 3), 2, '0')) AS wk, "
                        "COUNT(*) AS batches, SUM(target_quantity) AS target_qty, "
                        "SUM(completed_quantity) AS completed_qty, ROUND(AVG(efficiency_pct), 2) AS avg_eff "
                        "FROM Production_Orders GROUP BY wk ORDER BY wk DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("wk"), std::to_string(r.integer("batches")),
                            std::to_string(r.integer("target_qty")), std::to_string(r.integer("completed_qty")),
                            r.str("avg_eff")
                        });
                    }
                } else if (rtype == "monthly_production") {
                    headers = {"Month", "Batches", "Target Output", "Completed Output", "Avg Efficiency %"};
                    auto rows = database.query(
                        "SELECT DATE_FORMAT(start_date, '%Y-%m') AS mo, "
                        "COUNT(*) AS batches, SUM(target_quantity) AS target_qty, "
                        "SUM(completed_quantity) AS completed_qty, ROUND(AVG(efficiency_pct), 2) AS avg_eff "
                        "FROM Production_Orders GROUP BY mo ORDER BY mo DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("mo"), std::to_string(r.integer("batches")),
                            std::to_string(r.integer("target_qty")), std::to_string(r.integer("completed_qty")),
                            r.str("avg_eff")
                        });
                    }
                } else if (rtype == "material_consumption") {
                    headers = {"Code", "Material Name", "Category", "Available Stock", "Consumed Qty", "Unit", "Recycled %", "Status"};
                    auto rows = database.query(
                        "SELECT material_code, material_name, category, quantity, consumed_quantity, unit, "
                        "recycled_content_pct, stock_status FROM Materials ORDER BY consumed_quantity DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("material_code"), r.str("material_name"), r.str("category"),
                            r.str("quantity"), r.str("consumed_quantity"), r.str("unit"),
                            r.str("recycled_content_pct"), r.str("stock_status")
                        });
                    }
                } else if (rtype == "machine_performance") {
                    headers = {"Machine Code", "Machine Name", "Type", "Zone", "Status", "Operating Hours", "Utilization %", "Downtime Hours"};
                    auto rows = database.query(
                        "SELECT machine_code, machine_name, machine_type, plant_zone, status, "
                        "operating_hours, utilization_pct, downtime_hours FROM Machines ORDER BY utilization_pct DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("machine_code"), r.str("machine_name"), r.str("machine_type"),
                            r.str("plant_zone"), r.str("status"), r.str("operating_hours"),
                            r.str("utilization_pct"), r.str("downtime_hours")
                        });
                    }
                } else if (rtype == "product_quality") {
                    headers = {"Inspection Code", "Batch Number", "Inspector", "Inspected", "Passed", "Rejected", "Defect Rate %", "Decision", "Date"};
                    auto rows = database.query(
                        "SELECT inspection_code, batch_number, inspector_name, total_inspected, passed_count, "
                        "rejected_count, defect_rate_pct, decision, DATE_FORMAT(inspection_date, '%Y-%m-%d') AS idate "
                        "FROM Quality_Inspections ORDER BY inspection_date DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("inspection_code"), r.str("batch_number"), r.str("inspector_name"),
                            std::to_string(r.integer("total_inspected")), std::to_string(r.integer("passed_count")),
                            std::to_string(r.integer("rejected_count")), r.str("defect_rate_pct"),
                            r.str("decision"), r.str("idate")
                        });
                    }
                } else if (rtype == "inventory") {
                    headers = {"SKU", "Product Name", "Category", "Quantity", "Unit", "Warehouse", "Unit Price", "Stock Status"};
                    auto rows = database.query(
                        "SELECT sku, product_name, category, quantity, unit, warehouse_location, unit_price, stock_status "
                        "FROM Inventory ORDER BY quantity DESC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("sku"), r.str("product_name"), r.str("category"),
                            std::to_string(r.integer("quantity")), r.str("unit"),
                            r.str("warehouse_location"), r.str("unit_price"), r.str("stock_status")
                        });
                    }
                } else if (rtype == "sustainability") {
                    headers = {"Period", "Water (L)", "Water Recycled (L)", "Electricity (kWh)", "Renewable %", "Carbon (kg)", "Waste (kg)", "Recycled Mat %", "Score"};
                    auto rows = database.query(
                        "SELECT period_label, water_consumed_liters, water_recycled_liters, electricity_kwh, "
                        "renewable_energy_pct, carbon_emissions_kg, waste_generated_kg, recycled_material_usage_pct, "
                        "sustainability_score FROM Sustainability_Records ORDER BY record_date ASC");
                    for (const auto& r : rows) {
                        rows_data.push_back({
                            r.str("period_label"), r.str("water_consumed_liters"), r.str("water_recycled_liters"),
                            r.str("electricity_kwh"), r.str("renewable_energy_pct"), r.str("carbon_emissions_kg"),
                            r.str("waste_generated_kg"), r.str("recycled_material_usage_pct"), r.str("sustainability_score")
                        });
                    }
                } else {
                    return http::err_res(400, "Unknown report type");
                }

                if (format == "csv") {
                    std::ostringstream csv;
                    for (size_t i = 0; i < headers.size(); ++i) {
                        if (i > 0) csv << ",";
                        csv << csv_escape(headers[i]);
                    }
                    csv << "\r\n";
                    for (const auto& row : rows_data) {
                        for (size_t i = 0; i < row.size(); ++i) {
                            if (i > 0) csv << ",";
                            csv << csv_escape(row[i]);
                        }
                        csv << "\r\n";
                    }
                    crow::response res(200);
                    res.set_header("Content-Type", "text/csv; charset=utf-8");
                    res.set_header("Content-Disposition", "attachment; filename=\"" + rtype + "_report.csv\"");
                    res.write(csv.str());
                    return res;
                }

                crow::json::wvalue out;
                out["report_type"] = rtype;
                crow::json::wvalue hdrs = crow::json::wvalue::list();
                for (size_t i = 0; i < headers.size(); ++i) hdrs[i] = headers[i];
                out["headers"] = std::move(hdrs);

                crow::json::wvalue rarr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows_data.size(); ++i) {
                    crow::json::wvalue row_obj = crow::json::wvalue::list();
                    for (size_t j = 0; j < rows_data[i].size(); ++j) {
                        row_obj[j] = rows_data[i][j];
                    }
                    rarr[i] = std::move(row_obj);
                }
                out["rows"] = std::move(rarr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
