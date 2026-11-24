import type {
  CustomerOrder,
  DashboardData,
  InventoryItem,
  Machine,
  MaintenanceRecord,
  Material,
  ProductionOrder,
  QualityInspection,
  QualitySummary,
  ReportPayload,
  Supplier,
  SustainabilityRecord,
  SustainabilitySummary,
  User,
} from '../types';

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
}

export function getAuthToken(): string | null {
  return authToken;
}

async function apiRequest<T>(path: string, options: RequestInit = {}, attempt = 0): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };

  if (authToken) {
    headers['Authorization'] = `Bearer ${authToken}`;
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const rawText = await res.text();
  const contentType = res.headers.get('content-type') || '';
  const looksLikeJson =
    contentType.includes('application/json') ||
    rawText.trim().startsWith('{') ||
    rawText.trim().startsWith('[');

  let parsed: Record<string, unknown> | null = null;
  if (looksLikeJson && rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      parsed = null;
    }
  }

  if ((res.status === 502 || res.status === 503 || res.status === 504) && attempt < 2) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return apiRequest<T>(path, options, attempt + 1);
  }

  if (!res.ok) {
    if (parsed && typeof parsed.error === 'string') {
      throw new Error(parsed.error);
    }
    if (res.status === 502 || res.status === 503 || res.status === 504) {
      throw new Error(
        'C++ backend service is starting up or temporarily unreachable. Please wait a moment and try again.',
      );
    }
    throw new Error(`Request failed (${res.status})`);
  }

  if (!parsed) {
    throw new Error(
      'Received an unexpected non-JSON response from the server. Ensure the C++ backend is running.',
    );
  }

  return parsed as T;
}

export const api = {
  // Authentication
  login: (email: string, password: string) =>
    apiRequest<{token: string; user: User}>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({email, password}),
    }),

  register: (payload: {
    full_name: string;
    email: string;
    password: string;
    role: string;
    department: string;
  }) =>
    apiRequest<{token: string; user: User}>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  me: () => apiRequest<User>('/api/auth/me'),

  // Dashboard
  getDashboard: () => apiRequest<DashboardData>('/api/dashboard'),

  // Materials & Suppliers
  getMaterials: () => apiRequest<{materials: Material[]}>('/api/materials'),
  getSuppliers: () => apiRequest<{suppliers: Supplier[]}>('/api/suppliers'),
  createMaterial: (payload: Record<string, unknown>) =>
    apiRequest<{material_id: number; stock_status: string; message: string}>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMaterial: (id: number, payload: Record<string, unknown>) =>
    apiRequest<{stock_status: string; message: string}>(`/api/materials/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteMaterial: (id: number) =>
    apiRequest<{message: string}>(`/api/materials/${id}`, {method: 'DELETE'}),

  // Production Tracking
  getProduction: () => apiRequest<{orders: ProductionOrder[]}>('/api/production'),
  createProduction: (payload: Record<string, unknown>) =>
    apiRequest<{production_id: number; progress_pct: number; message: string}>('/api/production', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateProduction: (id: number, payload: Record<string, unknown>) =>
    apiRequest<{progress_pct: number; message: string}>(`/api/production/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  deleteProduction: (id: number) =>
    apiRequest<{message: string}>(`/api/production/${id}`, {method: 'DELETE'}),

  // Machines & Maintenance
  getMachines: () =>
    apiRequest<{machines: Machine[]; maintenance: MaintenanceRecord[]}>('/api/machines'),
  createMachine: (payload: Record<string, unknown>) =>
    apiRequest<{machine_id: number; message: string}>('/api/machines', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateMachine: (id: number, payload: Record<string, unknown>) =>
    apiRequest<{message: string}>(`/api/machines/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),
  createMaintenance: (payload: Record<string, unknown>) =>
    apiRequest<{maintenance_id: number; message: string}>('/api/machines/maintenance', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // Quality Control
  getQuality: () =>
    apiRequest<{summary: QualitySummary; inspections: QualityInspection[]}>('/api/quality'),
  createQuality: (payload: Record<string, unknown>) =>
    apiRequest<{inspection_id: number; defect_rate_pct: number; passed_count: number; message: string}>(
      '/api/quality',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  // Inventory
  getInventory: () => apiRequest<{inventory: InventoryItem[]}>('/api/inventory'),
  createInventory: (payload: Record<string, unknown>) =>
    apiRequest<{inventory_id: number; stock_status: string; message: string}>('/api/inventory', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateInventory: (id: number, payload: Record<string, unknown>) =>
    apiRequest<{stock_status: string; message: string}>(`/api/inventory/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Sustainability
  getSustainability: () =>
    apiRequest<{
      records: SustainabilityRecord[];
      summary: SustainabilitySummary;
      recommendations: string[];
    }>('/api/sustainability'),
  createSustainability: (payload: Record<string, unknown>) =>
    apiRequest<{record_id: number; sustainability_score: number; message: string}>(
      '/api/sustainability',
      {
        method: 'POST',
        body: JSON.stringify(payload),
      },
    ),

  // Customer Orders
  getOrders: () => apiRequest<{orders: CustomerOrder[]}>('/api/orders'),
  createOrder: (payload: Record<string, unknown>) =>
    apiRequest<{order_id: number; message: string}>('/api/orders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  updateOrder: (id: number, payload: Record<string, unknown>) =>
    apiRequest<{message: string}>(`/api/orders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    }),

  // Reports
  getReport: (reportType: string) =>
    apiRequest<ReportPayload>(`/api/reports?type=${encodeURIComponent(reportType)}`),

  downloadReportCsv: async (reportType: string) => {
    const headers: Record<string, string> = {};
    if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
    const res = await fetch(`/api/reports?type=${encodeURIComponent(reportType)}&format=csv`, {
      headers,
    });
    if (!res.ok) throw new Error('Failed to export CSV report');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${reportType}_report.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};
