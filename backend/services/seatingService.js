const { query } = require('../config/db');

/**
 * Service encapsulating business logic & algorithmic computation for Room & Seat Allocation
 * Adheres to 3-Tier Layered Architecture & Strategy Pattern
 */
class SeatingService {
  /**
   * Helper: Calculate anti-cheating adjacency metrics on a 2D room matrix
   * Checks horizontal, vertical, and diagonal neighbors to ensure no adjacent students take the same course
   */
  calculateAdjacencyMetrics(grid, rowsCount, colsCount) {
    let sameCourseHorizontal = 0;
    let sameCourseVertical = 0;
    let sameCourseDiagonal = 0;
    let totalAssignedSeats = 0;

    for (let r = 1; r <= rowsCount; r++) {
      for (let c = 1; c <= colsCount; c++) {
        const current = grid[r] && grid[r][c];
        if (!current || !current.student_id) continue;
        totalAssignedSeats++;

        // Horizontal neighbor (right)
        if (c + 1 <= colsCount) {
          const right = grid[r][c + 1];
          if (right && right.student_id && right.course_id === current.course_id) {
            sameCourseHorizontal++;
          }
        }

        // Vertical neighbor (down)
        if (r + 1 <= rowsCount) {
          const down = grid[r + 1][c];
          if (down && down.student_id && down.course_id === current.course_id) {
            sameCourseVertical++;
          }
        }

        // Diagonal neighbors (down-right, down-left)
        if (r + 1 <= rowsCount && c + 1 <= colsCount) {
          const diagRight = grid[r + 1][c + 1];
          if (diagRight && diagRight.student_id && diagRight.course_id === current.course_id) {
            sameCourseDiagonal++;
          }
        }
        if (r + 1 <= rowsCount && c - 1 >= 1) {
          const diagLeft = grid[r + 1][c - 1];
          if (diagLeft && diagLeft.student_id && diagLeft.course_id === current.course_id) {
            sameCourseDiagonal++;
          }
        }
      }
    }

    const totalViolations = sameCourseHorizontal + sameCourseVertical;
    const integrityPercentage = totalAssignedSeats > 0
      ? Math.max(0, Math.round((1 - (totalViolations / totalAssignedSeats)) * 100))
      : 100;

    return {
      totalAssignedSeats,
      sameCourseHorizontal,
      sameCourseVertical,
      sameCourseDiagonal,
      totalViolations,
      integrityPercentage,
      riskLevel: totalViolations === 0 ? 'ZERO_RISK' : totalViolations <= 2 ? 'LOW_RISK' : 'MODERATE_RISK'
    };
  }

  /**
   * Calculate usable seat capacity for a room under a specific anti-cheating strategy
   */
  getRoomUsableCapacity(room, strategy, studentGroups = 1) {
    const rows = room.rows_count || 5;
    const cols = room.cols_count || Math.ceil(room.capacity / rows);
    const maxCapacity = Math.min(room.capacity, rows * cols);
    const isDual = Array.isArray(studentGroups) ? studentGroups.length > 1 : studentGroups > 1;

    if (strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED') {
      const oddColsPerRow = Math.ceil(cols / 2);
      const evenColsPerRow = Math.floor(cols / 2);
      const oddSeats = rows * oddColsPerRow;
      const evenSeats = rows * evenColsPerRow;

      if (isDual) {
        if (Array.isArray(studentGroups) && studentGroups.length >= 2) {
          const n1 = studentGroups[0].students ? studentGroups[0].students.length : (studentGroups[0].count || 0);
          const n2 = studentGroups[1].students ? studentGroups[1].students.length : (studentGroups[1].count || 0);
          return Math.min(n1, oddSeats) + Math.min(n2, evenSeats);
        }
        return maxCapacity;
      } else {
        // Single course: only odd columns (C1, C3, C5...) can be used to maintain empty aisle buffers
        return Math.min(maxCapacity, oddSeats);
      }
    } else if (strategy === 'MULTI_COURSE_INTERLEAVED' && isDual) {
      if (Array.isArray(studentGroups) && studentGroups.length >= 2) {
        const n1 = studentGroups[0].students ? studentGroups[0].students.length : (studentGroups[0].count || 0);
        const n2 = studentGroups[1].students ? studentGroups[1].students.length : (studentGroups[1].count || 0);
        const half1 = Math.ceil(maxCapacity / 2);
        const half2 = Math.floor(maxCapacity / 2);
        return Math.min(n1, half1) + Math.min(n2, half2);
      }
    }

    return maxCapacity;
  }

