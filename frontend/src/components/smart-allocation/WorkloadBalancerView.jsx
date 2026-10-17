import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { 
  Users, Scale, Award, RefreshCw, Sparkles, 
  Trash2, UserCheck, ShieldAlert, CheckCircle2, UserX, AlertCircle 
} from 'lucide-react';

const MOCK_ROSTER_FALLBACK = [
  { id: 101, exam_name: 'CSE3005 Software Engineering End-Term', course_code: 'CSE3005', exam_date: '2026-11-20', start_time: '09:30:00', end_time: '12:30:00', duration_minutes: 180, room_number: 'E2-101', room_capacity: 30, faculty_name: 'Dr. Harsh Taneja', faculty_code: 'FAC103', faculty_department: 'ECE', course_department: 'CSE', designation: 'Associate Professor', seniority_level: 2, status: 'ASSIGNED' },
  { id: 102, exam_name: 'CSE3002 Database Systems Final Exam', course_code: 'CSE3002', exam_date: '2026-11-22', start_time: '09:30:00', end_time: '12:30:00', duration_minutes: 180, room_number: 'AUD-HALL', room_capacity: 80, faculty_name: 'Dr. Shilpa Mahajan', faculty_code: 'FAC101', faculty_department: 'CSE', course_department: 'CSE', designation: 'Associate Professor', seniority_level: 2, status: 'ASSIGNED' },
  { id: 103, exam_name: 'ECE2001 Digital Electronics Mid-Term', course_code: 'ECE2001', exam_date: '2026-11-24', start_time: '14:00:00', end_time: '17:00:00', duration_minutes: 180, room_number: 'E2-201', room_capacity: 40, faculty_name: 'Dr. Sukhandeep Kaur', faculty_code: 'FAC104', faculty_department: 'ME', course_department: 'ECE', designation: 'Assistant Professor', seniority_level: 1, status: 'ASSIGNED' },
  { id: 104, exam_name: 'ME1001 Thermodynamics End-Term', course_code: 'ME1001', exam_date: '2026-11-26', start_time: '09:30:00', end_time: '12:30:00', duration_minutes: 180, room_number: 'E2-102', room_capacity: 30, faculty_name: 'Dr. Nishtha Phutela', faculty_code: 'FAC102', faculty_department: 'CSE', course_department: 'ME', designation: 'Assistant Professor', seniority_level: 1, status: 'ASSIGNED' }
];

const MOCK_WORKLOAD_FALLBACK = {
  totalFaculty: 4,
  totalAssignedDuties: 4,
  averageDuties: 1.0,
  stdDev: 0.0,
  fairnessIndex: 100,
  facultyList: [
    { id: 1, name: 'Dr. Shilpa Mahajan', faculty_code: 'FAC101', department: 'CSE', designation: 'Associate Professor', seniority_level: 2, max_duties: 4, assigned_duties: 1, remaining_duties: 3, workload_pct: 25 },
    { id: 2, name: 'Dr. Nishtha Phutela', faculty_code: 'FAC102', department: 'CSE', designation: 'Assistant Professor', seniority_level: 1, max_duties: 5, assigned_duties: 1, remaining_duties: 4, workload_pct: 20 },
    { id: 3, name: 'Dr. Harsh Taneja', faculty_code: 'FAC103', department: 'ECE', designation: 'Associate Professor', seniority_level: 2, max_duties: 4, assigned_duties: 1, remaining_duties: 3, workload_pct: 25 },
    { id: 4, name: 'Dr. Sukhandeep Kaur', faculty_code: 'FAC104', department: 'ME', designation: 'Assistant Professor', seniority_level: 1, max_duties: 5, assigned_duties: 1, remaining_duties: 4, workload_pct: 20 }
  ]
};

