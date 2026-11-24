import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Search, Pencil} from 'lucide-react';
import {api} from '../services/api';
import type {CustomerOrder, InventoryItem, ProductionOrder} from '../types';
import {Modal} from '../components/Modal';
import {OriginLabel, StatusText} from '../components/StatusText';

interface OrdersPageProps {
  onDataMutated: () => void;
}

const ORDER_STATUSES = ['Pending', 'Processing', 'Completed', 'Shipped', 'Delivered'];

export function OrdersPage({onDataMutated}: OrdersPageProps) {
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [batches, setBatches] = useState<ProductionOrder[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerOrder | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [createForm, setCreateForm] = useState({
    order_number: '',
    customer_name: '',
    customer_email: '',
    product_name: '',
    inventory_id: '',
    production_id: '',
    quantity: '1000',
    total_amount: '15000',
    order_status: 'Pending',
    order_date: '2026-11-22',
    delivery_date: '2026-12-12',
  });

  const [editForm, setEditForm] = useState({
    order_status: 'Processing',
    production_id: '',
    delivery_date: '',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [oRes, pRes, iRes] = await Promise.all([
        api.getOrders(),
        api.getProduction(),
        api.getInventory(),
      ]);
      setOrders(oRes.orders);
      setBatches(pRes.orders);
      setInventory(iRes.inventory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load orders');
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
      const matchesStatus = statusFilter === 'All' || o.order_status === statusFilter;
      const matchesQ =
        !q ||
        o.order_number.toLowerCase().includes(q) ||
        o.customer_name.toLowerCase().includes(q) ||
        o.product_name.toLowerCase().includes(q);
      return matchesStatus && matchesQ;
    });
  }, [orders, statusFilter, search]);

  const openCreate = () => {
    const firstInv = inventory[0];
    setCreateForm({
      order_number: `ORD-2026-${Math.floor(400 + Math.random() * 599)}`,
      customer_name: '',
      customer_email: '',
      product_name: firstInv ? firstInv.product_name : 'Organic Canvas Twill 320gsm',
      inventory_id: firstInv ? String(firstInv.inventory_id) : '',
      production_id: batches[0] ? String(batches[0].production_id) : '',
      quantity: '1200',
      total_amount: '17760',
      order_status: 'Pending',
      order_date: '2026-11-22',
      delivery_date: '2026-12-14',
    });
    setCreateOpen(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createOrder({
        ...createForm,
        inventory_id: createForm.inventory_id ? Number(createForm.inventory_id) : 0,
        production_id: createForm.production_id ? Number(createForm.production_id) : 0,
        quantity: Number(createForm.quantity),
        total_amount: Number(createForm.total_amount),
      });
      setCreateOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create customer order');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    try {
      await api.updateOrder(editing.order_id, {
        order_status: editForm.order_status,
        production_id: editForm.production_id ? Number(editForm.production_id) : 0,
        delivery_date: editForm.delivery_date,
      });
      setEditing(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update order');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Customer Order Fulfillment
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Create buyer orders, link manufacturing batches, and track delivery milestones.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>New Customer Order</span>
        </button>
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
              placeholder="Search order, customer, fabric..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-emerald-700 focus:outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-emerald-100/70 p-1">
            {['All', ...ORDER_STATUSES].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setStatusFilter(st)}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors whitespace-nowrap ${
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

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Order #</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Assigned Batch</th>
                <th className="px-4 py-3 text-right">Qty (m)</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Delivery Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3 text-right">Update</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Loading customer orders...
                  </td>
                </tr>
              ) : (
                filtered.map((o) => (
                  <tr key={o.order_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {o.order_number}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{o.customer_name}</p>
                      <p className="text-xs text-slate-500">{o.customer_email}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{o.product_name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-emerald-900">
                      {o.batch_number}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {o.quantity.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium tabular-nums">
                      ${o.total_amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">{o.delivery_date}</td>
                    <td className="px-4 py-3">
                      <StatusText status={o.order_status} />
                    </td>
                    <td className="px-4 py-3">
                      <OriginLabel isSample={o.is_sample_data} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          setEditing(o);
                          setEditForm({
                            order_status: o.order_status,
                            production_id: o.production_id ? String(o.production_id) : '',
                            delivery_date: o.delivery_date,
                          });
                        }}
                        className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-800"
                        title="Update order status & batch"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Order Modal */}
      <Modal
        open={createOpen}
        title="Create Customer Order"
        onClose={() => setCreateOpen(false)}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Order Number</label>
              <input
                type="text"
                required
                value={createForm.order_number}
                onChange={(e) => setCreateForm({...createForm, order_number: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Customer Name</label>
              <input
                type="text"
                required
                value={createForm.customer_name}
                onChange={(e) => setCreateForm({...createForm, customer_name: e.target.value})}
                placeholder="e.g. Stella McCartney Studio"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Customer Email</label>
              <input
                type="email"
                required
                value={createForm.customer_email}
                onChange={(e) => setCreateForm({...createForm, customer_email: e.target.value})}
                placeholder="procurement@brand.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Assign Production Batch</label>
              <select
                value={createForm.production_id}
                onChange={(e) => setCreateForm({...createForm, production_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Unassigned</option>
                {batches.map((b) => (
                  <option key={b.production_id} value={b.production_id}>
                    {b.batch_number} — {b.product_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Warehouse SKU</label>
              <select
                value={createForm.inventory_id}
                onChange={(e) => setCreateForm({...createForm, inventory_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">Made-to-Order</option>
                {inventory.map((i) => (
                  <option key={i.inventory_id} value={i.inventory_id}>
                    {i.sku} — {i.product_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Quantity (m)</label>
              <input
                type="number"
                min="1"
                required
                value={createForm.quantity}
                onChange={(e) => setCreateForm({...createForm, quantity: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Total ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                required
                value={createForm.total_amount}
                onChange={(e) => setCreateForm({...createForm, total_amount: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Order Date</label>
              <input
                type="date"
                required
                value={createForm.order_date}
                onChange={(e) => setCreateForm({...createForm, order_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Delivery Date</label>
              <input
                type="date"
                required
                value={createForm.delivery_date}
                onChange={(e) => setCreateForm({...createForm, delivery_date: e.target.value})}
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
              {submitting ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Order Modal */}
      <Modal
        open={Boolean(editing)}
        title={`Update ${editing?.order_number ?? ''}`}
        subtitle={editing?.customer_name}
        onClose={() => setEditing(null)}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Order Status</label>
            <select
              value={editForm.order_status}
              onChange={(e) => setEditForm({...editForm, order_status: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {ORDER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Assigned Batch</label>
            <select
              value={editForm.production_id}
              onChange={(e) => setEditForm({...editForm, production_id: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Keep Current</option>
              {batches.map((b) => (
                <option key={b.production_id} value={b.production_id}>
                  {b.batch_number} — {b.product_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Delivery Date</label>
            <input
              type="date"
              value={editForm.delivery_date}
              onChange={(e) => setEditForm({...editForm, delivery_date: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEditing(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Update Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
