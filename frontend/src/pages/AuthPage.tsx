import React, {useState} from 'react';
import {Factory, ShieldCheck, ArrowRight, Loader2} from 'lucide-react';
import {api, setAuthToken} from '../services/api';
import type {User, UserRole} from '../types';

interface AuthPageProps {
  onAuthenticated: (user: User) => void;
}

const DEMO_ACCOUNTS: Array<{
  label: string;
  role: UserRole;
  email: string;
  password: string;
}> = [
  {label: 'Administrator', role: 'Administrator', email: 'admin@ecoweave.io', password: 'Admin@2026'},
  {
    label: 'Production Manager',
    role: 'Production Manager',
    email: 'production@ecoweave.io',
    password: 'Prod@2026',
  },
  {
    label: 'Inventory Manager',
    role: 'Inventory Manager',
    email: 'inventory@ecoweave.io',
    password: 'Inv@2026',
  },
];

export function AuthPage({onAuthenticated}: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('admin@ecoweave.io');
  const [password, setPassword] = useState('Admin@2026');
  const [role, setRole] = useState<UserRole>('Production Manager');
  const [department, setDepartment] = useState('Spinning & Weaving Floor');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [heroImgFailed, setHeroImgFailed] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res =
        mode === 'login'
          ? await api.login(email.trim(), password)
          : await api.register({
              full_name: fullName.trim(),
              email: email.trim(),
              password,
              role,
              department: department.trim() || 'Operations',
            });
      setAuthToken(res.token);
      onAuthenticated(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/80 lg:grid lg:grid-cols-12">
      {/* Left Industrial Textile Showcase */}
      <div className="relative hidden overflow-hidden bg-emerald-950 lg:col-span-5 lg:flex lg:flex-col lg:justify-between">
        {!heroImgFailed ? (
          <img
            src="/src/assets/images/textile_mill_hero_1795359896278.jpg"
            alt="Modern sustainable textile air-jet weaving floor"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover opacity-55"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-950 via-emerald-900 to-slate-900" />
        )}
        <div className="relative z-10 bg-gradient-to-b from-emerald-950/90 via-emerald-950/40 to-transparent p-10">
          <div className="flex items-center gap-2.5 text-white">
            <Factory className="h-6 w-6 text-emerald-400" />
            <span className="font-display text-xl font-bold tracking-tight">EcoWeave</span>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-emerald-100/90">
            Sustainable Textile Manufacturing &amp; Production Tracking System
          </p>
        </div>

        <div className="relative z-10 bg-gradient-to-t from-emerald-950 via-emerald-950/85 to-transparent p-10 text-white">
          <h2 className="font-display text-2xl font-semibold leading-snug text-balance">
            End-to-end mill visibility from organic fibre intake to closed-loop sustainability.
          </h2>
          <div className="mt-6 grid grid-cols-3 gap-4 border-t border-emerald-800/70 pt-5 text-xs">
            <div>
              <p className="text-emerald-300">Production</p>
              <p className="mt-1 font-mono text-base font-semibold tabular-nums">8 Stages</p>
            </div>
            <div>
              <p className="text-emerald-300">Backend Engine</p>
              <p className="mt-1 font-mono text-base font-semibold">C++17 Crow</p>
            </div>
            <div>
              <p className="text-emerald-300">Persistence</p>
              <p className="mt-1 font-mono text-base font-semibold">MySQL 12-Table</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Auth Form */}
      <div className="flex min-h-screen flex-col justify-center px-6 py-12 lg:col-span-7 lg:px-16">
        <div className="mx-auto w-full max-w-md rounded-2xl border border-emerald-900/10 bg-white/95 p-8 shadow-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <Factory className="h-6 w-6 text-emerald-900" />
            <span className="font-display text-xl font-bold text-slate-900">EcoWeave</span>
          </div>

          <div className="mb-6">
            <h1 className="font-display text-2xl font-bold text-slate-900 text-balance">
              {mode === 'login' ? 'Sign in to Operations Console' : 'Create Operator Account'}
            </h1>
            <p className="mt-1.5 text-sm text-slate-600">
              {mode === 'login'
                ? 'Authenticate with your role credentials to access plant telemetry and records.'
                : 'Register a new user in MySQL with role-based module permissions.'}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="mb-6 grid grid-cols-2 rounded-lg border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`rounded-md py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Register Account
            </button>
          </div>

          {error && (
            <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Jordan Alvarez"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Access Role
                    </label>
                    <select
                      value={role}
                      onChange={(e) => setRole(e.target.value as UserRole)}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    >
                      <option value="Administrator">Administrator</option>
                      <option value="Production Manager">Production Manager</option>
                      <option value="Inventory Manager">Inventory Manager</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">
                      Department
                    </label>
                    <input
                      type="text"
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="Weaving Floor"
                      className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Work Email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="operator@ecoweave.io"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-700/20"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {mode === 'login' && (
            <div className="mt-8 border-t border-slate-200 pt-6">
              <div className="mb-3 flex items-center gap-2 text-xs font-medium text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>Seeded Role Credentials (Quick Select)</span>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => {
                      setEmail(acc.email);
                      setPassword(acc.password);
                      setError(null);
                    }}
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left transition-colors hover:border-emerald-600 hover:bg-emerald-50/40"
                  >
                    <p className="text-xs font-semibold text-slate-800">{acc.label}</p>
                    <p className="mt-0.5 truncate font-mono text-[11px] text-slate-500">
                      {acc.email}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
