const { query } = require('../config/db');

/**
 * Service encapsulating business logic for Faculty Duty Allocation & Workload Balancing
 * Features:
 * - Workload balancing across faculty pool (minimizing duty variance)
 * - Strict adherence to max_duties capacity
 * - Seniority-weighted room allocation (large halls to senior faculty)
 * - Department impartiality check (prevent self-department invigilation where possible)
 * - Substitute invigilator assignment with clash prevention
 */
class DutyService {
  /**
   * Helper to ensure basic exams exist in database for duty assignment
   */
  async ensureSampleExamsExist() {
    try {
      const [countRows] = await query('SELECT COUNT(*) as count FROM exams');
      if (countRows[0].count === 0) {
        const [courseRows] = await query('SELECT id, course_code FROM courses');
        if (courseRows.length > 0) {
          const c1 = courseRows[0]?.id;
          const c2 = courseRows[1]?.id || c1;
          const c3 = courseRows[2]?.id || c1;
          const c4 = courseRows[3]?.id || c1;

          await query(`
            INSERT INTO exams (course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status) VALUES
            (?, 'CSE3005 Software Engineering End-Term', 'END_TERM', '2026-11-20', '09:30:00', '12:30:00', 180, 'SCHEDULED'),
            (?, 'CSE3002 Database Systems Final Exam', 'END_TERM', '2026-11-22', '09:30:00', '12:30:00', 180, 'SCHEDULED'),
            (?, 'ECE2001 Digital Electronics Mid-Term', 'MID_TERM', '2026-11-24', '14:00:00', '17:00:00', 180, 'SCHEDULED'),
            (?, 'ME1001 Thermodynamics End-Term', 'END_TERM', '2026-11-26', '09:30:00', '12:30:00', 180, 'SCHEDULED')
          `, [c1, c2, c3, c4]);
        }
      }
    } catch (e) {
      console.warn('Auto-seed exams note:', e.message);
    }
  }

  /**
   * Reset all invigilation duty assignments to 0
   */
  async resetAllDuties() {
    await query('DELETE FROM invigilation_duties');
    return { success: true, message: 'All invigilation duty assignments have been reset to zero.' };
  }

  /**
   * Fetch complete duty roster with joined details
   */
  async getDutyRoster() {
    await this.ensureSampleExamsExist();
    const sql = `
      SELECT 
        id.id,
        id.exam_id,
        id.room_id,
        id.faculty_id,
        id.status,
        id.substitute_faculty_id,
        id.created_at,
        e.exam_name,
        e.exam_date,
        e.start_time,
        e.end_time,
        e.duration_minutes,
        c.course_code,
        c.course_name,
        c.department as course_department,
        r.room_number,
        r.building,
        r.capacity as room_capacity,
        f.name as faculty_name,
        f.faculty_code,
        f.email as faculty_email,
        f.department as faculty_department,
        f.designation,
        f.seniority_level,
        f.max_duties,
        sub.name as substitute_name,
        sub.faculty_code as substitute_code
      FROM invigilation_duties id
      JOIN exams e ON id.exam_id = e.id
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON id.room_id = r.id
      JOIN faculty f ON id.faculty_id = f.id
      LEFT JOIN faculty sub ON id.substitute_faculty_id = sub.id
      ORDER BY e.exam_date ASC, e.start_time ASC, r.room_number ASC
    `;
    const [rows] = await query(sql);
    return rows;
  }