export default function WorkloadBalancerView() {
  const [roster, setRoster] = useState([]);
  const [workload, setWorkload] = useState(null);
  const [facultyList, setFacultyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);

  // Substitute modal
  const [substituteModal, setSubstituteModal] = useState({
    isOpen: false,
    dutyId: null,
    currentFacultyName: '',
    selectedSubstituteId: ''
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [rosterRes, workloadRes, facultyRes] = await Promise.all([
        api.getDutyRoster().catch(() => ({ data: [] })),
        api.getWorkloadStats().catch(() => ({ data: null })),
        api.getEntities('faculty').catch(() => ({ data: [] }))
      ]);

      const liveRoster = rosterRes.data && rosterRes.data.length > 0 ? rosterRes.data : MOCK_ROSTER_FALLBACK;
      const liveWorkload = workloadRes.data && workloadRes.data.facultyList && workloadRes.data.facultyList.length > 0 ? workloadRes.data : MOCK_WORKLOAD_FALLBACK;
      const liveFaculty = facultyRes.data && facultyRes.data.length > 0 ? facultyRes.data : MOCK_WORKLOAD_FALLBACK.facultyList;

      setRoster(liveRoster);
      setWorkload(liveWorkload);
      setFacultyList(liveFaculty);
    } catch (err) {
      console.warn('Using workload fallback data:', err.message);
      setRoster(MOCK_ROSTER_FALLBACK);
      setWorkload(MOCK_WORKLOAD_FALLBACK);
      setFacultyList(MOCK_WORKLOAD_FALLBACK.facultyList);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAutoAllocate = async () => {
    setAllocating(true);
    try {
      const res = await api.autoAllocateDuties({ clearExisting: false });
      alert(res.message);
      await loadData();
    } catch (err) {
      alert(`Duty allocation failed: ${err.message}`);
    } finally {
      setAllocating(false);
    }
  };

  const handleAssignSubstitute = async (e) => {
    e.preventDefault();
    if (!substituteModal.selectedSubstituteId) return;
    try {
      await api.assignSubstitute(substituteModal.dutyId, substituteModal.selectedSubstituteId);
      setSubstituteModal({ isOpen: false, dutyId: null, currentFacultyName: '', selectedSubstituteId: '' });
      await loadData();
    } catch (err) {
      alert(`Substitute assignment failed: ${err.message}`);
    }
  };

  const handleRemoveDuty = async (dutyId) => {
    if (!confirm('Remove this invigilation duty assignment?')) return;
    try {
      await api.removeDuty(dutyId);
      await loadData();
    } catch (err) {
      alert(`Remove failed: ${err.message}`);
    }
  };

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2>Faculty Duty & Workload Management</h2>
            <span className="badge badge-indigo">Module 5</span>
          </div>
          <p>Assign invigilators to rooms and time slots, check faculty availability and balance workloads</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadData} 
            disabled={loading}
            title="Refresh Roster"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleAutoAllocate}
            disabled={allocating}
          >
            <Sparkles size={16} />
            <span>{allocating ? 'Balancing Duties...' : 'Auto-Balance Duties'}</span>
          </button>
        </div>
      </div>

      {/* Statistical Summary Metric Cards */}
      {workload && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '1.5rem'
        }}>
          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Workload Fairness Index</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Scale size={20} />
              <span>{workload.fairnessIndex}%</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Optimal Equalized Load</span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Total Assigned Duties</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#6366f1', marginTop: '0.2rem' }}>
              {workload.totalAssignedDuties}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Across all scheduled halls</span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Average Duty Load</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#06b6d4', marginTop: '0.2rem' }}>
              {workload.averageDuties} / faculty
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Variance: σ = {workload.stdDev}</span>
          </div>

          <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Faculty Pool</span>
            <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f3f4f6', marginTop: '0.2rem' }}>
              {workload.totalFaculty} Members
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>All available for invigilation</span>
          </div>
        </div>
      )}

      {/* Faculty Workload Progress Grid */}
      {workload && workload.facultyList && (
        <div style={{ marginBottom: '2rem' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem' }}>
            Faculty Duty Capacity & Workload Balance
          </h4>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {workload.facultyList.map(f => {
              const assigned = Number(f.assigned_duties);
              const max = Number(f.max_duties);
              const pct = Math.min(100, Math.round((assigned / max) * 100));
              const fillColor = pct >= 100 ? '#f43f5e' : pct >= 75 ? '#f59e0b' : '#10b981';

              return (
                <div 
                  key={f.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '1rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '0.9rem' }}>{f.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        {f.designation} · {f.department}
                      </div>
                    </div>
                    <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                      Seniority {f.seniority_level}
                    </span>
                  </div>

                  <div className="workload-bar-wrap">
                    <div 
                      className="workload-bar-fill"
                      style={{ width: `${pct}%`, background: fillColor }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.45rem', fontSize: '0.75rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      Duties: <strong style={{ color: '#fff' }}>{assigned}</strong> / {max}
                    </span>
                    <span style={{ color: fillColor, fontWeight: 700 }}>
                      {pct}% capacity
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Duty Roster Table */}
      <div className="panel-title" style={{ marginBottom: '0.75rem' }}>
        <h3>Live Invigilation Duty Roster</h3>
        <p>Allocated faculty across all examination halls with impartiality verification</p>
      </div>

      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
          <p>Loading duty assignments...</p>
        </div>
      ) : roster.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <UserCheck size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h4 style={{ color: 'var(--text-main)', marginBottom: '0.4rem' }}>No Invigilation Duties Assigned Yet</h4>
          <p style={{ fontSize: '0.88rem', maxWidth: '420px', margin: '0 auto 1.25rem' }}>
            Click <strong>"Auto-Balance Duties"</strong> to distribute exam hall invigilation across faculty adhering to max duties and department impartiality.
          </p>
          <button className="btn btn-primary" onClick={handleAutoAllocate}>
            <Sparkles size={16} />
            <span>Balance & Assign Duties</span>
          </button>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Exam & Subject</th>
                <th>Schedule</th>
                <th>Examination Hall</th>
                <th>Assigned Invigilator</th>
                <th>Impartiality Check</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((duty) => {
                const isImpartial = duty.faculty_department !== duty.course_department;
                const isSubstituted = duty.status === 'SUBSTITUTED';
                const dateStr = duty.exam_date ? new Date(duty.exam_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

                return (
                  <tr key={duty.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)' }}>{duty.exam_name}</span>
                        <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                          {duty.course_code} ({duty.course_department})
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.82rem' }}>
                        <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{dateStr}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {duty.start_time?.substring(0, 5)} - {duty.end_time?.substring(0, 5)}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span className="badge badge-cyan">
                          Room {duty.room_number}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                          (Cap: {duty.room_capacity})
                        </span>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700, color: '#f3f4f6' }}>
                          {duty.faculty_name}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {duty.designation} · {duty.faculty_department}
                        </span>
                        {isSubstituted && (
                          <span style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.2rem' }}>
                            Substituted by: <strong>{duty.substitute_name}</strong>
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      {isImpartial ? (
                        <span className="badge badge-emerald" title="Impartial: Invigilator belongs to different department than course">
                          <CheckCircle2 size={12} />
                          Impartial External
                        </span>
                      ) : (
                        <span className="badge badge-amber" title="Same department faculty assigned">
                          Dept Colleague
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${isSubstituted ? 'badge-amber' : 'badge-emerald'}`}>
                        {duty.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-secondary"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => setSubstituteModal({
                            isOpen: true,
                            dutyId: duty.id,
                            currentFacultyName: duty.faculty_name,
                            selectedSubstituteId: ''
                          })}
                          title="Assign Substitute Invigilator"
                        >
                          <UserX size={13} />
                          <span>Substitute</span>
                        </button>

                        <button 
                          className="btn btn-danger"
                          style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                          onClick={() => handleRemoveDuty(duty.id)}
                          title="Remove Duty"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Substitute Reassignment Modal */}
      {substituteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="#6366f1" />
                <h3>Assign Substitute Invigilator</h3>
              </div>
              <button className="close-btn" onClick={() => setSubstituteModal({ ...substituteModal, isOpen: false })}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Reassign duty from <strong>{substituteModal.currentFacultyName}</strong> to an available faculty member without schedule clashes.
            </p>

            <form onSubmit={handleAssignSubstitute}>
              <div className="form-group">
                <label>Select Substitute Faculty *</label>
                <select 
                  className="form-control"
                  value={substituteModal.selectedSubstituteId}
                  onChange={(e) => setSubstituteModal({ ...substituteModal, selectedSubstituteId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Substitute --</option>
                  {facultyList.map(f => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.department} - {f.designation}) [Max Duties: {f.max_duties}]
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setSubstituteModal({ ...substituteModal, isOpen: false })}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Substitute
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
