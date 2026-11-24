import React, {useState} from 'react';
import {
  LayoutDashboard,
  Layers,
  Workflow,
  Cog,
  ShieldCheck,
  Package,
  Leaf,
  ShoppingCart,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  Factory,
  RefreshCw,
} from 'lucide-react';
import type {User, UserRole} from '../types';

export type ModuleKey =
  | 'dashboard'
  | 'materials'
  | 'production'
  | 'machines'
  | 'quality'
  | 'inventory'
  | 'sustainability'
  | 'orders'
  | 'reports';

interface NavItem {
  key: ModuleKey;
  label: string;
  icon: React.ComponentType<{className?: string}>;
  roles: UserRole[];
}

export const NAV_ITEMS: NavItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    roles: ['Administrator', 'Production Manager', 'Inventory Manager'],
  },
  {
    key: 'materials',
    label: 'Raw Materials',
    icon: Layers,
    roles: ['Administrator', 'Production Manager', 'Inventory Manager'],
  },
  {
    key: 'production',
    label: 'Production Tracking',
    icon: Workflow,
    roles: ['Administrator', 'Production Manager'],
  },
  {
    key: 'machines',
    label: 'Machines',
    icon: Cog,
    roles: ['Administrator', 'Production Manager'],
  },
  {
    key: 'quality',
    label: 'Quality Control',
    icon: ShieldCheck,
    roles: ['Administrator', 'Production Manager', 'Inventory Manager'],
  },
  {
    key: 'inventory',
    label: 'Inventory',
    icon: Package,
    roles: ['Administrator', 'Inventory Manager'],
  },
  {
    key: 'sustainability',
    label: 'Sustainability',
    icon: Leaf,
    roles: ['Administrator', 'Production Manager'],
  },
  {
    key: 'orders',
    label: 'Customer Orders',
    icon: ShoppingCart,
    roles: ['Administrator', 'Production Manager', 'Inventory Manager'],
  },
  {
    key: 'reports',
    label: 'Reports & Analytics',
    icon: FileBarChart2,
    roles: ['Administrator', 'Production Manager', 'Inventory Manager'],
  },
];

interface DashboardLayoutProps {
  user: User;
  activeModule: ModuleKey;
  onSelectModule: (key: ModuleKey) => void;
  onLogout: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  children: React.ReactNode;
}

export function DashboardLayout({
  user,
  activeModule,
  onSelectModule,
  onLogout,
  onRefresh,
  refreshing = false,
  children,
}: DashboardLayoutProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const visibleNav = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
  const currentItem = NAV_ITEMS.find((item) => item.key === activeModule) ?? visibleNav[0];

  const sidebarContent = (
    <div className="flex h-full flex-col bg-emerald-950 text-emerald-50">
      <div className="flex h-16 items-center justify-between border-b border-emerald-900/80 px-5">
        <div className="flex items-center gap-2.5">
          <Factory className="h-5 w-5 text-emerald-400 shrink-0" />
          <span className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap">
            EcoWeave
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation"
          className="rounded-lg p-1 text-emerald-300 hover:bg-emerald-900 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4" aria-label="Primary modules">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          const active = activeModule === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                onSelectModule(item.key);
                setMobileOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-emerald-100/80 hover:bg-emerald-900/70 hover:text-white'
              }`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-emerald-400/85'}`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="border-t border-emerald-900/80 p-4">
        <div className="flex items-center gap-3">
          {!avatarError ? (
            <img
              src="/src/assets/images/manager_avatar_1795359895977.jpg"
              alt={user.full_name}
              referrerPolicy="no-referrer"
              onError={() => setAvatarError(true)}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-emerald-700"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-800 text-xs font-semibold text-white">
              {user.full_name.slice(0, 2).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.full_name}</p>
            <p className="truncate text-xs text-emerald-300/80">{user.role}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-800 bg-emerald-900/50 px-3 py-2 text-xs font-medium text-emerald-100 transition-colors hover:bg-emerald-800"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50/70 to-emerald-100/80 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden w-64 shrink-0 border-r border-emerald-950 lg:block">
        <div className="sticky top-0 h-screen">{sidebarContent}</div>
      </aside>

      {/* Mobile Drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 w-64">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-emerald-900/10 bg-white/85 px-4 backdrop-blur-md sm:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation menu"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex min-w-0 items-center gap-2 text-sm">
              <span className="hidden text-slate-400 sm:inline">Operations</span>
              <span className="hidden text-slate-300 sm:inline">/</span>
              <h1 className="truncate font-display text-base font-semibold text-slate-900 sm:text-lg">
                {currentItem?.label}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0">
            <span className="hidden text-xs text-slate-500 md:inline whitespace-nowrap">
              {user.department} · {user.role}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-60 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin text-emerald-700' : ''}`} />
              <span>Sync Data</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
