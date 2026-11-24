-- Realistic Sample Data for Sustainable Textile Manufacturing & Production Tracking System
-- All seeded records carry is_sample_data = TRUE so the application clearly distinguishes
-- baseline demonstration records from live operator entries (is_sample_data = FALSE).

USE sustainable_textile_db;

-- Suppliers
INSERT IGNORE INTO Suppliers (supplier_id, supplier_code, supplier_name, contact_person, email, phone, country, sustainability_cert, rating, is_sample_data) VALUES
(1, 'SUP-001', 'Verdant Fibre Mills Ltd.', 'Aarav Mehta', 'supply@verdantfibres.com', '+91-421-2481920', 'India', 'GOTS Certified Organic', 4.85, TRUE),
(2, 'SUP-002', 'Nordic EcoPoly Polymers', 'Ingrid Lindqvist', 'orders@nordicecopoly.se', '+46-8-5012-4410', 'Sweden', 'GRS 4.0 Recycled', 4.72, TRUE),
(3, 'SUP-003', 'Botanica Bio-Dyes GmbH', 'Lukas Weber', 'desk@botanicadyes.de', '+49-69-8840-210', 'Germany', 'ZDHC Level 3 / OEKO-TEX', 4.90, TRUE),
(4, 'SUP-004', 'Anatolia Regenerated Yarns', 'Selin Kaya', 'export@anatoliayarns.tr', '+90-232-441-9032', 'Turkey', 'BCI & FairTrade Textile', 4.64, TRUE);

-- Users (Passwords use salted SHA-256 format matching backend auth module: sha256$<salt>$<hash>)
-- Note: Default operator accounts can also be registered via /api/auth/register;
-- Admin bootstrap / demo credentials are documented in README.md and login form quick-fill for capstone testing.
INSERT IGNORE INTO Users (user_id, full_name, email, password_hash, role, department, is_active, is_sample_data) VALUES
(1, 'Elena Vance', 'admin@ecoweave.io', 'sha256$ecoweave_salt_01$6ddf27e2c4c08b904c3570d644f2595f64c47d15c287a48966206e094b24f027', 'Administrator', 'Executive Operations', TRUE, TRUE),
(2, 'Marcus Chen', 'production@ecoweave.io', 'sha256$ecoweave_salt_02$861b61a751a85a4313fb643adbfee324aa23342f92c70c824358b9836d36d286', 'Production Manager', 'Spinning & Weaving Floor', TRUE, TRUE),
(3, 'Priya Nair', 'inventory@ecoweave.io', 'sha256$ecoweave_salt_03$77daa4812a3d5999c1e4b82bf0185539478475b63aa478ff23f9912c5461fcfc', 'Inventory Manager', 'Central Warehouse & Logistics', TRUE, TRUE);

-- Raw Materials
INSERT IGNORE INTO Materials (material_id, material_code, material_name, category, quantity, consumed_quantity, unit, reorder_level, unit_cost, recycled_content_pct, supplier_id, stock_status, is_sample_data) VALUES
(1, 'MAT-101', 'GOTS Organic Combed Cotton', 'Cotton', 14800.00, 6240.00, 'kg', 4000.00, 3.85, 15.00, 1, 'In Stock', TRUE),
(2, 'MAT-102', 'rPET Post-Consumer Filament', 'Recycled Fibres', 9450.00, 4120.00, 'kg', 3000.00, 2.95, 100.00, 2, 'In Stock', TRUE),
(3, 'MAT-103', 'Recycled Virgin Wool-Cotton Blend', 'Recycled Fibres', 1850.00, 2900.00, 'kg', 2500.00, 5.40, 82.00, 4, 'Low Stock', TRUE),
(4, 'MAT-104', 'Low-Impact Reactive Indigo Dye', 'Dyes', 620.00, 880.00, 'liters', 750.00, 18.50, 0.00, 3, 'Low Stock', TRUE),
(5, 'MAT-105', 'High-Tenacity Recycled Polyester', 'Polyester', 11200.00, 3850.00, 'kg', 3500.00, 2.40, 65.00, 2, 'In Stock', TRUE),
(6, 'MAT-106', 'Bio-Enzymatic Scouring Agent', 'Chemicals', 2400.00, 910.00, 'liters', 800.00, 9.75, 0.00, 3, 'In Stock', TRUE),
(7, 'MAT-107', 'Emerald Botanical Vat Dye', 'Dyes', 480.00, 640.00, 'liters', 500.00, 22.00, 0.00, 3, 'Low Stock', TRUE),
(8, 'MAT-108', 'Hemp-Cotton Slub Yarn', 'Blended Yarn', 6300.00, 1980.00, 'kg', 2000.00, 4.65, 45.00, 1, 'In Stock', TRUE);

