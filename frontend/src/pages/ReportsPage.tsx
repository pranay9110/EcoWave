import {useEffect, useMemo, useState} from 'react';
import {Download} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import {api} from '../services/api';
import type {ReportPayload} from '../types';

const REPORT_TYPES = [
  {key: 'daily_production', label: 'Daily Production'},
  {key: 'weekly_production', label: 'Weekly Production'},
  {key: 'monthly_production', label: 'Monthly Production'},
  {key: 'material_consumption', label: 'Raw Material Consumption'},
  {key: 'machine_performance', label: 'Machine Performance'},
  {key: 'product_quality', label: 'Product Quality'},
  {key: 'inventory', label: 'Inventory'},
  {key: 'sustainability', label: 'Sustainability Performance'},
];

export function ReportsPage() {
  const [selectedType, setSelectedType] = useState('daily_production');
  const [report, setReport] = useState<ReportPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.getReport(selectedType);
        if (active) setReport(res);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Failed to load report');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [selectedType]);

  const handleDownloadCsv = async () => {
    setDownloading(true);
    setError(null);
    try {
      await api.downloadReportCsv(selectedType);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV export failed');
    } finally {
      setDownloading(false);
    }
  };

  // Build chart data dynamically from the returned MySQL report rows
  const chartData = useMemo(() => {
    if (!report || report.rows.length === 0) return [];
    const labelIdx = 0;
    // Find first purely numeric column after column 0 for visual plotting
    let valIdx = -1;
    for (let c = 1; c < report.headers.length; c++) {
      const sampleVal = Number(report.rows[0][c]);
      if (!Number.isNaN(sampleVal) && report.rows[0][c] !== '') {
        valIdx = c;
        break;
      }
    }
    if (valIdx === -1) return [];
    return report.rows.slice(0, 10).map((row) => ({
      name: row[labelIdx],
      value: Number(row[valIdx]) || 0,
      metricLabel: report.headers[valIdx],
    }));
  }, [report]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-bold text-slate-900">
            Reports &amp; CSV Exports
          </h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Live SQL reports compiled by the C++ Crow server with one-click CSV download.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadCsv}
          disabled={downloading || loading}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-800 disabled:opacity-60 whitespace-nowrap"
        >
          <Download className="h-4 w-4" />
          <span>{downloading ? 'Exporting...' : 'Download CSV'}</span>
        </button>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-emerald-900/10 bg-white/95 p-2 shadow-xs">
        {REPORT_TYPES.map((rt) => (
          <button
            key={rt.key}
            type="button"
            onClick={() => setSelectedType(rt.key)}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
              selectedType === rt.key
                ? 'bg-emerald-900 text-white shadow-xs'
                : 'text-emerald-950/75 hover:bg-emerald-50 hover:text-emerald-950'
            }`}
          >
            {rt.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Report Chart */}
      {chartData.length > 0 && (
        <div className="rounded-xl border border-emerald-900/10 bg-white/95 p-6 shadow-xs">
          <h3 className="mb-4 font-display text-base font-semibold text-slate-900">
            {REPORT_TYPES.find((r) => r.key === selectedType)?.label} — {chartData[0].metricLabel}
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{top: 8, right: 16, left: 0, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 11, fill: '#475569'}} />
                <YAxis tick={{fontSize: 12, fill: '#475569'}} />
                <Tooltip contentStyle={{borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '12px'}} />
                <Bar
                  dataKey="value"
                  name={chartData[0].metricLabel}
                  fill="#059669"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Report Data Grid */}
      <div className="overflow-hidden rounded-xl border border-emerald-900/10 bg-white/95 shadow-xs">
        <div className="border-b border-emerald-900/10 bg-emerald-50/60 px-4 py-3">
          <h3 className="font-display text-sm font-semibold text-emerald-950">
            Report Data Preview ({report?.rows.length ?? 0} rows)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-emerald-950/[0.03] text-xs font-semibold text-slate-600">
              <tr>
                {report?.headers.map((h) => (
                  <th key={h} className="px-4 py-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    Generating report from MySQL...
                  </td>
                </tr>
              ) : !report || report.rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No records available for this report.
                  </td>
                </tr>
              ) : (
                report.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/70">
                    {row.map((cell, cIdx) => (
                      <td
                        key={cIdx}
                        className={`px-4 py-3 whitespace-nowrap ${
                          cIdx === 0 ? 'font-mono text-xs font-medium text-slate-800' : 'text-slate-700'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
