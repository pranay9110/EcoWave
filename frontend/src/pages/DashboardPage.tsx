import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  AlertTriangle,
  ArrowUpRight,
  Factory,
  Layers,
  Cog,
  CheckCircle2,
  Clock,
  Gauge,
  Leaf,
  ClipboardList,
} from 'lucide-react';
import type {DashboardData} from '../types';
import {OriginLabel, StatusText} from '../components/StatusText';
import type {ModuleKey} from '../layouts/DashboardLayout';

interface DashboardPageProps {
  data: DashboardData | null;
  loading: boolean;
  error: string | null;
  onNavigate: (module: ModuleKey) => void;
}

const PIE_COLORS = ['#064e3b', '#059669', '#0d9488', '#d97706'];

export function DashboardPage({data, loading, error, onNavigate}: DashboardPageProps) {
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({length: 8}).map((_, idx) => (
            <div key={idx} className="h-28 animate-pulse rounded-xl border border-emerald-900/10 bg-white/80" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="h-80 animate-pulse rounded-xl border border-emerald-900/10 bg-white/80" />
          <div className="h-80 animate-pulse rounded-xl border border-emerald-900/10 bg-white/80" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error || 'Unable to load dashboard telemetry from C++ backend.'}
      </div>
    );
  }

  const {kpis} = data;

  const kpiCards = [
    {
      label: 'Total Production Output',
      value: `${kpis.total_production.toLocaleString()} m`,
      sub: 'Cumulative milled fabric',
      target: 'production' as ModuleKey,
      icon: Factory,
      cardClass: 'border-emerald-800 bg-gradient-to-br from-emerald-900 to-emerald-950 text-white',
      labelClass: 'text-emerald-200',
      valueClass: 'text-white',
      subClass: 'text-emerald-200/80',
      iconBox: 'bg-emerald-800/80 text-emerald-200',
      arrowClass: 'text-emerald-300 group-hover:text-white',
    },
    {
      label: 'Active Manufacturing Orders',
      value: String(kpis.active_manufacturing_orders),
      sub: 'Scheduled & in-progress lots',
      target: 'production' as ModuleKey,
      icon: ClipboardList,
      cardClass: 'border-teal-200 bg-gradient-to-br from-white to-teal-50/80 text-slate-900',
      labelClass: 'text-teal-800',
      valueClass: 'text-slate-900',
      subClass: 'text-slate-600',
      iconBox: 'bg-teal-100 text-teal-800',
      arrowClass: 'text-teal-400 group-hover:text-teal-700',
    },
    {
      label: 'Raw Material Availability',
      value: `${Math.round(kpis.raw_material_availability).toLocaleString()} kg/L`,
      sub: 'On-hand fibres & dyes',
      target: 'materials' as ModuleKey,
      icon: Layers,
      cardClass: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/70 text-slate-900',
      labelClass: 'text-emerald-800',
      valueClass: 'text-slate-900',
      subClass: 'text-slate-600',
      iconBox: 'bg-emerald-100 text-emerald-800',
      arrowClass: 'text-emerald-400 group-hover:text-emerald-700',
    },
    {
      label: 'Machine Utilization',
      value: `${kpis.machine_utilization.toFixed(1)}%`,
      sub: `${kpis.running_machines} of ${kpis.total_machines} units running`,
      target: 'machines' as ModuleKey,
      icon: Cog,
      cardClass: 'border-sky-200 bg-gradient-to-br from-white to-sky-50/70 text-slate-900',
      labelClass: 'text-sky-800',
      valueClass: 'text-slate-900',
      subClass: 'text-slate-600',
      iconBox: 'bg-sky-100 text-sky-800',
      arrowClass: 'text-sky-400 group-hover:text-sky-700',
    },
    {
      label: 'Total Completed Products',
      value: `${kpis.total_completed_products.toLocaleString()} m`,
      sub: 'Cleared final delivery',
      target: 'inventory' as ModuleKey,
      icon: CheckCircle2,
      cardClass: 'border-emerald-200 bg-gradient-to-br from-white to-emerald-50/60 text-slate-900',
      labelClass: 'text-emerald-800',
      valueClass: 'text-emerald-950',
      subClass: 'text-slate-600',
      iconBox: 'bg-emerald-100 text-emerald-700',
      arrowClass: 'text-emerald-400 group-hover:text-emerald-700',
    },
    {
      label: 'Pending Customer Orders',
      value: String(kpis.pending_orders),
      sub: 'Awaiting fulfillment',
      target: 'orders' as ModuleKey,
      icon: Clock,
      cardClass: 'border-amber-200 bg-gradient-to-br from-white to-amber-50/80 text-slate-900',
      labelClass: 'text-amber-800',
      valueClass: 'text-amber-950',
      subClass: 'text-slate-600',
      iconBox: 'bg-amber-100 text-amber-800',
      arrowClass: 'text-amber-400 group-hover:text-amber-700',
    },
    {
      label: 'Production Efficiency',
      value: `${kpis.production_efficiency.toFixed(1)}%`,
      sub: 'Average batch line OEE',
      target: 'production' as ModuleKey,
      icon: Gauge,
      cardClass: 'border-cyan-200 bg-gradient-to-br from-white to-cyan-50/70 text-slate-900',
      labelClass: 'text-cyan-800',
      valueClass: 'text-slate-900',
      subClass: 'text-slate-600',
      iconBox: 'bg-cyan-100 text-cyan-800',
      arrowClass: 'text-cyan-400 group-hover:text-cyan-700',
    },
    {
      label: 'Sustainability Score',
      value: `${kpis.sustainability_score.toFixed(1)} / 100`,
      sub: 'Composite eco-impact index',
      target: 'sustainability' as ModuleKey,
      icon: Leaf,
      cardClass: 'border-teal-700 bg-gradient-to-br from-teal-800 to-emerald-900 text-white',
      labelClass: 'text-teal-100',
      valueClass: 'text-white',
      subClass: 'text-teal-100/80',
      iconBox: 'bg-teal-700/80 text-emerald-200',
      arrowClass: 'text-teal-200 group-hover:text-white',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Dataset Origin Summary Line */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-900/10 bg-white/80 px-5 py-4 backdrop-blur-xs">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Executive Manufacturing Overview
          </h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Live metrics aggregated by Crow C++17 from MySQL tables ·{' '}
            <span className="font-mono font-medium text-slate-800 tabular-nums">
              {kpis.sample_records}
            </span>{' '}
            sample baseline records ·{' '}
            <span className="font-mono font-semibold text-emerald-700 tabular-nums">
              {kpis.live_records}
            </span>{' '}
            live operator entries
          </p>
        </div>
      </div>

      {/* 8 Core KPI Cards */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.label}
              type="button"
              onClick={() => onNavigate(card.target)}
              className={`group flex flex-col justify-between rounded-xl border p-5 text-left shadow-xs transition-transform hover:-translate-y-0.5 ${card.cardClass}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.iconBox}`}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className={`text-xs font-semibold ${card.labelClass}`}>{card.label}</span>
                </div>
                <ArrowUpRight className={`h-4 w-4 shrink-0 transition-colors ${card.arrowClass}`} />
              </div>
              <p className={`mt-4 font-mono text-2xl font-semibold tracking-tight tabular-nums ${card.valueClass}`}>
                {card.value}
              </p>
              <p className={`mt-1.5 text-xs ${card.subClass}`}>{card.sub}</p>
            </button>
          );
        })}
      </section>

      {/* Primary Charts Grid */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Daily Production Chart */}
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-display text-base font-semibold text-slate-900">
                Daily Production Output
              </h3>
              <p className="text-xs text-slate-500">Target vs completed meters by batch start date</p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.daily_production} margin={{top: 8, right: 12, left: -12, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="day" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Legend />
                <Bar dataKey="target" name="Target (m)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="completed" name="Completed (m)" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Production & Sustainability Trend */}
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Monthly Sustainability &amp; Resource Trend
            </h3>
            <p className="text-xs text-slate-500">
              Composite score progression across recent plant cycles
            </p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={data.monthly_sustainability}
                margin={{top: 8, right: 12, left: -12, bottom: 0}}
              >
                <defs>
                  <linearGradient id="scoreGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="month" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="score"
                  name="Sustainability Score"
                  stroke="#047857"
                  fill="url(#scoreGrad)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Machine Performance Chart */}
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Machine Performance &amp; Utilization
            </h3>
            <p className="text-xs text-slate-500">Live utilization percentage across registered mill assets</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={data.machine_performance}
                layout="vertical"
                margin={{top: 4, right: 20, left: 10, bottom: 0}}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis
                  dataKey="code"
                  type="category"
                  width={68}
                  tick={{fontSize: 12, fill: '#334155'}}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="utilization" name="Utilization %" fill="#0d9488" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Production Status Distribution */}
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
          <div className="mb-4 border-b border-slate-100 pb-3">
            <h3 className="font-display text-base font-semibold text-slate-900">
              Production Status Distribution
            </h3>
            <p className="text-xs text-slate-500">Batch breakdown by operational state</p>
          </div>
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.status_distribution}
                    dataKey="count"
                    nameKey="status"
                    innerRadius={52}
                    outerRadius={84}
                    paddingAngle={3}
                  >
                    {data.status_distribution.map((entry, index) => (
                      <Cell key={entry.status} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {data.status_distribution.map((item, idx) => (
                <div
                  key={item.status}
                  className="flex items-center justify-between border-b border-slate-100 pb-2 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className="h-3 w-3 rounded-xs shrink-0"
                      style={{backgroundColor: PIE_COLORS[idx % PIE_COLORS.length]}}
                    />
                    <span className="text-slate-700">{item.status}</span>
                  </div>
                  <span className="font-mono font-semibold text-slate-900 tabular-nums">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Recent Activities & Low-Stock Alerts */}
      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
          <div className="flex items-center justify-between border-b border-emerald-900/10 bg-emerald-50/70 px-6 py-4">
            <h3 className="font-display text-base font-semibold text-emerald-950">
              Recent Plant Activities
            </h3>
            <span className="text-xs font-medium text-emerald-800">MySQL Audit Stream</span>
          </div>
          <div className="divide-y divide-slate-100 px-6 py-2">
            {data.recent_activities.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">No recent activities logged.</p>
            ) : (
              data.recent_activities.map((log) => (
                <div key={log.log_id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-slate-800">{log.description}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {log.actor_name} · {log.module_name} · {log.action_type} ·{' '}
                      <span className="font-mono">{log.logged_at}</span>
                    </p>
                  </div>
                  <OriginLabel isSample={log.is_sample_data} />
                </div>
              ))
            )}
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-amber-200/80 bg-white/95 shadow-xs">
          <div className="flex items-center justify-between border-b border-amber-200/80 bg-amber-50/80 px-6 py-4">
            <h3 className="font-display text-base font-semibold text-amber-950">
              Low-Stock &amp; Replenishment Alerts
            </h3>
            <button
              type="button"
              onClick={() => onNavigate('materials')}
              className="text-xs font-semibold text-emerald-800 hover:underline whitespace-nowrap"
            >
              Manage Stock
            </button>
          </div>
          <div className="px-6 py-2">
            {data.low_stock_alerts.length === 0 ? (
              <p className="py-6 text-center text-sm text-slate-500">
                All raw materials and finished goods are above reorder thresholds.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {data.low_stock_alerts.map((alert) => (
                  <div key={`${alert.source}-${alert.code}`} className="flex items-center justify-between gap-4 py-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                        <p className="truncate text-sm font-medium text-slate-900">{alert.name}</p>
                      </div>
                      <p className="mt-0.5 text-xs text-slate-500">
                        <span className="font-mono">{alert.code}</span> · {alert.source} · Threshold{' '}
                        <span className="font-mono tabular-nums">
                          {alert.reorder_level} {alert.unit}
                        </span>
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {alert.quantity.toLocaleString()} {alert.unit}
                      </p>
                      <StatusText status={alert.stock_status} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