-- Production Orders (Batches)
INSERT IGNORE INTO Production_Orders (production_id, batch_number, product_name, fabric_type, material_id, target_quantity, completed_quantity, material_used_kg, current_stage, progress_pct, efficiency_pct, status, start_date, due_date, completed_date, assigned_manager_id, is_sample_data) VALUES
(1, 'BATCH-2026-041', 'Organic Canvas Twill 320gsm', '100% GOTS Organic Cotton', 1, 5000, 5000, 2150.00, 'Final Delivery', 100.00, 95.40, 'Completed', '2026-10-18', '2026-11-04', '2026-11-03', 2, TRUE),
(2, 'BATCH-2026-042', 'rPET Ripstop Performance Shell', '100% Recycled Polyester', 2, 4200, 3360, 1480.00, 'Quality Inspection', 75.00, 93.80, 'In Progress', '2026-11-02', '2026-11-26', NULL, 2, TRUE),
(3, 'BATCH-2026-043', 'Botanical Emerald Poplin', 'Organic Cotton-Hemp Blend', 8, 6500, 3900, 1920.00, 'Dyeing', 50.00, 91.20, 'In Progress', '2026-11-08', '2026-12-01', NULL, 2, TRUE),
(4, 'BATCH-2026-044', 'Regenerated Denim 12oz Indigo', 'Recycled Cotton-rPET', 3, 3800, 1140, 1340.00, 'Weaving', 37.50, 88.60, 'In Progress', '2026-11-12', '2026-12-06', NULL, 2, TRUE),
(5, 'BATCH-2026-045', 'Bamboo-Cotton Interlock Knit', 'Combed Organic Blend', 1, 4800, 4800, 1790.00, 'Final Delivery', 100.00, 96.10, 'Completed', '2026-10-22', '2026-11-10', '2026-11-09', 2, TRUE),
(6, 'BATCH-2026-046', 'Circular Fleece Lining 280gsm', 'Recycled Poly-Cotton', 5, 3200, 640, 820.00, 'Spinning', 25.00, 89.50, 'In Progress', '2026-11-16', '2026-12-12', NULL, 2, TRUE),
(7, 'BATCH-2026-047', 'Unbleached Muslin Filtration Cloth', 'Raw Organic Cotton', 1, 5500, 0, 0.00, 'Raw Material Preparation', 12.50, 90.00, 'Scheduled', '2026-11-21', '2026-12-18', NULL, 2, TRUE);

