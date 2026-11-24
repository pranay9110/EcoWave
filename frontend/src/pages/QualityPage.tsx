import React, {useEffect, useState} from 'react';
import {Plus} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {api} from '../services/api';
import type {ProductionOrder, QualityInspection, QualitySummary} from '../types';
import {Modal} from '../components/Modal';
import {OriginLabel, StatusText} from '../components/StatusText';

interface QualityPageProps {
  onDataMutated: () => void;
}

export function QualityPage({onDataMutated}: QualityPageProps) {
  const [summary, setSummary] = useState<QualitySummary>({
    total_inspected: 0,
    passed_products: 0,
    rejected_products: 0,
    defect_rate_pct: 0,
  });
  const [inspections, setInspections] = useState<QualityInspection[]>([]);
  const [batches, setBatches] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    inspection_code: '',
    production_id: '',
    inspector_name: '',
    total_inspected: '1000',
    rejected_count: '15',
    primary_defect_type: 'None',
    decision: 'Approved',
    inspection_date: '2026-11-22',
    remarks: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [qRes, pRes] = await Promise.all([api.getQuality(), api.getProduction()]);
      setSummary(qRes.summary);
      setInspections(qRes.inspections);
      setBatches(pRes.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quality records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const openModal = () => {
    setForm({
      inspection_code: `QC-2026-${Math.floor(100 + Math.random() * 899)}`,
      production_id: batches[0] ? String(batches[0].production_id) : '',
      inspector_name: 'Dr. Ananya Rao',
      total_inspected: '1200',
      rejected_count: '18',
      primary_defect_type: 'Minor Selvedge Variance',
      decision: 'Approved',
      inspection_date: '2026-11-22',
      remarks: '',
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createQuality({
        ...form,
        production_id: Number(form.production_id),
        total_inspected: Number(form.total_inspected),
        rejected_count: Number(form.rejected_count),
      });
      setModalOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const chartData = [...inspections].reverse().map((i) => ({
    code: i.inspection_code,
    defect_rate: Number(i.defect_rate_pct.toFixed(2)),
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Quality Control &amp; Batch Inspections
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Record textile inspections, compute defect percentages, and approve or hold production lots.
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>Record Inspection</span>
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* 4 Quality KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-sky-800">Total Inspected Products</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {summary.total_inspected.toLocaleString()} m
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Passed Products</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-emerald-900 tabular-nums">
            {summary.passed_products.toLocaleString()} m
          </p>
        </div>
        <div className="rounded-xl border border-rose-200 bg-gradient-to-br from-white to-rose-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-rose-800">Rejected Products</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-rose-700 tabular-nums">
            {summary.rejected_products.toLocaleString()} m
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-amber-800">Overall Defect Rate</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-amber-950 tabular-nums">
            {summary.defect_rate_pct.toFixed(2)}%
          </p>
        </div>
      </div>

      {/* Defect Rate Trend Chart */}
      <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
        <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
          Batch Defect Rate Trend (%)
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{top: 8, right: 16, left: -12, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="code" tick={{fontSize: 12, fill: '#475569'}} />
              <YAxis tick={{fontSize: 12, fill: '#475569'}} />
              <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
              <Line
                type="monotone"
                dataKey="defect_rate"
                name="Defect Rate (%)"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{r: 4, fill: '#059669'}}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Quality Reports Table */}
      <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
        <div className="border-b border-emerald-900/10 bg-emerald-50/60 px-4 py-3.5">
          <h3 className="font-display text-base font-semibold text-emerald-950">
            Inspection Reports
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Report ID</th>
                <th className="px-4 py-3">Batch</th>
                <th className="px-4 py-3">Inspector</th>
                <th className="px-4 py-3 text-right">Inspected</th>
                <th className="px-4 py-3 text-right">Passed</th>
                <th className="px-4 py-3 text-right">Rejected</th>
                <th className="px-4 py-3 text-right">Defect %</th>
                <th className="px-4 py-3">Decision</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Origin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Loading inspections...
                  </td>
                </tr>
              ) : (
                inspections.map((q) => (
                  <tr key={q.inspection_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {q.inspection_code}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-mono text-xs font-medium text-emerald-900">{q.batch_number}</p>
                      <p className="text-xs text-slate-500">{q.product_name}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{q.inspector_name}</td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{q.total_inspected}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-800 tabular-nums">
                      {q.passed_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-red-700 tabular-nums">
                      {q.rejected_count}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                      {q.defect_rate_pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={q.decision} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{q.inspection_date}</td>
                    <td className="px-4 py-3">
                      <OriginLabel isSample={q.is_sample_data} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Quality Inspection Modal */}
      <Modal
        open={modalOpen}
        title="Record Quality Inspection"
        subtitle="Defect rate is automatically computed on the C++ backend."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Inspection Code</label>
              <input
                type="text"
                required
                value={form.inspection_code}
                onChange={(e) => setForm({...form, inspection_code: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Production Batch</label>
              <select
                required
                value={form.production_id}
                onChange={(e) => setForm({...form, production_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {batches.map((b) => (
                  <option key={b.production_id} value={b.production_id}>
                    {b.batch_number} — {b.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Total Inspected (m)</label>
              <input
                type="number"
                min="1"
                required
                value={form.total_inspected}
                onChange={(e) => setForm({...form, total_inspected: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Rejected Count (m)</label>
              <input
                type="number"
                min="0"
                max={form.total_inspected}
                required
                value={form.rejected_count}
                onChange={(e) => setForm({...form, rejected_count: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Decision</label>
              <select
                value={form.decision}
                onChange={(e) => setForm({...form, decision: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Approved">Approved</option>
                <option value="Conditional Rework">Conditional Rework</option>
                <option value="Rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Inspector Name</label>
              <input
                type="text"
                required
                value={form.inspector_name}
                onChange={(e) => setForm({...form, inspector_name: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Inspection Date</label>
              <input
                type="date"
                required
                value={form.inspection_date}
                onChange={(e) => setForm({...form, inspection_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Primary Defect Finding</label>
            <input
              type="text"
              value={form.primary_defect_type}
              onChange={(e) => setForm({...form, primary_defect_type: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Remarks</label>
            <input
              type="text"
              value={form.remarks}
              onChange={(e) => setForm({...form, remarks: e.target.value})}
              placeholder="Lab test notes or GSM readings..."
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
              {submitting ? 'Saving...' : 'Save Inspection'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
