const { query } = require('../config/db');

/**
 * Service encapsulating business logic for Exam Scheduling & Timetable Generation
 * Features:
 * - Exam difficulty considerations (spacing out difficulty level 4 & 5 courses)
 * - Hard conflict detection (student cohort overlap, room double-booking)
 * - Automatic timetable generation
 */
class SchedulingService {
  /**
   * Fetch all exams with course details and allocation counts
   */
  async getAllExams() {
    const sql = `
      SELECT 
        e.*,
        c.course_code,
        c.course_name,
        c.department,
        c.semester,
        c.difficulty_level,
        (SELECT COUNT(*) FROM seat_allocations sa WHERE sa.exam_id = e.id) AS allocated_students_count,
        (SELECT COUNT(DISTINCT room_id) FROM seat_allocations sa WHERE sa.exam_id = e.id) AS rooms_used_count,
        (SELECT COUNT(*) FROM invigilation_duties id WHERE id.exam_id = e.id) AS assigned_faculty_count
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      ORDER BY e.exam_date ASC, e.start_time ASC
    `;
    const [rows] = await query(sql);
    return rows;
  }

  /**
   * Fetch single exam details
   */
  async getExamById(id) {
    const [rows] = await query(
      `SELECT e.*, c.course_code, c.course_name, c.department, c.semester, c.difficulty_level 
       FROM exams e 
       JOIN courses c ON e.course_id = c.id 
       WHERE e.id = ?`,
      [id]
    );
    if (!rows.length) {
      const err = new Error(`Exam with ID ${id} not found.`);
      err.statusCode = 404;
      throw err;
    }
    return rows[0];
  }