  /**
   * Fetch live faculty workload distribution and fairness metrics
   */
  async getWorkloadStats() {
    const [facultyList] = await query(`
      SELECT 
        f.id,
        f.faculty_code,
        f.name,
        f.email,
        f.department,
        f.designation,
        f.seniority_level,
        f.max_duties,
        COUNT(id.id) as assigned_duties,
        (f.max_duties - COUNT(id.id)) as remaining_duties,
        ROUND((COUNT(id.id) / f.max_duties) * 100) as workload_pct
      FROM faculty f
      LEFT JOIN invigilation_duties id ON f.id = id.faculty_id
      GROUP BY f.id
      ORDER BY assigned_duties DESC, f.name ASC
    `);

    // Calculate statistical balance metrics
    const dutyCounts = facultyList.map(f => Number(f.assigned_duties));
    const totalAssigned = dutyCounts.reduce((acc, c) => acc + c, 0);
    const mean = facultyList.length > 0 ? totalAssigned / facultyList.length : 0;
    
    // Variance and standard deviation
    const variance = facultyList.length > 0
      ? dutyCounts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / facultyList.length
      : 0;
    const stdDev = Math.sqrt(variance);

    // Fairness index: 100% means perfectly equal duty count across all faculty
    const fairnessIndex = facultyList.length > 0
      ? Math.max(0, Math.round((1 - (stdDev / (mean + 1))) * 100))
      : 100;

    return {
      facultyList,
      totalFaculty: facultyList.length,
      totalAssignedDuties: totalAssigned,
      averageDuties: Number(mean.toFixed(1)),
      stdDev: Number(stdDev.toFixed(2)),
      fairnessIndex
    };
  }