  /**
   * Calculate total usable capacity across multiple rooms under a strategy
   */
  calculateTotalUsableCapacity(rooms, strategy, studentGroups = []) {
    if (strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED') {
      let totalOddSeats = 0;
      let totalEvenSeats = 0;

      for (const room of rooms) {
        const rows = room.rows_count || 5;
        const cols = room.cols_count || Math.ceil(room.capacity / rows);
        totalOddSeats += rows * Math.ceil(cols / 2);
        totalEvenSeats += rows * Math.floor(cols / 2);
      }

      if (studentGroups && studentGroups.length > 1) {
        const n1 = studentGroups[0].students ? studentGroups[0].students.length : (studentGroups[0].count || 0);
        const n2 = studentGroups[1].students ? studentGroups[1].students.length : (studentGroups[1].count || 0);
        return Math.min(n1, totalOddSeats) + Math.min(n2, totalEvenSeats);
      } else {
        return totalOddSeats;
      }
    } else if (strategy === 'MULTI_COURSE_INTERLEAVED' && studentGroups && studentGroups.length > 1) {
      let totalSeats1 = 0;
      let totalSeats2 = 0;
      for (const room of rooms) {
        const rows = room.rows_count || 5;
        const cols = room.cols_count || Math.ceil(room.capacity / rows);
        const maxCap = Math.min(room.capacity, rows * cols);
        totalSeats1 += Math.ceil(maxCap / 2);
        totalSeats2 += Math.floor(maxCap / 2);
      }
      const n1 = studentGroups[0].students ? studentGroups[0].students.length : (studentGroups[0].count || 0);
      const n2 = studentGroups[1].students ? studentGroups[1].students.length : (studentGroups[1].count || 0);
      return Math.min(n1, totalSeats1) + Math.min(n2, totalSeats2);
    }

    return rooms.reduce((sum, r) => {
      const rows = r.rows_count || 5;
      const cols = r.cols_count || Math.ceil(r.capacity / rows);
      return sum + Math.min(r.capacity, rows * cols);
    }, 0);
  }

