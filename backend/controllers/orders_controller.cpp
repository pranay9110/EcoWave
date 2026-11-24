#include "controllers.hpp"
#include "http_helpers.hpp"
#include "domain_models.hpp"

namespace textile::controllers {

void register_orders_routes(crow::SimpleApp& app, db::Database& database, const AppConfig& cfg) {
    CROW_ROUTE(app, "/api/orders").methods(crow::HTTPMethod::GET)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");

            try {
                auto rows = database.query(
                    "SELECT o.order_id, o.order_number, o.customer_name, o.customer_email, o.product_name, "
                    "COALESCE(o.inventory_id, 0) AS inventory_id, COALESCE(o.production_id, 0) AS production_id, "
                    "COALESCE(p.batch_number, 'Unassigned') AS batch_number, "
                    "o.quantity, o.total_amount, o.order_status, "
                    "DATE_FORMAT(o.order_date, '%Y-%m-%d') AS order_date, "
                    "DATE_FORMAT(o.delivery_date, '%Y-%m-%d') AS delivery_date, "
                    "o.is_sample_data "
                    "FROM Customer_Orders o "
                    "LEFT JOIN Production_Orders p ON o.production_id = p.production_id "
                    "ORDER BY o.order_id DESC");

                crow::json::wvalue arr = crow::json::wvalue::list();
                for (size_t i = 0; i < rows.size(); ++i) {
                    arr[i]["order_id"] = rows[i].integer("order_id");
                    arr[i]["order_number"] = rows[i].str("order_number");
                    arr[i]["customer_name"] = rows[i].str("customer_name");
                    arr[i]["customer_email"] = rows[i].str("customer_email");
                    arr[i]["product_name"] = rows[i].str("product_name");
                    arr[i]["inventory_id"] = rows[i].integer("inventory_id");
                    arr[i]["production_id"] = rows[i].integer("production_id");
                    arr[i]["batch_number"] = rows[i].str("batch_number");
                    arr[i]["quantity"] = rows[i].integer("quantity");
                    arr[i]["total_amount"] = rows[i].dbl("total_amount");
                    arr[i]["order_status"] = rows[i].str("order_status");
                    arr[i]["order_date"] = rows[i].str("order_date");
                    arr[i]["delivery_date"] = rows[i].str("delivery_date");
                    arr[i]["is_sample_data"] = rows[i].boolean("is_sample_data");
                }
                crow::json::wvalue out;
                out["orders"] = std::move(arr);
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });

    CROW_ROUTE(app, "/api/orders").methods(crow::HTTPMethod::POST)(
        [&database, &cfg](const crow::request& req) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string order_num = http::req_str(body, "order_number");
            std::string cust_name = http::req_str(body, "customer_name");
            std::string cust_email = http::req_str(body, "customer_email");
            std::string product_name = http::req_str(body, "product_name");
            int inventory_id = http::req_int(body, "inventory_id", 0);
            int production_id = http::req_int(body, "production_id", 0);
            int quantity = http::req_int(body, "quantity", 0);
            double total_amount = http::req_dbl(body, "total_amount", 0.0);
            std::string status = http::req_str(body, "order_status", "Pending");
            std::string order_date = http::req_str(body, "order_date");
            std::string delivery_date = http::req_str(body, "delivery_date");

            if (order_num.empty() || cust_name.empty() || product_name.empty() || quantity <= 0 || order_date.empty() || delivery_date.empty()) {
                return http::err_res(400, "Order number, customer name, product, positive quantity, and dates are required");
            }
            if (!http::is_valid_enum(status, models::ORDER_STATUSES)) {
                return http::err_res(400, "Invalid order status");
            }

            db::ParamValue inv_param = nullptr;
            if (inventory_id > 0) inv_param = inventory_id;
            db::ParamValue prod_param = nullptr;
            if (production_id > 0) prod_param = production_id;

            try {
                auto res = database.execute(
                    "INSERT INTO Customer_Orders (order_number, customer_name, customer_email, product_name, "
                    "inventory_id, production_id, quantity, total_amount, order_status, order_date, delivery_date, is_sample_data) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, FALSE)",
                    {order_num, cust_name, cust_email, product_name, inv_param, prod_param,
                     quantity, total_amount, status, order_date, delivery_date});

                http::log_activity(database, *user, "Orders", "Order Created",
                                   "Created " + order_num + " for " + cust_name);

                crow::json::wvalue out;
                out["order_id"] = static_cast<int>(res.last_insert_id);
                out["message"] = "Customer order created";
                return http::json_res(201, out);
            } catch (const std::exception& e) {
                return http::err_res(400, std::string("Could not create order: ") + e.what());
            }
        });

    CROW_ROUTE(app, "/api/orders/<int>").methods(crow::HTTPMethod::PUT)(
        [&database, &cfg](const crow::request& req, int order_id) {
            auto user = http::authenticate(req, cfg);
            if (!user) return http::err_res(401, "Authentication required");
            if (!auth::has_role(*user, {"Administrator", "Inventory Manager", "Production Manager"})) {
                return http::err_res(403, "Insufficient role permissions");
            }

            auto body = crow::json::load(req.body);
            if (!body) return http::err_res(400, "Invalid JSON payload");

            std::string status = http::req_str(body, "order_status");
            int production_id = http::req_int(body, "production_id", 0);
            std::string delivery_date = http::req_str(body, "delivery_date");

            if (!http::is_valid_enum(status, models::ORDER_STATUSES)) {
                return http::err_res(400, "Invalid order status");
            }

            db::ParamValue prod_param = nullptr;
            if (production_id > 0) prod_param = production_id;

            try {
                auto res = database.execute(
                    "UPDATE Customer_Orders SET order_status=?, production_id=COALESCE(?, production_id), "
                    "delivery_date=COALESCE(NULLIF(?, ''), delivery_date), is_sample_data=FALSE WHERE order_id=?",
                    {status, prod_param, delivery_date, order_id});
                if (res.affected_rows == 0) return http::err_res(404, "Order not found");

                http::log_activity(database, *user, "Orders", "Order Updated",
                                   "Order #" + std::to_string(order_id) + " updated to " + status);

                crow::json::wvalue out;
                out["message"] = "Order updated";
                return http::json_res(200, out);
            } catch (const std::exception& e) {
                return http::err_res(500, e.what());
            }
        });
}

} // namespace textile::controllers
