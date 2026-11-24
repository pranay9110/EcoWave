#include "controllers.hpp"
#include "http_helpers.hpp"
#include <algorithm>

namespace textile::controllers {

void register_sustainability_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/sustainability").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT s.record_id, DATE_FORMAT(s.record_date, '%Y-%m-%d') AS record_date, s.period_label, "
                    "COALESCE(s.production_id, 0) AS production_id, COALESCE(p.batch_number, 'Plant-Wide') AS batch_number, "
                    "s.water_consumed_liters, s.water_recycled_liters, s.electricity_kwh, s.renewable_energy_pct, "
                    "s.carbon_emissions_kg, s.waste_generated_kg, s.waste_recycled_kg, "
                    "s.recycled_material_usage_pct, s.sustainability_score, COALESCE(s.notes, '') AS notes, s.is_sample_data "
                    "FROM Sustainability_Records s "
                    "LEFT JOIN Production_Orders p ON s.production_id = p.production_id "
                    "ORDER BY s.record_date ASC, s.record_id ASC");

                double total_water = 0, total_water_rec = 0, total_elec = 0, total_carbon = 0;
                double total_waste = 0, total_waste_rec = 0, sum_rec_mat = 0, sum_score = 0, sum_renew = 0;

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    double wc = rows[i].dbl("water_consumed_liters");
                    double wr = rows[i].dbl("water_recycled_liters");
                    double el = rows[i].dbl("electricity_kwh");
                    double rn = rows[i].dbl("renewable_energy_pct");
                    double cb = rows[i].dbl("carbon_emissions_kg");
                    double wg = rows[i].dbl("waste_generated_kg");
                    double wrec = rows[i].dbl("waste_recycled_kg");
                    double rmu = rows[i].dbl("recycled_material_usage_pct");
                    double sc = rows[i].dbl("sustainability_score");

                    total_water += wc;
                    total_water_rec += wr;
                    total_elec += el;
                    total_carbon += cb;
                    total_waste += wg;
                    total_waste_rec += wrec;
                    sum_rec_mat += rmu;
                    sum_score += sc;
                    sum_renew += rn;

                    arr[i]["record_id"] = rows[i].integer("record_id");
                    arr[i]["record_date"] = rows[i].str("record_date");
                    arr[i]["period_label"] = rows[i].str("period_label");
                    arr[i]["production_id"] = rows[i].integer("production_id");
                    arr[i]["batch_number"] = rows[i].str("batch_number");
                    arr[i]["water_consumed_liters"] = wc;
                    arr[i]["water_recycled_liters"] = wr;
                    arr[i]["electricity_kwh"] = el;
                    arr[i]["renewable_energy_pct"] = rn;
                    arr[i]["carbon_emissions_kg"] = cb;
                    arr[i]["waste_generated_kg"] = wg;
                    arr[i]["waste_recycled_kg"] = wrec;
                    arr[i]["recycled_material_usage_pct"] = rmu;
                    arr[i]["sustainability_score"] = sc;
                    arr[i]["notes"] = rows[i].str("notes");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                }

                double n = rows.empty() ? 1.0 : static_cast<double>(rows.size());
                double water_recovery_pct = total_water > 0 ? (total_water_rec / total_water) * 100.0 : 0.0;
                double waste_diversion_pct = total_waste > 0 ? (total_waste_rec / total_waste) * 100.0 : 0.0;
                double avg_recycled_mat = sum_rec_mat / n;
                double avg_renewable = sum_renew / n;
                double avg_score = sum_score / n;

                // Data-driven recommendations derived from actual database readings
                crow::json::wvalue recs = crow::json::wvalue::list();
                size_t rec_idx = 0;
                if (water_recovery_pct < 65.0) {
                    recs[rec_idx++] = "Expand closed-loop dye rinse filtration: water recovery is at " +
                        std::to_string(static_cast<int>(water_recovery_pct)) + "% (target >= 65%).";
                } else {
                    recs[rec_idx++] = "Closed-loop water recovery is performing strongly at " +
                        std::to_string(static_cast<int>(water_recovery_pct)) + "%. Maintain membrane backwash intervals.";
                }
                if (avg_renewable < 60.0) {
                    recs[rec_idx++] = "Shift peak dyeing vat schedules to solar-peak midday hours to raise renewable share above 60%.";
                } else {
                    recs[rec_idx++] = "Renewable energy integration averages " +
                        std::to_string(static_cast<int>(avg_renewable)) + "%, keeping Scope 2 carbon intensity low.";
                }
                if (avg_recycled_mat < 65.0) {
                    recs[rec_idx++] = "Increase rPET and regenerated yarn blend ratio in upcoming spinning lots to exceed 65% circular input.";
                }
                if (waste_diversion_pct < 85.0) {
                    recs[rec_idx++] = "Route cotton selvedge trimmings from Weaving Floor B to mechanical shredding to raise waste diversion above 85%.";
                }

                crow::json::wvalue out;
                out["records"] = std::move(arr);
                out["summary"]["total_water_liters"] = total_water;
                out["summary"]["water_recovery_pct"] = water_recovery_pct;
                out["summary"]["total_electricity_kwh"] = total_elec;
                out["summary"]["avg_renewable_pct"] = avg_renewable;
                out["summary"]["total_carbon_kg"] = total_carbon;
                out["summary"]["waste_diversion_pct"] = waste_diversion_pct;
                out["summary"]["avg_recycled_material_pct"] = avg_recycled_mat;
                out["summary"]["sustainability_score"] = avg_score;
                out["recommendations"] = std::move(recs);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/sustainability").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Production Manager"})) {
                return http::err_res(403, "Only Administrator or Production Manager can log sustainability metrics");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string record_date = http::req_str(body, "record_date");
            std::string period_label = http::req_str(body, "period_label");
            int production_id = http::req_int(body, "production_id", 0);
            double water_c = http::req_dbl(body, "water_consumed_liters", -1.0);
            double water_r = http::req_dbl(body, "water_recycled_liters", 0.0);
            double elec = http::req_dbl(body, "electricity_kwh", -1.0);
            double renew_pct = http::req_dbl(body, "renewable_energy_pct", 50.0);
            double carbon = http::req_dbl(body, "carbon_emissions_kg", -1.0);
            double waste_g = http::req_dbl(body, "waste_generated_kg", -1.0);
            double waste_r = http::req_dbl(body, "waste_recycled_kg", 0.0);
            double rec_mat = http::req_dbl(body, "recycled_material_usage_pct", 50.0);
            std::string notes = http::req_str(body, "notes");

            if (record_date.empty() || period_label.empty() || water_c <= 0 || elec <= 0 || carbon < 0 || waste_g < 0) {
                return http::err_res(400, "Valid date, period label, and non-negative resource measurements are required");
            }

            double water_rec_pct = std::min(100.0, (water_r / water_c) * 100.0);
            double waste_div_pct = waste_g > 0 ? std::min(100.0, (waste_r / waste_g) * 100.0) : 100.0;
            double score = (water_rec_pct * 0.25) + (std::min(100.0, renew_pct) * 0.25) +
                           (waste_div_pct * 0.25) + (std::min(100.0, rec_mat) * 0.25);

            db::ParamValue prod_param = nullptr;
            if (production_id > 0) prod_param = production_id;

            try {
                auto res = database.execute(
                    "INSERT INTO Sustainability_Records (record_date, period_label, production_id, "
                    "water_consumed_liters, water_recycled_liters, electricity_kwh, renewable_energy_pct, "
                    "carbon_emissions_kg, waste_generated_kg, waste_recycled_kg, recycled_material_usage_pct, "
                    "sustainability_score, notes, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {record_date, period_label, prod_param, water_c, water_r, elec, renew_pct,
                     carbon, waste_g, waste_r, rec_mat, score, notes});

                http::log_activity(database, *user, "Sustainability", "Metrics Recorded",
                                   "Logged " + period_label + " environmental metrics (score " +
                                   std::to_string(static_cast<int>(score)) + ")");

                crow::json::wvalue out;
                out["record_id"] = static_cast<int>(res.last_insert_id);
                out["sustainability_score"] = score;
                out["message"] = "Sustainability record saved";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
