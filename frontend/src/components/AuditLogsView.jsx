import React, { useState, useEffect } from 'react';
import { Activity, RefreshCw } from 'lucide-react';
import { api } from '../api';

// Fallback demo audit logs
const MOCK_AUDIT_LOGS = [
  {
    id: 1,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    user_name: 'ExamSphere Admin',
    user_email: 'admin@examsphere.edu',
    module: 'DUTY_MANAGEMENT',
    action: 'AUTO_ALLOCATE',
    details: 'Equi-variance duty allocation executed across 4 faculty members. Workload Fairness Index: 100%.',
    ip_address: '127.0.0.1'
  },
  {
    id: 2,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    user_name: 'ExamSphere Admin',
    user_email: 'admin@examsphere.edu',
    module: 'DUTY_MANAGEMENT',
    action: 'ASSIGN_DUTY',
    details: 'Assigned Dr. Harsh Taneja (FAC103) to Room E2-101 for CSE3005 Software Engineering End-Term.',
    ip_address: '127.0.0.1'
  },
  {
    id: 3,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    user_name: 'ExamSphere Admin',
    user_email: 'admin@examsphere.edu',
    module: 'DUTY_MANAGEMENT',
    action: 'SUBSTITUTE_DUTY',
    details: 'Reassigned Room E2-201 duty from Dr. Nishtha Phutela to Dr. Sukhandeep Kaur.',
    ip_address: '127.0.0.1'
  },
  {
    id: 4,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    user_name: 'ExamSphere Admin',
    user_email: 'admin@examsphere.edu',
    module: 'MASTER_DATA',
    action: 'CSV_IMPORT',
    details: 'Batch imported 40 student enrollments for B.Tech Semester 6.',
    ip_address: '127.0.0.1'
  },
  {
    id: 5,
    created_at: new Date(Date.now() - 3600000 * 28).toISOString(),
    user_name: 'ExamSphere Admin',
    user_email: 'admin@examsphere.edu',
    module: 'SECURITY',
    action: 'USER_LOGIN',
    details: 'Administrator logged in successfully via JWT session.',
    ip_address: '127.0.0.1'
  }
];

export default function AuditLogsView() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isUsingDemoFallback, setIsUsingDemoFallback] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await api.getAuditLogs();
      if (res.data && res.data.length > 0) {
        setLogs(res.data);
        setIsUsingDemoFallback(false);
      } else {
        setLogs(MOCK_AUDIT_LOGS);
        setIsUsingDemoFallback(true);
      }
    } catch (err) {
      console.warn('Backend note, loading fallback audit logs:', err.message);
      setLogs(MOCK_AUDIT_LOGS);
      setIsUsingDemoFallback(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return (
    <div className="panel-card">
      <div className="panel-header">
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2>System Audit Trail</h2>
            {isUsingDemoFallback && (
              <span className="badge badge-emerald" style={{ fontSize: '0.72rem' }}>
                Preview & Demo Active
              </span>
            )}
          </div>
          <p>Module 11: Immutable log of administrative operations, data modifications, and security events</p>
        </div>

        <button className="btn btn-secondary" onClick={fetchLogs}>
          <RefreshCw size={15} />
          <span>Refresh Logs</span>
        </button>
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Admin / User</th>
              <th>Module</th>
              <th>Action</th>
              <th>Operation Details</th>
              <th>Client IP</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: '#9ca3af' }}>
                  Loading audit events...
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: 'center', padding: '2.5rem', color: '#6b7280' }}>
                  No audit logs recorded yet. Changes to master data will automatically log here.
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#9ca3af' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {log.user_name || 'System Admin'}
                    <span style={{ fontSize: '0.72rem', color: '#6b7280', display: 'block' }}>
                      {log.user_email}
                    </span>
                  </td>
                  <td>
                    <span className="badge badge-indigo">{log.module}</span>
                  </td>
                  <td>
                    <span className="badge badge-emerald">{log.action}</span>
                  </td>
                  <td style={{ maxWidth: '300px', wordBreak: 'break-word', color: '#e5e7eb' }}>
                    {log.details}
                  </td>
                  <td style={{ fontFamily: 'JetBrains Mono', fontSize: '0.78rem', color: '#6b7280' }}>
                    {log.ip_address || '127.0.0.1'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
