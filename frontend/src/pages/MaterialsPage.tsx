import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, Pencil, Trash2, AlertTriangle} from 'lucide-react';
import {api} from '../services/api';
import type {Material, Supplier, UserRole} from '../types';
import {Modal} from '../components/Modal';
import {ConfirmDialog} from '../components/ConfirmDialog';
import {OriginLabel, StatusText} from '../components/StatusText';

interface MaterialsPageProps {
  userRole: UserRole;
  onDataMutated: () => void;
}

const CATEGORIES = ['All', 'Cotton', 'Polyester', 'Recycled Fibres', 'Dyes', 'Chemicals', 'Blended Yarn'];

export function MaterialsPage({userRole, onDataMutated}: MaterialsPageProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [activeTab, setActiveTab] = useState<'materials' | 'suppliers'>('materials');

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Material | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Material | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    material_code: '',
    material_name: '',
    category: 'Cotton',
    quantity: '1000',
    consumed_quantity: '0',
    unit: 'kg',
    reorder_level: '500',
    unit_cost: '3.50',
    recycled_content_pct: '0',
    supplier_id: '1',
  });

  const canDelete = userRole === 'Administrator' || userRole === 'Inventory Manager';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [mRes, sRes] = await Promise.all([api.getMaterials(), api.getSuppliers()]);
      setMaterials(mRes.materials);
      setSuppliers(sRes.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    return materials.filter((m) => {
      const matchesCat = categoryFilter === 'All' || m.category === categoryFilter;
      const q = search.toLowerCase();
      const matchesSearch =
        !q ||
        m.material_code.toLowerCase().includes(q) ||
        m.material_name.toLowerCase().includes(q) ||
        m.supplier_name.toLowerCase().includes(q);
      return matchesCat && matchesSearch;
    });
  }, [materials, categoryFilter, search]);

  const lowStockCount = useMemo(
    () => materials.filter((m) => m.stock_status !== 'In Stock').length,
    [materials],
  );

  const openCreate = () => {
    setEditing(null);
    setForm({
      material_code: `MAT-${Math.floor(200 + Math.random() * 799)}`,
      material_name: '',
      category: 'Cotton',
      quantity: '1200',
      consumed_quantity: '0',
      unit: 'kg',
      reorder_level: '500',
      unit_cost: '4.20',
      recycled_content_pct: '25',
      supplier_id: suppliers[0] ? String(suppliers[0].supplier_id) : '1',
    });
    setModalOpen(true);
  };

  const openEdit = (m: Material) => {
    setEditing(m);
    setForm({
      material_code: m.material_code,
      material_name: m.material_name,
      category: m.category,
      quantity: String(m.quantity),
      consumed_quantity: String(m.consumed_quantity),
      unit: m.unit,
      reorder_level: String(m.reorder_level),
      unit_cost: String(m.unit_cost),
      recycled_content_pct: String(m.recycled_content_pct),
      supplier_id: String(m.supplier_id),
    });
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        material_code: form.material_code.trim(),
        material_name: form.material_name.trim(),
        category: form.category,
        quantity: Number(form.quantity),
        consumed_quantity: Number(form.consumed_quantity),
        unit: form.unit.trim(),
        reorder_level: Number(form.reorder_level),
        unit_cost: Number(form.unit_cost),
        recycled_content_pct: Number(form.recycled_content_pct),
        supplier_id: Number(form.supplier_id),
      };
      if (editing) {
        await api.updateMaterial(editing.material_id, payload);
      } else {
        await api.createMaterial(payload);
      }
      setModalOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save material');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSubmitting(true);
    try {
      await api.deleteMaterial(deleteTarget.material_id);
      setDeleteTarget(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Raw Material &amp; Supplier Inventory
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Track fibres, dyes, and bio-chemicals with automated reorder threshold monitoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setActiveTab('materials')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'materials'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Materials ({materials.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('suppliers')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeTab === 'suppliers'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Suppliers ({suppliers.length})
            </button>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-800 whitespace-nowrap shrink-0"
          >
            <Plus className="h-4 w-4" />
            <span>Add Material</span>
          </button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <AlertTriangle className="h-4 w-4 text-amber-700 shrink-0" />
          <span>
            <strong className="font-semibold">{lowStockCount} raw material(s)</strong> are at or below reorder threshold and require procurement review.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {activeTab === 'materials' ? (
        <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 bg-emerald-50/50 p-4">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search code, name, supplier..."
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-1 rounded-lg bg-emerald-100/70 p-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                    categoryFilter === cat
                      ? 'bg-emerald-900 text-white shadow-xs'
                      : 'text-emerald-900/80 hover:bg-white/70 hover:text-emerald-950'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Material ID</th>
                  <th className="px-4 py-3">Material Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Available Qty</th>
                  <th className="px-4 py-3 text-right">Consumed</th>
                  <th className="px-4 py-3">Supplier</th>
                  <th className="px-4 py-3">Stock Status</th>
                  <th className="px-4 py-3">Origin</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      Loading raw materials from MySQL...
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
                      No raw materials match the current filter.
                    </td>
                  </tr>
                ) : (
                  filtered.map((m) => (
                    <tr key={m.material_id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">
                        {m.material_code}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{m.material_name}</p>
                        <p className="text-xs text-slate-500">
                          Recycled content: <span className="font-mono">{m.recycled_content_pct}%</span>
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-600">{m.category}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-slate-900 tabular-nums">
                        {m.quantity.toLocaleString()} {m.unit}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                        {m.consumed_quantity.toLocaleString()} {m.unit}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{m.supplier_name}</td>
                      <td className="px-4 py-3">
                        <StatusText status={m.stock_status} />
                      </td>
                      <td className="px-4 py-3">
                        <OriginLabel isSample={m.is_sample_data} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(m)}
                            aria-label={`Edit ${m.material_name}`}
                            className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-800"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(m)}
                              aria-label={`Delete ${m.material_name}`}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {suppliers.map((s) => (
            <div key={s.supplier_id} className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-mono text-xs text-slate-500">{s.supplier_code} · {s.country}</p>
                  <h3 className="mt-1 font-display text-base font-semibold text-slate-900">
                    {s.supplier_name}
                  </h3>
                </div>
                <span className="font-mono text-sm font-semibold text-emerald-800 tabular-nums">
                  {s.rating.toFixed(2)} / 5.0
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-600">Certification: {s.sustainability_cert}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <span>Contact: {s.contact_person}</span>
                <span>·</span>
                <span>{s.email}</span>
                <span>·</span>
                <span className="font-mono">{s.phone}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        title={editing ? `Edit ${editing.material_name}` : 'Add Raw Material'}
        subtitle="Persists directly to MySQL Materials table via Crow C++ API."
        onClose={() => setModalOpen(false)}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Material Code</label>
              <input
                type="text"
                required
                disabled={Boolean(editing)}
                value={form.material_code}
                onChange={(e) => setForm({...form, material_code: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({...form, category: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Material Name</label>
            <input
              type="text"
              required
              value={form.material_name}
              onChange={(e) => setForm({...form, material_name: e.target.value})}
              placeholder="e.g. GOTS Organic Combed Cotton"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantity</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.quantity}
                onChange={(e) => setForm({...form, quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Unit</label>
              <input
                type="text"
                required
                value={form.unit}
                onChange={(e) => setForm({...form, unit: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Reorder Threshold</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={form.reorder_level}
                onChange={(e) => setForm({...form, reorder_level: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Consumed Qty</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.consumed_quantity}
                onChange={(e) => setForm({...form, consumed_quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.unit_cost}
                onChange={(e) => setForm({...form, unit_cost: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Recycled %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={form.recycled_content_pct}
                onChange={(e) => setForm({...form, recycled_content_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Supplier</label>
            <select
              value={form.supplier_id}
              onChange={(e) => setForm({...form, supplier_id: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {suppliers.map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.supplier_name} ({s.sustainability_cert})
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? 'Saving...' : editing ? 'Save Changes' : 'Add Material'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Raw Material"
        message={`Are you sure you want to delete "${deleteTarget?.material_name}" (${deleteTarget?.material_code})? This action removes the record from MySQL.`}
        busy={submitting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
