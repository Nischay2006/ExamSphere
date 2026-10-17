import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import StatsGrid from './components/StatsGrid';
import MasterDataView from './components/MasterDataView';
import SeatingAllocationView from './components/SeatingAllocationView';
import AuditLogsView from './components/AuditLogsView';
import DevSandboxView from './components/DevSandboxView';
import LoginModal from './components/LoginModal';
import { api } from './api';
import { Database, ShieldAlert, Cpu, Grid } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState(null);
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('master-data');
  const [stats, setStats] = useState({ students: 0, faculty: 0, courses: 0, rooms: 0, exams: 0 });

  const loadStats = async () => {
    try {
      const res = await api.getSystemSummary();
      setStats(res.data);
    } catch (err) {
      console.log('Stats fetch note:', err.message);
    }
  };

  useEffect(() => {
    // Check saved user session
    const savedUser = api.getUser();
    if (savedUser && api.getToken()) {
      setUser(savedUser);
      loadStats();
    } else {
      // Auto-open login for demo convenience if unauthenticated
      setIsLoginOpen(true);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser) => {
    setUser(loggedInUser);
    loadStats();
  };

  const handleLogout = () => {
    api.removeToken();
    setUser(null);
    setIsLoginOpen(true);
  };

  return (
    <div className="app-shell">
      <Navbar
        user={user}
        onOpenLogin={() => setIsLoginOpen(true)}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      <main className="main-content">
        {/* System Summary Metrics */}
        <StatsGrid stats={stats} />

        {/* Primary Navigation Tabs */}
        <div className="nav-tabs">
          <button
            className={`tab-btn ${activeTab === 'master-data' ? 'active' : ''}`}
            onClick={() => setActiveTab('master-data')}
          >
            <Database size={16} />
            <span>Resource & Data (Module 2)</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'seating' ? 'active' : ''}`}
            onClick={() => setActiveTab('seating')}
          >
            <Grid size={16} />
            <span>Smart Seating (Module 4)</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'audit-logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('audit-logs')}
          >
            <ShieldAlert size={16} />
            <span>System Audit Trail</span>
          </button>

          <button
            className={`tab-btn ${activeTab === 'dev-hub' ? 'active' : ''}`}
            onClick={() => setActiveTab('dev-hub')}
          >
            <Cpu size={16} />
            <span>Modules Hub (10 Modules)</span>
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'master-data' && (
          <MasterDataView user={user} onDataChange={loadStats} />
        )}

        {activeTab === 'seating' && (
          <SeatingAllocationView user={user} />
        )}

        {activeTab === 'audit-logs' && (
          <AuditLogsView />
        )}

        {activeTab === 'dev-hub' && (
          <DevSandboxView />
        )}
      </main>

      <LoginModal
        isOpen={isLoginOpen}
        onClose={() => setIsLoginOpen(false)}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