-- Production Stages for Batch 2 (Quality Inspection = stage 6) & Batch 3 (Dyeing = stage 4)
INSERT IGNORE INTO Production_Stages (production_id, stage_order, stage_name, stage_status, operator_name, is_sample_data) VALUES
(1, 1, 'Raw Material Preparation', 'Completed', 'Team Alpha', TRUE),
(1, 2, 'Spinning', 'Completed', 'Team Alpha', TRUE),
(1, 3, 'Weaving', 'Completed', 'Team Bravo', TRUE),
(1, 4, 'Dyeing', 'Completed', 'Team EcoDye', TRUE),
(1, 5, 'Processing', 'Completed', 'Team Finish', TRUE),
(1, 6, 'Quality Inspection', 'Completed', 'QC Unit 1', TRUE),
(1, 7, 'Packaging', 'Completed', 'Logistics B', TRUE),
(1, 8, 'Final Delivery', 'Completed', 'Dispatch Hub', TRUE),
(2, 1, 'Raw Material Preparation', 'Completed', 'Team Alpha', TRUE),
(2, 2, 'Spinning', 'Completed', 'Team Alpha', TRUE),
(2, 3, 'Weaving', 'Completed', 'Team Bravo', TRUE),
(2, 4, 'Dyeing', 'Completed', 'Team EcoDye', TRUE),
(2, 5, 'Processing', 'Completed', 'Team Finish', TRUE),
(2, 6, 'Quality Inspection', 'In Progress', 'QC Unit 2', TRUE),
(2, 7, 'Packaging', 'Pending', 'Logistics A', TRUE),
(2, 8, 'Final Delivery', 'Pending', 'Dispatch Hub', TRUE),
(3, 1, 'Raw Material Preparation', 'Completed', 'Team Alpha', TRUE),
(3, 2, 'Spinning', 'Completed', 'Team Alpha', TRUE),
(3, 3, 'Weaving', 'Completed', 'Team Bravo', TRUE),
(3, 4, 'Dyeing', 'In Progress', 'Team EcoDye', TRUE),
(3, 5, 'Processing', 'Pending', 'Team Finish', TRUE),
(3, 6, 'Quality Inspection', 'Pending', 'QC Unit 1', TRUE),
(3, 7, 'Packaging', 'Pending', 'Logistics A', TRUE),
(3, 8, 'Final Delivery', 'Pending', 'Dispatch Hub', TRUE);

-- Machines
INSERT IGNORE INTO Machines (machine_id, machine_code, machine_name, machine_type, plant_zone, status, operating_hours, utilization_pct, downtime_hours, energy_rating_kw, last_maintenance_date, next_maintenance_date, is_sample_data) VALUES
(1, 'MCH-01', 'Rieter G37 Ring Spinner #1', 'Spinning Frame', 'Spinning Hall A', 'Running', 4280.5, 93.40, 18.5, 58.00, '2026-10-15', '2026-12-15', TRUE),
(2, 'MCH-02', 'Picanol OmniPlus Air-Jet Loom #4', 'Air-Jet Loom', 'Weaving Floor B', 'Running', 5120.0, 95.80, 12.0, 42.50, '2026-10-28', '2026-12-28', TRUE),
(3, 'MCH-03', 'Picanol OmniPlus Air-Jet Loom #7', 'Air-Jet Loom', 'Weaving Floor B', 'Running', 4890.2, 91.20, 24.5, 42.50, '2026-11-01', '2027-01-01', TRUE),
(4, 'MCH-04', 'Thies Eco-Flow Jet Dyeing Vat #2', 'Dyeing Vat', 'Wet Processing C', 'Running', 3640.0, 87.60, 31.0, 74.00, '2026-10-09', '2026-11-29', TRUE),
(5, 'MCH-05', 'Bruckner Power-Frame Stenter #1', 'Finishing Stenter', 'Finishing Zone D', 'Under Maintenance', 6110.8, 64.50, 76.0, 85.00, '2026-11-20', '2026-11-24', TRUE),
(6, 'MCH-06', 'Trutzschler TC19i Carding Line', 'Carding Unit', 'Prep Hall A', 'Idle', 2980.4, 78.90, 19.0, 36.00, '2026-11-05', '2027-01-05', TRUE),
(7, 'MCH-07', 'Thies Eco-Flow Jet Dyeing Vat #3', 'Dyeing Vat', 'Wet Processing C', 'Breakdown', 4410.0, 52.30, 94.5, 74.00, '2026-09-18', '2026-11-23', TRUE),
(8, 'MCH-08', 'Shelton Vision Optical Inspector', 'Inspection Table', 'QC Lab E', 'Running', 3150.0, 89.70, 9.5, 14.50, '2026-11-10', '2027-01-10', TRUE);

