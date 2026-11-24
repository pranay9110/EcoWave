#include "controllers.hpp"
#include "http_helpers.hpp"

namespace textile::controllers {

void register_dashboard_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/dashboard").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                crow::json::wvalue out;

                // 1. KPI Aggregations calculated directly from MySQL records
                auto prod_agg = database.query(
                    "SELECT "
                    "COALESCE(SUM(completed_quantity), 0) AS total_production, "
                    "COALESCE(SUM(CASE WHEN status IN ('Scheduled','In Progress') THEN 1 ELSE 0 END), 0) AS active_orders, "
                    "COALESCE(SUM(CASE WHEN status = 'Completed' THEN completed_quantity ELSE 0 END), 0) AS completed_products, "
                    "COALESCE(AVG(efficiency_pct), 0) AS avg_efficiency "
                    "FROM Production_Orders");

                auto mat_agg = database.query(
                    "SELECT COALESCE(SUM(quantity), 0) AS total_material_qty, "
                    "COALESCE(SUM(CASE WHEN stock_status IN ('Low Stock','Out of Stock') THEN 1 ELSE 0 END), 0) AS low_stock_materials "
                    "FROM Materials");

                auto mach_agg = database.query(
                    "SELECT COALESCE(AVG(utilization_pct), 0) AS avg_utilization, "
                    "COALESCE(SUM(CASE WHEN status = 'Running' THEN 1 ELSE 0 END), 0) AS running_count, "
                    "COUNT(*) AS total_machines "
                    "FROM Machines");

                auto ord_agg = database.query(
                    "SELECT COALESCE(SUM(CASE WHEN order_status IN ('Pending','Processing') THEN 1 ELSE 0 END), 0) AS pending_orders "
                    "FROM Customer_Orders");

                auto sust_agg = database.query(
                    "SELECT COALESCE(AVG(sustainability_score), 0) AS avg_score "
                    "FROM Sustainability_Records");

                auto origin_counts = database.query(
                    "SELECT "
                    "(SELECT COUNT(*) FROM Production_Orders WHERE is_sample_data = TRUE) + "
                    "(SELECT COUNT(*) FROM Materials WHERE is_sample_data = TRUE) + "
                    "(SELECT COUNT(*) FROM Machines WHERE is_sample_data = TRUE) AS sample_records, "
                    "(SELECT COUNT(*) FROM Production_Orders WHERE is_sample_data = FALSE) + "
                    "(SELECT COUNT(*) FROM Materials WHERE is_sample_data = FALSE) + "
                    "(SELECT COUNT(*) FROM Machines WHERE is_sample_data = FALSE) AS live_records");

                out["kpis"]["total_production"] = prod_agg.empty() ? 0 : prod_agg[0].integer("total_production");
                out["kpis"]["active_manufacturing_orders"] = prod_agg.empty() ? 0 : prod_agg[0].integer("active_orders");
                out["kpis"]["raw_material_availability"] = mat_agg.empty() ? 0.0 : mat_agg[0].dbl("total_material_qty");
                out["kpis"]["machine_utilization"] = mach_agg.empty() ? 0.0 : mach_agg[0].dbl("avg_utilization");
                out["kpis"]["total_completed_products"] = prod_agg.empty() ? 0 : prod_agg[0].integer("completed_products");
                out["kpis"]["pending_orders"] = ord_agg.empty() ? 0 : ord_agg[0].integer("pending_orders");
                out["kpis"]["production_efficiency"] = prod_agg.empty() ? 0.0 : prod_agg[0].dbl("avg_efficiency");
                out["kpis"]["sustainability_score"] = sust_agg.empty() ? 0.0 : sust_agg[0].dbl("avg_score");
                out["kpis"]["running_machines"] = mach_agg.empty() ? 0 : mach_agg[0].integer("running_count");
                out["kpis"]["total_machines"] = mach_agg.empty() ? 0 : mach_agg[0].integer("total_machines");
                out["kpis"]["sample_records"] = origin_counts.empty() ? 0 : origin_counts[0].integer("sample_records");
                out["kpis"]["live_records"] = origin_counts.empty() ? 0 : origin_counts[0].integer("live_records");

