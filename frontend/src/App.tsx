import {useCallback, useEffect, useState} from 'react';
import {api, setAuthToken} from './services/api';
import type {DashboardData, User} from './types';
import {AuthPage} from './pages/AuthPage';
import {DashboardLayout, NAV_ITEMS, type ModuleKey} from './layouts/DashboardLayout';
import {DashboardPage} from './pages/DashboardPage';
import {MaterialsPage} from './pages/MaterialsPage';
import {ProductionPage} from './pages/ProductionPage';
import {MachinesPage} from './pages/MachinesPage';
import {QualityPage} from './pages/QualityPage';
import {InventoryPage} from './pages/InventoryPage';
import {SustainabilityPage} from './pages/SustainabilityPage';
import {OrdersPage} from './pages/OrdersPage';
import {ReportsPage} from './pages/ReportsPage';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeModule, setActiveModule] = useState<ModuleKey>('dashboard');
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const [dashError, setDashError] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    if (!user) return;
    setDashLoading(true);
    setDashError(null);
    try {
      const data = await api.getDashboard();
      setDashboard(data);
    } catch (err) {
      setDashError(err instanceof Error ? err.message : 'Failed to load dashboard');
    } finally {
      setDashLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const allowed = NAV_ITEMS.filter((item) => item.roles.includes(user.role));
      if (!allowed.some((item) => item.key === activeModule)) {
        setActiveModule(allowed[0]?.key ?? 'dashboard');
      }
      void loadDashboard();
    }
  }, [user, activeModule, loadDashboard]);

  const handleLogout = () => {
    setAuthToken(null);
    setUser(null);
    setDashboard(null);
    setActiveModule('dashboard');
  };

  if (!user) {
    return <AuthPage onAuthenticated={(u) => setUser(u)} />;
  }

  return (
    <DashboardLayout
      user={user}
      activeModule={activeModule}
      onSelectModule={setActiveModule}
      onLogout={handleLogout}
      onRefresh={() => void loadDashboard()}
      refreshing={dashLoading}
    >
      {activeModule === 'dashboard' && (
        <DashboardPage
          data={dashboard}
          loading={dashLoading}
          error={dashError}
          onNavigate={setActiveModule}
        />
      )}
      {activeModule === 'materials' && (
        <MaterialsPage userRole={user.role} onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'production' && (
        <ProductionPage onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'machines' && (
        <MachinesPage onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'quality' && (
        <QualityPage onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'inventory' && (
        <InventoryPage userRole={user.role} onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'sustainability' && (
        <SustainabilityPage onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'orders' && (
        <OrdersPage onDataMutated={() => void loadDashboard()} />
      )}
      {activeModule === 'reports' && <ReportsPage />}
    </DashboardLayout>
  );
}
