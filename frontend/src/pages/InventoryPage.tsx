import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, Pencil} from 'lucide-react';
import {api} from '../services/api';
import type {InventoryItem, ProductionOrder, UserRole} from '../types';
import {Modal} from '../components/Modal';
import {OriginLabel, StatusText} from '../components/StatusText';

interface InventoryPageProps {
  userRole: UserRole;
  onDataMutated: () => void;
}

const INV_CATEGORIES = [
  'All',
  'Organic Woven',
  'Recycled Knit',
  'Technical Textile',
  'Denim & Twill',
  'Home Textile',
];

export function InventoryPage({userRole, onDataMutated}: InventoryPageProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [batches, setBatches] = useState<ProductionOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('All');

  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    sku: '',
    product_name: '',
    category: 'Organic Woven',
    production_id: '',
    quantity: '1500',
    unit: 'meters',
    reorder_threshold: '500',
    warehouse_location: 'WH-A1 (Bay 06)',
    unit_price: '14.50',
  });

  const [editForm, setEditForm] = useState({
    quantity: '0',
    reorder_threshold: '300',
    warehouse_location: '',
    unit_price: '12.50',
  });

  const canAdjust = userRole === 'Administrator' || userRole === 'Inventory Manager';

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [invRes, prodRes] = await Promise.all([api.getInventory(), api.getProduction()]);
      setItems(invRes.inventory);
      setBatches(prodRes.orders);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((item) => {
      const matchesCat = catFilter === 'All' || item.category === catFilter;
      const matchesQ =
        !q ||
        item.sku.toLowerCase().includes(q) ||
        item.product_name.toLowerCase().includes(q) ||
        item.warehouse_location.toLowerCase().includes(q);
      return matchesCat && matchesQ;
    });
  }, [items, catFilter, search]);

  const totalValue = useMemo(
    () => items.reduce((sum, i) => sum + i.quantity * i.unit_price, 0),
    [items],
  );
  const totalMeters = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const openCreate = () => {
    setCreateForm({
      sku: `SKU-ECO-${Math.floor(100 + Math.random() * 899)}`,
      product_name: '',
      category: 'Organic Woven',
      production_id: batches[0] ? String(batches[0].production_id) : '',
      quantity: '1800',
      unit: 'meters',
      reorder_threshold: '600',
      warehouse_location: 'WH-A2 (Bay 08)',
      unit_price: '15.25',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createInventory({
        ...createForm,
        production_id: createForm.production_id ? Number(createForm.production_id) : 0,
        quantity: Number(createForm.quantity),
        reorder_threshold: Number(createForm.reorder_threshold),
        unit_price: Number(createForm.unit_price),
      });
      setCreateOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add inventory');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editItem) return;
    setSubmitting(true);
    try {
      await api.updateInventory(editItem.inventory_id, {
        quantity: Number(editForm.quantity),
        reorder_threshold: Number(editForm.reorder_threshold),
        warehouse_location: editForm.warehouse_location.trim(),
        unit_price: Number(editForm.unit_price),
      });
      setEditItem(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update stock');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Finished Goods &amp; Warehouse Inventory
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Manage finished textile SKUs, warehouse bay allocation, and valuation.
          </p>
        </div>

        {canAdjust && (
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Add Finished Goods</span>
          </button>
        )}
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-teal-200 bg-gradient-to-br from-white to-teal-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-teal-800">Total Warehouse Stock</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-teal-950 tabular-nums">
            {totalMeters.toLocaleString()} m
          </p>
        </div>
        <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-white to-emerald-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-emerald-800">Inventory Valuation</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-emerald-900 tabular-nums">
            ${totalValue.toLocaleString(undefined, {maximumFractionDigits: 0})}
          </p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-gradient-to-br from-white to-sky-50/80 p-5 shadow-xs">
          <p className="text-xs font-semibold text-sky-800">Active SKUs</p>
          <p className="mt-2 font-mono text-2xl font-semibold text-slate-900 tabular-nums">
            {items.length}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 bg-emerald-50/50 p-4">
          <div className="relative w-full max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search SKU, product, warehouse..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-emerald-100/70 p-1">
            {INV_CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCatFilter(c)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
                  catFilter === c
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : 'text-emerald-900/80 hover:bg-white/70 hover:text-emerald-950'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">SKU</th>
                <th className="px-4 py-3">Product Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Source Batch</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Stock</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Origin</th>
                {canAdjust && <th className="px-4 py-3 text-right">Adjust</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Loading warehouse stock...
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item.inventory_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {item.sku}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.product_name}</td>
                    <td className="px-4 py-3 text-slate-600">{item.category}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{item.batch_number}</td>
                    <td className="px-4 py-3 text-slate-700">{item.warehouse_location}</td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                      {item.quantity.toLocaleString()} {item.unit}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      ${item.unit_price.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={item.stock_status} />
                    </td>
                    <td className="px-4 py-3">
                      <OriginLabel isSample={item.is_sample_data} />
                    </td>
                    {canAdjust && (
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditItem(item);
                            setEditForm({
                              quantity: String(item.quantity),
                              reorder_threshold: String(item.reorder_threshold),
                              warehouse_location: item.warehouse_location,
                              unit_price: String(item.unit_price),
                            });
                          }}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-800"
                          title="Adjust warehouse quantity"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Inventory Modal */}
      <Modal
        open={createOpen}
        title="Add Finished Goods to Warehouse"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">SKU Code</label>
              <input
                type="text"
                required
                value={createForm.sku}
                onChange={(e) => setCreateForm({...createForm, sku: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
              <select
                value={createForm.category}
                onChange={(e) => setCreateForm({...createForm, category: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {INV_CATEGORIES.filter((c) => c !== 'All').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Product Name</label>
            <input
              type="text"
              required
              value={createForm.product_name}
              onChange={(e) => setCreateForm({...createForm, product_name: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Source Batch</label>
              <select
                value={createForm.production_id}
                onChange={(e) => setCreateForm({...createForm, production_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Direct Stock</option>
                {batches.map((b) => (
                  <option key={b.production_id} value={b.production_id}>
                    {b.batch_number} — {b.product_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Warehouse Bay</label>
              <input
                type="text"
                required
                value={createForm.warehouse_location}
                onChange={(e) => setCreateForm({...createForm, warehouse_location: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantity (m)</label>
              <input
                type="number"
                min="0"
                required
                value={createForm.quantity}
                onChange={(e) => setCreateForm({...createForm, quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Reorder Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={createForm.reorder_threshold}
                onChange={(e) => setCreateForm({...createForm, reorder_threshold: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={createForm.unit_price}
                onChange={(e) => setCreateForm({...createForm, unit_price: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setCreateOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              {submitting ? 'Saving...' : 'Add Stock'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Adjust Stock Modal */}
      <Modal
        open={Boolean(editItem)}
        title={`Adjust Stock · ${editItem?.sku ?? ''}`}
        subtitle={editItem?.product_name}
        onClose={() => setEditItem(null)}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Stock Quantity (m)</label>
            <input
              type="number"
              min="0"
              required
              value={editForm.quantity}
              onChange={(e) => setEditForm({...editForm, quantity: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Reorder Threshold</label>
              <input
                type="number"
                min="0"
                required
                value={editForm.reorder_threshold}
                onChange={(e) => setEditForm({...editForm, reorder_threshold: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Unit Price ($)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={editForm.unit_price}
                onChange={(e) => setEditForm({...editForm, unit_price: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Warehouse Bay</label>
            <input
              type="text"
              required
              value={editForm.warehouse_location}
              onChange={(e) => setEditForm({...editForm, warehouse_location: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEditItem(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Update Stock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