-- Machine Maintenance Records
INSERT IGNORE INTO Machine_Maintenance (maintenance_id, machine_id, maintenance_type, description, technician_name, downtime_hours, cost_usd, scheduled_date, completed_date, status, is_sample_data) VALUES
(1, 5, 'Preventive', 'Thermal heat-recovery exchanger cleaning & tension roller calibration', 'Rohan Kulkarni', 8.50, 640.00, '2026-11-20', NULL, 'In Progress', TRUE),
(2, 7, 'Breakdown Repair', 'Circulation pump mechanical seal failure under pressure cycle', 'Elena Rostova', 14.00, 1420.00, '2026-11-21', NULL, 'In Progress', TRUE),
(3, 2, 'Preventive', 'Compressed air nozzle manifold inspection and reed alignment', 'Rohan Kulkarni', 3.00, 210.00, '2026-10-28', '2026-10-28', 'Completed', TRUE),
(4, 4, 'Calibration', 'Closed-loop dye liquor flow meter & pH sensor calibration', 'Tariq Al-Mansoor', 2.50, 185.00, '2026-11-29', NULL, 'Scheduled', TRUE);

-- Quality Inspections
INSERT IGNORE INTO Quality_Inspections (inspection_id, inspection_code, production_id, batch_number, inspector_name, total_inspected, passed_count, rejected_count, defect_rate_pct, primary_defect_type, decision, inspection_date, remarks, is_sample_data) VALUES
(1, 'QC-2026-081', 1, 'BATCH-2026-041', 'Dr. Ananya Rao', 5000, 4915, 85, 1.70, 'Minor Selvedge Tension', 'Approved', '2026-11-02', 'Exceeds ISO 9001 GSM tolerance', TRUE),
(2, 'QC-2026-082', 5, 'BATCH-2026-045', 'Dr. Ananya Rao', 4800, 4742, 58, 1.21, 'Yarn Slub Variance', 'Approved', '2026-11-08', 'Zero pilling after 20-wash test', TRUE),
(3, 'QC-2026-083', 2, 'BATCH-2026-042', 'Victor Morales', 3360, 3266, 94, 2.80, 'Weft Skew > 1.5%', 'Conditional Rework', '2026-11-19', '94m routed to secondary finishing', TRUE),
(4, 'QC-2026-084', 3, 'BATCH-2026-043', 'Victor Morales', 1200, 1134, 66, 5.50, 'Dye Shade Delta E > 1.2', 'Rejected', '2026-11-20', 'Vat #3 valve fault caused uneven uptake', TRUE);

-- Finished Goods Inventory
INSERT IGNORE INTO Inventory (inventory_id, sku, product_name, category, production_id, quantity, unit, reorder_threshold, warehouse_location, unit_price, stock_status, is_sample_data) VALUES
(1, 'SKU-ORG-320', 'Organic Canvas Twill 320gsm', 'Organic Woven', 1, 4850, 'meters', 1000, 'WH-A1 (Bay 04)', 14.80, 'Available', TRUE),
(2, 'SKU-BAM-210', 'Bamboo-Cotton Interlock Knit', 'Recycled Knit', 5, 4120, 'meters', 1200, 'WH-A2 (Bay 11)', 11.40, 'Available', TRUE),
(3, 'SKU-RPT-180', 'rPET Ripstop Performance Shell', 'Technical Textile', 2, 1680, 'meters', 1500, 'WH-B1 (Bay 02)', 16.90, 'Available', TRUE),
(4, 'SKU-DEN-12Z', 'Regenerated Denim 12oz Indigo', 'Denim & Twill', 4, 640, 'meters', 900, 'WH-B3 (Bay 07)', 18.25, 'Low Stock', TRUE),
(5, 'SKU-HEM-240', 'Hemp-Cotton Home Upholstery', 'Home Textile', NULL, 2390, 'meters', 800, 'WH-C1 (Bay 09)', 15.50, 'Available', TRUE);

