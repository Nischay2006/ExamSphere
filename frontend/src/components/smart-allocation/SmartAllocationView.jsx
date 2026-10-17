import React, { useState } from 'react';
import { Calendar, Scale, Zap } from 'lucide-react';
import TimetableSchedulerView from './TimetableSchedulerView';
import WorkloadBalancerView from './WorkloadBalancerView';

export default function SmartAllocationView() {
  const [subTab, setSubTab] = useState('scheduler');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Module Hub Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))',
        border: '1px solid var(--border-accent)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem 2rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.25)'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.35rem' }}>
            <span style={{ 
              background: 'linear-gradient(135deg, #6366f1, #06b6d4)', 
              padding: '0.2rem 0.6rem', 
              borderRadius: '6px', 
              fontSize: '0.75rem', 
              fontWeight: 800,
              color: '#fff',
              letterSpacing: '0.05em'
            }}>
              ALGORITHMIC CORE
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
              Smart Allocation & Scheduling
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '720px' }}>
            Applies exam difficulty considerations and workload-balancing logic.
          </p>
        </div>

        {/* Feature Badges */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem'
          }}>
            <Zap size={15} color="#fbbf24" />
            <span>Difficulty Spacing</span>
          </div>

          <div style={{ 
            background: 'rgba(255, 255, 255, 0.04)', 
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.45rem 0.85rem',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            fontSize: '0.8rem'
          }}>
            <Scale size={15} color="#06b6d4" />
            <span>Seniority Balancer</span>
          </div>
        </div>
      </div>

      {/* Internal Sub-Navigation Tabs */}
      <div className="nav-tabs" style={{ marginBottom: '0.25rem' }}>
        <button
          className={`tab-btn ${subTab === 'scheduler' ? 'active' : ''}`}
          onClick={() => setSubTab('scheduler')}
        >
          <Calendar size={16} />
          <span>Exam Scheduling</span>
        </button>

        <button
          className={`tab-btn ${subTab === 'workload' ? 'active' : ''}`}
          onClick={() => setSubTab('workload')}
        >
          <Scale size={16} />
          <span>Faculty Duty & Workload Management</span>
        </button>
      </div>

      {/* Sub-View Rendering */}
      {subTab === 'scheduler' && (
        <TimetableSchedulerView />
      )}

      {subTab === 'workload' && (
        <WorkloadBalancerView />
      )}
    </div>
  );
}
