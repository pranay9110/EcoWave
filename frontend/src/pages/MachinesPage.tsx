import React, {useEffect, useMemo, useState} from 'react';
import {Plus, Wrench, SlidersHorizontal} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {api} from '../services/api';
import type {Machine, MaintenanceRecord} from '../types';
import {Modal} from '../components/Modal';
import {OriginLabel, StatusText} from '../components/StatusText';

interface MachinesPageProps {
  onDataMutated: () => void;
}

const MACHINE_TYPES = [
  'Spinning Frame',
  'Air-Jet Loom',
  'Dyeing Vat',
  'Finishing Stenter',
  'Carding Unit',
  'Inspection Table',
];
const MACHINE_STATUSES = ['Running', 'Idle', 'Under Maintenance', 'Breakdown'];

export function MachinesPage({onDataMutated}: MachinesPageProps) {
  const [machines, setMachines] = useState<Machine[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');

  const [registerOpen, setRegisterOpen] = useState(false);
  const [editMachine, setEditMachine] = useState<Machine | null>(null);
  const [maintOpen, setMaintOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [newForm, setNewForm] = useState({
    machine_code: '',
    machine_name: '',
    machine_type: 'Air-Jet Loom',
    plant_zone: 'Weaving Floor B',
    status: 'Running',
    operating_hours: '0',
    utilization_pct: '88',
    downtime_hours: '0',
    energy_rating_kw: '42.5',
    next_maintenance_date: '2027-01-15',
  });

  const [editForm, setEditForm] = useState({
    status: 'Running',
    operating_hours: '0',
    utilization_pct: '0',
    downtime_hours: '0',
    next_maintenance_date: '',
  });

  const [maintForm, setMaintForm] = useState({
    machine_id: '',
    maintenance_type: 'Preventive',
    description: '',
    technician_name: '',
    downtime_hours: '4',
    cost_usd: '350',
    scheduled_date: '2026-11-24',
    status: 'In Progress',
  });

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getMachines();
      setMachines(res.machines);
      setMaintenance(res.maintenance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load machines');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const filtered = useMemo(
    () => machines.filter((m) => statusFilter === 'All' || m.status === statusFilter),
    [machines, statusFilter],
  );

  const openRegister = () => {
    setNewForm({
      machine_code: `MCH-${Math.floor(10 + Math.random() * 89)}`,
      machine_name: '',
      machine_type: 'Air-Jet Loom',
      plant_zone: 'Weaving Floor B',
      status: 'Running',
      operating_hours: '120',
      utilization_pct: '90',
      downtime_hours: '2',
      energy_rating_kw: '42.5',
      next_maintenance_date: '2027-01-15',
    });
    setRegisterOpen(true);
  };

  const openMaint = (machineId?: number) => {
    setMaintForm({
      machine_id: machineId
        ? String(machineId)
        : machines[0]
          ? String(machines[0].machine_id)
          : '',
      maintenance_type: 'Breakdown Repair',
      description: '',
      technician_name: '',
      downtime_hours: '4',
      cost_usd: '450',
      scheduled_date: '2026-11-22',
      status: 'In Progress',
    });
    setMaintOpen(true);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.createMachine({
        ...newForm,
        operating_hours: Number(newForm.operating_hours),
        utilization_pct: Number(newForm.utilization_pct),
        downtime_hours: Number(newForm.downtime_hours),
        energy_rating_kw: Number(newForm.energy_rating_kw),
      });
      setRegisterOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editMachine) return;
    setSubmitting(true);
    try {
      await api.updateMachine(editMachine.machine_id, {
        status: editForm.status,
        operating_hours: Number(editForm.operating_hours),
        utilization_pct: Number(editForm.utilization_pct),
        downtime_hours: Number(editForm.downtime_hours),
        next_maintenance_date: editForm.next_maintenance_date,
      });
      setEditMachine(null);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update machine');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateMaint = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createMaintenance({
        ...maintForm,
        machine_id: Number(maintForm.machine_id),
        downtime_hours: Number(maintForm.downtime_hours),
        cost_usd: Number(maintForm.cost_usd),
      });
      setMaintOpen(false);
      await loadData();
      onDataMutated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log maintenance');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Machine Fleet &amp; Maintenance
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Monitor utilization, operating hours, downtime, and report breakdowns or preventive schedules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => openMaint()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap"
          >
            <Wrench className="h-4 w-4 text-amber-600" />
            <span>Log Maintenance / Breakdown</span>
          </button>
          <button
            type="button"
            onClick={openRegister}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>Register Machine</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Machine Utilization vs Downtime Chart */}
      <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-display text-base font-semibold text-slate-900">
              Machine Utilization vs. Downtime Hours
            </h3>
            <p className="text-xs text-slate-500">Comparing active line efficiency against logged downtime</p>
          </div>
        </div>
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={machines} margin={{top: 8, right: 16, left: -12, bottom: 0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="machine_code" tick={{fontSize: 12, fill: '#475569'}} />
              <YAxis tick={{fontSize: 12, fill: '#475569'}} />
              <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
              <Legend />
              <Bar dataKey="utilization_pct" name="Utilization (%)" fill="#059669" radius={[4, 4, 0, 0]} />
              <Bar dataKey="downtime_hours" name="Downtime (hrs)" fill="#d97706" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Machines Table */}
      <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-emerald-900/10 bg-emerald-50/50 p-4">
          <h3 className="font-display text-base font-semibold text-emerald-950">
            Registered Machinery ({filtered.length})
          </h3>
          <div className="flex flex-wrap items-center gap-1 rounded-lg bg-emerald-100/70 p-1">
            {['All', ...MACHINE_STATUSES].map((st) => (
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
                <th className="px-4 py-3">Code</th>
                <th className="px-4 py-3">Machine Name</th>
                <th className="px-4 py-3">Type &amp; Zone</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Operating Hrs</th>
                <th className="px-4 py-3 text-right">Utilization</th>
                <th className="px-4 py-3 text-right">Downtime</th>
                <th className="px-4 py-3">Next Service</th>
                <th className="px-4 py-3">Origin</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-slate-500">
                    Loading machinery telemetry...
                  </td>
                </tr>
              ) : (
                filtered.map((m) => (
                  <tr key={m.machine_id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">
                      {m.machine_code}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{m.machine_name}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {m.machine_type} · {m.plant_zone}
                    </td>
                    <td className="px-4 py-3">
                      <StatusText status={m.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">
                      {m.operating_hours.toLocaleString()} h
                    </td>
                    <td className="px-4 py-3 text-right font-mono font-medium text-emerald-800 tabular-nums">
                      {m.utilization_pct.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 tabular-nums">
                      {m.downtime_hours.toFixed(1)} h
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600">
                      {m.next_maintenance_date || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <OriginLabel isSample={m.is_sample_data} />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEditMachine(m);
                            setEditForm({
                              status: m.status,
                              operating_hours: String(m.operating_hours),
                              utilization_pct: String(m.utilization_pct),
                              downtime_hours: String(m.downtime_hours),
                              next_maintenance_date: m.next_maintenance_date,
                            });
                          }}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-emerald-800"
                          title="Update telemetry"
                        >
                          <SlidersHorizontal className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openMaint(m.machine_id)}
                          className="rounded-md p-1.5 text-slate-500 hover:bg-amber-50 hover:text-amber-700"
                          title="Report maintenance or breakdown"
                        >
                          <Wrench className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Maintenance History Table */}
      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-200 p-4">
          <h3 className="font-display text-base font-semibold text-slate-900">
            Maintenance Schedules &amp; Breakdown Logs
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-xs font-medium text-slate-500">
              <tr>
                <th className="px-4 py-3">Machine</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Technician</th>
                <th className="px-4 py-3 text-right">Downtime</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3">Scheduled</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {maintenance.map((mm) => (
                <tr key={mm.maintenance_id}>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs text-slate-500">{mm.machine_code}</span>{' '}
                    <span className="font-medium text-slate-900">{mm.machine_name}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">{mm.maintenance_type}</td>
                  <td className="px-4 py-3 text-slate-600">{mm.description}</td>
                  <td className="px-4 py-3 text-slate-700">{mm.technician_name}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">{mm.downtime_hours} h</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums">${mm.cost_usd.toFixed(0)}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-600">{mm.scheduled_date}</td>
                  <td className="px-4 py-3">
                    <StatusText status={mm.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Machine Modal */}
      <Modal
        open={registerOpen}
        title="Register New Machine"
        onClose={() => setRegisterOpen(false)}
      >
        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Machine Code</label>
              <input
                type="text"
                required
                value={newForm.machine_code}
                onChange={(e) => setNewForm({...newForm, machine_code: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Machine Type</label>
              <select
                value={newForm.machine_type}
                onChange={(e) => setNewForm({...newForm, machine_type: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {MACHINE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Machine Name</label>
            <input
              type="text"
              required
              value={newForm.machine_name}
              onChange={(e) => setNewForm({...newForm, machine_name: e.target.value})}
              placeholder="e.g. Dornier Eco-Weave Rapier #9"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Plant Zone</label>
              <input
                type="text"
                required
                value={newForm.plant_zone}
                onChange={(e) => setNewForm({...newForm, plant_zone: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Status</label>
              <select
                value={newForm.status}
                onChange={(e) => setNewForm({...newForm, status: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {MACHINE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Utilization %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={newForm.utilization_pct}
                onChange={(e) => setNewForm({...newForm, utilization_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Power Rating (kW)</label>
              <input
                type="number"
                step="0.5"
                value={newForm.energy_rating_kw}
                onChange={(e) => setNewForm({...newForm, energy_rating_kw: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Next Maintenance</label>
              <input
                type="date"
                value={newForm.next_maintenance_date}
                onChange={(e) => setNewForm({...newForm, next_maintenance_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setRegisterOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              {submitting ? 'Registering...' : 'Register Machine'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Update Machine Modal */}
      <Modal
        open={Boolean(editMachine)}
        title={`Update ${editMachine?.machine_code ?? ''}`}
        subtitle={editMachine?.machine_name}
        onClose={() => setEditMachine(null)}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleUpdate} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Operational Status</label>
            <select
              value={editForm.status}
              onChange={(e) => setEditForm({...editForm, status: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            >
              {MACHINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Operating Hrs</label>
              <input
                type="number"
                step="0.1"
                value={editForm.operating_hours}
                onChange={(e) => setEditForm({...editForm, operating_hours: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Util %</label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                value={editForm.utilization_pct}
                onChange={(e) => setEditForm({...editForm, utilization_pct: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Downtime Hrs</label>
              <input
                type="number"
                step="0.1"
                value={editForm.downtime_hours}
                onChange={(e) => setEditForm({...editForm, downtime_hours: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Next Maintenance Date</label>
            <input
              type="date"
              value={editForm.next_maintenance_date}
              onChange={(e) => setEditForm({...editForm, next_maintenance_date: e.target.value})}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEditMachine(null)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Log Maintenance / Breakdown Modal */}
      <Modal
        open={maintOpen}
        title="Log Maintenance or Breakdown"
        onClose={() => setMaintOpen(false)}
      >
        <form onSubmit={handleCreateMaint} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Machine</label>
              <select
                required
                value={maintForm.machine_id}
                onChange={(e) => setMaintForm({...maintForm, machine_id: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id}>
                    {m.machine_code} — {m.machine_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Event Type</label>
              <select
                value={maintForm.maintenance_type}
                onChange={(e) => setMaintForm({...maintForm, maintenance_type: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Breakdown Repair">Breakdown Repair</option>
                <option value="Calibration">Calibration</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Fault / Service Description</label>
            <textarea
              required
              rows={2}
              value={maintForm.description}
              onChange={(e) => setMaintForm({...maintForm, description: e.target.value})}
              placeholder="Describe mechanical fault or maintenance checklist..."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Technician</label>
              <input
                type="text"
                required
                value={maintForm.technician_name}
                onChange={(e) => setMaintForm({...maintForm, technician_name: e.target.value})}
                placeholder="Technician name"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Downtime (hrs)</label>
              <input
                type="number"
                step="0.5"
                min="0"
                value={maintForm.downtime_hours}
                onChange={(e) => setMaintForm({...maintForm, downtime_hours: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Scheduled Date</label>
              <input
                type="date"
                required
                value={maintForm.scheduled_date}
                onChange={(e) => setMaintForm({...maintForm, scheduled_date: e.target.value})}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setMaintOpen(false)}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800"
            >
              {submitting ? 'Logging...' : 'Save Log'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
