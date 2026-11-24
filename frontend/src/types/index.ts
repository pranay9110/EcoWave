export type UserRole = 'Administrator' | 'Production Manager' | 'Inventory Manager';

export interface User {
  user_id: number;
  full_name: string;
  email: string;
  role: UserRole;
  department: string;
}

export interface DashboardData {
  kpis: {
    total_production: number;
    active_manufacturing_orders: number;
    raw_material_availability: number;
    machine_utilization: number;
    total_completed_products: number;
    pending_orders: number;
    production_efficiency: number;
    sustainability_score: number;
    running_machines: number;
    total_machines: number;
    sample_records: number;
    live_records: number;
  };
  daily_production: Array<{
    day: string;
    target: number;
    completed: number;
  }>;
  monthly_sustainability: Array<{
    month: string;
    water: number;
    energy: number;
    carbon: number;
    score: number;
  }>;
  machine_performance: Array<{
    code: string;
    name: string;
    utilization: number;
    hours: number;
    downtime: number;
    status: string;
  }>;
  status_distribution: Array<{
    status: string;
    count: number;
  }>;
  recent_activities: Array<{
    log_id: number;
    actor_name: string;
    module_name: string;
    action_type: string;
    description: string;
    is_sample_data: boolean;
    logged_at: string;
  }>;
  low_stock_alerts: Array<{
    source: string;
    code: string;
    name: string;
    quantity: number;
    reorder_level: number;
    unit: string;
    stock_status: string;
    is_sample_data: boolean;
  }>;
}

export interface Supplier {
  supplier_id: number;
  supplier_code: string;
  supplier_name: string;
  contact_person: string;
  email: string;
  phone: string;
  country: string;
  sustainability_cert: string;
  rating: number;
  is_sample_data: boolean;
}

export interface Material {
  material_id: number;
  material_code: string;
  material_name: string;
  category: string;
  quantity: number;
  consumed_quantity: number;
  unit: string;
  reorder_level: number;
  unit_cost: number;
  recycled_content_pct: number;
  supplier_id: number;
  supplier_name: string;
  sustainability_cert: string;
  stock_status: 'In Stock' | 'Low Stock' | 'Out of Stock';
  is_sample_data: boolean;
  updated_date: string;
}

export interface ProductionStageItem {
  stage_order: number;
  stage_name: string;
  stage_status: 'Pending' | 'In Progress' | 'Completed';
  operator_name: string;
}

export interface ProductionOrder {
  production_id: number;
  batch_number: string;
  product_name: string;
  fabric_type: string;
  material_id: number;
  material_name: string;
  target_quantity: number;
  completed_quantity: number;
  material_used_kg: number;
  current_stage: string;
  progress_pct: number;
  efficiency_pct: number;
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'On Hold';
  start_date: string;
  due_date: string;
  completed_date: string;
  is_sample_data: boolean;
  stages: ProductionStageItem[];
}

export interface Machine {
  machine_id: number;
  machine_code: string;
  machine_name: string;
  machine_type: string;
  plant_zone: string;
  status: 'Running' | 'Idle' | 'Under Maintenance' | 'Breakdown';
  operating_hours: number;
  utilization_pct: number;
  downtime_hours: number;
  energy_rating_kw: number;
  last_maintenance_date: string;
  next_maintenance_date: string;
  is_sample_data: boolean;
}

export interface MaintenanceRecord {
  maintenance_id: number;
  machine_id: number;
  machine_code: string;
  machine_name: string;
  maintenance_type: string;
  description: string;
  technician_name: string;
  downtime_hours: number;
  cost_usd: number;
  scheduled_date: string;
  completed_date: string;
  status: string;
  is_sample_data: boolean;
}

export interface QualityInspection {
  inspection_id: number;
  inspection_code: string;
  production_id: number;
  batch_number: string;
  product_name: string;
  inspector_name: string;
  total_inspected: number;
  passed_count: number;
  rejected_count: number;
  defect_rate_pct: number;
  primary_defect_type: string;
  decision: 'Approved' | 'Rejected' | 'Conditional Rework';
  inspection_date: string;
  remarks: string;
  is_sample_data: boolean;
}

export interface QualitySummary {
  total_inspected: number;
  passed_products: number;
  rejected_products: number;
  defect_rate_pct: number;
}

export interface InventoryItem {
  inventory_id: number;
  sku: string;
  product_name: string;
  category: string;
  production_id: number;
  batch_number: string;
  quantity: number;
  unit: string;
  reorder_threshold: number;
  warehouse_location: string;
  unit_price: number;
  stock_status: 'Available' | 'Low Stock' | 'Reserved' | 'Out of Stock';
  is_sample_data: boolean;
  last_updated: string;
}

export interface SustainabilityRecord {
  record_id: number;
  record_date: string;
  period_label: string;
  production_id: number;
  batch_number: string;
  water_consumed_liters: number;
  water_recycled_liters: number;
  electricity_kwh: number;
  renewable_energy_pct: number;
  carbon_emissions_kg: number;
  waste_generated_kg: number;
  waste_recycled_kg: number;
  recycled_material_usage_pct: number;
  sustainability_score: number;
  notes: string;
  is_sample_data: boolean;
}

export interface SustainabilitySummary {
  total_water_liters: number;
  water_recovery_pct: number;
  total_electricity_kwh: number;
  avg_renewable_pct: number;
  total_carbon_kg: number;
  waste_diversion_pct: number;
  avg_recycled_material_pct: number;
  sustainability_score: number;
}

export interface CustomerOrder {
  order_id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  inventory_id: number;
  production_id: number;
  batch_number: string;
  quantity: number;
  total_amount: number;
  order_status: 'Pending' | 'Processing' | 'Completed' | 'Shipped' | 'Delivered';
  order_date: string;
  delivery_date: string;
  is_sample_data: boolean;
}

export interface ReportPayload {
  report_type: string;
  headers: string[];
  rows: string[][];
}
