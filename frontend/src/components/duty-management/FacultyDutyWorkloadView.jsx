import React, { useState, useEffect } from 'react';
import { api } from '../../api';
import { 
  Users, Scale, Calendar, Clock, RefreshCw, 
  Trash2, UserCheck, CheckCircle2, UserX, AlertCircle, Plus, 
  Search, ShieldAlert, ArrowRight, RotateCcw, Info, Sun, Moon, Sunrise,
  History, FileText, UserMinus
} from 'lucide-react';

// =====================================================================
// UTILITY FUNCTIONS: TIME CONVERSION & OVERLAP CHECKING
// =====================================================================

// Converts "09:30", "09:30:00", "9:30 AM", "12:00 PM", "14:00" to total minutes from midnight (0 to 1440)
export const timeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const str = String(timeStr).trim().toUpperCase();
  const isPM = str.includes('PM');
  const isAM = str.includes('AM');
  const cleanStr = str.replace(/[AP]M/g, '').trim();
  const parts = cleanStr.split(':');
  let h = parseInt(parts[0], 10) || 0;
  const m = parseInt(parts[1], 10) || 0;

  if (isPM && h < 12) h += 12;
  if (isAM && h === 12) h = 0;

  return h * 60 + m;
};

// Checks if two time intervals on the same date strictly overlap: [s1, e1] and [s2, e2]
export const doSlotsOverlap = (startA, endA, startB, endB) => {
  const sA = timeToMinutes(startA);
  const eA = timeToMinutes(endA);
  const sB = timeToMinutes(startB);
  const eB = timeToMinutes(endB);
  // Two intervals strictly overlap if and only if sA < eB and eA > sB
  return (sA < eB && eA > sB);
};

// Formats "09:30:00" or "14:00" into friendly 12-hour "09:30 AM" or "02:00 PM"
export const formatTime12 = (timeStr) => {
  if (!timeStr) return '';
  const totalM = timeToMinutes(timeStr);
  let h = Math.floor(totalM / 60);
  const m = String(totalM % 60).padStart(2, '0');
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  const hStr = h < 10 ? `0${h}` : `${h}`;
  return `${hStr}:${m} ${ampm}`;
};

// Normalizes date string or Date object to YYYY-MM-DD
export const normalizeDate = (d) => {
  if (!d) return '';
  if (d instanceof Date) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
  const str = String(d).trim();
  if (str.includes('T')) return str.split('T')[0];
  if (str.includes(' ')) return str.split(' ')[0];
  return str;
};

// Format readable date e.g. "Nov 20, 2026"
export const formatDateReadable = (d) => {
  if (!d) return '';
  try {
    const norm = normalizeDate(d);
    const parts = norm.split('-');
    const dt = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return String(d);
  }
};

// =====================================================================
// DEFAULT DATA POOLS (Faculty, Exams, and Rooms available for assignment)
// =====================================================================
const DEFAULT_FACULTY = [
  { id: 1, name: 'Dr. Shilpa Mahajan', faculty_code: 'FAC101', department: 'CSE', designation: 'Associate Professor', max_duties: 4 },
  { id: 2, name: 'Dr. Nishtha Phutela', faculty_code: 'FAC102', department: 'CSE', designation: 'Assistant Professor', max_duties: 5 },
  { id: 3, name: 'Dr. Harsh Taneja', faculty_code: 'FAC103', department: 'ECE', designation: 'Associate Professor', max_duties: 4 },
  { id: 4, name: 'Dr. Sukhandeep Kaur', faculty_code: 'FAC104', department: 'ME', designation: 'Assistant Professor', max_duties: 5 }
];

const DEFAULT_EXAMS = [
  { id: 1, exam_name: 'CSE3005 Software Engineering End-Term', course_code: 'CSE3005', exam_date: '2026-11-20', start_time: '09:30:00', end_time: '12:30:00' },
  { id: 2, exam_name: 'CSE3002 Database Management Systems Final', course_code: 'CSE3002', exam_date: '2026-11-22', start_time: '09:30:00', end_time: '12:30:00' },
  { id: 3, exam_name: 'ECE2001 Digital Electronics Mid-Term', course_code: 'ECE2001', exam_date: '2026-11-24', start_time: '14:00:00', end_time: '17:00:00' },
  { id: 4, exam_name: 'ME1001 Thermodynamics End-Term', course_code: 'ME1001', exam_date: '2026-11-26', start_time: '09:30:00', end_time: '12:30:00' }
];

const DEFAULT_ROOMS = [
  { id: 1, room_number: 'E2-101', capacity: 30, building: 'E2 Block' },
  { id: 2, room_number: 'E2-102', capacity: 30, building: 'E2 Block' },
  { id: 3, room_number: 'E2-201', capacity: 40, building: 'E2 Block' },
  { id: 4, room_number: 'AUD-HALL', capacity: 80, building: 'Main Auditorium' }
];

// =====================================================================
// VISUAL COMPONENT: DAY SCHEDULE TIMELINE (08:00 AM to 08:00 PM)
// =====================================================================
function DayScheduleTimeline({ todayDuties = [], queryStart, queryEnd }) {
  const dayStart = 8 * 60;   // 08:00 AM = 480 mins
  const dayEnd = 20 * 60;    // 08:00 PM = 1200 mins
  const totalMinutes = dayEnd - dayStart; // 720 mins

  const qStart = timeToMinutes(queryStart);
  const qEnd = timeToMinutes(queryEnd);

  // Position for query slot
  const boundedQStart = Math.max(dayStart, Math.min(dayEnd, qStart));
  const boundedQEnd = Math.max(dayStart, Math.min(dayEnd, qEnd));
  const qLeft = ((boundedQStart - dayStart) / totalMinutes) * 100;
  const qWidth = Math.max(2, ((boundedQEnd - boundedQStart) / totalMinutes) * 100);

  const isQueryValid = qEnd > qStart;

  return (
    <div style={{ marginTop: '0.65rem', marginBottom: '0.5rem' }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        fontSize: '0.7rem', 
        color: '#9ca3af',
        marginBottom: '0.3rem' 
      }}>
        <span style={{ fontWeight: 600 }}>Visual Day Timeline:</span>
        <span style={{ color: '#38bdf8', fontWeight: 600 }}>
          Window: {formatTime12(queryStart)} – {formatTime12(queryEnd)}
        </span>
      </div>

      {/* Track */}
      <div style={{
        position: 'relative',
        height: '24px',
        background: 'rgba(255, 255, 255, 0.05)',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      }}>
        {/* Render today's duties as red/coral filled blocks */}
        {todayDuties.map(d => {
          const sD = timeToMinutes(d.start_time);
          const eD = timeToMinutes(d.end_time);
          const boundedSD = Math.max(dayStart, Math.min(dayEnd, sD));
          const boundedED = Math.max(dayStart, Math.min(dayEnd, eD));
          if (boundedED <= boundedSD) return null;

          const left = ((boundedSD - dayStart) / totalMinutes) * 100;
          const width = ((boundedED - boundedSD) / totalMinutes) * 100;

          return (
            <div
              key={d.id}
              title={`Occupied Duty: ${formatTime12(d.start_time)} – ${formatTime12(d.end_time)} | Room ${d.room_number}`}
              style={{
                position: 'absolute',
                left: `${left}%`,
                width: `${width}%`,
                top: 0,
                bottom: 0,
                background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.9), rgba(220, 38, 38, 0.95))',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0 4px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                zIndex: 2,
                boxShadow: '0 1px 3px rgba(0,0,0,0.4)'
              }}
            >
              Rm {d.room_number || '101'} ({formatTime12(d.start_time).split(' ')[0]}-{formatTime12(d.end_time)})
            </div>
          );
        })}

        {/* Highlight the user's active query window */}
        {isQueryValid && (
          <div
            title={`Active Checking Window: ${formatTime12(queryStart)} to ${formatTime12(queryEnd)}`}
            style={{
              position: 'absolute',
              left: `${qLeft}%`,
              width: `${qWidth}%`,
              top: 0,
              bottom: 0,
              background: 'rgba(56, 189, 248, 0.15)',
              border: '2px dashed #38bdf8',
              borderRadius: '4px',
              zIndex: 3,
              pointerEvents: 'none'
            }}
          />
        )}
      </div>

      {/* Hour Markers */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.62rem',
        color: '#6b7280',
        marginTop: '0.25rem'
      }}>
        <span>08:00 AM</span>
        <span>11:00 AM</span>
        <span>02:00 PM</span>
        <span>05:00 PM</span>
        <span>08:00 PM</span>
      </div>
    </div>
  );
}