                // 2. Daily production chart (derived from Production_Orders grouped by start_date)
                auto daily_rows = database.query(
                    "SELECT DATE_FORMAT(start_date, '%b %d') AS day_label, "
                    "SUM(target_quantity) AS target_qty, "
                    "SUM(completed_quantity) AS completed_qty "
                    "FROM Production_Orders "
                    "GROUP BY start_date "
                    "ORDER BY start_date ASC LIMIT 12");
                crow::json::wvalue daily_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < daily_rows.size(); ++i) {
                    daily_arr[i]["day"] = daily_rows[i].str("day_label");
                    daily_arr[i]["target"] = daily_rows[i].integer("target_qty");
                    daily_arr[i]["completed"] = daily_rows[i].integer("completed_qty");
                }
                out["daily_production"] = std::move(daily_arr);

                // 3. Monthly production & sustainability chart
                auto monthly_rows = database.query(
                    "SELECT period_label, water_consumed_liters, electricity_kwh, carbon_emissions_kg, sustainability_score "
                    "FROM Sustainability_Records ORDER BY record_date ASC LIMIT 12");
                crow::json::wvalue monthly_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < monthly_rows.size(); ++i) {
                    monthly_arr[i]["month"] = monthly_rows[i].str("period_label");
                    monthly_arr[i]["water"] = monthly_rows[i].dbl("water_consumed_liters");
                    monthly_arr[i]["energy"] = monthly_rows[i].dbl("electricity_kwh");
                    monthly_arr[i]["carbon"] = monthly_rows[i].dbl("carbon_emissions_kg");
                    monthly_arr[i]["score"] = monthly_rows[i].dbl("sustainability_score");
                }
                out["monthly_sustainability"] = std::move(monthly_arr);

                // 4. Machine performance chart
                auto mach_rows = database.query(
                    "SELECT machine_code, machine_name, utilization_pct, operating_hours, downtime_hours, status "
                    "FROM Machines ORDER BY machine_id ASC");
                crow::json::wvalue mach_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < mach_rows.size(); ++i) {
                    mach_arr[i]["code"] = mach_rows[i].str("machine_code");
                    mach_arr[i]["name"] = mach_rows[i].str("machine_name");
                    mach_arr[i]["utilization"] = mach_rows[i].dbl("utilization_pct");
                    mach_arr[i]["hours"] = mach_rows[i].dbl("operating_hours");
                    mach_arr[i]["downtime"] = mach_rows[i].dbl("downtime_hours");
                    mach_arr[i]["status"] = mach_rows[i].str("status");
                }
                out["machine_performance"] = std::move(mach_arr);

                // 5. Production status distribution
                auto status_rows = database.query(
                    "SELECT status, COUNT(*) AS cnt FROM Production_Orders GROUP BY status");
                crow::json::wvalue status_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < status_rows.size(); ++i) {
                    status_arr[i]["status"] = status_rows[i].str("status");
                    status_arr[i]["count"] = status_rows[i].integer("cnt");
                }
                out["status_distribution"] = std::move(status_arr);

                // 6. Recent activities
                auto log_rows = database.query(
                    "SELECT log_id, actor_name, module_name, action_type, description, is_sample_data, "
                    "DATE_FORMAT(created_at, '%Y-%m-%d %H:%i') AS logged_at "
                    "FROM Activity_Logs ORDER BY log_id DESC LIMIT 10");
                crow::json::wvalue log_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < log_rows.size(); ++i) {
                    log_arr[i]["log_id"] = log_rows[i].integer("log_id");
                    log_arr[i]["actor_name"] = log_rows[i].str("actor_name");
                    log_arr[i]["module_name"] = log_rows[i].str("module_name");
                    log_arr[i]["action_type"] = log_rows[i].str("action_type");
                    log_arr[i]["description"] = log_rows[i].str("description");
                    log_arr[i]["is_sample_data"] = log_rows[i].boolean("is_sample_data");
                    log_arr[i]["logged_at"] = log_rows[i].str("logged_at");
                }
                out["recent_activities"] = std::move(log_arr);

                // 7. Low-stock alerts (both Raw Materials and Finished Goods)
                auto alert_rows = database.query(
                    "SELECT 'Raw Material' AS source, material_code AS code, material_name AS name, "
                    "quantity, reorder_level, unit, stock_status, is_sample_data "
                    "FROM Materials WHERE stock_status IN ('Low Stock', 'Out of Stock') "
                    "UNION ALL "
                    "SELECT 'Finished Goods' AS source, sku AS code, product_name AS name, "
                    "quantity, reorder_threshold AS reorder_level, unit, stock_status, is_sample_data "
                    "FROM Inventory WHERE stock_status IN ('Low Stock', 'Out of Stock')");
                crow::json::wvalue alert_arr = crow::json::wvalue::list();
                for (size_t i = 0; i < alert_rows.size(); ++i) {
                    alert_arr[i]["source"] = alert_rows[i].str("source");
                    alert_arr[i]["code"] = alert_rows[i].str("code");
                    alert_arr[i]["name"] = alert_rows[i].str("name");
                    alert_arr[i]["quantity"] = alert_rows[i].dbl("quantity");
                    alert_arr[i]["reorder_level"] = alert_rows[i].dbl("reorder_level");
                    alert_arr[i]["unit"] = alert_rows[i].str("unit");
                    alert_arr[i]["stock_status"] = alert_rows[i].str("stock_status");
                    alert_arr[i]["is_sample_data"] = alert_rows[i].boolean("is_sample_data");
                }
                out["low_stock_alerts"] = std::move(alert_arr);

                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, std::string("Dashboard query failed: ") + e.what());
            }
        });
}

} // namespace textile::controllers
