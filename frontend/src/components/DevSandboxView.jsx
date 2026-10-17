import React from 'react';
import { CheckCircle2, Clock, ShieldCheck, Database, Calendar, Users, Eye, AlertOctagon, Bell, BarChart3 } from 'lucide-react';

export default function DevSandboxView() {
  const modules = [
    {
      id: '1',
      name: 'Authentication & Role Management',
      functionality: 'Login, JWT authentication, role-based access for Admin, Faculty, Invigilator and Student.',
      status: 'COMPLETED & LIVE',
      endpoints: ['POST /api/auth/login', 'POST /api/auth/register', 'GET /api/auth/me'],
      icon: CheckCircle2,
      color: '#10b981'
    },
    {
      id: '2',
      name: 'Resource & Data Management',
      functionality: 'Student, faculty, course and room CRUD operations; CSV bulk upload and data validation.',
      status: 'COMPLETED & LIVE',
      endpoints: ['GET/POST /api/master-data/:type', 'POST /api/master-data/upload-csv/:type'],
      icon: Database,
      color: '#10b981'
    },
    {
      id: '3',
      name: 'Exam Scheduling',
      functionality: 'Create examinations, generate timetables and detect scheduling conflicts.',
      status: 'Ready for Development',
      endpoints: ['POST /api/exams/schedule', 'GET /api/exams/conflicts'],
      icon: Calendar,
      color: '#f59e0b'
    },
    {
      id: '4',
      name: 'Smart Room & Seating Allocation',
      functionality: 'Allocate rooms based on capacity, assign student seats and apply anti-cheating seating rules.',
      status: 'COMPLETED & LIVE',
      endpoints: ['POST /api/allocations/seating', 'GET /api/allocations/exam/:id', 'GET /api/allocations/room/:id'],
      icon: ShieldCheck,
      color: '#10b981'
    },
    {
      id: '5',
      name: 'Faculty Duty & Workload Management',
      functionality: 'Assign invigilators to rooms and time slots, check faculty availability and balance workloads.',
      status: 'Ready for Development',
      endpoints: ['POST /api/duty/allocate', 'GET /api/duty/faculty/:id'],
      icon: Users,
      color: '#f59e0b'
    },
    {
      id: '6',
      name: 'Faculty Portal & Doubt Resolution',
      functionality: 'Allow faculty to view examination schedules and assigned duties, receive student doubt requests and respond to them.',
      status: 'Ready for Development',
      endpoints: ['GET /api/faculty/duties', 'POST /api/doubts/respond'],
      icon: Users,
      color: '#06b6d4'
    },
    {
      id: '7',
      name: 'Invigilator Portal & Attendance',
      functionality: 'View assigned duties, verify student identities, perform camera-based face matching and record attendance.',
      status: 'Ready for Development',
      endpoints: ['GET /api/invigilator/students', 'POST /api/attendance/verify'],
      icon: Eye,
      color: '#06b6d4'
    },
    {
      id: '8',
      name: 'Exam-Day Incident Management',
      functionality: 'Submit Unfair Means (UFM) reports with photo evidence and written statements, manage incident records and find substitute invigilators.',
      status: 'Ready for Development',
      endpoints: ['POST /api/ufm/report', 'POST /api/substitute/find'],
      icon: AlertOctagon,
      color: '#06b6d4'
    },
    {
      id: '9',
      name: 'Notification & Alert System',
      functionality: 'Send student examination and seating emails, faculty duty notifications and emergency alerts; track notification status.',
      status: 'Ready for Development',
      endpoints: ['POST /api/notifications/seating', 'POST /api/notifications/duty-alert'],
      icon: Bell,
      color: '#8b5cf6'
    },
    {
      id: '10',
      name: 'Analytics & Reports',
      functionality: 'Generate attendance statistics, room utilization reports, faculty workload reports and UFM summaries for administrators.',
      status: 'Ready for Development',
      endpoints: ['GET /api/analytics/room-utilization', 'GET /api/analytics/attendance-stats'],
      icon: BarChart3,
      color: '#8b5cf6'
    }
  ];

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ marginBottom: '1.5rem' }}>
        <div className="panel-title">
          <h2>ExamSphere System Modules Hub</h2>
          <p>Official 10-Module architecture specification and real-time completion status</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.25rem' }}>
        {modules.map((m) => {
          const IconComp = m.icon;
          const isLive = m.status.includes('LIVE');
          return (
            <div
              key={m.id}
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: `1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.07)'}`,
                borderRadius: '12px',
                padding: '1.25rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.85rem',
                transition: 'var(--transition)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 800, fontSize: '0.85rem', color: isLive ? '#34d399' : '#a5b4fc', fontFamily: 'monospace' }}>
                    MODULE {m.id}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.55rem',
                      borderRadius: '6px',
                      background: isLive ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.15)',
                      color: isLive ? '#34d399' : '#fbbf24',
                      border: `1px solid ${isLive ? 'rgba(16,185,129,0.3)' : 'rgba(245,158,11,0.3)'}`
                    }}
                  >
                    {m.status}
                  </span>
                </div>
                <h4 style={{ fontSize: '1.02rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.4rem' }}>{m.name}</h4>
                <p style={{ fontSize: '0.82rem', color: '#9ca3af', lineHeight: '1.45' }}>
                  {m.functionality}
                </p>
              </div>

              <div style={{ background: 'rgba(0, 0, 0, 0.35)', padding: '0.65rem 0.75rem', borderRadius: '8px', fontSize: '0.74rem', fontFamily: 'JetBrains Mono, monospace', color: '#9ca3af' }}>
                <div style={{ fontSize: '0.68rem', color: '#6b7280', textTransform: 'uppercase', marginBottom: '0.25rem', fontWeight: 700 }}>
                  API Endpoints
                </div>
                {m.endpoints.map((ep, i) => (
                  <div key={i} style={{ color: '#c7d2fe', padding: '0.1rem 0' }}>{ep}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