export default function FacultyDutyWorkloadView() {
  const [activeTab, setActiveTab] = useState('roster'); // 'roster' | 'availability' | 'balancing'
  
  // Data State - Starts completely clean (0 duties initially so user can do all actions themselves!)
  const [roster, setRoster] = useState([]);
  const [facultyList, setFacultyList] = useState(DEFAULT_FACULTY);
  const [exams, setExams] = useState(DEFAULT_EXAMS);
  const [rooms, setRooms] = useState(DEFAULT_ROOMS);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Search & Filter state for Roster
  const [rosterSearch, setRosterSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');

  // Leave / On-Duty Status Map: { [facultyId]: true if on leave }
  const [facultyLeaveMap, setFacultyLeaveMap] = useState({});

  const toggleFacultyLeave = (facultyId) => {
    setFacultyLeaveMap(prev => ({
      ...prev,
      [facultyId]: !prev[facultyId]
    }));
  };

  // Availability Checker form - Default: 20 Nov 2026, 09:30 AM to 12:30 PM
  const [availParams, setAvailParams] = useState({
    exam_date: '2026-11-20',
    start_time: '09:30',
    end_time: '12:30'
  });

  // Current System Reference Date - Default: 20 Nov 2026 (separates current/upcoming from past history)
  const [currentDate, setCurrentDate] = useState('2026-11-20');

  // Roster View Mode: 'current_upcoming' (default) | 'history' | 'all'
  const [rosterViewMode, setRosterViewMode] = useState('current_upcoming');

  // Choice Modal: Asks whether user wants Manual Assign or Auto-Assign
  const [isAssignChoiceModalOpen, setIsAssignChoiceModalOpen] = useState(false);

  // Manual Assign Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    faculty_id: '',
    exam_id: '',
    exam_name: '',
    exam_date: '2026-11-20',
    start_time: '09:30',
    end_time: '12:30',
    room_id: ''
  });

  const openManualAssign = () => {
    setAssignForm({
      faculty_id: facultyWithStats[0]?.id ? String(facultyWithStats[0].id) : '',
      exam_id: exams[0]?.id ? String(exams[0].id) : '',
      exam_name: exams[0]?.exam_name || 'End-Term Examination',
      exam_date: currentDate,
      start_time: availParams.start_time,
      end_time: availParams.end_time,
      room_id: rooms[0]?.id ? String(rooms[0].id) : ''
    });
    setIsAssignModalOpen(true);
  };

  // Substitute Modal
  const [substituteModal, setSubstituteModal] = useState({
    isOpen: false,
    dutyId: null,
    currentFacultyName: '',
    selectedSubstituteId: ''
  });

  // Load live data from backend if available
  const loadData = async () => {
    setLoading(true);
    try {
      const [rosterRes, workloadRes, examsRes, roomsRes, facultyRes] = await Promise.all([
        api.getDutyRoster().catch(() => ({ data: [] })),
        api.getWorkloadStats().catch(() => ({ data: null })),
        api.getExams().catch(() => ({ data: [] })),
        api.getRoomsOverview().catch(() => ({ data: [] })),
        api.getEntities('faculty').catch(() => ({ data: [] }))
      ]);

      if (rosterRes.data && Array.isArray(rosterRes.data)) {
        setRoster(rosterRes.data);
      }
      if (facultyRes.data && facultyRes.data.length > 0) {
        setFacultyList(facultyRes.data);
      } else if (workloadRes.data && workloadRes.data.facultyList && workloadRes.data.facultyList.length > 0) {
        setFacultyList(workloadRes.data.facultyList);
      }
      if (examsRes.data && examsRes.data.length > 0) {
        setExams(examsRes.data);
      }
      if (roomsRes.data && roomsRes.data.length > 0) {
        setRooms(roomsRes.data);
      }
    } catch (err) {
      console.warn('Backend load note:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Query parameters for the current selected date & time slot
  const queryDate = normalizeDate(availParams.exam_date);
  const querySlotStart = timeToMinutes(availParams.start_time);
  const querySlotEnd = timeToMinutes(availParams.end_time);

  // Compute live statistics dynamically:
  // 1. Per-day duty count: resets to 0/4 on a new day!
  // 2. Real-time active in-duty vs completed duties vs upcoming duties!
  // 3. Excludes teachers who are on leave!
  const facultyWithStats = facultyList.map(f => {
    const isOnLeave = Boolean(facultyLeaveMap[f.id]);
    const max = Number(f.max_duties) || 4;

    // All duties for this teacher across all dates in the system
    const allDuties = roster.filter(d => 
      (Number(d.faculty_id) === Number(f.id) && d.status !== 'SUBSTITUTED') ||
      (d.substitute_faculty_id && Number(d.substitute_faculty_id) === Number(f.id))
    );

    // Duties specifically on the CURRENTLY SELECTED DATE (Resets to 0/4 on a new day!)
    const todayDuties = allDuties.filter(d => normalizeDate(d.exam_date) === queryDate);

    // Real-time breakdown relative to the queried time slot on today's date:
    let activeNowCount = 0;       // Currently invigilating during the queried time window
    let completedTodayCount = 0;   // Duty ended by/before the queried time window
    let upcomingTodayCount = 0;    // Duty starts after the queried time window

    todayDuties.forEach(d => {
      const sD = timeToMinutes(d.start_time);
      const eD = timeToMinutes(d.end_time);

      if (doSlotsOverlap(d.start_time, d.end_time, availParams.start_time, availParams.end_time)) {
        activeNowCount++;
      } else if (eD <= querySlotStart) {
        completedTodayCount++;
      } else if (sD >= querySlotEnd) {
        upcomingTodayCount++;
      } else {
        completedTodayCount++;
      }
    });

    const todayDutiesCount = todayDuties.length;
    const isAtCapacity = todayDutiesCount >= max;

    // Time clash check for current queried slot
    const conflictingDuty = todayDuties.find(d => 
      doSlotsOverlap(d.start_time, d.end_time, availParams.start_time, availParams.end_time)
    );

    const isFree = !isOnLeave && !conflictingDuty && !isAtCapacity;

    return {
      ...f,
      isOnLeave,
      todayDuties,
      todayDutiesCount,       // Resets to 0 on a new day!
      activeNowCount,         // Active during current duty time
      completedTodayCount,    // Completed duties
      upcomingTodayCount,     // Upcoming duties
      allDutiesCount: allDuties.length,
      assigned_duties: todayDutiesCount, // Daily assigned duties (0/4 on new day)
      remaining_duties: Math.max(0, max - todayDutiesCount),
      workload_pct: Math.min(100, Math.round((todayDutiesCount / max) * 100)),
      conflictingDuty,
      isFree
    };
  });

  // Calculate Overall Fairness Score (computed for active teachers on selected day)
  const activeFacultyList = facultyWithStats.filter(f => !f.isOnLeave);
  const totalDutiesToday = roster.filter(d => normalizeDate(d.exam_date) === queryDate).length;
  const dutyCounts = activeFacultyList.map(f => f.todayDutiesCount);
  const mean = activeFacultyList.length > 0 ? totalDutiesToday / activeFacultyList.length : 0;
  const variance = activeFacultyList.length > 0
    ? dutyCounts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / activeFacultyList.length
    : 0;
  const stdDev = Math.sqrt(variance);
  const fairnessScore = totalDutiesToday === 0 
    ? 100 
    : Math.max(0, Math.round((1 - (stdDev / (mean + 1))) * 100));

  // Overall KPI aggregates for selected date & time:
  const totalActiveNow = facultyWithStats.reduce((acc, f) => acc + f.activeNowCount, 0);
  const totalCompletedToday = facultyWithStats.reduce((acc, f) => acc + f.completedTodayCount, 0);
  const totalOnLeave = facultyWithStats.filter(f => f.isOnLeave).length;
  const totalActiveFaculty = facultyWithStats.filter(f => !f.isOnLeave).length;

  // Quick preset slot helper
  const setQuickSlot = (startTime, endTime) => {
    setAvailParams(prev => ({
      ...prev,
      start_time: startTime,
      end_time: endTime
    }));
  };

  // Interactive Live Scenario Demonstration Handler
  const handleRunDemoScenario = (scenarioType) => {
    if (scenarioType === 'assign_morning') {
      const teacher = facultyWithStats[0] || DEFAULT_FACULTY[0];
      const room = rooms[0] || DEFAULT_ROOMS[0];
      const exam = exams[0] || DEFAULT_EXAMS[0];

      const newDuty = {
        id: Date.now(),
        faculty_id: teacher.id,
        faculty_name: teacher.name,
        faculty_code: teacher.faculty_code || 'FAC101',
        faculty_department: teacher.department,
        designation: teacher.designation,
        max_duties: teacher.max_duties,
        exam_id: exam.id,
        exam_name: exam.exam_name,
        course_code: exam.course_code,
        exam_date: '2026-11-20',
        start_time: '09:30',
        end_time: '12:30',
        duration_minutes: 180,
        room_id: room.id,
        room_number: room.room_number,
        room_capacity: room.capacity,
        status: 'ASSIGNED'
      };

      setRoster(prev => {
        const filtered = prev.filter(d => !(Number(d.faculty_id) === Number(teacher.id) && normalizeDate(d.exam_date) === '2026-11-20'));
        return [newDuty, ...filtered];
      });

      setAvailParams({
        exam_date: '2026-11-20',
        start_time: '09:30',
        end_time: '12:30'
      });
    } else if (scenarioType === 'check_afternoon') {
      // Time changed to afternoon -> Duty has passed -> Shows Completed: 1/4, Active: 0, Free!
      setAvailParams({
        exam_date: '2026-11-20',
        start_time: '14:00',
        end_time: '17:00'
      });
    } else if (scenarioType === 'check_new_day') {
      // Day changed to Nov 22 -> New day started -> Shows 0/4 duties!
      setAvailParams({
        exam_date: '2026-11-22',
        start_time: '09:30',
        end_time: '12:30'
      });
    } else if (scenarioType === 'toggle_leave') {
      // Toggles leave on Dr. Shilpa Mahajan
      const teacherId = facultyWithStats[0]?.id || 1;
      toggleFacultyLeave(teacherId);
    } else if (scenarioType === 'check_morning') {
      setAvailParams({
        exam_date: '2026-11-20',
        start_time: '09:30',
        end_time: '12:30'
      });
    }
  };

  // =========================================================================
  // ACTION: MANUALLY ASSIGN TEACHER TO EXAM SLOT & ROOM
  // =========================================================================
  const handleAssignDuty = async (e) => {
    e.preventDefault();
    if (!assignForm.faculty_id || !assignForm.room_id) {
      alert('Please select a teacher and an examination room.');
      return;
    }

    const chosenTeacher = facultyWithStats.find(f => String(f.id) === String(assignForm.faculty_id));
    const chosenRoom = rooms.find(r => String(r.id) === String(assignForm.room_id));
    const chosenExam = exams.find(ex => String(ex.id) === String(assignForm.exam_id)) || exams[0];

    if (!chosenTeacher || !chosenRoom) {
      alert('Invalid selection. Please choose again.');
      return;
    }

    // 0. Leave check
    if (chosenTeacher.isOnLeave) {
      alert(`Cannot Assign: ${chosenTeacher.name} is currently marked On Leave. Please toggle them On Duty first.`);
      return;
    }

    // 1. Capacity limit check
    if (chosenTeacher.assigned_duties >= chosenTeacher.max_duties) {
      alert(`Capacity Limit: ${chosenTeacher.name} already has ${chosenTeacher.assigned_duties} duties (maximum allowed: ${chosenTeacher.max_duties}).`);
      return;
    }

    // 2. Strict time clash check: Can this teacher take this slot?
    const hasTimeClash = roster.some(d => {
      const dFacultyId = d.substitute_faculty_id || d.faculty_id;
      if (Number(dFacultyId) !== Number(chosenTeacher.id)) return false;
      if (normalizeDate(d.exam_date) !== normalizeDate(assignForm.exam_date)) return false;
      return doSlotsOverlap(d.start_time, d.end_time, assignForm.start_time, assignForm.end_time);
    });

    if (hasTimeClash) {
      alert(`Schedule Conflict: ${chosenTeacher.name} already has an exam duty during this time window (${formatTime12(assignForm.start_time)} - ${formatTime12(assignForm.end_time)})! Please choose another teacher or non-overlapping time.`);
      return;
    }

    // 3. Room clash check
    const roomAlreadyBooked = roster.some(d => {
      if (Number(d.room_id) !== Number(chosenRoom.id)) return false;
      if (normalizeDate(d.exam_date) !== normalizeDate(assignForm.exam_date)) return false;
      return doSlotsOverlap(d.start_time, d.end_time, assignForm.start_time, assignForm.end_time);
    });

    if (roomAlreadyBooked) {
      alert(`Room Conflict: Room ${chosenRoom.room_number} already has an invigilator assigned during this time window.`);
      return;
    }

    // Save to Backend if active
    try {
      await api.assignDuty({
        faculty_id: chosenTeacher.id,
        exam_id: chosenExam.id,
        room_id: chosenRoom.id,
        exam_date: assignForm.exam_date,
        start_time: assignForm.start_time,
        end_time: assignForm.end_time
      });
    } catch (err) {
      console.warn('Backend note, applying assignment locally:', err.message);
    }

    // Calculate duration in minutes
    const startM = timeToMinutes(assignForm.start_time);
    const endM = timeToMinutes(assignForm.end_time);
    const duration = Math.max(60, endM - startM);

    const newDuty = {
      id: Date.now(),
      faculty_id: chosenTeacher.id,
      faculty_name: chosenTeacher.name,
      faculty_code: chosenTeacher.faculty_code || 'FAC101',
      faculty_department: chosenTeacher.department,
      designation: chosenTeacher.designation,
      max_duties: chosenTeacher.max_duties,
      exam_id: chosenExam.id,
      exam_name: assignForm.exam_name || chosenExam.exam_name,
      course_code: chosenExam.course_code || 'CSE3005',
      exam_date: assignForm.exam_date,
      start_time: assignForm.start_time,
      end_time: assignForm.end_time,
      duration_minutes: duration,
      room_id: chosenRoom.id,
      room_number: chosenRoom.room_number,
      room_capacity: chosenRoom.capacity,
      status: 'ASSIGNED'
    };

    setRoster(prev => [newDuty, ...prev]);
    setIsAssignModalOpen(false);
    alert(`Successfully assigned ${chosenTeacher.name} to Room ${chosenRoom.room_number} (${formatTime12(assignForm.start_time)} - ${formatTime12(assignForm.end_time)})!`);
  };

  // Quick Open Modal from Availability Scanner Card
  const openAssignForFaculty = (facultyId) => {
    // Check if an exam matches this date & time
    const matchedExam = exams.find(ex => {
      return normalizeDate(ex.exam_date) === normalizeDate(availParams.exam_date);
    }) || exams[0];

    setAssignForm({
      faculty_id: String(facultyId),
      exam_id: matchedExam ? String(matchedExam.id) : (exams[0] ? String(exams[0].id) : ''),
      exam_name: matchedExam ? matchedExam.exam_name : 'Semester Final Examination',
      exam_date: availParams.exam_date,
      start_time: availParams.start_time,
      end_time: availParams.end_time,
      room_id: rooms[0] ? String(rooms[0].id) : ''
    });
    setIsAssignModalOpen(true);
  };

  // =========================================================================
  // ACTION: AUTO-BALANCE ALL DUTIES EVENLY (1 Click)
  // =========================================================================
  const handleAutoAllocate = async () => {
    setActionLoading(true);
    const excludeIds = Object.keys(facultyLeaveMap)
      .filter(id => facultyLeaveMap[id])
      .map(Number);

    try {
      await api.autoAllocateDuties({ 
        clearExisting: true,
        excludeFacultyIds: excludeIds
      });
      await loadData();
      alert(`Duties automatically balanced and allocated! (${excludeIds.length} teachers on leave were skipped)`);
    } catch (err) {
      console.warn('Auto-allocating locally:', err.message);
      const activeFaculty = facultyWithStats.filter(f => !f.isOnLeave);
      if (activeFaculty.length === 0) {
        alert('Cannot auto-allocate: All teachers are currently marked On Leave.');
        setActionLoading(false);
        return;
      }

      const balancedDuties = exams.slice(0, 4).map((ex, idx) => {
        const assignedFaculty = activeFaculty[idx % activeFaculty.length];
        const assignedRoom = rooms[idx % rooms.length];
        return {
          id: Date.now() + idx,
          faculty_id: assignedFaculty.id,
          faculty_name: assignedFaculty.name,
          faculty_code: assignedFaculty.faculty_code,
          faculty_department: assignedFaculty.department,
          designation: assignedFaculty.designation,
          max_duties: assignedFaculty.max_duties,
          exam_id: ex.id,
          exam_name: ex.exam_name,
          course_code: ex.course_code,
          exam_date: ex.exam_date,
          start_time: ex.start_time,
          end_time: ex.end_time,
          duration_minutes: 180,
          room_id: assignedRoom.id,
          room_number: assignedRoom.room_number,
          room_capacity: assignedRoom.capacity,
          status: 'ASSIGNED'
        };
      });

      setRoster(balancedDuties);
      alert(`Duties automatically balanced among ${activeFaculty.length} active teachers! (${excludeIds.length} teachers on leave were excluded).`);
    } finally {
      setActionLoading(false);
    }
  };

  // =========================================================================
  // ACTION: RESET ALL DUTIES BACK TO 0 (Clean Slate)
  // =========================================================================
  const handleResetDuties = async () => {
    if (!confirm('Reset all duty assignments back to 0? This lets you test assigning from scratch.')) return;
    try {
      await api.resetDuties();
    } catch (err) {
      console.warn('Local reset note:', err.message);
    }
    setRoster([]);
    alert('All duty assignments have been reset back to 0.');
  };

  // =========================================================================
  // ACTION: SUBSTITUTE A TEACHER
  // =========================================================================
  const handleAssignSubstitute = async (e) => {
    e.preventDefault();
    if (!substituteModal.selectedSubstituteId) return;

    const sub = facultyWithStats.find(f => String(f.id) === String(substituteModal.selectedSubstituteId));
    if (!sub) return;

    try {
      await api.assignSubstitute(substituteModal.dutyId, sub.id);
    } catch (err) {
      console.warn('Local substitute note:', err.message);
    }

    setRoster(prev => prev.map(d => {
      if (d.id === substituteModal.dutyId) {
        return {
          ...d,
          status: 'SUBSTITUTED',
          substitute_faculty_id: sub.id,
          substitute_name: sub.name
        };
      }
      return d;
    }));

    setSubstituteModal({ isOpen: false, dutyId: null, currentFacultyName: '', selectedSubstituteId: '' });
    alert(`Substitute assigned: ${sub.name} will cover this duty.`);
  };

  // =========================================================================
  // ACTION: REMOVE A DUTY
  // =========================================================================
  const handleRemoveDuty = async (dutyId) => {
    if (!confirm('Remove this duty assignment?')) return;
    try {
      await api.removeDuty(dutyId);
    } catch (err) {
      console.warn('Local remove note:', err.message);
    }
    setRoster(prev => prev.filter(d => d.id !== dutyId));
  };

  const systemDate = normalizeDate(currentDate);

  // Filter roster by search & department
  const searchedRoster = roster.filter(duty => {
    const q = rosterSearch.toLowerCase();
    const matchesSearch = 
      duty.faculty_name?.toLowerCase().includes(q) ||
      duty.exam_name?.toLowerCase().includes(q) ||
      duty.course_code?.toLowerCase().includes(q) ||
      duty.room_number?.toLowerCase().includes(q);
    
    if (filterDept === 'ALL') return matchesSearch;
    return matchesSearch && duty.faculty_department === filterDept;
  });

  // Current Day & Upcoming Duties (Sorted chronologically: today first, then future dates)
  const currentAndUpcomingRoster = searchedRoster
    .filter(duty => normalizeDate(duty.exam_date) >= systemDate)
    .sort((a, b) => {
      const d1 = normalizeDate(a.exam_date);
      const d2 = normalizeDate(b.exam_date);
      if (d1 !== d2) return d1.localeCompare(d2);
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });

  // Past Duties History (Previous dates strictly before systemDate)
  const pastHistoryRoster = searchedRoster
    .filter(duty => normalizeDate(duty.exam_date) < systemDate)
    .sort((a, b) => {
      const d1 = normalizeDate(a.exam_date);
      const d2 = normalizeDate(b.exam_date);
      if (d1 !== d2) return d2.localeCompare(d1); // Most recent past date first
      return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
    });

  // Active displayed roster based on user selected view mode
  const displayedRoster = 
    rosterViewMode === 'history' 
      ? pastHistoryRoster 
      : rosterViewMode === 'all' 
        ? searchedRoster.sort((a, b) => {
            const d1 = normalizeDate(a.exam_date);
            const d2 = normalizeDate(b.exam_date);
            if (d1 !== d2) return d1.localeCompare(d2);
            return timeToMinutes(a.start_time) - timeToMinutes(b.start_time);
          })
        : currentAndUpcomingRoster;

  // Calculate live count of Free vs Busy vs On Leave for currently selected time slot
  const freeCountForSlot = facultyWithStats.filter(f => f.isFree).length;
  const busyCountForSlot = facultyWithStats.filter(f => !f.isFree && !f.isOnLeave).length;
  const onLeaveCountForSlot = facultyWithStats.filter(f => f.isOnLeave).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Banner */}
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
              color: '#fff'
            }}>
              MODULE 5
            </span>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, color: '#fff' }}>
              Faculty Duty & Workload Management
            </h1>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', maxWidth: '750px' }}>
            Assign teachers to examination rooms & time slots, check who is free or busy, and balance workloads equally.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={loadData} 
            disabled={loading}
            title="Refresh Data"
          >
            <RefreshCw size={15} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={handleResetDuties}
            title="Reset duties to 0 to test from scratch"
            style={{ color: '#f87171' }}
          >
            <RotateCcw size={15} />
            <span>Reset to 0</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => setIsAssignChoiceModalOpen(true)}
            title="Choose between Manual Assignment or Automatic Assignment"
          >
            <Plus size={16} />
            <span>+ Assign Duties</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={handleAutoAllocate}
            disabled={actionLoading}
          >
            <Scale size={16} />
            <span>{actionLoading ? 'Balancing...' : 'Auto-Allocate Duties'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))',
        gap: '0.85rem'
      }}>
        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Workload Fairness</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Scale size={18} />
            <span>{fairnessScore}%</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            {totalDutiesToday === 0 ? 'Day starts at 0/4' : 'Balanced Distribution'}
          </span>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Clock size={13} color="#f87171" /> Active In-Duty Now
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: totalActiveNow > 0 ? '#f87171' : '#f3f4f6', marginTop: '0.2rem' }}>
            {totalActiveNow} Invigilating
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>During current slot window</span>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <CheckCircle2 size={13} color="#34d399" /> Completed Today
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399', marginTop: '0.2rem' }}>
            {totalCompletedToday} Completed
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>Finished earlier today</span>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <Calendar size={13} color="#a855f7" /> Today's Total Load
          </span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#a855f7', marginTop: '0.2rem' }}>
            {totalDutiesToday} Duties
          </div>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>On {formatDateReadable(availParams.exam_date)}</span>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1rem' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Teachers On Duty</span>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#38bdf8', marginTop: '0.2rem' }}>
            {totalActiveFaculty} Active
          </div>
          <span style={{ fontSize: '0.72rem', color: totalOnLeave > 0 ? '#fbbf24' : 'var(--text-dim)' }}>
            {totalOnLeave > 0 ? `${totalOnLeave} on leave (skipped)` : '0 on leave'}
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="nav-tabs" style={{ marginBottom: '0.25rem' }}>
        <button
          className={`tab-btn ${activeTab === 'roster' ? 'active' : ''}`}
          onClick={() => setActiveTab('roster')}
        >
          <Calendar size={16} />
          <span>Duty Roster & Time Slots ({roster.length})</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'availability' ? 'active' : ''}`}
          onClick={() => setActiveTab('availability')}
        >
          <UserCheck size={16} />
          <span>Check Teacher Availability</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'balancing' ? 'active' : ''}`}
          onClick={() => setActiveTab('balancing')}
        >
          <Scale size={16} />
          <span>Balance Teacher Workloads</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DUTY ROSTER & TIME SLOTS */}
      {/* ========================================================================= */}
      {activeTab === 'roster' && (
        <div className="panel-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="panel-title">
              <h2>Invigilation Duty Roster</h2>
              <p>
                {rosterViewMode === 'history' 
                  ? `Showing Past Duties History (Completed examinations prior to ${formatDateReadable(currentDate)})`
                  : rosterViewMode === 'all'
                    ? 'Showing all invigilation duty records across the academic calendar'
                    : `Showing Current Day (${formatDateReadable(currentDate)}) & Upcoming Duties sorted chronologically`}
              </p>
            </div>

            {/* Controls: Search, Assign Choices */}
            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <div className="search-box">
                <Search size={16} color="#6b7280" />
                <input
                  type="text"
                  placeholder="Search teacher, exam, room..."
                  value={rosterSearch}
                  onChange={(e) => setRosterSearch(e.target.value)}
                />
              </div>

              {/* Main Assign Button: Asks whether user wants Manual or Automatic */}
              <button 
                className="btn btn-primary"
                onClick={() => setIsAssignChoiceModalOpen(true)}
                title="Choose between Manual or Automatic Assignment"
              >
                <Plus size={16} />
                <span>+ Assign Duties</span>
              </button>

              {/* Direct Quick Button: Manual */}
              <button 
                className="btn btn-secondary"
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                onClick={openManualAssign}
                title="Directly open manual assignment modal"
              >
                <UserCheck size={14} />
                <span>Manual</span>
              </button>

              {/* Direct Quick Button: Auto-Assign */}
              <button 
                className="btn btn-secondary" 
                style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem', borderColor: '#34d399', color: '#6ee7b7' }}
                onClick={handleAutoAllocate}
                disabled={actionLoading}
                title="Directly auto-balance and assign all duties"
              >
                <Scale size={14} />
                <span>Auto-Allocate</span>
              </button>
            </div>
          </div>

          {/* Systematic Sub-View Filter & Current Reference Date Controller */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '10px',
            padding: '0.65rem 0.9rem',
            marginBottom: '1rem'
          }}>
            {/* View Mode Filters: Current & Upcoming vs Past History vs All */}
            <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className={`btn ${rosterViewMode === 'current_upcoming' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setRosterViewMode('current_upcoming')}
              >
                <Calendar size={13} />
                <span>Current & Upcoming ({currentAndUpcomingRoster.length})</span>
              </button>

              <button
                type="button"
                className={`btn ${rosterViewMode === 'history' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem', borderColor: rosterViewMode === 'history' ? '#818cf8' : 'rgba(255,255,255,0.1)' }}
                onClick={() => setRosterViewMode('history')}
              >
                <History size={13} />
                <span>Duty History ({pastHistoryRoster.length})</span>
              </button>

              <button
                type="button"
                className={`btn ${rosterViewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setRosterViewMode('all')}
              >
                <FileText size={13} />
                <span>All Records ({searchedRoster.length})</span>
              </button>
            </div>

            {/* Current Reference Date (Allows user to test e.g. "suppose current date is 20") */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.8rem' }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>
                Current Date:
              </span>
              <input
                type="date"
                className="form-control"
                style={{ padding: '0.25rem 0.55rem', fontSize: '0.78rem', width: 'auto' }}
                value={currentDate}
                onChange={(e) => {
                  setCurrentDate(e.target.value);
                  setAvailParams(prev => ({ ...prev, exam_date: e.target.value }));
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem', color: '#38bdf8', borderColor: '#38bdf8' }}
                onClick={() => {
                  setCurrentDate('2026-11-20');
                  setAvailParams(prev => ({ ...prev, exam_date: '2026-11-20' }));
                }}
                title="Reset reference date to Nov 20, 2026"
              >
                Set to Nov 20
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Exam & Subject</th>
                  <th>Date & Time Slot</th>
                  <th>Room</th>
                  <th>Assigned Teacher</th>
                  <th>Duty Progress (Real-Time)</th>
                  <th>Daily Load</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayedRoster.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '3.5rem 1rem', color: 'var(--text-muted)' }}>
                      <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', color: '#6366f1', opacity: 0.8 }} />
                      <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '1.05rem', marginBottom: '0.4rem' }}>
                        {rosterViewMode === 'history' 
                          ? 'No Past Duty Records Found' 
                          : 'No Current or Upcoming Exam Duties'}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', maxWidth: '480px', margin: '0 auto 1.25rem' }}>
                        {rosterViewMode === 'history'
                          ? `There are no previous exam duties before ${formatDateReadable(currentDate)}. Previous dates will automatically appear here once their exam date has passed.`
                          : `There are no duties scheduled on or after ${formatDateReadable(currentDate)}. Assign a teacher manually or click Auto-Assign to distribute slots.`}
                      </p>
                      <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                        {rosterViewMode === 'history' ? (
                          <button 
                            className="btn btn-primary"
                            onClick={() => setRosterViewMode('current_upcoming')}
                          >
                            <span>View Current & Upcoming Duties</span>
                          </button>
                        ) : (
                          <>
                            <button 
                              className="btn btn-secondary" 
                              onClick={openManualAssign}
                            >
                              <Plus size={15} />
                              <span>Assign Manually</span>
                            </button>
                            <button 
                              className="btn btn-primary" 
                              onClick={handleAutoAllocate}
                              disabled={actionLoading}
                            >
                              <Scale size={15} />
                              <span>Auto-Allocate Duties</span>
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  displayedRoster.map((duty) => {
                    const isSubstituted = duty.status === 'SUBSTITUTED';
                    const dateStr = formatDateReadable(duty.exam_date);
                    const dutyDate = normalizeDate(duty.exam_date);
                    const isToday = dutyDate === systemDate;
                    const isPast = dutyDate < systemDate;
                    const isFuture = dutyDate > systemDate;

                    const isDutyActive = isToday && doSlotsOverlap(duty.start_time, duty.end_time, availParams.start_time, availParams.end_time);
                    const isDutyCompleted = isPast || (isToday && (timeToMinutes(duty.end_time) <= querySlotStart));
                    const isDutyUpcoming = isFuture || (isToday && (timeToMinutes(duty.start_time) >= querySlotEnd));

                    // Daily duties for this teacher on this exam's date (resets to 0/4 on day change)
                    const teacherDutiesOnDate = roster.filter(d => 
                      Number(d.faculty_id) === Number(duty.faculty_id) && 
                      normalizeDate(d.exam_date) === normalizeDate(duty.exam_date)
                    ).length;

                    return (
                      <tr key={duty.id}>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontWeight: 700, color: '#f3f4f6' }}>{duty.exam_name}</span>
                            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              Course Code: {duty.course_code}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div style={{ display: 'flex', flexDirection: 'column', fontSize: '0.82rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{dateStr}</span>
                              {isToday && (
                                <span className="badge badge-emerald" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', fontWeight: 700 }}>
                                  Today
                                </span>
                              )}
                              {isPast && (
                                <span className="badge" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem', background: 'rgba(156, 163, 175, 0.15)', color: '#cbd5e1' }}>
                                  History
                                </span>
                              )}
                              {isFuture && (
                                <span className="badge badge-cyan" style={{ fontSize: '0.65rem', padding: '0.15rem 0.45rem' }}>
                                  Upcoming
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', marginTop: '0.15rem' }}>
                              <Clock size={12} />
                              {formatTime12(duty.start_time)} - {formatTime12(duty.end_time)} ({duty.duration_minutes || 180} mins)
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
                              {duty.designation} · Dept: {duty.faculty_department}
                            </span>
                            {isSubstituted && (
                              <span style={{ fontSize: '0.72rem', color: '#fbbf24', marginTop: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <AlertCircle size={12} />
                                <span>Substituted by: <strong>{duty.substitute_name}</strong></span>
                              </span>
                            )}
                          </div>
                        </td>
                        {/* Real-Time Duty Progress (Active Now vs Completed vs Upcoming vs Past History) */}
                        <td>
                          {isPast ? (
                            <span className="badge" style={{ background: 'rgba(156, 163, 175, 0.15)', color: '#cbd5e1', fontWeight: 600, border: '1px solid rgba(156, 163, 175, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <History size={12} /> Completed (Past Date)
                            </span>
                          ) : isDutyActive ? (
                            <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#f87171', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} /> In-Duty (Active)
                            </span>
                          ) : isDutyCompleted ? (
                            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <CheckCircle2 size={12} color="#34d399" /> Completed Today
                            </span>
                          ) : isDutyUpcoming ? (
                            <span className="badge" style={{ background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8', fontWeight: 700, border: '1px solid rgba(56, 189, 248, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Clock size={12} color="#38bdf8" /> Upcoming Slot
                            </span>
                          ) : (
                            <span className="badge badge-secondary" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                              <Calendar size={12} /> Scheduled
                            </span>
                          )}
                        </td>
                        {/* Teacher Daily Load (Resets to 0/4 on day change) */}
                        <td>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f3f4f6' }}>
                            {teacherDutiesOnDate} / {duty.max_duties || 4} duties
                            <span style={{ fontSize: '0.7rem', color: '#9ca3af', display: 'block', fontWeight: 400 }}>
                              On {dateStr}
                            </span>
                          </div>
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
                              title="Assign a substitute if teacher is absent"
                            >
                              <UserX size={13} />
                              <span>Substitute</span>
                            </button>

                            <button 
                              className="btn btn-danger"
                              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem' }}
                              onClick={() => handleRemoveDuty(duty.id)}
                              title="Remove duty assignment"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Past History Footnote Banner when viewing Current & Upcoming */}
          {rosterViewMode === 'current_upcoming' && pastHistoryRoster.length > 0 && (
            <div style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px dashed rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              padding: '0.75rem 1.25rem',
              marginTop: '1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '0.6rem',
              fontSize: '0.82rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#cbd5e1' }}>
                <Info size={16} color="#818cf8" />
                <span>
                  <strong>{pastHistoryRoster.length} past duty record{pastHistoryRoster.length > 1 ? 's' : ''}</strong> from previous dates (before {formatDateReadable(currentDate)}) {pastHistoryRoster.length > 1 ? 'are' : 'is'} cleanly organized in <strong>Past Duties History</strong>.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-secondary"
                style={{ fontSize: '0.78rem', padding: '0.35rem 0.75rem' }}
                onClick={() => setRosterViewMode('history')}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  View Duty History ({pastHistoryRoster.length}) <ArrowRight size={13} />
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: FACULTY AVAILABILITY SCANNER */}
      {/* ========================================================================= */}
      {activeTab === 'availability' && (
        <div className="panel-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="panel-title">
              <h2>Check Teacher Availability & Free Time Slots</h2>
              <p>Select any date and time window to see live who is Free or Busy across the university</p>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleResetDuties}
                title="Reset all duties to 0"
                style={{ color: '#f87171', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                <RotateCcw size={14} />
                <span>Reset Duties to 0</span>
              </button>
            </div>
          </div>



          {/* Quick-Slot Presets and Custom Time Controls */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            padding: '1.25rem',
            marginBottom: '1rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}>
            {/* Quick 1-Click Slot Selector */}
            <div>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '0.5rem' }}>
                Standard Examination Slots:
              </span>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn ${availParams.start_time === '09:30' && availParams.end_time === '12:30' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => setQuickSlot('09:30', '12:30')}
                >
                  <Sunrise size={14} />
                  <span>Morning Slot: 09:30 AM – 12:30 PM</span>
                </button>

                <button
                  type="button"
                  className={`btn ${availParams.start_time === '12:30' && availParams.end_time === '14:00' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => setQuickSlot('12:30', '14:00')}
                >
                  <Sun size={14} />
                  <span>Midday Slot: 12:30 PM – 02:00 PM</span>
                </button>

                <button
                  type="button"
                  className={`btn ${availParams.start_time === '14:00' && availParams.end_time === '17:00' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => setQuickSlot('14:00', '17:00')}
                >
                  <Sun size={14} />
                  <span>Afternoon Slot: 02:00 PM – 05:00 PM</span>
                </button>

                <button
                  type="button"
                  className={`btn ${availParams.start_time === '17:30' && availParams.end_time === '20:30' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                  onClick={() => setQuickSlot('17:30', '20:30')}
                >
                  <Moon size={14} />
                  <span>Evening Slot: 05:30 PM – 08:30 PM</span>
                </button>
              </div>
            </div>

            {/* Custom Date & Time Inputs */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '1rem',
              alignItems: 'flex-end',
              borderTop: '1px solid rgba(255, 255, 255, 0.06)',
              paddingTop: '0.85rem'
            }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Exam Date
                </label>
                <input 
                  type="date"
                  className="form-control"
                  value={availParams.exam_date}
                  onChange={(e) => setAvailParams({ ...availParams, exam_date: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  Start Time: <strong style={{ color: '#38bdf8' }}>{formatTime12(availParams.start_time)}</strong>
                </label>
                <input 
                  type="time"
                  className="form-control"
                  value={availParams.start_time}
                  onChange={(e) => setAvailParams({ ...availParams, start_time: e.target.value })}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.4rem' }}>
                  End Time: <strong style={{ color: '#38bdf8' }}>{formatTime12(availParams.end_time)}</strong>
                </label>
                <input 
                  type="time"
                  className="form-control"
                  value={availParams.end_time}
                  onChange={(e) => setAvailParams({ ...availParams, end_time: e.target.value })}
                />
              </div>
            </div>

            {/* Time Sequence Validation Warning */}
            {timeToMinutes(availParams.start_time) >= timeToMinutes(availParams.end_time) && (
              <div style={{
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: '8px',
                padding: '0.6rem 0.85rem',
                fontSize: '0.78rem',
                color: '#f87171',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertCircle size={16} />
                <span>
                  Start Time ({formatTime12(availParams.start_time)}) is after or equal to End Time ({formatTime12(availParams.end_time)}). Please select an end time after the start time.
                </span>
              </div>
            )}
          </div>

          {/* Active Checking Status Ribbon */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '0.85rem 1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Clock size={18} color="#818cf8" />
              <span style={{ fontSize: '0.88rem', color: '#e5e7eb' }}>
                Querying Availability for: <strong>{formatDateReadable(availParams.exam_date)}</strong> &nbsp;|&nbsp; <strong>{formatTime12(availParams.start_time)} to {formatTime12(availParams.end_time)}</strong>
              </span>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="badge badge-emerald" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <UserCheck size={13} /> {freeCountForSlot} Available
              </span>
              {busyCountForSlot > 0 && (
                <span className="badge badge-amber" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <Clock size={13} /> {busyCountForSlot} In Duty / Clash
                </span>
              )}
              {onLeaveCountForSlot > 0 && (
                <span className="badge" style={{ fontSize: '0.8rem', padding: '0.35rem 0.7rem', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                  <UserMinus size={13} /> {onLeaveCountForSlot} On Leave (Excluded)
                </span>
              )}
            </div>
          </div>

          {/* Teacher Availability Cards Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            {facultyWithStats.map(f => {
              const {
                isOnLeave,
                todayDuties,
                todayDutiesCount,
                activeNowCount,
                completedTodayCount,
                upcomingTodayCount,
                conflictingDuty,
                isFree,
                max_duties
              } = f;

              // Border and accent color depending on state
              const cardBorder = isOnLeave 
                ? 'rgba(245, 158, 11, 0.4)' 
                : isFree 
                  ? 'rgba(16, 185, 129, 0.35)' 
                  : 'rgba(239, 68, 68, 0.35)';
              const cardBg = isOnLeave 
                ? 'rgba(245, 158, 11, 0.05)' 
                : isFree 
                  ? 'rgba(16, 185, 129, 0.04)' 
                  : 'rgba(239, 68, 68, 0.04)';

              return (
                <div
                  key={f.id}
                  style={{
                    background: cardBg,
                    border: `1px solid ${cardBorder}`,
                    borderRadius: '12px',
                    padding: '1.25rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '1rem',
                    boxShadow: isFree ? '0 4px 20px rgba(16, 185, 129, 0.06)' : '0 4px 20px rgba(0,0,0,0.2)'
                  }}
                >
                  <div>
                    {/* Top Header: Status Pill & Enable/Disable Leave Toggle Button */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span className="badge" style={{ 
                        background: isOnLeave ? 'rgba(245, 158, 11, 0.2)' : isFree ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                        color: isOnLeave ? '#fbbf24' : isFree ? '#34d399' : '#f87171', 
                        fontWeight: 700,
                        fontSize: '0.78rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem'
                      }}>
                        {isOnLeave ? (
                          <>
                            <UserMinus size={12} />
                            <span>On Leave</span>
                          </>
                        ) : isFree ? (
                          <>
                            <UserCheck size={12} />
                            <span>Available</span>
                          </>
                        ) : activeNowCount > 0 ? (
                          <>
                            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f87171', display: 'inline-block' }} />
                            <span>In-Duty (Active Now)</span>
                          </>
                        ) : conflictingDuty ? (
                          <>
                            <AlertCircle size={12} />
                            <span>Time Clash</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle size={12} />
                            <span>Max Limit Reached</span>
                          </>
                        )}
                      </span>

                      {/* Enable / Disable Leave Toggle (Directly meets user requirement 1) */}
                      <button
                        type="button"
                        onClick={() => toggleFacultyLeave(f.id)}
                        style={{
                          background: isOnLeave ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                          border: `1px solid ${isOnLeave ? '#f59e0b' : 'rgba(255, 255, 255, 0.2)'}`,
                          color: isOnLeave ? '#fbbf24' : '#e5e7eb',
                          borderRadius: '6px',
                          padding: '0.25rem 0.6rem',
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                        title={isOnLeave ? "Click to set teacher On Duty (Active)" : "Click to set teacher On Leave (Will be excluded from auto slots)"}
                      >
                        {isOnLeave ? (
                          <>
                            <UserMinus size={13} />
                            <span>Status: On Leave</span>
                          </>
                        ) : (
                          <>
                            <UserCheck size={13} />
                            <span>Status: Active</span>
                          </>
                        )}
                      </button>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <h4 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f3f4f6', marginBottom: '0.15rem' }}>
                        {f.name}
                      </h4>
                      <span className="badge badge-indigo" style={{ fontSize: '0.72rem' }}>
                        Dept: {f.department}
                      </span>
                    </div>

                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                      {f.designation} · Max Allowed: {max_duties} duties/day
                    </p>

                    {/* 4-Box Real-Time Metrics Strip (Directly meets user requirements 2 and 3) */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(4, 1fr)',
                      gap: '0.45rem',
                      background: 'rgba(0, 0, 0, 0.35)',
                      border: '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '8px',
                      padding: '0.6rem 0.4rem',
                      textAlign: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>In-Duty Now</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: activeNowCount > 0 ? '#f87171' : '#9ca3af', marginTop: '0.1rem' }}>
                          {activeNowCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Completed</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: completedTodayCount > 0 ? '#34d399' : '#9ca3af', marginTop: '0.1rem' }}>
                          {completedTodayCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Upcoming</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: upcomingTodayCount > 0 ? '#38bdf8' : '#9ca3af', marginTop: '0.1rem' }}>
                          {upcomingTodayCount}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>Today's Total</div>
                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f3f4f6', marginTop: '0.1rem' }}>
                          {todayDutiesCount}/{max_duties}
                        </div>
                      </div>
                    </div>

                    {/* Visual Day Schedule Timeline (08:00 AM to 08:00 PM) */}
                    <DayScheduleTimeline 
                      todayDuties={todayDuties}
                      queryStart={availParams.start_time}
                      queryEnd={availParams.end_time}
                    />

                    {/* Today's Schedule Box - Shows detailed text breakdown */}
                    <div style={{ 
                      background: 'rgba(255, 255, 255, 0.03)', 
                      borderRadius: '8px', 
                      padding: '0.75rem', 
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                      marginTop: '0.5rem'
                    }}>
                      <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '0.35rem' }}>
                        Schedule on {formatDateReadable(availParams.exam_date)}:
                      </div>

                      {isOnLeave ? (
                        <div style={{ fontSize: '0.78rem', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <AlertCircle size={14} />
                          <span>Teacher is On Leave. Excluded from duty slots & auto-generation.</span>
                        </div>
                      ) : todayDuties.length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#34d399', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <CheckCircle2 size={13} />
                          <span>No duties scheduled today (0/{max_duties} — 100% Free all day)</span>
                        </div>
                      ) : (
                        todayDuties.map(d => {
                          const isThisActive = doSlotsOverlap(d.start_time, d.end_time, availParams.start_time, availParams.end_time);
                          const isThisDone = timeToMinutes(d.end_time) <= querySlotStart;
                          return (
                            <div 
                              key={d.id} 
                              style={{ 
                                fontSize: '0.78rem', 
                                color: isThisActive ? '#f87171' : isThisDone ? '#34d399' : '#a5b4fc', 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '0.35rem',
                                marginTop: '0.25rem',
                                fontWeight: isThisActive ? 700 : 400
                              }}
                            >
                              <Clock size={12} />
                              <span>
                                {formatTime12(d.start_time)} – {formatTime12(d.end_time)}: Room {d.room_number} ({d.course_code || 'Exam'})
                                {isThisActive ? ' · [Active Now]' : isThisDone ? ' · [Completed]' : ' · [Upcoming]'}
                              </span>
                            </div>
                          );
                        })
                      )}

                      {/* If teacher has completed earlier duties today and is currently free */}
                      {!isOnLeave && isFree && completedTodayCount > 0 && (
                        <div style={{ 
                          fontSize: '0.75rem', 
                          color: '#34d399', 
                          fontWeight: 600, 
                          marginTop: '0.45rem', 
                          borderTop: '1px dashed rgba(255,255,255,0.08)', 
                          paddingTop: '0.4rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem'
                        }}>
                          <CheckCircle2 size={13} />
                          <span>Completed {completedTodayCount} duty earlier. Teacher is currently FREE for this slot!</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Card Bottom: Duty Count & Assign Action */}
                  <div style={{ 
                    borderTop: '1px solid rgba(255, 255, 255, 0.08)', 
                    paddingTop: '0.85rem', 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    gap: '0.5rem'
                  }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Today's Load: <strong style={{ color: '#fff' }}>{todayDutiesCount}</strong> / {max_duties} duties
                    </span>

                    {isOnLeave ? (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', opacity: 0.7, cursor: 'not-allowed', color: '#fbbf24' }}
                        disabled
                        title="Teacher is marked on leave and cannot take exam duties"
                      >
                        <UserMinus size={13} style={{ marginRight: 4 }} />
                        <span>On Leave (Unavailable)</span>
                      </button>
                    ) : isFree ? (
                      <button
                        className="btn btn-emerald"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                        onClick={() => openAssignForFaculty(f.id)}
                      >
                        <Plus size={14} />
                        <span>Assign to this Slot</span>
                      </button>
                    ) : (
                      <button
                        className="btn btn-secondary"
                        style={{ padding: '0.4rem 0.85rem', fontSize: '0.78rem', opacity: 0.6, cursor: 'not-allowed' }}
                        disabled
                        title={activeNowCount > 0 ? 'Teacher is actively in-duty right now' : conflictingDuty ? 'Cannot double-book: Teacher already assigned during this time' : 'Max duties reached for today'}
                      >
                        <span>{activeNowCount > 0 ? 'In-Duty' : conflictingDuty ? 'Time Clash' : 'Max Load'}</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: WORKLOAD DISTRIBUTION & BALANCING */}
      {/* ========================================================================= */}
      {activeTab === 'balancing' && (
        <div className="panel-card">
          <div className="panel-header" style={{ flexWrap: 'wrap', gap: '1rem' }}>
            <div className="panel-title">
              <h2>Faculty Workload Balancer</h2>
              <p>Distribute examination duties equally among all teachers so nobody is overloaded</p>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                onClick={handleResetDuties}
                title="Reset all duties to 0"
                style={{ color: '#f87171' }}
              >
                <RotateCcw size={15} />
                <span>Reset to 0</span>
              </button>

              <button 
                className="btn btn-primary"
                onClick={handleAutoAllocate}
                disabled={actionLoading}
              >
                <Scale size={16} />
                <span>{actionLoading ? 'Balancing...' : 'Distribute Duties Evenly (Auto-Balance)'}</span>
              </button>
            </div>
          </div>

          {/* Simple Explanation Guide for Presentation */}
          <div style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            borderRadius: '10px',
            padding: '1.25rem',
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.75rem'
          }}>
            <Info size={22} color="#818cf8" style={{ marginTop: '0.1rem', flexShrink: 0 }} />
            <div style={{ fontSize: '0.88rem', color: '#e5e7eb', lineHeight: '1.5' }}>
              <strong style={{ color: '#fff', fontSize: '0.95rem', display: 'block', marginBottom: '0.25rem' }}>
                Workload Balancing Policy (Overview):
              </strong>
              In university exam management, giving 4 duties to one teacher while another has 0 duties is unfair.
              <br />
              <strong>The Goal:</strong> Spread the duties equally across all active faculty members without exceeding anyone's maximum limit. Teachers marked <strong>On Leave</strong> are automatically excluded and will not be given any duties.
              <br />
              <strong>How to demonstrate:</strong> Click <strong>"Distribute Duties Evenly (Auto-Balance)"</strong> above. The system automatically assigns duties across all active teachers so everyone gets an equal load and the Fairness Score hits 100%!
            </div>
          </div>

          {/* Teacher Workload Progress Meters */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '1rem'
          }}>
            {facultyWithStats.map(f => {
              const assigned = f.assigned_duties;
              const max = f.max_duties;
              const pct = f.isOnLeave ? 0 : f.workload_pct;
              const fillColor = f.isOnLeave ? '#9ca3af' : pct >= 100 ? '#f43f5e' : pct >= 50 ? '#f59e0b' : '#10b981';

              return (
                <div 
                  key={f.id}
                  style={{
                    background: f.isOnLeave ? 'rgba(245, 158, 11, 0.03)' : 'rgba(255, 255, 255, 0.02)',
                    border: `1px solid ${f.isOnLeave ? 'rgba(245, 158, 11, 0.3)' : 'var(--border-subtle)'}`,
                    borderRadius: '12px',
                    padding: '1.25rem'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem', gap: '0.5rem' }}>
                    <div>
                      <div style={{ fontWeight: 700, color: '#f3f4f6', fontSize: '1rem' }}>{f.name}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        {f.designation} · Dept: {f.department}
                      </div>
                    </div>
                    {f.isOnLeave ? (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', fontSize: '0.72rem', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <UserMinus size={11} /> On Leave
                      </span>
                    ) : (
                      <span className="badge badge-indigo" style={{ fontSize: '0.7rem' }}>
                        Max: {max} duties
                      </span>
                    )}
                  </div>

                  <div className="workload-bar-wrap" style={{ marginTop: '0.85rem' }}>
                    <div 
                      className="workload-bar-fill"
                      style={{ width: `${pct}%`, background: fillColor }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.6rem', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {f.isOnLeave ? (
                        <span style={{ color: '#fbbf24' }}>Excluded from auto-assign</span>
                      ) : (
                        <>Today's Load: <strong style={{ color: '#fff' }}>{assigned}</strong> of {max}</>
                      )}
                    </span>
                    <span style={{ color: fillColor, fontWeight: 700 }}>
                      {f.isOnLeave ? '0% (On Leave)' : `${pct}% Capacity`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ASSIGNMENT METHOD CHOICE MODAL (Asks: Manual Assign vs Auto-Assign) */}
      {/* ========================================================================= */}
      {isAssignChoiceModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <Scale size={22} color="#6366f1" />
                <h3 style={{ margin: 0 }}>Assign Invigilation Duties</h3>
              </div>
              <button className="close-btn" onClick={() => setIsAssignChoiceModalOpen(false)}>✕</button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.4' }}>
              How would you like to assign duties for examinations? Choose your preferred method:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Option 1: Manual Assignment */}
              <div
                onClick={() => {
                  setIsAssignChoiceModalOpen(false);
                  openManualAssign();
                }}
                style={{
                  background: 'rgba(99, 102, 241, 0.08)',
                  border: '1px solid rgba(99, 102, 241, 0.35)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#818cf8';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.35)';
                  e.currentTarget.style.background = 'rgba(99, 102, 241, 0.08)';
                }}
              >
                <div style={{
                  background: 'rgba(99, 102, 241, 0.2)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#818cf8',
                  flexShrink: 0
                }}>
                  <UserCheck size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                    Manual Duty Assignment
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                    Select an individual teacher, examination subject, room, and custom time window manually with clash prevention.
                  </p>
                </div>
                <ArrowRight size={18} color="#818cf8" style={{ flexShrink: 0 }} />
              </div>

              {/* Option 2: Automatic Assignment */}
              <div
                onClick={() => {
                  setIsAssignChoiceModalOpen(false);
                  handleAutoAllocate();
                }}
                style={{
                  background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 185, 129, 0.1))',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '12px',
                  padding: '1.25rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#34d399';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(16, 185, 129, 0.15))';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(16, 185, 129, 0.35)';
                  e.currentTarget.style.background = 'linear-gradient(135deg, rgba(6, 182, 212, 0.1), rgba(16, 185, 129, 0.1))';
                }}
              >
                <div style={{
                  background: 'rgba(16, 185, 129, 0.2)',
                  borderRadius: '10px',
                  padding: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#34d399',
                  flexShrink: 0
                }}>
                  <Scale size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', fontWeight: 700, margin: '0 0 0.25rem 0' }}>
                    Automated Workload Allocation
                  </h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>
                    Automatically allocate and balance duties equally across all active teachers (teachers on leave are automatically excluded).
                  </p>
                </div>
                <ArrowRight size={18} color="#34d399" style={{ flexShrink: 0 }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button className="btn btn-secondary" onClick={() => setIsAssignChoiceModalOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANUAL ASSIGN MODAL (Teacher + Exam Slot + Room) */}
      {/* ========================================================================= */}
      {isAssignModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Plus size={20} color="#6366f1" />
                <h3>Assign Teacher to Exam Slot & Room</h3>
              </div>
              <button className="close-btn" onClick={() => setIsAssignModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={handleAssignDuty}>
              {/* 1. Select Teacher */}
              <div className="form-group">
                <label>1. Select Teacher *</label>
                <select 
                  className="form-control"
                  value={assignForm.faculty_id}
                  onChange={(e) => setAssignForm({ ...assignForm, faculty_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Teacher --</option>
                  {facultyWithStats.map(f => (
                    <option key={f.id} value={f.id} disabled={f.isOnLeave}>
                      {f.name} ({f.department}) {f.isOnLeave ? '[On Leave - Unavailable]' : `[Today's Duties: ${f.assigned_duties}/${f.max_duties}]`}
                    </option>
                  ))}
                </select>
              </div>

              {/* 2. Select Exam & Subject */}
              <div className="form-group">
                <label>2. Examination Subject *</label>
                <select 
                  className="form-control"
                  value={assignForm.exam_id}
                  onChange={(e) => {
                    const chosen = exams.find(x => String(x.id) === String(e.target.value));
                    setAssignForm({
                      ...assignForm,
                      exam_id: e.target.value,
                      exam_name: chosen ? chosen.exam_name : assignForm.exam_name
                    });
                  }}
                  required
                >
                  <option value="">-- Choose Exam Subject --</option>
                  {exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                      {ex.exam_name} ({ex.course_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* 3. Slot Date & Time Window */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '0.6rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Exam Date *
                  </label>
                  <input 
                    type="date"
                    className="form-control"
                    value={assignForm.exam_date}
                    onChange={(e) => setAssignForm({ ...assignForm, exam_date: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    Start Time *
                  </label>
                  <input 
                    type="time"
                    className="form-control"
                    value={assignForm.start_time}
                    onChange={(e) => setAssignForm({ ...assignForm, start_time: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                    End Time *
                  </label>
                  <input 
                    type="time"
                    className="form-control"
                    value={assignForm.end_time}
                    onChange={(e) => setAssignForm({ ...assignForm, end_time: e.target.value })}
                    required
                  />
                </div>
              </div>

              {/* 4. Select Room */}
              <div className="form-group">
                <label>4. Select Examination Room *</label>
                <select 
                  className="form-control"
                  value={assignForm.room_id}
                  onChange={(e) => setAssignForm({ ...assignForm, room_id: e.target.value })}
                  required
                >
                  <option value="">-- Choose Room --</option>
                  {rooms.map(r => (
                    <option key={r.id} value={r.id}>
                      Room {r.room_number} (Capacity: {r.capacity} seats · {r.building})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '1.5rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Confirm Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* SUBSTITUTE REASSIGNMENT MODAL */}
      {/* ========================================================================= */}
      {substituteModal.isOpen && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck size={20} color="#6366f1" />
                <h3>Assign Substitute Teacher</h3>
              </div>
              <button className="close-btn" onClick={() => setSubstituteModal({ ...substituteModal, isOpen: false })}>✕</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>
              Reassign this exam duty from <strong>{substituteModal.currentFacultyName}</strong> to another available teacher who is free at this time.
            </p>

            <form onSubmit={handleAssignSubstitute}>
              <div className="form-group">
                <label>Select Substitute Teacher *</label>
                <select 
                  className="form-control"
                  value={substituteModal.selectedSubstituteId}
                  onChange={(e) => setSubstituteModal({ ...substituteModal, selectedSubstituteId: e.target.value })}
                  required
                >
                  <option value="">-- Choose Substitute Teacher --</option>
                  {facultyWithStats
                    .filter(f => f.name !== substituteModal.currentFacultyName)
                    .map(f => (
                      <option key={f.id} value={f.id}>
                        {f.name} ({f.department}) [Current duties: {f.assigned_duties}/{f.max_duties}]
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