  /**
   * Pure Algorithmic Engine: Arrange students into room grids using Anti-Cheating Interleaving
   * @param {Array} rooms - Array of room objects { id, room_number, capacity, rows_count, cols_count }
   * @param {Array} studentGroups - Array of { exam_id, course_id, course_code, students: [...] }
   * @param {string} strategy - 'MULTI_COURSE_INTERLEAVED' | 'CHECKERBOARD_SPACED' | 'SEQUENTIAL'
   */
  generateSeatCoordinates(rooms, studentGroups, strategy = 'MULTI_COURSE_INTERLEAVED') {
    const allocations = [];
    const roomGrids = {};

    // Flatten or balance pools
    const groups = studentGroups.map(g => ({
      exam_id: g.exam_id,
      course_id: g.course_id,
      course_code: g.course_code,
      students: [...g.students]
    }));

    let currentRoomIndex = 0;

    while (groups.some(g => g.students.length > 0) && currentRoomIndex < rooms.length) {
      const room = rooms[currentRoomIndex];
      const rows = room.rows_count || 5;
      const cols = room.cols_count || Math.ceil(room.capacity / rows);
      const grid = {};

      for (let r = 1; r <= rows; r++) {
        grid[r] = {};
        for (let c = 1; c <= cols; c++) {
          grid[r][c] = null;
        }
      }

      let roomSeatsFilled = 0;
      const maxRoomCapacity = Math.min(room.capacity, rows * cols);

      // Fill room seats according to strategy
      if (strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED') {
        // Row-by-row alternate column seating:
        // Course 1 (or single paper): R1: C1, C3, C5... then R2: C1, C3, C5...
        // Course 2 (if 2 papers present): R1: C2, C4, C6... then R2: C2, C4, C6...
        if (groups.length > 1) {
          const primaryGroup = groups[0];
          const secondaryGroup = groups[1];

          for (let r = 1; r <= rows && roomSeatsFilled < maxRoomCapacity; r++) {
            for (let c = 1; c <= cols && roomSeatsFilled < maxRoomCapacity; c++) {
              let candidateGroup = null;

              if (c % 2 !== 0) {
                // Odd columns are strictly for Course 1
                if (primaryGroup && primaryGroup.students.length > 0) {
                  candidateGroup = primaryGroup;
                }
              } else {
                // Even columns are strictly for Course 2
                if (secondaryGroup && secondaryGroup.students.length > 0) {
                  candidateGroup = secondaryGroup;
                }
              }

              if (candidateGroup && candidateGroup.students.length > 0) {
                const student = candidateGroup.students.shift();
                const seatNumber = `${room.room_number}-R${r}-C${c}`;

                const seatData = {
                  exam_id: candidateGroup.exam_id,
                  room_id: room.id,
                  room_number: room.room_number,
                  student_id: student.id,
                  student_name: student.name,
                  enrollment_no: student.enrollment_no,
                  course_id: candidateGroup.course_id,
                  course_code: candidateGroup.course_code,
                  row_num: r,
                  col_num: c,
                  seat_number: seatNumber
                };

                grid[r][c] = seatData;
                allocations.push(seatData);
                roomSeatsFilled++;
              }
            }
          }
        } else {
          // Single paper: Fill odd columns row-by-row (R1: C1, C3, C5 -> R2: C1, C3, C5...)
          // Leaving even columns (C2, C4, C6) empty as buffer aisles
          for (let r = 1; r <= rows && roomSeatsFilled < maxRoomCapacity; r++) {
            for (let c = 1; c <= cols && roomSeatsFilled < maxRoomCapacity; c += 2) {
              const available = groups.find(g => g.students.length > 0);
              if (!available) break;

              const student = available.students.shift();
              const seatNumber = `${room.room_number}-R${r}-C${c}`;

              const seatData = {
                exam_id: available.exam_id,
                room_id: room.id,
                room_number: room.room_number,
                student_id: student.id,
                student_name: student.name,
                enrollment_no: student.enrollment_no,
                course_id: available.course_id,
                course_code: available.course_code,
                row_num: r,
                col_num: c,
                seat_number: seatNumber
              };

              grid[r][c] = seatData;
              allocations.push(seatData);
              roomSeatsFilled++;
            }
          }
        }
      } else {
        // Standard filling (Multi-Course Interleaved or Sequential)
        for (let r = 1; r <= rows && roomSeatsFilled < maxRoomCapacity; r++) {
          for (let c = 1; c <= cols && roomSeatsFilled < maxRoomCapacity; c++) {
            let candidateGroup = null;

            if (groups.length > 1 && strategy === 'MULTI_COURSE_INTERLEAVED') {
              const leftCourseId = c > 1 && grid[r][c - 1] ? grid[r][c - 1].course_id : null;
              const topCourseId = r > 1 && grid[r - 1][c] ? grid[r - 1][c].course_id : null;

              const availableGroups = groups.filter(g => g.students.length > 0);
              if (availableGroups.length === 0) break;

              const nonConflicting = availableGroups.filter(
                g => g.course_id !== leftCourseId && g.course_id !== topCourseId
              );

              if (nonConflicting.length > 0) {
                nonConflicting.sort((a, b) => b.students.length - a.students.length);
                candidateGroup = nonConflicting[0];
              } else {
                // Leave desk vacant so that same-course students are not seated adjacently
                candidateGroup = null;
              }
            } else {
              const available = groups.find(g => g.students.length > 0);
              if (!available) break;
              candidateGroup = available;
            }

            if (candidateGroup && candidateGroup.students.length > 0) {
              const student = candidateGroup.students.shift();
              const seatNumber = `${room.room_number}-R${r}-C${c}`;

              const seatData = {
                exam_id: candidateGroup.exam_id,
                room_id: room.id,
                room_number: room.room_number,
                student_id: student.id,
                student_name: student.name,
                enrollment_no: student.enrollment_no,
                course_id: candidateGroup.course_id,
                course_code: candidateGroup.course_code,
                row_num: r,
                col_num: c,
                seat_number: seatNumber
              };

              grid[r][c] = seatData;
              allocations.push(seatData);
              roomSeatsFilled++;
            }
          }
        }
      }

      // Calculate anti-cheating adjacency metrics for this room
      const metrics = this.calculateAdjacencyMetrics(grid, rows, cols);

      roomGrids[room.id] = {
        room_id: room.id,
        room_number: room.room_number,
        building: room.building,
        floor: room.floor,
        capacity: room.capacity,
        rows_count: rows,
        cols_count: cols,
        seatsFilled: roomSeatsFilled,
        grid,
        metrics
      };

      currentRoomIndex++;
    }

    const remainingUnseated = groups.reduce((acc, g) => acc + g.students.length, 0);

    return {
      allocations,
      roomGrids,
      roomsUtilized: currentRoomIndex,
      remainingUnseated
    };
  }

