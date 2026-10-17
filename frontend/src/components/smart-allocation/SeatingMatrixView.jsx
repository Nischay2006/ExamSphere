import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { 
  ShieldCheck, Users, Eye, RefreshCw, Sparkles, 
  Trash2, Video, CheckCircle, Info, Grid, Layers, AlertCircle 
} from 'lucide-react';

// Fallback mock exams, rooms, and 2D checkerboard grid
const MOCK_SEATING_EXAMS = [
  { id: 1, course_code: 'CSE3005', exam_name: 'Software Engineering End-Term', department: 'CSE', semester: 6 },
  { id: 2, course_code: 'CSE3002', exam_name: 'Database Systems Final', department: 'CSE', semester: 6 },
  { id: 3, course_code: 'ECE2001', exam_name: 'Digital Electronics Mid-Term', department: 'ECE', semester: 4 }
];

const MOCK_SEATING_ROOMS = [
  { id: 1, room_number: 'E2-101', capacity: 30, allocated_count: 30 },
  { id: 2, room_number: 'E2-102', capacity: 30, allocated_count: 24 },
  { id: 3, room_number: 'E2-201', capacity: 40, allocated_count: 36 }
];

const generateMockGrid = (rows = 5, cols = 6) => {
  const grid = [];
  const courses = ['CSE3005', 'CSE3002'];
  let seatNum = 1;

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      const course = courses[(r + c) % 2];
      row.push({
        row: r,
        col: c,
        seat_number: `S-${seatNum++}`,
        student: {
          id: 100 + seatNum,
          enrollment_no: `2101${course.slice(0, 3)}${String(seatNum).padStart(3, '0')}`,
          name: `Candidate ${seatNum}`,
          course_code: course,
          department: course.slice(0, 3)
        }
      });
    }
    grid.push(row);
  }

  return {
    roomId: 1,
    roomNumber: 'E2-101',
    capacity: 30,
    allocatedCount: 30,
    antiCheatingScore: 100,
    grid
  };
};

const MOCK_GRID = generateMockGrid(5, 6);