  /**
   * Create an exam with conflict validation
   */
  async createExam({ course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes }) {
    if (!course_id || !exam_name || !exam_date || !start_time || !end_time) {
      const err = new Error('course_id, exam_name, exam_date, start_time, and end_time are required.');
      err.statusCode = 400;
      throw err;
    }

    // Verify course exists
    const [courses] = await query('SELECT * FROM courses WHERE id = ?', [course_id]);
    if (!courses.length) {
      const err = new Error(`Course ID ${course_id} does not exist.`);
      err.statusCode = 404;
      throw err;
    }
    const course = courses[0];

    // Check for hard conflict: Same department & semester having another exam in overlapping time slot
    const [conflicts] = await query(
      `SELECT e.id, e.exam_name, c.course_code 
       FROM exams e
       JOIN courses c ON e.course_id = c.id
       WHERE e.exam_date = ? 
         AND c.department = ? 
         AND c.semester = ?
         AND (
           (e.start_time <= ? AND e.end_time > ?) OR
           (e.start_time < ? AND e.end_time >= ?) OR
           (e.start_time >= ? AND e.end_time <= ?)
         )`,
      [
        exam_date, course.department, course.semester,
        start_time, start_time,
        end_time, end_time,
        start_time, end_time
      ]
    );

    if (conflicts.length > 0) {
      const err = new Error(
        `Scheduling Conflict: Cohort (${course.department} Sem-${course.semester}) already has exam "${conflicts[0].exam_name}" (${conflicts[0].course_code}) in this overlapping time slot.`
      );
      err.statusCode = 409;
      throw err;
    }

    const [result] = await query(
      `INSERT INTO exams (course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status) 
       VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
      [
        course_id,
        exam_name,
        exam_type || 'END_TERM',
        exam_date,
        start_time,
        end_time,
        duration_minutes || 180
      ]
    );

    return result.insertId;
  }

  /**
   * Update exam schedule details
   */
  async updateExam(id, { exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status }) {
    await this.getExamById(id);

    await query(
      `UPDATE exams 
       SET exam_name = COALESCE(?, exam_name),
           exam_type = COALESCE(?, exam_type),
           exam_date = COALESCE(?, exam_date),
           start_time = COALESCE(?, start_time),
           end_time = COALESCE(?, end_time),
           duration_minutes = COALESCE(?, duration_minutes),
           status = COALESCE(?, status)
       WHERE id = ?`,
      [exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status, id]
    );

    return true;
  }

  /**
   * Delete an exam and clean up allocations
   */
  async deleteExam(id) {
    await this.getExamById(id);
    await query('DELETE FROM exams WHERE id = ?', [id]);
    return true;
  }

  /**
   * Comprehensive Conflict Detector:
   * Analyzes all scheduled exams for:
   * 1. Hard clashes: Same cohort with simultaneous exams
   * 2. Room double-bookings (where seat allocations overlap)
   * 3. Faculty double-bookings (where duty assignments overlap)
   * 4. Difficulty considerations: Consecutive high-difficulty exams (difficulty >= 4) with zero prep days
   */
  async detectConflicts() {
    const issues = [];

    // 1. Check simultaneous cohort clashes
    const [cohortClashes] = await query(`
      SELECT 
        e1.id as exam1_id, e1.exam_name as exam1_name, c1.course_code as course1_code,
        e2.id as exam2_id, e2.exam_name as exam2_name, c2.course_code as course2_code,
        c1.department, c1.semester, e1.exam_date, e1.start_time, e1.end_time
      FROM exams e1
      JOIN courses c1 ON e1.course_id = c1.id
      JOIN exams e2 ON e1.id < e2.id AND e1.exam_date = e2.exam_date
      JOIN courses c2 ON e2.course_id = c2.id
      WHERE c1.department = c2.department 
        AND c1.semester = c2.semester
        AND (
          (e1.start_time <= e2.start_time AND e1.end_time > e2.start_time) OR
          (e1.start_time < e2.end_time AND e1.end_time >= e2.end_time) OR
          (e1.start_time >= e2.start_time AND e1.end_time <= e2.end_time)
        )
    `);

    for (const clash of cohortClashes) {
      issues.push({
        type: 'HARD_CONFLICT',
        severity: 'HIGH',
        message: `Student Cohort Clash: ${clash.department} Sem-${clash.semester} has simultaneous exams (${clash.course1_code} & ${clash.course2_code}) on ${clash.exam_date.toISOString().split('T')[0]}.`,
        details: clash
      });
    }

    // 2. Check room double-bookings
    const [roomClashes] = await query(`
      SELECT 
        r.id as room_id, r.room_number,
        e1.id as exam1_id, e1.exam_name as exam1_name,
        e2.id as exam2_id, e2.exam_name as exam2_name,
        e1.exam_date, e1.start_time, e1.end_time
      FROM seat_allocations sa1
      JOIN exams e1 ON sa1.exam_id = e1.id
      JOIN seat_allocations sa2 ON sa1.room_id = sa2.room_id AND sa1.exam_id < sa2.exam_id
      JOIN exams e2 ON sa2.exam_id = e2.id AND e1.exam_date = e2.exam_date
      JOIN rooms r ON sa1.room_id = r.id
      WHERE (
        (e1.start_time <= e2.start_time AND e1.end_time > e2.start_time) OR
        (e1.start_time < e2.end_time AND e1.end_time >= e2.end_time)
      )
      GROUP BY r.id, e1.id, e2.id
    `);

    for (const clash of roomClashes) {
      issues.push({
        type: 'ROOM_DOUBLE_BOOKING',
        severity: 'HIGH',
        message: `Room Overlap: Room ${clash.room_number} is allocated to both "${clash.exam1_name}" and "${clash.exam2_name}" simultaneously on ${clash.exam_date.toISOString().split('T')[0]}.`,
        details: clash
      });
    }

    // 3. Check faculty double-bookings
    const [facultyClashes] = await query(`
      SELECT 
        f.id as faculty_id, f.name as faculty_name,
        e1.id as exam1_id, e1.exam_name as exam1_name,
        e2.id as exam2_id, e2.exam_name as exam2_name,
        e1.exam_date, e1.start_time, e1.end_time
      FROM invigilation_duties id1
      JOIN exams e1 ON id1.exam_id = e1.id
      JOIN invigilation_duties id2 ON id1.faculty_id = id2.faculty_id AND id1.exam_id < id2.exam_id
      JOIN exams e2 ON id2.exam_id = e2.id AND e1.exam_date = e2.exam_date
      JOIN faculty f ON id1.faculty_id = f.id
      WHERE (
        (e1.start_time <= e2.start_time AND e1.end_time > e2.start_time) OR
        (e1.start_time < e2.end_time AND e1.end_time >= e2.end_time)
      )
      GROUP BY f.id, e1.id, e2.id
    `);

    for (const clash of facultyClashes) {
      issues.push({
        type: 'FACULTY_DOUBLE_BOOKING',
        severity: 'HIGH',
        message: `Faculty Duty Overlap: ${clash.faculty_name} is assigned to multiple exams simultaneously on ${clash.exam_date.toISOString().split('T')[0]}.`,
        details: clash
      });
    }

    // 4. Difficulty considerations: Consecutive high difficulty exams (difficulty >= 4) with zero gap
    const [difficultyStrains] = await query(`
      SELECT 
        e1.id as exam1_id, c1.course_code as course1_code, c1.difficulty_level as diff1, e1.exam_date as date1,
        e2.id as exam2_id, c2.course_code as course2_code, c2.difficulty_level as diff2, e2.exam_date as date2,
        c1.department, c1.semester
      FROM exams e1
      JOIN courses c1 ON e1.course_id = c1.id
      JOIN exams e2 ON e1.id != e2.id
      JOIN courses c2 ON e2.course_id = c2.id
      WHERE c1.department = c2.department
        AND c1.semester = c2.semester
        AND c1.difficulty_level >= 4
        AND c2.difficulty_level >= 4
        AND DATEDIFF(e2.exam_date, e1.exam_date) = 1
    `);

    for (const strain of difficultyStrains) {
      issues.push({
        type: 'DIFFICULTY_STRAIN',
        severity: 'MEDIUM',
        message: `Cognitive Load Warning: Back-to-back high-difficulty exams for ${strain.department} Sem-${strain.semester} (${strain.course1_code} [Diff ${strain.diff1}] and ${strain.course2_code} [Diff ${strain.diff2}]) on consecutive days. Consider spacing them out.`,
        details: strain
      });
    }

    return {
      hasConflicts: issues.length > 0,
      hardConflictsCount: issues.filter(i => i.severity === 'HIGH').length,
      warningsCount: issues.filter(i => i.severity === 'MEDIUM').length,
      totalIssues: issues.length,
      issues
    };
  }

  /**
   * Automated Timetable Generator with Difficulty-Aware Spacing
   * 
   * Strategy:
   * 1. Fetches all courses (or specific course IDs).
   * 2. Groups courses by cohort (department + semester).
   * 3. Sorts courses by difficulty_level descending (harder exams get first placement).
   * 4. Spreads exams across available dates with difficulty spacing:
   *    - High difficulty courses (4-5) are placed on dates separated by at least 1 rest/prep day.
   *    - Slots: Morning (09:30-12:30) and Afternoon (14:00-17:00).
   * 5. Ensures zero cohort clashes.
   */
  async generateAutomatedTimetable({ startDate, examType = 'END_TERM', courseIds = null, clearExisting = false }) {
    if (!startDate) {
      const err = new Error('startDate is required for timetable generation.');
      err.statusCode = 400;
      throw err;
    }

    if (clearExisting) {
      await query('DELETE FROM seat_allocations');
      await query('DELETE FROM invigilation_duties');
      await query('DELETE FROM exams');
    }

    let coursesSql = 'SELECT * FROM courses';
    let params = [];
    if (courseIds && courseIds.length > 0) {
      coursesSql += ` WHERE id IN (${courseIds.map(() => '?').join(',')})`;
      params = courseIds;
    }
    const [courses] = await query(coursesSql, params);

    if (courses.length === 0) {
      const err = new Error('No courses found to schedule.');
      err.statusCode = 400;
      throw err;
    }

    // Group courses by cohort: `${department}_${semester}`
    const cohorts = {};
    for (const course of courses) {
      const key = `${course.department}_${course.semester}`;
      if (!cohorts[key]) cohorts[key] = [];
      cohorts[key].push(course);
    }

    // Standard time slots
    const SLOTS = [
      { name: 'Morning Slot', start: '09:30:00', end: '12:30:00', duration: 180 },
      { name: 'Afternoon Slot', start: '14:00:00', end: '17:00:00', duration: 180 }
    ];

    const scheduledExams = [];
    const baseDate = new Date(startDate);

    // Track assigned date for each cohort to prevent conflicts and ensure difficulty spacing
    // cohortSchedule[key] = [ { dateStr, slotIndex, difficulty } ]
    const cohortSchedule = {};

    for (const [cohortKey, cohortCourses] of Object.entries(cohorts)) {
      cohortSchedule[cohortKey] = [];

      // Sort courses: High difficulty first (5 down to 1)
      const sorted = [...cohortCourses].sort((a, b) => (b.difficulty_level || 3) - (a.difficulty_level || 3));

      let dayOffset = 0;

      for (const course of sorted) {
        const difficulty = course.difficulty_level || 3;
        let scheduled = false;
        let attempts = 0;

        while (!scheduled && attempts < 40) {
          const testDate = new Date(baseDate);
          testDate.setDate(testDate.getDate() + dayOffset);
          const dateStr = testDate.toISOString().split('T')[0];

          // Check if cohort already has an exam on this date
          const existingOnDate = cohortSchedule[cohortKey].find(s => s.dateStr === dateStr);

          // Check difficulty spacing: If difficulty >= 4, check if yesterday was also a hard exam
          const yesterday = new Date(testDate);
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayStr = yesterday.toISOString().split('T')[0];
          const hardYesterday = cohortSchedule[cohortKey].find(s => s.dateStr === yesterdayStr && s.difficulty >= 4);

          if (!existingOnDate && !(difficulty >= 4 && hardYesterday)) {
            // Assign slot: Morning for hard exams (levels 4,5), Afternoon for others (or alternate)
            const slotIndex = difficulty >= 4 ? 0 : (cohortSchedule[cohortKey].length % 2);
            const slot = SLOTS[slotIndex];

            // Schedule this course
            const examName = `${course.course_code} ${examType === 'END_TERM' ? 'Final Examination' : 'Mid-Term Exam'}`;

            const [result] = await query(
              `INSERT INTO exams (course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status) 
               VALUES (?, ?, ?, ?, ?, ?, ?, 'SCHEDULED')`,
              [course.id, examName, examType, dateStr, slot.start, slot.end, slot.duration]
            );

            cohortSchedule[cohortKey].push({
              dateStr,
              slotIndex,
              difficulty,
              courseCode: course.course_code
            });

            scheduledExams.push({
              id: result.insertId,
              course_id: course.id,
              course_code: course.course_code,
              course_name: course.course_name,
              department: course.department,
              semester: course.semester,
              difficulty_level: difficulty,
              exam_name: examName,
              exam_date: dateStr,
              start_time: slot.start,
              end_time: slot.end,
              slot_name: slot.name
            });

            scheduled = true;
          }

          // Advance offset: space out hard exams by at least 2 calendar days
          dayOffset += (difficulty >= 4 ? 2 : 1);
          attempts++;
        }
      }
    }

    return {
      totalScheduled: scheduledExams.length,
      scheduledExams,
      message: `Successfully scheduled ${scheduledExams.length} exams with difficulty-aware spacing and zero cohort conflicts.`
    };
  }
}

module.exports = new SchedulingService();