  /**
   * Main Allocation Engine API
   * Allocates rooms based on capacity, assigns student seats, and persists to database
   */
  async allocateSeats({ exam_ids, room_ids = null, strategy = 'MULTI_COURSE_INTERLEAVED', clearExisting = true, userId = null }) {
    if (!exam_ids || (Array.isArray(exam_ids) && exam_ids.length === 0)) {
      const err = new Error('At least one exam_id is required for seat allocation.');
      err.statusCode = 400;
      throw err;
    }

    const examIdList = Array.isArray(exam_ids) ? exam_ids : [exam_ids];

    // 1. Fetch exam and course details
    const placeholders = examIdList.map(() => '?').join(',');
    const [exams] = await query(
      `SELECT e.id AS exam_id, e.exam_name, e.exam_date, e.start_time, e.end_time,
              c.id AS course_id, c.course_code, c.course_name, c.department, c.semester
       FROM exams e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id IN (${placeholders})`,
      examIdList
    );

    if (exams.length === 0) {
      const err = new Error('No valid exams found for the provided IDs.');
      err.statusCode = 404;
      throw err;
    }

    // 2. Fetch eligible students for each exam based on course department and semester
    const studentGroups = [];
    let totalStudentsToSeat = 0;

    for (const exam of exams) {
      // 1. Prioritize students enrolled in this course via student_courses
      let [students] = await query(
        `SELECT s.id, s.enrollment_no, s.name, s.email, s.department, s.semester, s.program
         FROM students s
         JOIN student_courses sc ON s.id = sc.student_id
         WHERE sc.course_id = ?
         ORDER BY s.enrollment_no ASC`,
        [exam.course_id]
      );

      // 2. Fallback to department & semester if no specific student_courses mapped
      if (students.length === 0) {
        const [fallbackStudents] = await query(
          `SELECT id, enrollment_no, name, email, department, semester, program
           FROM students
           WHERE department = ? AND semester = ?
           ORDER BY enrollment_no ASC`,
          [exam.department, exam.semester]
        );
        students = fallbackStudents;
      }

      studentGroups.push({
        exam_id: exam.exam_id,
        course_id: exam.course_id,
        course_code: exam.course_code,
        course_name: exam.course_name,
        students
      });

      totalStudentsToSeat += students.length;
    }

    if (totalStudentsToSeat === 0) {
      const err = new Error('No eligible students found in the department & semester corresponding to the selected exam(s).');
      err.statusCode = 400;
      throw err;
    }

    // 3. Select and validate rooms
    let roomsToUse = [];

    if (room_ids && Array.isArray(room_ids)) {
      if (room_ids.length === 0) {
        const err = new Error("In this much room this strategy can't be implemented. Please select at least one classroom under Manual Room Selection.");
        err.statusCode = 400;
        throw err;
      }
      const roomPlaceholders = room_ids.map(() => '?').join(',');
      const [fetchedRooms] = await query(
        `SELECT id, room_number, building, floor, capacity, rows_count, cols_count, has_camera
         FROM rooms
         WHERE id IN (${roomPlaceholders}) AND is_available = TRUE
         ORDER BY capacity DESC`,
        room_ids
      );
      roomsToUse = fetchedRooms;
    } else {
      // Auto-select available rooms based on required capacity
      const [availableRooms] = await query(
        `SELECT id, room_number, building, floor, capacity, rows_count, cols_count, has_camera
         FROM rooms
         WHERE is_available = TRUE
         ORDER BY capacity DESC, room_number ASC`
      );

      for (const rm of availableRooms) {
        roomsToUse.push(rm);
        const currentUsable = this.calculateTotalUsableCapacity(roomsToUse, strategy, studentGroups);
        if (currentUsable >= totalStudentsToSeat) {
          break; // Enough capacity selected with strategy considered
        }
      }
    }

    const totalCapacity = roomsToUse.reduce((sum, r) => sum + r.capacity, 0);

    // Calculate total usable capacity across selected rooms under this strategy
    const totalUsableCapacity = this.calculateTotalUsableCapacity(roomsToUse, strategy, studentGroups);

    const isManualSelection = room_ids && Array.isArray(room_ids) && room_ids.length > 0;
    const strategyLabel = strategy === 'ALTERNATE_COLUMNS' || strategy === 'CHECKERBOARD_SPACED'
      ? (studentGroups.length > 1 ? 'Alternate Columns Side-by-Side' : 'Alternate Column Spacing (Empty Aisles)')
      : strategy === 'MULTI_COURSE_INTERLEAVED'
        ? 'Checkerboard Interleaving'
        : 'Sequential Fill';

    if (roomsToUse.length === 0 || totalUsableCapacity < totalStudentsToSeat) {
      const err = new Error(
        `In this much room this strategy can't be implemented. ${isManualSelection ? 'Selected room(s)' : 'Available room(s)'} provide only ${totalUsableCapacity} usable seat(s) under the '${strategyLabel}' strategy, but ${totalStudentsToSeat} student(s) need to be seated. Please select more rooms or choose a different strategy.`
      );
      err.statusCode = 400;
      throw err;
    }

    // 4. Run the pure Anti-Cheating Seating Allocation Engine
    const { allocations, roomGrids, roomsUtilized, remainingUnseated } = this.generateSeatCoordinates(
      roomsToUse,
      studentGroups,
      strategy
    );

    if (remainingUnseated > 0) {
      const err = new Error(
        `In this much room this strategy can't be implemented. ${remainingUnseated} student(s) could not be seated under the '${strategyLabel}' strategy with the selected room(s). Please select more rooms or choose a different strategy.`
      );
      err.statusCode = 400;
      throw err;
    }

    if (allocations.length === 0) {
      const err = new Error('Could not generate seat allocations with the specified parameters.');
      err.statusCode = 400;
      throw err;
    }

    // 5. Persist to MySQL database with atomic cleanup
    if (clearExisting) {
      await query(
        `DELETE FROM seat_allocations WHERE exam_id IN (${placeholders})`,
        examIdList
      );
      const roomIdsToClear = roomsToUse.map((r) => r.id);
      if (roomIdsToClear.length > 0) {
        const roomPh = roomIdsToClear.map(() => '?').join(',');
        await query(
          `DELETE FROM seat_allocations WHERE room_id IN (${roomPh})`,
          roomIdsToClear
        );
      }
    }

    // Insert allocations in batches
    for (const alloc of allocations) {
      await query(
        `INSERT INTO seat_allocations (exam_id, room_id, student_id, row_num, col_num, seat_number)
         VALUES (?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
           room_id = VALUES(room_id),
           row_num = VALUES(row_num),
           col_num = VALUES(col_num),
           seat_number = VALUES(seat_number)`,
        [alloc.exam_id, alloc.room_id, alloc.student_id, alloc.row_num, alloc.col_num, alloc.seat_number]
      );
    }

    // 6. Log in Audit Trail
    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, module, details)
         VALUES (?, ?, 'SEAT_ALLOCATION', ?)`,
        [
          userId || null,
          'ALLOCATE_SEATS',
          `Allocated ${allocations.length} seats across ${roomsUtilized} rooms for exam(s): [${examIdList.join(', ')}] using ${strategy} strategy.`
        ]
      );
    } catch (auditErr) {
      console.warn('Audit logging note:', auditErr.message);
    }

    // Aggregate summary metrics
    const totalViolations = Object.values(roomGrids).reduce(
      (sum, rg) => sum + (rg.metrics ? rg.metrics.totalViolations : 0),
      0
    );

    return {
      success: true,
      summary: {
        totalStudentsToSeat,
        totalSeatsAllocated: allocations.length,
        remainingUnseated,
        roomsUtilized,
        totalCapacity,
        capacityUtilizationRate: totalCapacity > 0 ? `${Math.round((allocations.length / totalCapacity) * 100)}%` : '0%',
        antiCheatingIntegrityRate: totalViolations === 0 ? '100% (Zero Adjacency Conflict)' : `${Math.max(0, 100 - (totalViolations * 5))}%`,
        strategyApplied: strategy
      },
      roomGrids,
      allocations
    };
  }

  /**
   * Get seating arrangement for a specific exam
   */
  async getSeatingByExamId(examId) {
    if (!examId) {
      const err = new Error('examId is required.');
      err.statusCode = 400;
      throw err;
    }

    const ids = String(examId)
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n));
    if (ids.length === 0) {
      const err = new Error('Valid examId is required.');
      err.statusCode = 400;
      throw err;
    }

    if (ids.length === 1) {
      const [coExams] = await query(
        `SELECT DISTINCT sa2.exam_id
         FROM seat_allocations sa2
         WHERE sa2.room_id IN (SELECT DISTINCT sa1.room_id FROM seat_allocations sa1 WHERE sa1.exam_id = ?)`,
        [ids[0]]
      );
      if (coExams.length > 1) {
        ids.splice(0, ids.length, ...coExams.map((c) => c.exam_id));
      }
    }

    const ph = ids.map(() => '?').join(',');

    const [allocations] = await query(
      `SELECT sa.id, sa.exam_id, sa.room_id, sa.student_id, sa.row_num, sa.col_num, sa.seat_number,
              s.enrollment_no, s.name AS student_name, s.email AS student_email, s.department, s.semester,
              r.room_number, r.building, r.floor, r.capacity, r.rows_count, r.cols_count,
              e.exam_name, e.exam_date, e.start_time, e.end_time,
              c.course_code, c.course_name
       FROM seat_allocations sa
       JOIN students s ON sa.student_id = s.id
       JOIN rooms r ON sa.room_id = r.id
       JOIN exams e ON sa.exam_id = e.id
       JOIN courses c ON e.course_id = c.id
       WHERE sa.exam_id IN (${ph})
       ORDER BY r.room_number ASC, sa.row_num ASC, sa.col_num ASC`,
      ids
    );

    // Group by rooms
    const roomsMap = {};
    for (const alloc of allocations) {
      if (!roomsMap[alloc.room_id]) {
        roomsMap[alloc.room_id] = {
          room_id: alloc.room_id,
          room_number: alloc.room_number,
          building: alloc.building,
          floor: alloc.floor,
          capacity: alloc.capacity,
          rows_count: alloc.rows_count,
          cols_count: alloc.cols_count,
          students: []
        };
      }
      roomsMap[alloc.room_id].students.push(alloc);
    }

    return {
      exam_id: ids.length === 1 ? ids[0] : ids,
      totalAllocated: allocations.length,
      rooms: Object.values(roomsMap),
      allocations
    };
  }

  /**
   * Get complete 2D layout grid for a specific room (visualizer endpoint)
   */
  async getRoomLayout(roomId, examId = null, strict = false) {
    if (!roomId) {
      const err = new Error('roomId is required.');
      err.statusCode = 400;
      throw err;
    }

    const [rooms] = await query('SELECT * FROM rooms WHERE id = ?', [roomId]);
    if (rooms.length === 0) {
      const err = new Error(`Room with ID ${roomId} not found.`);
      err.statusCode = 404;
      throw err;
    }

    const room = rooms[0];
    const rows = room.rows_count || 5;
    const cols = room.cols_count || Math.ceil(room.capacity / rows);

    let sql = `
      SELECT sa.id, sa.exam_id, sa.room_id, sa.student_id, sa.row_num, sa.col_num, sa.seat_number,
             s.enrollment_no, s.name AS student_name, s.department,
             c.course_code, c.course_name,
             e.exam_name
      FROM seat_allocations sa
      JOIN students s ON sa.student_id = s.id
      JOIN exams e ON sa.exam_id = e.id
      JOIN courses c ON e.course_id = c.id
      WHERE sa.room_id = ?
    `;
    const params = [roomId];

    if (examId) {
      const ids = String(examId)
        .split(',')
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => !isNaN(n));

      if (ids.length > 0) {
        if (strict || ids.length > 1) {
          const ph = ids.map(() => '?').join(',');
          sql += ` AND sa.exam_id IN (${ph})`;
          params.push(...ids);
        } else {
          // If a single examId is queried and not strict, also include any co-allocated exams sharing this room
          sql += ` AND (sa.exam_id = ? OR sa.exam_id IN (
            SELECT DISTINCT sa2.exam_id FROM seat_allocations sa2
            JOIN exams e2 ON sa2.exam_id = e2.id
            JOIN exams e1 ON e1.id = ?
            WHERE sa2.room_id = ? AND (e2.exam_date = e1.exam_date OR e2.id = e1.id)
          ))`;
          params.push(ids[0], ids[0], roomId);
        }
      }
    }

    sql += ' ORDER BY sa.row_num ASC, sa.col_num ASC';

    const [seats] = await query(sql, params);

    // Build 2D matrix
    const matrix = [];
    const seatMap = {};
    for (const seat of seats) {
      seatMap[`${seat.row_num}_${seat.col_num}`] = seat;
    }

    for (let r = 1; r <= rows; r++) {
      const row = [];
      for (let c = 1; c <= cols; c++) {
        const found = seatMap[`${r}_${c}`] || null;
        row.push(found ? { ...found, isOccupied: true } : {
          row_num: r,
          col_num: c,
          seat_number: `${room.room_number}-R${r}-C${c}`,
          isOccupied: false
        });
      }
      matrix.push(row);
    }

    return {
      room,
      rows,
      cols,
      totalSeats: rows * cols,
      occupiedSeats: seats.length,
      occupancyRate: `${Math.round((seats.length / room.capacity) * 100)}%`,
      matrix
    };
  }

  /**
   * Clear allocations for an exam
   */
  async clearAllocations(examId, userId = null) {
    if (!examId) {
      const err = new Error('examId is required.');
      err.statusCode = 400;
      throw err;
    }

    const ids = String(examId)
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n));

    if (ids.length === 0) {
      return { success: true, deletedCount: 0 };
    }

    const ph = ids.map(() => '?').join(',');
    const [result] = await query(`DELETE FROM seat_allocations WHERE exam_id IN (${ph})`, ids);

    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, module, details)
         VALUES (?, 'CLEAR_SEAT_ALLOCATIONS', 'SEAT_ALLOCATION', ?)`,
        [userId || null, `Cleared seat allocations for exam ID(s) [${ids.join(', ')}]. Affected rows: ${result.affectedRows}`]
      );
    } catch (e) {
      // Ignore audit fail
    }

    return { success: true, deletedCount: result.affectedRows };
  }

  /**
   * Helper: List all exams with their current allocation status
   */
  async getExamsWithAllocationStatus() {
    const [exams] = await query(`
      SELECT e.id, e.exam_name, e.exam_type, e.exam_date, e.start_time, e.end_time, e.status,
             c.id AS course_id, c.course_code, c.course_name, c.department, c.semester,
             COUNT(DISTINCT sa.id) AS allocated_seats_count,
             COUNT(DISTINCT sa.room_id) AS allocated_rooms_count,
             GROUP_CONCAT(DISTINCT r.room_number ORDER BY r.room_number SEPARATOR ', ') AS allocated_room_numbers,
             COALESCE(
               NULLIF((SELECT COUNT(*) FROM student_courses sc WHERE sc.course_id = c.id), 0),
               (SELECT COUNT(*) FROM students s WHERE s.department = c.department AND s.semester = c.semester)
             ) AS eligible_students_count
      FROM exams e
      JOIN courses c ON e.course_id = c.id
      LEFT JOIN seat_allocations sa ON e.id = sa.exam_id
      LEFT JOIN rooms r ON sa.room_id = r.id
      GROUP BY e.id, c.id
      ORDER BY e.exam_date ASC, e.start_time ASC
    `);

    return exams.map(e => ({
      ...e,
      allocationStatus: e.allocated_seats_count === 0
        ? 'PENDING'
        : e.allocated_seats_count >= e.eligible_students_count
        ? 'FULLY_ALLOCATED'
        : 'PARTIALLY_ALLOCATED'
    }));
  }

  /**
   * Get all enrolled students for an exam with their seat status (for Manual Seating Studio)
   */
  async getEnrolledStudentsForExam(examId) {
    if (!examId) throw new Error('examId is required');

    const ids = String(examId)
      .split(',')
      .map((x) => parseInt(x.trim(), 10))
      .filter((n) => !isNaN(n));
    if (ids.length === 0) throw new Error('Valid examId is required');

    const ph = ids.map(() => '?').join(',');
    const [exams] = await query(
      `SELECT e.id, e.course_id, c.department, c.semester, c.course_code, c.course_name
       FROM exams e
       JOIN courses c ON e.course_id = c.id
       WHERE e.id IN (${ph})`,
      ids
    );
    if (exams.length === 0) throw new Error('Exam not found');
    const exam = exams[0];

    const allStudents = [];
    for (const ex of exams) {
      // Check student_courses first
      let [students] = await query(
        `SELECT s.id, s.enrollment_no, s.name, s.email, s.department, s.semester, s.program,
                sa.id AS allocation_id, sa.room_id, sa.row_num, sa.col_num, sa.seat_number,
                r.room_number,
                ? AS exam_id, ? AS course_code, ? AS course_name
         FROM students s
         JOIN student_courses sc ON s.id = sc.student_id
         LEFT JOIN seat_allocations sa ON s.id = sa.student_id AND sa.exam_id = ?
         LEFT JOIN rooms r ON sa.room_id = r.id
         WHERE sc.course_id = ?
         ORDER BY s.enrollment_no ASC`,
        [ex.id, ex.course_code, ex.course_name, ex.id, ex.course_id]
      );

      if (students.length === 0) {
        // Fallback to department & semester
        const [fallback] = await query(
          `SELECT s.id, s.enrollment_no, s.name, s.email, s.department, s.semester, s.program,
                  sa.id AS allocation_id, sa.room_id, sa.row_num, sa.col_num, sa.seat_number,
                  r.room_number,
                  ? AS exam_id, ? AS course_code, ? AS course_name
           FROM students s
           LEFT JOIN seat_allocations sa ON s.id = sa.student_id AND sa.exam_id = ?
           LEFT JOIN rooms r ON sa.room_id = r.id
           WHERE s.department = ? AND s.semester = ?
           ORDER BY s.enrollment_no ASC`,
          [ex.id, ex.course_code, ex.course_name, ex.id, ex.department, ex.semester]
        );
        students = fallback;
      }
      allStudents.push(...students);
    }

    return {
      exam,
      exams,
      totalStudents: allStudents.length,
      allocatedCount: allStudents.filter(s => s.seat_number).length,
      unallocatedCount: allStudents.filter(s => !s.seat_number).length,
      students: allStudents.map(s => ({
        ...s,
        isAllocated: !!s.seat_number
      }))
    };
  }

  /**
   * Save a batch of manual seat assignments for a room
   */
  async saveManualAllocation({ exam_id, room_id, assignments, userId }) {
    if (!exam_id || !room_id) {
      const err = new Error('exam_id and room_id are required.');
      err.statusCode = 400;
      throw err;
    }

    // Support array or comma-separated exam_ids
    const examIds = (Array.isArray(exam_id) ? exam_id : String(exam_id).split(','))
      .map((x) => parseInt(String(x).trim(), 10))
      .filter((n) => !isNaN(n));

    // Also collect any exam_ids specified inside individual assignments
    if (assignments && Array.isArray(assignments)) {
      for (const a of assignments) {
        if (a.exam_id) {
          const parsed = parseInt(a.exam_id, 10);
          if (!isNaN(parsed) && !examIds.includes(parsed)) {
            examIds.push(parsed);
          }
        }
      }
    }

    if (examIds.length > 0) {
      const ph = examIds.map(() => '?').join(',');
      await query(
        `DELETE FROM seat_allocations WHERE room_id = ? AND exam_id IN (${ph})`,
        [room_id, ...examIds]
      );
    }

    let inserted = 0;
    if (assignments && Array.isArray(assignments)) {
      for (const a of assignments) {
        if (!a.student_id || !a.row_num || !a.col_num) continue;
        const aExamId = a.exam_id ? parseInt(a.exam_id, 10) : (examIds[0] || parseInt(exam_id, 10));
        const seatNo = a.seat_number || `R${a.row_num}-C${a.col_num}`;
        await query(
          `INSERT INTO seat_allocations (exam_id, room_id, student_id, row_num, col_num, seat_number)
           VALUES (?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE student_id = VALUES(student_id), seat_number = VALUES(seat_number), exam_id = VALUES(exam_id)`,
          [aExamId, room_id, a.student_id, a.row_num, a.col_num, seatNo]
        );
        inserted++;
      }
    }

    try {
      await query(
        `INSERT INTO audit_logs (user_id, action, module, details)
         VALUES (?, 'MANUAL_SEAT_ALLOCATION', 'SEAT_ALLOCATION', ?)`,
        [userId || null, `Manually assigned ${inserted} seats in room ID ${room_id} for exam(s) ${examIds.join(',')}.`]
      );
    } catch (e) {
      // Ignore audit fail
    }

    return { success: true, savedCount: inserted };
  }

  /**
   * Assign or move a single student to a seat in real-time
   */
  async assignSingleSeat({ exam_id, room_id, student_id, row_num, col_num, seat_number, userId }) {
    if (!exam_id || !room_id || !student_id || !row_num || !col_num) {
      const err = new Error('exam_id, room_id, student_id, row_num, and col_num are required.');
      err.statusCode = 400;
      throw err;
    }

    // Remove any previous seat this student has for this exam
    await query('DELETE FROM seat_allocations WHERE exam_id = ? AND student_id = ?', [exam_id, student_id]);

    // Remove any seat currently occupying this desk (prevent double-booking)
    await query('DELETE FROM seat_allocations WHERE room_id = ? AND row_num = ? AND col_num = ?', [room_id, row_num, col_num]);

    // Insert seat
    await query(
      `INSERT INTO seat_allocations (exam_id, room_id, student_id, row_num, col_num, seat_number)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [exam_id, room_id, student_id, row_num, col_num, seat_number]
    );

    return { success: true, seat_number };
  }

  /**
   * Unseat/remove student from a desk
   */
  async unassignSingleSeat({ exam_id, room_id, row_num, col_num, userId }) {
    if (!room_id || !row_num || !col_num) {
      const err = new Error('room_id, row_num, and col_num are required.');
      err.statusCode = 400;
      throw err;
    }

    if (exam_id) {
      await query(
        'DELETE FROM seat_allocations WHERE room_id = ? AND row_num = ? AND col_num = ? AND (exam_id = ? OR 1=1)',
        [room_id, row_num, col_num, exam_id]
      );
    } else {
      await query(
        'DELETE FROM seat_allocations WHERE room_id = ? AND row_num = ? AND col_num = ?',
        [room_id, row_num, col_num]
      );
    }

    return { success: true };
  }

  /**
   * Quick Seed Demo Exams if none exist yet, allowing instant testing of the seating engine
   */
  async seedDemoExamsIfEmpty() {
    const [existing] = await query('SELECT COUNT(*) AS cnt FROM exams');
    if (existing[0].cnt > 0) {
      return { seeded: false, message: 'Exams already exist in the database.' };
    }

    const [courses] = await query('SELECT id, course_code, course_name, department, semester FROM courses LIMIT 4');
    if (courses.length === 0) {
      return { seeded: false, message: 'No courses available to generate demo exams. Please populate courses first.' };
    }

    const demoDate = new Date();
    demoDate.setDate(demoDate.getDate() + 7);
    const dateStr = demoDate.toISOString().split('T')[0];

    const seededExams = [];
    for (let i = 0; i < courses.length; i++) {
      const crs = courses[i];
      const [res] = await query(
        `INSERT INTO exams (course_id, exam_name, exam_type, exam_date, start_time, end_time, duration_minutes, status)
         VALUES (?, ?, 'END_TERM', ?, '09:30:00', '12:30:00', 180, 'SCHEDULED')`,
        [crs.id, `${crs.course_name} (${crs.course_code}) Final Exam`, dateStr]
      );
      seededExams.push(res.insertId);
    }

    return { seeded: true, message: `Created ${seededExams.length} demo exams for testing.`, examIds: seededExams };
  }
}

module.exports = new SeatingService();
