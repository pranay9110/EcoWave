import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, Trash2, ArrowRightCircle, CheckCircle2, Circle, Clock} from 'lucide-react';
import {api} from '../services/api';
import type {Material, ProductionOrder} from '../types';
import {Modal} from '../components/Modal';
import {ConfirmDialog} from '../components/ConfirmDialog';
import {OriginLabel, StatusText} from '../components/StatusText';

interface ProductionPageProps {
  onDataMutated: () => void;
}

const STAGES = [
  'Raw Material Preparation',
  'Spinning',
  'Weaving',
  'Dyeing',
  'Processing',
  'Quality Inspection',
  'Packaging',
  'Final Delivery',
];

const STATUS_FILTERS = ['All', 'Scheduled', 'In Progress', 'Completed', 'On Hold'];

export function ProductionPage({onDataMutated}: ProductionPageProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [createOpen, setCreateOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<ProductionOrder | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductionOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    batch_number: '',
    product_name: '',
    fabric_type: '100% GOTS Organic Cotton',
    material_id: '',
    target_quantity: '3000',
    completed_quantity: '0',
    material_used_kg: '900',
    current_stage: 'Raw Material Preparation',
    efficiency_pct: '92.5',
    status: 'In Progress',
    start_date: '2026-11-22',
    due_date: '2026-12-15',
  });

  const [editForm, setEditForm] = useState({
    current_stage: 'Spinning',
    status: 'In Progress',
    completed_quantity: '0',
    target_quantity: '0',
    efficiency_pct: '92.0',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pRes, mRes] = await Promise.all([api.getProduction(), api.getMaterials()]);
      setOrders(pRes.orders);
      setMaterials(mRes.materials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load production orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'All' || o.status === statusFilter;
      const matchesQ =
        !q ||
        o.batch_number.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q) ||
        o.current_stage.toLowerCase().includes(q);
      return matchesStatus && matchesQ;
    });
  }, [orders, statusFilter, search]);

  const metrics = useMemo(() => {
    const completed = orders.filter((o) => o.status === 'Completed').length;
    const pending = orders.filter((o) => o.status !== 'Completed').length;
    const avgEff =
      orders.length > 0
        ? orders.reduce((sum, o) => sum + o.efficiency_pct, 0) / orders.length
        : 0;
    return {completed, pending, avgEff};
  }, [orders]);

  const openCreate = () => {
    setCreateForm({
      batch_number: `BATCH-2026-${Math.floor(100 + Math.random() * 899)}`,
      product_name: '',
      fabric_type: '100% GOTS Organic Cotton',
      material_id: materials[0] ? String(materials[0].material_id) : '',
      target_quantity: '3500',
      completed_quantity: '0',
      material_used_kg: '850',
      current_stage: 'Raw Material Preparation',
      efficiency_pct: '92.5',
      status: 'In Progress',
      start_date: '2026-11-22',
      due_date: '2026-12-18',
    });
    setCreateOpen(true);
  };

  const openUpdate = (o: ProductionOrder) => {
    setEditingBatch(o);
    setEditForm({
      current_stage: o.current_stage,
      status: o.status,
      completed_quantity: String(o.completed_quantity),
      target_quantity: String(o.target_quantity),
      efficiency_pct: String(o.efficiency_pct),
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createProduction({
        batch_number: createForm.batch_number.trim(),
        product_name: createForm.product_name.trim(),
        fabric_type: createForm.fabric_type.trim(),
        material_id: createForm.material_id ? Number(createForm.material_id) : 0,
        target_quantity: Number(createForm.target_quantity),
        completed_quantity: Number(createForm.completed_quantity),
        material_used_kg: Number(createForm.material_used_kg),
        current_stage: createForm.current_stage,
        efficiency_pct: Number(createForm.efficiency_pct),
        status: createForm.status,
        start_date: createForm.start_date,
        due_date: createForm.due_date,
      });
      setCreateOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.updateProduction(editingBatch.production_id, {
        current_stage: editForm.current_stage,
        status: editForm.status,
        completed_quantity: Number(editForm.completed_quantity),
        target_quantity: Number(editForm.target_quantity),
        efficiency_pct: Number(editForm.efficiency_pct),
      });
      setEditingBatch(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update batch');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.deleteProduction(deleteTarget.production_id);
      setDeleteTarget(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete batch');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            8-Stage Production Tracking
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Create manufacturing batches, advance through the 8 textile stages, and calculate line efficiency.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Production Batch</span>
        </button>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Completed Batches</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-emerald-950 tabular-nums">
            {metrics.completed}
          </p>
        </div>
        <div className="rounded-xl border border-amber-200 bg-gradient-to-br from-white to-amber-50/75 p-5 shadow-xs">
          <p className="text-xs font-semibold text-amber-800">Active / Pending Batches</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-amber-950 tabular-nums">
            {metrics.pending}
          </p>
        </div>
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-teal-800">Average Line Efficiency</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-teal-950 tabular-nums">
            {metrics.avgEff.toFixed(1)}%
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Search & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-emerald-900/10 bg-white/95 p-4 shadow-xs">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search batch, product, stage..."
            className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-emerald-700 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-1 rounded-lg bg-emerald-50/90 p-1">
          {STATUS_FILTERS.map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-emerald-900 text-white shadow-xs'
                  : 'text-emerald-900/80 hover:bg-white/70 hover:text-emerald-950'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Production Batch Cards with 8-Stage Pipeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({length: 3}).map((_, idx) => (
            <div key={idx} className="h-44 animate-pulse rounded-xl border border-emerald-900/10 bg-white/80" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-10 text-center text-sm text-slate-500">
          No production batches found for this filter.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((batch) => {
            const currentIdx = STAGES.indexOf(batch.current_stage);
            return (
              <div key={batch.production_id} className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="font-mono font-semibold text-emerald-800">
                        {batch.batch_number}
                      </span>
                      <span>·</span>
                      <span>{batch.fabric_type}</span>
                      <span>·</span>
                      <span>Material: {batch.material_name}</span>
                      <span>·</span>
                      <OriginLabel isSample={batch.is_sample_data} />
                    </div>
                    <h3 className="mt-1 font-display text-lg font-semibold text-slate-900">
                      {batch.product_name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <StatusText status={batch.status} />
                    <button
                      type="button"
                      onClick={() => openUpdate(batch)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-700 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-900 hover:bg-emerald-100 whitespace-nowrap"
                    >
                      <ArrowRightCircle className="h-3.5 w-3.5" />
                      <span>Update Stage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(batch)}
                      aria-label={`Delete ${batch.batch_number}`}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Progress Bar & Output Metrics */}
                <div className="mt-4 grid grid-cols-1 gap-4 border-y border-slate-100 py-4 md:grid-cols-4">
                  <div className="md:col-span-2">
                    <div className="mb-1.5 flex items-center justify-between text-xs">
                      <span className="font-medium text-slate-700">
                        Stage: {batch.current_stage}
                      </span>
                      <span className="font-mono font-semibold text-emerald-800 tabular-nums">
                        {batch.progress_pct.toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-emerald-100/80">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-700 to-teal-500 transition-all"
                        style={{width: `${Math.min(100, batch.progress_pct)}%`}}
                      />
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Output Volume</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {batch.completed_quantity.toLocaleString()} / {batch.target_quantity.toLocaleString()} m
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Efficiency &amp; Schedule</p>
                    <p className="mt-1 font-mono text-sm font-semibold text-slate-900 tabular-nums">
                      {batch.efficiency_pct.toFixed(1)}% · Due {batch.due_date}
                    </p>
                  </div>
                </div>

                {/* 8-Stage Stepper */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
                  {STAGES.map((stageName, idx) => {
                    const isDone = batch.status === 'Completed' || idx < currentIdx;
                    const isCurrent = batch.status !== 'Completed' && idx === currentIdx;
                    return (
                      <div
                        key={stageName}
                        className={`rounded-lg border px-2.5 py-2 text-xs ${
                          isDone
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-950'
                            : isCurrent
                              ? 'border-amber-400 bg-amber-50/70 font-medium text-amber-950'
                              : 'border-slate-200 bg-slate-50/70 text-slate-400'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          {isDone ? (
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-700" />
                          ) : isCurrent ? (
                            <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 shrink-0 text-slate-300" />
                          )}
                          <span className="font-mono text-[11px]">{idx + 1}</span>
                        </div>
                        <p className="mt-1 truncate" title={stageName}>
                          {stageName}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Batch Modal */}
      <Modal
        open={createOpen}
        title="Create Production Order"
        subtitle="Assign raw material and initialize 8-stage tracking in MySQL."
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Batch Number</label>
              <input
                type="text"
                required
                value={createForm.batch_number}
                onChange={(e) => setCreateForm({...createForm, batch_number: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Fabric Composition</label>
              <input
                type="text"
                required
                value={createForm.fabric_type}
                onChange={(e) => setCreateForm({...createForm, fabric_type: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Product Name</label>
            <input
              type="text"
              required
              value={createForm.product_name}
              onChange={(e) => setCreateForm({...createForm, product_name: e.target.value})}
              placeholder="e.g. Organic Hemp Canvas 280gsm"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Raw Material Lot</label>
              <select
                value={createForm.material_id}
                onChange={(e) => setCreateForm({...createForm, material_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {materials.map((m) => (
                  <option key={m.material_id} value={m.material_id}>
                    {m.material_name} ({m.quantity} {m.unit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Material Consumed (kg/L)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={createForm.material_used_kg}
                onChange={(e) => setCreateForm({...createForm, material_used_kg: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Target Qty (m)</label>
              <input
                type="number"
                min="1"
                required
                value={createForm.target_quantity}
                onChange={(e) => setCreateForm({...createForm, target_quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Initial Stage</label>
              <select
                value={createForm.current_stage}
                onChange={(e) => setCreateForm({...createForm, current_stage: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {STAGES.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Est. Efficiency %</label>
              <input
                type="number"
                step="0.1"
                min="10"
                max="100"
                value={createForm.efficiency_pct}
                onChange={(e) => setCreateForm({...createForm, efficiency_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Start Date</label>
              <input
                type="date"
                required
                value={createForm.start_date}
                onChange={(e) => setCreateForm({...createForm, start_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Target Due Date</label>
              <input
                type="date"
                required
                value={createForm.due_date}
                onChange={(e) => setCreateForm({...createForm, due_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? 'Creating...' : 'Launch Batch'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Stage Modal */}
      <Modal
        open={Boolean(editingBatch)}
        title={`Update ${editingBatch?.batch_number ?? ''}`}
        subtitle={editingBatch?.product_name}
        onClose={() => setEditingBatch(null)}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Current Stage</label>
            <select
              value={editForm.current_stage}
              onChange={(e) => setEditForm({...editForm, current_stage: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Batch Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {['Scheduled', 'In Progress', 'Completed', 'On Hold'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Completed Qty (m)
              </label>
              <input
                type="number"
                min="0"
                max={editForm.target_quantity}
                value={editForm.completed_quantity}
                onChange={(e) => setEditForm({...editForm, completed_quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Efficiency %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editForm.efficiency_pct}
                onChange={(e) => setEditForm({...editForm, efficiency_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEditingBatch(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? 'Updating...' : 'Save Progress'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Production Batch"
        message={`Delete batch "${deleteTarget?.batch_number}" (${deleteTarget?.product_name}) and its 8-stage history from MySQL?`}
        busy={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
