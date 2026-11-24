#pragma once

#include <string>
#include <vector>
#include <algorithm>

namespace textile::models {

inline const std::vector<std::string> PRODUCTION_STAGES = {
    "Raw Material Preparation",
    "Spinning",
    "Weaving",
    "Dyeing",
    "Processing",
    "Quality Inspection",
    "Packaging",
    "Final Delivery"
};

inline const std::vector<std::string> MATERIAL_CATEGORIES = {
    "Cotton", "Polyester", "Recycled Fibres", "Dyes", "Chemicals", "Blended Yarn"
};

inline const std::vector<std::string> MACHINE_TYPES = {
    "Spinning Frame", "Air-Jet Loom", "Dyeing Vat", "Finishing Stenter", "Carding Unit", "Inspection Table"
};

inline const std::vector<std::string> MACHINE_STATUSES = {
    "Running", "Idle", "Under Maintenance", "Breakdown"
};

inline const std::vector<std::string> INVENTORY_CATEGORIES = {
    "Organic Woven", "Recycled Knit", "Technical Textile", "Denim & Twill", "Home Textile"
};

inline const std::vector<std::string> ORDER_STATUSES = {
    "Pending", "Processing", "Completed", "Shipped", "Delivered"
};

inline const std::vector<std::string> USER_ROLES = {
    "Administrator", "Production Manager", "Inventory Manager"
};

inline int stage_index(const std::string& stage_name) {
    for (size_t i = 0; i < PRODUCTION_STAGES.size(); ++i) {
        if (PRODUCTION_STAGES[i] == stage_name) return static_cast<int>(i) + 1;
    }
    return 1;
}

inline double compute_stage_progress(const std::string& stage_name, const std::string& status) {
    if (status == "Completed") return 100.0;
    int idx = stage_index(stage_name);
    return (static_cast<double>(idx) / static_cast<double>(PRODUCTION_STAGES.size())) * 100.0;
}

inline std::string compute_material_stock_status(double qty, double reorder_level) {
    if (qty <= 0.0) return "Out of Stock";
    if (qty <= reorder_level) return "Low Stock";
    return "In Stock";
}

inline std::string compute_inventory_status(int qty, int threshold) {
    if (qty <= 0) return "Out of Stock";
    if (qty <= threshold) return "Low Stock";
    return "Available";
}

} // namespace textile::models