  /**
   * Automated Workload-Balanced Duty Allocation Algorithm
   * 
   * Process:
   * 1. Identifies all (exam_id, room_id) pairs needing an invigilator.
   *    (Either from active seat_allocations or room defaults for scheduled exams).
   * 2. Pulls all available faculty with current duty counts and max_duties.
   * 3. Sorts rooms: High capacity rooms (e.g. Auditoriums) match with higher seniority faculty.
   * 4. For each duty slot:
   *    - Filters out faculty with:
   *        a) Current duty count >= max_duties
   *        b) Overlapping duty at same date/time
   *    - Scores candidate faculty:
   *        - Lowest current assigned duties (+100 weight for workload balance)
   *        - Different department than exam course (+50 weight for impartiality)
   *        - Matching seniority level with room scale (+30 weight)
   *    - Assigns top-ranked candidate.
   */
  async autoAllocateDuties({ clearExisting = false, excludeFacultyIds = [] } = {}) {
    if (clearExisting) {
      await query('DELETE FROM invigilation_duties');
    }

    // Step 1: Find exam-room pairs that have seated students
    let [examRooms] = await query(`
      SELECT DISTINCT 
        sa.exam_id, 
        sa.room_id, 
        e.exam_name, 
        e.exam_date, 
        e.start_time, 
        e.end_time,
        c.department as course_dept,
        r.room_number,
        r.capacity as room_capacity
      FROM seat_allocations sa
      JOIN exams e ON sa.exam_id = e.id
      JOIN courses c ON e.course_id = c.id
      JOIN rooms r ON sa.room_id = r.id
      WHERE (sa.exam_id, sa.room_id) NOT IN (SELECT exam_id, room_id FROM invigilation_duties)
      ORDER BY e.exam_date ASC, e.start_time ASC, r.capacity DESC
    `);

    // Fallback: If seating hasn't been run yet, assign 1 room per scheduled exam
    if (examRooms.length === 0) {
      const [scheduledExams] = await query(`
        SELECT 
          e.id as exam_id, 
          e.exam_name, 
          e.exam_date, 
          e.start_time, 
          e.end_time,
          c.department as course_dept
        FROM exams e
        JOIN courses c ON e.course_id = c.id
        WHERE e.id NOT IN (SELECT exam_id FROM invigilation_duties)
        ORDER BY e.exam_date ASC, e.start_time ASC
      `);

      const [defaultRooms] = await query('SELECT * FROM rooms WHERE is_available = TRUE ORDER BY capacity DESC');

      if (defaultRooms.length > 0 && scheduledExams.length > 0) {
        examRooms = scheduledExams.map((ex, idx) => {
          const room = defaultRooms[idx % defaultRooms.length];
          return {
            exam_id: ex.exam_id,
            room_id: room.id,
            exam_name: ex.exam_name,
            exam_date: ex.exam_date,
            start_time: ex.start_time,
            end_time: ex.end_time,
            course_dept: ex.course_dept,
            room_number: room.room_number,
            room_capacity: room.capacity
          };
        });
      }
    }

    if (examRooms.length === 0) {
      return {
        success: true,
        allocatedCount: 0,
        message: 'No unassigned exam-room sessions found. All duties are already assigned.'
      };
    }

    // Step 2: Load all faculty, excluding any teachers who are on leave
    const [allFacultyRows] = await query('SELECT * FROM faculty');
    const excludedList = (excludeFacultyIds || []).map(id => Number(id));
    const allFaculty = allFacultyRows.filter(f => !excludedList.includes(Number(f.id)));

    if (allFaculty.length === 0) {
      const err = new Error('No available faculty records to assign duties (all selected teachers may be marked on leave).');
      err.statusCode = 400;
      throw err;
    }

    // Track assigned duties in memory for rapid greedy balancing
    // facultyDutyMap[faculty_id] = { count, maxDuties, assignments: [ { exam_date, start_time, end_time } ] }
    const facultyDutyMap = {};
    for (const f of allFaculty) {
      const [existing] = await query(
        `SELECT id.id, e.exam_date, e.start_time, e.end_time 
         FROM invigilation_duties id 
         JOIN exams e ON id.exam_id = e.id 
         WHERE id.faculty_id = ?`,
        [f.id]
      );
      facultyDutyMap[f.id] = {
        id: f.id,
        name: f.name,
        department: f.department,
        seniority: f.seniority_level || 1,
        maxDuties: f.max_duties || 5,
        count: existing.length,
        schedule: existing.map(x => ({
          dateStr: x.exam_date.toISOString().split('T')[0],
          start: x.start_time,
          end: x.end_time
        }))
      };
    }

    const newDuties = [];

    // Step 3: Iterate through exam-rooms and assign optimal faculty
    for (const session of examRooms) {
      const dateStr = session.exam_date instanceof Date
        ? session.exam_date.toISOString().split('T')[0]
        : String(session.exam_date).split('T')[0];

      // Eligible candidates: Under max duties & no time clash
      const candidates = Object.values(facultyDutyMap).filter(f => {
        // Rule 1: Capacity check
        if (f.count >= f.maxDuties) return false;

        // Rule 2: Overlapping time clash on same date
        const hasTimeClash = f.schedule.some(s => {
          if (s.dateStr !== dateStr) return false;
          return (
            (session.start_time <= s.start && session.end_time > s.start) ||
            (session.start_time < s.end && session.end_time >= s.end) ||
            (session.start_time >= s.start && session.end_time <= s.end)
          );
        });
        return !hasTimeClash;
      });

      if (candidates.length === 0) {
        continue; // Faculty shortage for this particular slot
      }

      // Rule 3, 4, 5: Scoring candidates
      // Lower count = higher score
      // Different department = +50 score (impartiality)
      // Large room capacity (>= 50) prefers seniority >= 2
      const scored = candidates.map(c => {
        let score = (10 - c.count) * 20; // Workload balancing priority
        
        // Department impartiality
        if (c.department !== session.course_dept) {
          score += 50;
        }

        // Seniority alignment with room size
        if (session.room_capacity >= 50 && c.seniority >= 2) {
          score += 30;
        } else if (session.room_capacity < 50 && c.seniority === 1) {
          score += 20;
        }

        return { candidate: c, score };
      });

      scored.sort((a, b) => b.score - a.score);
      const chosen = scored[0].candidate;

      // Persist in DB
      const [insertRes] = await query(
        `INSERT INTO invigilation_duties (exam_id, room_id, faculty_id, status) 
         VALUES (?, ?, ?, 'ASSIGNED')
         ON DUPLICATE KEY UPDATE faculty_id = VALUES(faculty_id), status = 'ASSIGNED'`,
        [session.exam_id, session.room_id, chosen.id]
      );

      // Update in-memory tracker
      chosen.count += 1;
      chosen.schedule.push({
        dateStr,
        start: session.start_time,
        end: session.end_time
      });

      newDuties.push({
        duty_id: insertRes.insertId,
        exam_id: session.exam_id,
        room_id: session.room_id,
        faculty_id: chosen.id,
        faculty_name: chosen.name
      });
    }

    return {
      success: true,
      allocatedCount: newDuties.length,
      newDuties,
      message: `Successfully allocated and balanced ${newDuties.length} invigilation duties across available faculty.`
    };
  }

