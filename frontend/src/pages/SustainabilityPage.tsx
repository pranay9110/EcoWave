import React, {useEffect, useState} from 'react';
import {Plus, Leaf} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {api} from '../services/api';
import type {ProductionOrder, SustainabilityRecord, SustainabilitySummary} from '../types';
import {Modal} from '../components/Modal';
import {OriginLabel} from '../components/StatusText';

interface SustainabilityPageProps {
  onDataMutated: () => void;
}

export function SustainabilityPage({onDataMutated}: SustainabilityPageProps) {
  const [records, setRecords] = useState<SustainabilityRecord[]>([]);
  const [summary, setSummary] = useState<SustainabilitySummary>({
    total_water_liters: 0,
    water_recovery_pct: 0,
    total_electricity_kwh: 0,
    avg_renewable_pct: 0,
    total_carbon_kg: 0,
    waste_diversion_pct: 0,
    avg_recycled_material_pct: 0,
    sustainability_score: 0,
  });
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [batches, setBatches] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    record_date: '2026-11-22',
    period_label: 'Nov W4',
    production_id: '',
    water_consumed_liters: '92000',
    water_recycled_liters: '66000',
    electricity_kwh: '36500',
    renewable_energy_pct: '66',
    carbon_emissions_kg: '12900',
    waste_generated_kg: '790',
    waste_recycled_kg: '720',
    recycled_material_usage_pct: '71',
    notes: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sRes, pRes] = await Promise.all([api.getSustainability(), api.getProduction()]);
      setRecords(sRes.records);
      setSummary(sRes.summary);
      setRecommendations(sRes.recommendations);
      setBatches(pRes.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sustainability analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createSustainability({
        record_date: form.record_date,
        period_label: form.period_label.trim(),
        production_id: form.production_id ? Number(form.production_id) : 0,
        water_consumed_liters: Number(form.water_consumed_liters),
        water_recycled_liters: Number(form.water_recycled_liters),
        electricity_kwh: Number(form.electricity_kwh),
        renewable_energy_pct: Number(form.renewable_energy_pct),
        carbon_emissions_kg: Number(form.carbon_emissions_kg),
        waste_generated_kg: Number(form.waste_generated_kg),
        waste_recycled_kg: Number(form.waste_recycled_kg),
        recycled_material_usage_pct: Number(form.recycled_material_usage_pct),
        notes: form.notes.trim(),
      });
      setModalOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save sustainability record');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Environmental Sustainability Monitoring
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Track closed-loop water recovery, renewable electricity, Scope 2 carbon intensity, and circular waste diversion.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Log Environmental Audit</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Sustainability KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-xl border border-emerald-800 bg-gradient-to-br from-emerald-900 to-emerald-950 p-5 text-white shadow-xs">
          <p className="text-xs font-semibold text-emerald-300">Sustainability Score</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums">
            {summary.sustainability_score.toFixed(1)}
          </p>
          <p className="mt-1 text-xs text-emerald-200">Composite ESG Index / 100</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/85 p-5 shadow-xs">
          <p className="text-xs font-semibold text-sky-800">Water Recovery Rate</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-sky-950 tabular-nums">
            {summary.water_recovery_pct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {Math.round(summary.total_water_liters / 1000).toLocaleString()}k L total intake
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-amber-800">Renewable Energy Share</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-amber-950 tabular-nums">
            {summary.avg_renewable_pct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {Math.round(summary.total_electricity_kwh).toLocaleString()} kWh metered
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/85 p-5 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Waste Diversion</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-emerald-900 tabular-nums">
            {summary.waste_diversion_pct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-600">Shredded &amp; recycled scrap</p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/85 p-5 shadow-xs">
          <p className="text-xs font-semibold text-teal-800">Sustainable Fibre Input</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-teal-950 tabular-nums">
            {summary.avg_recycled_material_pct.toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-slate-600">
            {Math.round(summary.total_carbon_kg).toLocaleString()} kg CO2e cumulative
          </p>
        </div>
      </div>

      {/* 4 Environmental Charts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Water Consumption Chart */}
        <div className="rounded-xl border border-sky-200/70 bg-white/95 p-6 shadow-xs">
          <h3 className="mb-1 font-display text-base font-semibold text-slate-900">
            Water Consumption vs. Closed-Loop Recovery (L)
          </h3>
          <p className="mb-4 text-xs text-slate-500">Monthly dye house freshwater draw vs recycled volume</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={records} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period_label" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="water_consumed_liters"
                  name="Total Water (L)"
                  stroke="#0284c7"
                  fill="#bae6fd"
                />
                <Area
                  type="monotone"
                  dataKey="water_recycled_liters"
                  name="Recycled Water (L)"
                  stroke="#059669"
                  fill="#a7f3d0"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Energy Consumption Chart */}
        <div className="rounded-xl border border-amber-200/70 bg-white/95 p-6 shadow-xs">
          <h3 className="mb-1 font-display text-base font-semibold text-slate-900">
            Electricity Consumption (kWh) &amp; Renewable Share (%)
          </h3>
          <p className="mb-4 text-xs text-slate-500">Plant power demand reduction across periods</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={records} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period_label" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
                <Bar dataKey="electricity_kwh" name="Electricity (kWh)" fill="#d97706" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Carbon Emissions Chart */}
        <div className="rounded-xl border border-emerald-200/70 bg-white/95 p-6 shadow-xs">
          <h3 className="mb-1 font-display text-base font-semibold text-slate-900">
            Carbon Emissions Trajectory (kg CO2e)
          </h3>
          <p className="mb-4 text-xs text-slate-500">Scope 1 &amp; 2 emissions across manufacturing cycles</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={records} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period_label" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
                <Line
                  type="monotone"
                  dataKey="carbon_emissions_kg"
                  name="CO2e (kg)"
                  stroke="#059669"
                  strokeWidth={2.5}
                  dot={{r: 4, fill: '#059669'}}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Waste Reduction Analysis */}
        <div className="rounded-xl border border-teal-200/70 bg-white/95 p-6 shadow-xs">
          <h3 className="mb-1 font-display text-base font-semibold text-slate-900">
            Waste Generation vs. Recycled Recovery (kg)
          </h3>
          <p className="mb-4 text-xs text-slate-500">Circular recovery of fabric offcuts and yarn waste</p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={records} margin={{top: 8, right: 12, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="period_label" tick={{fontSize: 12, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
                <Legend />
                <Bar dataKey="waste_generated_kg" name="Waste Generated (kg)" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="waste_recycled_kg" name="Waste Recycled (kg)" fill="#0d9488" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recommendations Panel */}
      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white/95 shadow-xs">
        <div className="flex items-center gap-2 border-b border-emerald-200 bg-emerald-50/80 px-6 py-4">
          <Leaf className="h-4 w-4 text-emerald-700" />
          <h3 className="font-display text-base font-semibold text-emerald-950">
            Automated Sustainability Indicators &amp; Recommendations
          </h3>
        </div>
        <ul className="divide-y divide-slate-100 px-6 py-2 text-sm text-slate-700">
          {recommendations.map((rec, idx) => (
            <li key={idx} className="py-2.5">
              {rec}
            </li>
          ))}
        </ul>
      </div>

      {/* Environmental Audit Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Recorded Sustainability Audits
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Water (L)</th>
                <th className="px-4 py-3 text-right">Electricity (kWh)</th>
                <th className="px-4 py-3 text-right">Carbon (kg)</th>
                <th className="px-4 py-3 text-right">Recycled Fibre %</th>
                <th className="px-4 py-3 text-right">Score</th>
                <th className="px-4 py-3">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    Loading environmental records...
                  </td>
                </tr>
              ) : (
                records.map((r) => (
                  <tr key={r.record_id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{r.period_label}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.record_date}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.water_consumed_liters.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.electricity_kwh.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.carbon_emissions_kg.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {r.recycled_material_usage_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-800 tabular-nums">
                      {r.sustainability_score.toFixed(1)}
                    </td>
                    <td className="px-4 py-3">
                      <OriginLabel isSample={r.is_sample_data} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Sustainability Record Modal */}
      <Modal
        open={modalOpen}
        title="Log Environmental Sustainability Audit"
        subtitle="Composite sustainability score is computed by the C++ backend."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Period Label</label>
              <input
                type="text"
                required
                value={form.period_label}
                onChange={(e) => setForm({...form, period_label: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Record Date</label>
              <input
                type="date"
                required
                value={form.record_date}
                onChange={(e) => setForm({...form, record_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Linked Batch</label>
              <select
                value={form.production_id}
                onChange={(e) => setForm({...form, production_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Plant-Wide</option>
                {batches.map((b) => (
                  <option key={b.production_id} value={b.production_id}>
                    {b.batch_number}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Water Consumed (L)</label>
              <input
                type="number"
                min="1"
                required
                value={form.water_consumed_liters}
                onChange={(e) => setForm({...form, water_consumed_liters: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Water Recycled (L)</label>
              <input
                type="number"
                min="0"
                required
                value={form.water_recycled_liters}
                onChange={(e) => setForm({...form, water_recycled_liters: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Electricity (kWh)</label>
              <input
                type="number"
                min="1"
                required
                value={form.electricity_kwh}
                onChange={(e) => setForm({...form, electricity_kwh: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Renewable Energy %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={form.renewable_energy_pct}
                onChange={(e) => setForm({...form, renewable_energy_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Carbon (kg CO2e)</label>
              <input
                type="number"
                min="0"
                required
                value={form.carbon_emissions_kg}
                onChange={(e) => setForm({...form, carbon_emissions_kg: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Waste Generated (kg)</label>
              <input
                type="number"
                min="0"
                required
                value={form.waste_generated_kg}
                onChange={(e) => setForm({...form, waste_generated_kg: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Waste Recycled (kg)</label>
              <input
                type="number"
                min="0"
                required
                value={form.waste_recycled_kg}
                onChange={(e) => setForm({...form, waste_recycled_kg: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Recycled Material %</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                required
                value={form.recycled_material_usage_pct}
                onChange={(e) => setForm({...form, recycled_material_usage_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Audit Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={(e) => setForm({...form, notes: e.target.value})}
              placeholder="Solar array output, dye vat recovery notes..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              {submitting ? 'Saving...' : 'Save Audit'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