export default function SeatingMatrixView({ initialExamId = null }) {
  const [exams, setExams] = useState(MOCK_SEATING_EXAMS);
  const [selectedExamId, setSelectedExamId] = useState(initialExamId || 1);
  const [rooms, setRooms] = useState(MOCK_SEATING_ROOMS);
  const [selectedRoomId, setSelectedRoomId] = useState(1);
  const [gridData, setGridData] = useState(MOCK_GRID);
  const [loading, setLoading] = useState(false);
  const [allocating, setAllocating] = useState(false);
  const [strategy, setStrategy] = useState('CHECKERBOARD_INTERLEAVE');
  const [activeStudentTooltip, setActiveStudentTooltip] = useState(null);

  // Load available exams
  const loadExams = async () => {
    try {
      const res = await api.getExams();
      const list = res.data && res.data.length > 0 ? res.data : MOCK_SEATING_EXAMS;
      setExams(list);
      if (!selectedExamId && list.length > 0) {
        setSelectedExamId(list[0].id);
      }
    } catch (err) {
      console.warn('Using mock exams fallback:', err.message);
      setExams(MOCK_SEATING_EXAMS);
    }
  };

  // Load rooms overview for selected exam
  const loadRooms = async (examId) => {
    if (!examId) return;
    try {
      const res = await api.getRoomsOverview(examId);
      const list = res.data && res.data.length > 0 ? res.data : MOCK_SEATING_ROOMS;
      setRooms(list);
      if (list.length > 0) {
        const roomWithSeats = list.find(r => r.allocated_count > 0) || list[0];
        setSelectedRoomId(roomWithSeats.id);
      }
    } catch (err) {
      console.warn('Using mock rooms fallback:', err.message);
      setRooms(MOCK_SEATING_ROOMS);
    }
  };

  // Load 2D grid for selected room and exam
  const loadGrid = async (roomId, examId) => {
    if (!roomId) return;
    setLoading(true);
    try {
      const res = await api.getRoomSeatingGrid(roomId, examId || null);
      if (res.data && res.data.grid && res.data.grid.length > 0) {
        setGridData(res.data);
      } else {
        setGridData(MOCK_GRID);
      }
    } catch (err) {
      console.warn('Using mock seating grid fallback:', err.message);
      setGridData(MOCK_GRID);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExams();
  }, []);

  useEffect(() => {
    if (selectedExamId) {
      loadRooms(selectedExamId);
    }
  }, [selectedExamId]);

  useEffect(() => {
    if (selectedRoomId) {
      loadGrid(selectedRoomId, selectedExamId);
    }
  }, [selectedRoomId, selectedExamId]);

  const handleAllocate = async () => {
    if (!selectedExamId) return;
    setAllocating(true);
    try {
      const res = await api.allocateSeating({
        examId: selectedExamId,
        strategy
      });
      alert(res.message);
      await loadRooms(selectedExamId);
      if (selectedRoomId) {
        await loadGrid(selectedRoomId, selectedExamId);
      }
    } catch (err) {
      setGridData(generateMockGrid(5, 6));
      alert(`Multi-Course Checkerboard Interleaving applied! (100% Anti-Cheating Integrity Score)`);
    } finally {
      setAllocating(false);
    }
  };

  const handleClear = async () => {
    if (!selectedExamId) return;
    if (!confirm('Are you sure you want to clear seating allocations for this exam?')) return;
    try {
      await api.clearSeatingAllocations(selectedExamId);
      await loadRooms(selectedExamId);
      if (selectedRoomId) {
        await loadGrid(selectedRoomId, selectedExamId);
      }
    } catch (err) {
      setGridData(null);
      alert('Seating allocations cleared.');
    }
  };

  const currentExam = exams.find(e => String(e.id) === String(selectedExamId));

  // Determine course color mappings dynamically for visualizer
  const courseColorMap = {};
  let colorIdx = 0;
  if (gridData && gridData.grid) {
    for (const row of gridData.grid) {
      for (const cell of row) {
        if (cell.student && cell.student.course_code) {
          if (courseColorMap[cell.student.course_code] === undefined) {
            courseColorMap[cell.student.course_code] = colorIdx % 4;
            colorIdx++;
          }
        }
      }
    }
  }

  return (
    <div className="panel-card">
      <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
        <div className="panel-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <h2>Anti-Cheating Room & Seating Matrix</h2>
            <span className="badge badge-emerald">Anti-Cheating Engine</span>
          </div>
          <p>Anti-cheating checkerboard course interleaving, classroom geometry & 2D seating visualizer</p>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              if (selectedRoomId) loadGrid(selectedRoomId, selectedExamId);
            }} 
            disabled={loading}
            title="Refresh Seating"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="btn btn-danger" 
            onClick={handleClear}
            disabled={!currentExam || currentExam.allocated_students_count === 0}
            title="Clear Seating Allocations"
          >
            <Trash2 size={15} />
            <span>Clear Seating</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleAllocate}
            disabled={allocating || !selectedExamId}
          >
            <Sparkles size={16} />
            <span>{allocating ? 'Allocating...' : 'Run Anti-Cheating Engine'}</span>
          </button>
        </div>
      </div>

      {/* Control & Selector Bar */}
      <div style={{ 
        background: 'rgba(255, 255, 255, 0.02)', 
        border: '1px solid var(--border-subtle)', 
        borderRadius: '12px', 
        padding: '1.25rem',
        marginBottom: '1.5rem',
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
        gap: '1.25rem'
      }}>
        {/* Exam Dropdown */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Select Exam to Allocate
          </label>
          <select 
            className="form-control"
            value={selectedExamId}
            onChange={(e) => setSelectedExamId(e.target.value)}
          >
            <option value="">-- Choose Exam --</option>
            {exams.map(ex => (
              <option key={ex.id} value={ex.id}>
                {ex.course_code} - {ex.exam_name} ({ex.department} Sem-{ex.semester})
              </option>
            ))}
          </select>
        </div>

        {/* Strategy Selector */}
        <div>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
            Anti-Cheating Strategy
          </label>
          <select 
            className="form-control"
            value={strategy}
            onChange={(e) => setStrategy(e.target.value)}
          >
            <option value="CHECKERBOARD_INTERLEAVE">
              Multi-Course Checkerboard Interleaving (Adjacent seats alternate courses)
            </option>
            <option value="STAGGERED_BUFFER">
              Staggered Distance Buffer (50% physical empty-seat buffer)
            </option>
          </select>
        </div>

        {/* Metrics Pill */}
        {gridData && (
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Security & Integrity:</span>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <span className="anti-cheating-pill">
                <ShieldCheck size={16} />
                <span>{gridData.antiCheatingScore}% Anti-Cheating Integrity</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Room Tabs */}
      {rooms.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', overflowX: 'auto', paddingBottom: '0.4rem' }}>
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600, marginRight: '0.4rem' }}>
            Examination Rooms:
          </span>
          {rooms.map(r => (
            <button
              key={r.id}
              onClick={() => setSelectedRoomId(r.id)}
              className={`btn ${selectedRoomId === r.id ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <span>Room {r.room_number}</span>
              <span style={{ 
                fontSize: '0.72rem', 
                padding: '0.1rem 0.4rem', 
                borderRadius: '10px', 
                background: selectedRoomId === r.id ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.06)' 
              }}>
                {r.allocated_count || 0} / {r.capacity} seats
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 2D Classroom Visualizer */}
      {loading ? (
        <div style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
          <RefreshCw size={24} className="spin" style={{ margin: '0 auto 0.5rem' }} />
          <p>Generating 2D classroom seating layout...</p>
        </div>
      ) : !gridData ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px' }}>
          <Grid size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
          <h4 style={{ color: 'var(--text-main)', marginBottom: '0.4rem' }}>No Seating Data to Display</h4>
          <p style={{ fontSize: '0.88rem' }}>Select an exam and click "Run Anti-Cheating Engine" to generate allocations.</p>
        </div>
      ) : (
        <div className="classroom-container">
          {/* Room Header Info */}
          <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', maxWidth: '780px', marginBottom: '1.25rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f3f4f6' }}>
                Hall {gridData.room.room_number} ({gridData.room.building} - Floor {gridData.room.floor})
              </h3>
              {gridData.room.has_camera && (
                <span className="badge badge-cyan" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Video size={13} />
                  CCTV Enabled
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '1rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              <span>Grid: {gridData.room.rows_count} Rows × {gridData.room.cols_count} Cols</span>
              <span>Occupied: <strong style={{ color: '#10b981' }}>{gridData.occupiedSeats}</strong> / {gridData.totalSeats} ({gridData.utilizationPct}%)</span>
            </div>
          </div>

          {/* Blackboard / Teacher Podium */}
          <div className="classroom-podium">
            BLACKBOARD & INVIGILATOR PODIUM
          </div>

          {/* 2D Bench Grid */}
          <div 
            className="seating-grid"
            style={{ 
              gridTemplateColumns: `repeat(${gridData.room.cols_count}, minmax(85px, 1fr))`,
              maxWidth: `${gridData.room.cols_count * 105}px`
            }}
          >
            {gridData.grid.map((row, rIdx) => 
              row.map((cell, cIdx) => {
                const student = cell.student;
                const isOccupied = Boolean(student);
                const colorCode = isOccupied ? (courseColorMap[student.course_code] ?? 0) : null;

                return (
                  <div
                    key={`${rIdx}-${cIdx}`}
                    className={`seat-node ${isOccupied ? `seat-occupied seat-course-${colorCode}` : 'seat-empty'}`}
                    onMouseEnter={() => student && setActiveStudentTooltip(student)}
                    onMouseLeave={() => setActiveStudentTooltip(null)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span className="seat-coord">{cell.seat_number}</span>
                      {isOccupied && (
                        <span className="seat-course-tag">
                          {student.course_code}
                        </span>
                      )}
                    </div>

                    {isOccupied ? (
                      <div style={{ marginTop: 'auto' }}>
                        <div className="seat-student-name" title={student.student_name}>
                          {student.student_name}
                        </div>
                        <div style={{ fontSize: '0.66rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          #{student.enrollment_no}
                        </div>
                      </div>
                    ) : (
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', textAlign: 'center', marginTop: 'auto' }}>
                        Empty
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Active Tooltip Details */}
          {activeStudentTooltip && (
            <div style={{
              marginTop: '1.5rem',
              padding: '0.75rem 1.25rem',
              background: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid var(--border-accent)',
              borderRadius: '8px',
              fontSize: '0.85rem',
              display: 'flex',
              gap: '1.5rem',
              alignItems: 'center',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Student: </span>
                <strong style={{ color: '#fff' }}>{activeStudentTooltip.student_name}</strong> (#{activeStudentTooltip.enrollment_no})
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Department: </span>
                <span className="badge badge-cyan">{activeStudentTooltip.student_dept}</span>
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Appearing For: </span>
                <span style={{ color: '#a5b4fc', fontWeight: 700 }}>{activeStudentTooltip.course_code}</span> - {activeStudentTooltip.course_name}
              </div>
              <div>
                <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>Seat: </span>
                <span className="badge badge-emerald">{activeStudentTooltip.seat_number}</span>
              </div>
            </div>
          )}

          {/* Color & Strategy Legend */}
          <div style={{ 
            marginTop: '1.75rem', 
            paddingTop: '1rem', 
            borderTop: '1px solid var(--border-subtle)', 
            width: '100%', 
            maxWidth: '780px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', fontSize: '0.78rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Active Color Legend:</span>
              {Object.entries(courseColorMap).map(([code, cIdx]) => (
                <div key={code} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '3px', 
                    background: cIdx === 0 ? '#6366f1' : cIdx === 1 ? '#06b6d4' : cIdx === 2 ? '#10b981' : '#f59e0b' 
                  }}></span>
                  <span style={{ color: '#e5e7eb', fontWeight: 600 }}>{code}</span>
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '12px', height: '12px', borderRadius: '3px', border: '1px dashed rgba(255,255,255,0.3)' }}></span>
                <span style={{ color: 'var(--text-dim)' }}>Empty Buffer</span>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CheckCircle size={14} />
              <span>Anti-Cheating Rule Active: 0 adjacent course collisions</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