  /**
   * Assign or update a substitute invigilator for an existing duty
   */
  async assignSubstitute(dutyId, substituteFacultyId) {
    const [duties] = await query(
      `SELECT id.*, e.exam_date, e.start_time, e.end_time 
       FROM invigilation_duties id 
       JOIN exams e ON id.exam_id = e.id 
       WHERE id.id = ?`,
      [dutyId]
    );

    if (!duties.length) {
      const err = new Error(`Duty ID ${dutyId} not found.`);
      err.statusCode = 404;
      throw err;
    }
    const duty = duties[0];

    // Check substitute faculty exists and has capacity
    const [subFaculty] = await query('SELECT * FROM faculty WHERE id = ?', [substituteFacultyId]);
    if (!subFaculty.length) {
      const err = new Error(`Substitute Faculty ID ${substituteFacultyId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    // Check substitute doesn't already have a duty at this time
    const [subClashes] = await query(
      `SELECT id.id 
       FROM invigilation_duties id 
       JOIN exams e ON id.exam_id = e.id 
       WHERE id.faculty_id = ? 
         AND e.exam_date = ? 
         AND (
           (e.start_time <= ? AND e.end_time > ?) OR
           (e.start_time < ? AND e.end_time >= ?)
         )`,
      [substituteFacultyId, duty.exam_date, duty.start_time, duty.start_time, duty.end_time, duty.end_time]
    );

    if (subClashes.length > 0) {
      const err = new Error('Substitute faculty has a schedule clash with another exam at this exact time slot.');
      err.statusCode = 409;
      throw err;
    }

    await query(
      `UPDATE invigilation_duties 
       SET substitute_faculty_id = ?, status = 'SUBSTITUTED' 
       WHERE id = ?`,
      [substituteFacultyId, dutyId]
    );

    return true;
  }

  /**
   * Helper to normalize time strings to HH:MM:SS for exact database matching
   */
  normTime(t) {
    if (!t) return '00:00:00';
    const clean = String(t).trim();
    const parts = clean.split(':');
    const h = String(parts[0] || '0').padStart(2, '0');
    const m = String(parts[1] || '0').padStart(2, '0');
    const s = String(parts[2] || '0').padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  /**
   * Check live availability of all faculty for a given date, time slot, and course department
   * Enforces:
   * 1. Availability check (no overlapping duties in time slot)
   * 2. Max duties capacity check
   * 3. Department impartiality evaluation
   */
  async checkFacultyAvailability({ exam_date, start_time, end_time, course_dept = null }) {
    if (!exam_date || !start_time || !end_time) {
      const err = new Error('exam_date, start_time, and end_time are required to check availability.');
      err.statusCode = 400;
      throw err;
    }

    const sTime = this.normTime(start_time);
    const eTime = this.normTime(end_time);

    const [allFaculty] = await query('SELECT * FROM faculty ORDER BY name ASC');

    const result = [];
    for (const f of allFaculty) {
      // 1. Check existing duty count
      const [countRows] = await query(
        'SELECT COUNT(*) as count FROM invigilation_duties WHERE faculty_id = ?',
        [f.id]
      );
      const assignedCount = countRows[0]?.count || 0;
      const atCapacity = assignedCount >= f.max_duties;

      // 2. Check time clash on date (Interval overlap: e.start_time < end_time AND e.end_time > start_time)
      const [clashes] = await query(
        `SELECT id.id, e.exam_name, r.room_number, e.start_time, e.end_time 
         FROM invigilation_duties id
         JOIN exams e ON id.exam_id = e.id
         JOIN rooms r ON id.room_id = r.id
         WHERE id.faculty_id = ? 
           AND e.exam_date = ? 
           AND e.start_time < ? 
           AND e.end_time > ?`,
        [f.id, exam_date, eTime, sTime]
      );

      const hasClash = clashes.length > 0;
      let status = 'AVAILABLE';
      let reason = null;

      if (hasClash) {
        status = 'TIME_CONFLICT';
        reason = `Assigned to ${clashes[0].exam_name} in Room ${clashes[0].room_number} (${clashes[0].start_time?.substring(0, 5)} - ${clashes[0].end_time?.substring(0, 5)})`;
      } else if (atCapacity) {
        status = 'AT_CAPACITY';
        reason = `Reached maximum allowed duties (${assignedCount}/${f.max_duties})`;
      }

      const isImpartial = course_dept ? f.department !== course_dept : true;

      result.push({
        faculty_id: f.id,
        faculty_code: f.faculty_code,
        name: f.name,
        email: f.email,
        department: f.department,
        designation: f.designation,
        seniority_level: f.seniority_level,
        max_duties: f.max_duties,
        assigned_duties: assignedCount,
        remaining_capacity: Math.max(0, f.max_duties - assignedCount),
        is_available: !hasClash && !atCapacity,
        status,
        conflict_reason: reason,
        is_impartial: isImpartial
      });
    }

    return result;
  }

  /**
   * Explicitly assign an invigilator to an exam room and time slot with conflict checks
   */
  async assignDutyToRoomSlot({ exam_id, room_id, faculty_id, exam_date, start_time, end_time }) {
    if (!exam_id || !room_id || !faculty_id) {
      const err = new Error('exam_id, room_id, and faculty_id are required.');
      err.statusCode = 400;
      throw err;
    }

    // Verify exam
    const [exams] = await query('SELECT * FROM exams WHERE id = ?', [exam_id]);
    if (!exams.length) {
      const err = new Error(`Exam ID ${exam_id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    const exam = exams[0];

    // Determine active slot date and times
    const targetDate = exam_date || exam.exam_date;
    const targetStart = start_time ? this.normTime(start_time) : exam.start_time;
    const targetEnd = end_time ? this.normTime(end_time) : exam.end_time;

    // Verify faculty
    const [faculties] = await query('SELECT * FROM faculty WHERE id = ?', [faculty_id]);
    if (!faculties.length) {
      const err = new Error(`Faculty ID ${faculty_id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    const faculty = faculties[0];

    // Check faculty capacity
    const [dutyCount] = await query(
      'SELECT COUNT(*) as count FROM invigilation_duties WHERE faculty_id = ? AND exam_id != ?',
      [faculty_id, exam_id]
    );
    if (dutyCount[0].count >= faculty.max_duties) {
      const err = new Error(`Faculty ${faculty.name} has already reached maximum duty capacity (${faculty.max_duties} duties).`);
      err.statusCode = 409;
      throw err;
    }

    // Check time clash: Check if faculty has another duty on this date that strictly overlaps
    const [clashes] = await query(
      `SELECT id.id, e.exam_name, r.room_number, e.start_time, e.end_time 
       FROM invigilation_duties id
       JOIN exams e ON id.exam_id = e.id
       JOIN rooms r ON id.room_id = r.id
       WHERE id.faculty_id = ? 
         AND e.exam_date = ? 
         AND id.exam_id != ?
         AND e.start_time < ? 
         AND e.end_time > ?`,
      [faculty_id, targetDate, exam_id, targetEnd, targetStart]
    );

    if (clashes.length > 0) {
      const err = new Error(`Schedule Clash: ${faculty.name} already has a duty in Room ${clashes[0].room_number} for "${clashes[0].exam_name}" at this time.`);
      err.statusCode = 409;
      throw err;
    }

    const [insertRes] = await query(
      `INSERT INTO invigilation_duties (exam_id, room_id, faculty_id, status)
       VALUES (?, ?, ?, 'ASSIGNED')
       ON DUPLICATE KEY UPDATE faculty_id = VALUES(faculty_id), status = 'ASSIGNED'`,
      [exam_id, room_id, faculty_id]
    );

    return {
      success: true,
      duty_id: insertRes.insertId,
      message: `Assigned ${faculty.name} to Room for "${exam.exam_name}".`
    };
  }

  /**
   * Delete or cancel an invigilation duty assignment
   */
  async removeDuty(dutyId) {
    await query('DELETE FROM invigilation_duties WHERE id = ?', [dutyId]);
    return true;
  }
}

module.exports = new DutyService();