-- Sustainability Records (Monthly & Recent Operational Snapshots)
INSERT IGNORE INTO Sustainability_Records (record_id, record_date, period_label, production_id, water_consumed_liters, water_recycled_liters, electricity_kwh, renewable_energy_pct, carbon_emissions_kg, waste_generated_kg, waste_recycled_kg, recycled_material_usage_pct, sustainability_score, notes, is_sample_data) VALUES
(1, '2026-06-15', 'Jun 2026', NULL, 142000.00, 68160.00, 48500.00, 42.00, 21800.00, 1450.00, 980.00, 48.00, 76.40, 'Baseline summer dye house load', TRUE),
(2, '2026-07-15', 'Jul 2026', NULL, 134500.00, 71285.00, 46800.00, 46.50, 20150.00, 1320.00, 960.00, 52.50, 79.80, 'Solar rooftop Phase 1 online', TRUE),
(3, '2026-08-15', 'Aug 2026', NULL, 126800.00, 73544.00, 44900.00, 51.00, 18600.00, 1210.00, 945.00, 56.00, 82.60, 'Closed-loop rinse recovery active', TRUE),
(4, '2026-09-15', 'Sep 2026', NULL, 118400.00, 74592.00, 42600.00, 55.20, 16950.00, 1080.00, 895.00, 61.00, 85.30, 'Enzymatic bio-scouring rollout', TRUE),
(5, '2026-10-15', 'Oct 2026', 1, 109200.00, 73164.00, 40400.00, 59.80, 15200.00, 940.00, 818.00, 64.50, 88.10, 'Batch 041 zero-discharge cycle', TRUE),
(6, '2026-11-18', 'Nov 2026', 2, 98600.00, 69020.00, 38100.00, 63.40, 13840.00, 845.00, 760.00, 68.20, 90.40, 'Current month rPET & organic runs', TRUE);

-- Customer Orders
INSERT IGNORE INTO Customer_Orders (order_id, order_number, customer_name, customer_email, product_name, inventory_id, production_id, quantity, total_amount, order_status, order_date, delivery_date, is_sample_data) VALUES
(1, 'ORD-2026-301', 'Patagonia European Supply', 'procurement@patagonia-eu.example', 'Organic Canvas Twill 320gsm', 1, 1, 2400, 35520.00, 'Delivered', '2026-10-20', '2026-11-08', TRUE),
(2, 'ORD-2026-302', 'Fjallraven Eco Apparel AB', 'sourcing@fjallraven.example', 'rPET Ripstop Performance Shell', 3, 2, 1800, 30420.00, 'Processing', '2026-11-05', '2026-11-29', TRUE),
(3, 'ORD-2026-303', 'Eileen Fisher Textiles', 'millops@eileenfisher.example', 'Bamboo-Cotton Interlock Knit', 2, 5, 1500, 17100.00, 'Shipped', '2026-11-01', '2026-11-24', TRUE),
(4, 'ORD-2026-304', 'Nudie Jeans Circular Co.', 'denim@nudiejeans.example', 'Regenerated Denim 12oz Indigo', 4, 4, 2200, 40150.00, 'Pending', '2026-11-15', '2026-12-10', TRUE),
(5, 'ORD-2026-305', 'Kvadrat Sustainable Interiors', 'orders@kvadrat.example', 'Hemp-Cotton Home Upholstery', 5, NULL, 950, 14725.00, 'Completed', '2026-11-10', '2026-11-25', TRUE);

-- Activity Logs
INSERT IGNORE INTO Activity_Logs (log_id, user_id, actor_name, module_name, action_type, description, is_sample_data) VALUES
(1, 2, 'Marcus Chen', 'Production', 'Stage Advanced', 'BATCH-2026-042 moved to Quality Inspection (75% complete)', TRUE),
(2, 1, 'Elena Vance', 'Machines', 'Breakdown Alert', 'Thies Eco-Flow Jet Dyeing Vat #3 flagged Breakdown — repair dispatched', TRUE),
(3, 3, 'Priya Nair', 'Materials', 'Low Stock Alert', 'Low-Impact Reactive Indigo Dye fell below 750 L reorder threshold', TRUE),
(4, 2, 'Marcus Chen', 'Quality', 'Inspection Logged', 'QC-2026-083 recorded 2.80% defect rate on BATCH-2026-042', TRUE),
(5, 1, 'Elena Vance', 'Sustainability', 'Audit Recorded', 'November closed-loop water recycling reached 70.0% recovery', TRUE);
