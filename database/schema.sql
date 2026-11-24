-- Sustainable Textile Manufacturing & Production Tracking System
-- Complete MySQL 8.0 / MariaDB Database Schema
-- 12 Core Relational Tables with Foreign Keys, Constraints & Indexes

CREATE DATABASE IF NOT EXISTS sustainable_textile_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE sustainable_textile_db;

-- 1. Users (Role-Based Access Control)
CREATE TABLE IF NOT EXISTS Users (
    user_id INT AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('Administrator', 'Production Manager', 'Inventory Manager') NOT NULL DEFAULT 'Production Manager',
    department VARCHAR(100) NOT NULL DEFAULT 'Operations',
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Suppliers
CREATE TABLE IF NOT EXISTS Suppliers (
    supplier_id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_code VARCHAR(32) NOT NULL UNIQUE,
    supplier_name VARCHAR(150) NOT NULL,
    contact_person VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL,
    phone VARCHAR(40) NOT NULL,
    country VARCHAR(80) NOT NULL,
    sustainability_cert VARCHAR(120) DEFAULT 'GOTS / OEKO-TEX 100',
    rating DECIMAL(3,2) NOT NULL DEFAULT 4.50,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 3. Materials (Raw Material Management)
CREATE TABLE IF NOT EXISTS Materials (
    material_id INT AUTO_INCREMENT PRIMARY KEY,
    material_code VARCHAR(32) NOT NULL UNIQUE,
    material_name VARCHAR(150) NOT NULL,
    category ENUM('Cotton', 'Polyester', 'Recycled Fibres', 'Dyes', 'Chemicals', 'Blended Yarn') NOT NULL,
    quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    consumed_quantity DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    unit VARCHAR(24) NOT NULL DEFAULT 'kg',
    reorder_level DECIMAL(12,2) NOT NULL DEFAULT 500.00,
    unit_cost DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    recycled_content_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    supplier_id INT NOT NULL,
    stock_status ENUM('In Stock', 'Low Stock', 'Out of Stock') NOT NULL DEFAULT 'In Stock',
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_materials_supplier FOREIGN KEY (supplier_id) REFERENCES Suppliers(supplier_id) ON UPDATE CASCADE ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 4. Production_Orders (Production Tracking)
CREATE TABLE IF NOT EXISTS Production_Orders (
    production_id INT AUTO_INCREMENT PRIMARY KEY,
    batch_number VARCHAR(40) NOT NULL UNIQUE,
    product_name VARCHAR(160) NOT NULL,
    fabric_type VARCHAR(100) NOT NULL,
    material_id INT NULL,
    target_quantity INT NOT NULL,
    completed_quantity INT NOT NULL DEFAULT 0,
    material_used_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    current_stage ENUM(
        'Raw Material Preparation',
        'Spinning',
        'Weaving',
        'Dyeing',
        'Processing',
        'Quality Inspection',
        'Packaging',
        'Final Delivery'
    ) NOT NULL DEFAULT 'Raw Material Preparation',
    progress_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    efficiency_pct DECIMAL(5,2) NOT NULL DEFAULT 92.00,
    status ENUM('Scheduled', 'In Progress', 'Completed', 'On Hold') NOT NULL DEFAULT 'Scheduled',
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    completed_date DATE NULL,
    assigned_manager_id INT NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_prod_material FOREIGN KEY (material_id) REFERENCES Materials(material_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_prod_manager FOREIGN KEY (assigned_manager_id) REFERENCES Users(user_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 5. Production_Stages (Detailed 8-Stage Timeline per Batch)
CREATE TABLE IF NOT EXISTS Production_Stages (
    stage_id INT AUTO_INCREMENT PRIMARY KEY,
    production_id INT NOT NULL,
    stage_order TINYINT NOT NULL,
    stage_name ENUM(
        'Raw Material Preparation',
        'Spinning',
        'Weaving',
        'Dyeing',
        'Processing',
        'Quality Inspection',
        'Packaging',
        'Final Delivery'
    ) NOT NULL,
    stage_status ENUM('Pending', 'In Progress', 'Completed') NOT NULL DEFAULT 'Pending',
    operator_name VARCHAR(100) DEFAULT 'Shift Team A',
    started_at DATETIME NULL,
    completed_at DATETIME NULL,
    notes VARCHAR(255) NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT fk_stage_production FOREIGN KEY (production_id) REFERENCES Production_Orders(production_id) ON UPDATE CASCADE ON DELETE CASCADE,
    UNIQUE KEY uq_prod_stage (production_id, stage_order)
) ENGINE=InnoDB;

-- 6. Machines (Machine Management)
CREATE TABLE IF NOT EXISTS Machines (
    machine_id INT AUTO_INCREMENT PRIMARY KEY,
    machine_code VARCHAR(32) NOT NULL UNIQUE,
    machine_name VARCHAR(140) NOT NULL,
    machine_type ENUM('Spinning Frame', 'Air-Jet Loom', 'Dyeing Vat', 'Finishing Stenter', 'Carding Unit', 'Inspection Table') NOT NULL,
    plant_zone VARCHAR(80) NOT NULL DEFAULT 'Zone A',
    status ENUM('Running', 'Idle', 'Under Maintenance', 'Breakdown') NOT NULL DEFAULT 'Running',
    operating_hours DECIMAL(10,1) NOT NULL DEFAULT 0.0,
    utilization_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    downtime_hours DECIMAL(8,1) NOT NULL DEFAULT 0.0,
    energy_rating_kw DECIMAL(8,2) NOT NULL DEFAULT 45.00,
    last_maintenance_date DATE NULL,
    next_maintenance_date DATE NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Machine_Maintenance (Schedules & Breakdown Logs)
CREATE TABLE IF NOT EXISTS Machine_Maintenance (
    maintenance_id INT AUTO_INCREMENT PRIMARY KEY,
    machine_id INT NOT NULL,
    maintenance_type ENUM('Preventive', 'Corrective', 'Breakdown Repair', 'Calibration') NOT NULL,
    description TEXT NOT NULL,
    technician_name VARCHAR(120) NOT NULL,
    downtime_hours DECIMAL(6,2) NOT NULL DEFAULT 0.00,
    cost_usd DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    scheduled_date DATE NOT NULL,
    completed_date DATE NULL,
    status ENUM('Scheduled', 'In Progress', 'Completed') NOT NULL DEFAULT 'Scheduled',
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_maint_machine FOREIGN KEY (machine_id) REFERENCES Machines(machine_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 8. Quality_Inspections (Quality Control)
CREATE TABLE IF NOT EXISTS Quality_Inspections (
    inspection_id INT AUTO_INCREMENT PRIMARY KEY,
    inspection_code VARCHAR(36) NOT NULL UNIQUE,
    production_id INT NOT NULL,
    batch_number VARCHAR(40) NOT NULL,
    inspector_name VARCHAR(120) NOT NULL,
    total_inspected INT NOT NULL,
    passed_count INT NOT NULL,
    rejected_count INT NOT NULL,
    defect_rate_pct DECIMAL(5,2) NOT NULL,
    primary_defect_type VARCHAR(120) DEFAULT 'None',
    decision ENUM('Approved', 'Rejected', 'Conditional Rework') NOT NULL DEFAULT 'Approved',
    inspection_date DATE NOT NULL,
    remarks VARCHAR(255) NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_qc_production FOREIGN KEY (production_id) REFERENCES Production_Orders(production_id) ON UPDATE CASCADE ON DELETE CASCADE
) ENGINE=InnoDB;

-- 9. Inventory (Finished Goods & Warehouse Stock)
CREATE TABLE IF NOT EXISTS Inventory (
    inventory_id INT AUTO_INCREMENT PRIMARY KEY,
    sku VARCHAR(40) NOT NULL UNIQUE,
    product_name VARCHAR(160) NOT NULL,
    category ENUM('Organic Woven', 'Recycled Knit', 'Technical Textile', 'Denim & Twill', 'Home Textile') NOT NULL,
    production_id INT NULL,
    quantity INT NOT NULL DEFAULT 0,
    unit VARCHAR(24) NOT NULL DEFAULT 'meters',
    reorder_threshold INT NOT NULL DEFAULT 300,
    warehouse_location VARCHAR(80) NOT NULL DEFAULT 'WH-A1',
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 12.50,
    stock_status ENUM('Available', 'Low Stock', 'Reserved', 'Out of Stock') NOT NULL DEFAULT 'Available',
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_inv_production FOREIGN KEY (production_id) REFERENCES Production_Orders(production_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 10. Sustainability_Records (Environmental Impact Tracking)
CREATE TABLE IF NOT EXISTS Sustainability_Records (
    record_id INT AUTO_INCREMENT PRIMARY KEY,
    record_date DATE NOT NULL,
    period_label VARCHAR(32) NOT NULL,
    production_id INT NULL,
    water_consumed_liters DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    water_recycled_liters DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    electricity_kwh DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    renewable_energy_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    carbon_emissions_kg DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    waste_generated_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    waste_recycled_kg DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    recycled_material_usage_pct DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    sustainability_score DECIMAL(5,2) NOT NULL DEFAULT 0.00,
    notes VARCHAR(255) NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sust_production FOREIGN KEY (production_id) REFERENCES Production_Orders(production_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 11. Customer_Orders (Order Management)
CREATE TABLE IF NOT EXISTS Customer_Orders (
    order_id INT AUTO_INCREMENT PRIMARY KEY,
    order_number VARCHAR(36) NOT NULL UNIQUE,
    customer_name VARCHAR(150) NOT NULL,
    customer_email VARCHAR(160) NOT NULL,
    product_name VARCHAR(160) NOT NULL,
    inventory_id INT NULL,
    production_id INT NULL,
    quantity INT NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    order_status ENUM('Pending', 'Processing', 'Completed', 'Shipped', 'Delivered') NOT NULL DEFAULT 'Pending',
    order_date DATE NOT NULL,
    delivery_date DATE NOT NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_order_inventory FOREIGN KEY (inventory_id) REFERENCES Inventory(inventory_id) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT fk_order_production FOREIGN KEY (production_id) REFERENCES Production_Orders(production_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

-- 12. Activity_Logs (Audit Trail & Dashboard Recent Activities)
CREATE TABLE IF NOT EXISTS Activity_Logs (
    log_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    actor_name VARCHAR(120) NOT NULL DEFAULT 'System',
    module_name VARCHAR(64) NOT NULL,
    action_type VARCHAR(48) NOT NULL,
    description VARCHAR(255) NOT NULL,
    is_sample_data BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_log_user FOREIGN KEY (user_id) REFERENCES Users(user_id) ON UPDATE CASCADE ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE INDEX idx_materials_status ON Materials(stock_status);
CREATE INDEX idx_production_status ON Production_Orders(status);
CREATE INDEX idx_machines_status ON Machines(status);
CREATE INDEX idx_sust_date ON Sustainability_Records(record_date);
CREATE INDEX idx_orders_status ON Customer_Orders(order_status);
CREATE INDEX idx_logs_created ON Activity_Logs(created_at DESC);
