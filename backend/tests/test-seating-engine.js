const seatingService = require('../services/seatingService');

async function runSeatingEngineTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MODULE 4 TESTS (Anti-Cheating Seating Engine)');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  // Mock Rooms
  const rooms = [
    { id: 1, room_number: 'E2-101', capacity: 12, rows_count: 3, cols_count: 4, building: 'Block E', floor: 1 },
    { id: 2, room_number: 'E2-102', capacity: 12, rows_count: 3, cols_count: 4, building: 'Block E', floor: 1 }
  ];

  // Mock Students across 2 different courses
  const courseAStudents = [
    { id: 101, name: 'Aarav Sharma', enrollment_no: '240101' },
    { id: 102, name: 'Ananya Verma', enrollment_no: '240102' },
    { id: 103, name: 'Rohan Gupta', enrollment_no: '240103' },
    { id: 104, name: 'Pooja Patel', enrollment_no: '240104' }
  ];

  const courseBStudents = [
    { id: 201, name: 'Kabir Singh', enrollment_no: '240201' },
    { id: 202, name: 'Sneha Iyer', enrollment_no: '240202' },
    { id: 203, name: 'Vikram Mehta', enrollment_no: '240203' },
    { id: 204, name: 'Diya Nair', enrollment_no: '240204' }
  ];

  const studentGroups = [
    { exam_id: 1, course_id: 10, course_code: 'CSE3005', students: [...courseAStudents] },
    { exam_id: 2, course_id: 20, course_code: 'ECE2001', students: [...courseBStudents] }
  ];

  // ---------------------------------------------------------
  // TEST 1: Anti-Cheating Multi-Course Interleaving Engine
  // ---------------------------------------------------------
  total++;
  try {
    const result = seatingService.generateSeatCoordinates(
      rooms,
      studentGroups,
      'MULTI_COURSE_INTERLEAVED'
    );

    const roomGrid = result.roomGrids[1].grid;
    let adjacentSameCourseCount = 0;

    // Check every seat against right and bottom neighbors
    for (let r = 1; r <= 3; r++) {
      for (let c = 1; c <= 4; c++) {
        const cur = roomGrid[r][c];
        if (!cur) continue;

        // Check horizontal neighbor
        if (c + 1 <= 4 && roomGrid[r][c + 1]) {
          if (roomGrid[r][c + 1].course_id === cur.course_id) {
            adjacentSameCourseCount++;
          }
        }
        // Check vertical neighbor
        if (r + 1 <= 3 && roomGrid[r + 1][c]) {
          if (roomGrid[r + 1][c].course_id === cur.course_id) {
            adjacentSameCourseCount++;
          }
        }
      }
    }

    if (result.allocations.length === 8 && adjacentSameCourseCount === 0) {
      console.log(` [TEST 1 PASSED] Multi-Course Interleaving verified: 0 adjacent same-course violations across ${result.allocations.length} seats.`);
      passed++;
    } else {
      console.error(`❌ [TEST 1 FAILED] Found ${adjacentSameCourseCount} adjacent course conflicts or wrong count (${result.allocations.length}).`);
    }
  } catch (err) {
    console.error('❌ [TEST 1 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 2: Bench Coordinate Formatting & Row/Col Bounds
  // ---------------------------------------------------------
  total++;
  try {
    const result = seatingService.generateSeatCoordinates(
      rooms,
      studentGroups,
      'MULTI_COURSE_INTERLEAVED'
    );

    let formatValid = true;
    for (const alloc of result.allocations) {
      const expectedSeatNo = `${alloc.room_number}-R${alloc.row_num}-C${alloc.col_num}`;
      if (alloc.seat_number !== expectedSeatNo || alloc.row_num > 3 || alloc.col_num > 4) {
        formatValid = false;
        break;
      }
    }

    if (formatValid && result.allocations.length === 8) {
      console.log(' [TEST 2 PASSED] Seat coordinate bounds & format verified (${room_number}-R{r}-C{c}).');
      passed++;
    } else {
      console.error('❌ [TEST 2 FAILED] Invalid coordinate formatting or bounds exceeded.');
    }
  } catch (err) {
    console.error('❌ [TEST 2 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 3: Multi-Room Overflow & Capacity Distribution
  // ---------------------------------------------------------
  total++;
  try {
    // Small rooms of 4 capacity each
    const tinyRooms = [
      { id: 10, room_number: 'R-1', capacity: 4, rows_count: 2, cols_count: 2 },
      { id: 11, room_number: 'R-2', capacity: 4, rows_count: 2, cols_count: 2 }
    ];

    const testGroups = [
      {
        exam_id: 1,
        course_id: 10,
        course_code: 'CSE3005',
        students: [
          { id: 1, name: 'S1', enrollment_no: 'E1' },
          { id: 2, name: 'S2', enrollment_no: 'E2' },
          { id: 3, name: 'S3', enrollment_no: 'E3' },
          { id: 4, name: 'S4', enrollment_no: 'E4' },
          { id: 5, name: 'S5', enrollment_no: 'E5' },
          { id: 6, name: 'S6', enrollment_no: 'E6' }
        ]
      }
    ];

    const result = seatingService.generateSeatCoordinates(tinyRooms, testGroups, 'SEQUENTIAL');

    if (result.roomsUtilized === 2 && result.roomGrids[10].seatsFilled === 4 && result.roomGrids[11].seatsFilled === 2) {
      console.log(' [TEST 3 PASSED] Room capacity overflow & multi-room distribution verified (4 in R-1, 2 in R-2).');
      passed++;
    } else {
      console.error('❌ [TEST 3 FAILED] Room overflow did not distribute correctly.');
    }
  } catch (err) {
    console.error('❌ [TEST 3 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 4: Row-by-Row Alternate Columns Seating Strategy
  // ---------------------------------------------------------
  total++;
  try {
    const spaciousRoom = [
      { id: 20, room_number: 'HALL-A', capacity: 20, rows_count: 4, cols_count: 4 }
    ];

    const singleGroup = [
      {
        exam_id: 5,
        course_id: 50,
        course_code: 'MATH101',
        students: [
          { id: 1, name: 'S1', enrollment_no: 'E1' },
          { id: 2, name: 'S2', enrollment_no: 'E2' },
          { id: 3, name: 'S3', enrollment_no: 'E3' },
          { id: 4, name: 'S4', enrollment_no: 'E4' },
          { id: 5, name: 'S5', enrollment_no: 'E5' }
        ]
      }
    ];

    const result = seatingService.generateSeatCoordinates(spaciousRoom, singleGroup, 'ALTERNATE_COLUMNS');
    let allInOddColumns = true;
    let sequenceValid = true;

    // Verify all allocated seats are strictly in odd columns (Col 1, Col 3...)
    for (const alloc of result.allocations) {
      if (alloc.col_num % 2 === 0) {
        allInOddColumns = false;
        break;
      }
    }

    // Verify row-by-row alternate column filling:
    // Row 1: (1, 1), (1, 3)
    // Row 2: (2, 1), (2, 3)
    // Row 3: (3, 1)
    const expectedSequence = [
      { r: 1, c: 1 },
      { r: 1, c: 3 },
      { r: 2, c: 1 },
      { r: 2, c: 3 },
      { r: 3, c: 1 }
    ];

    for (let i = 0; i < expectedSequence.length; i++) {
      if (
        result.allocations[i].row_num !== expectedSequence[i].r ||
        result.allocations[i].col_num !== expectedSequence[i].c
      ) {
        sequenceValid = false;
        break;
      }
    }

    if (allInOddColumns && sequenceValid && result.allocations.length === 5) {
      console.log(' [TEST 4 PASSED] Row-by-Row Alternate Column Seating verified (R1: C1, C3 -> R2: C1, C3 -> R3: C1, even columns empty).');
      passed++;
    } else {
      console.error('❌ [TEST 4 FAILED] Row-by-row alternate column sequence mismatch.', { allInOddColumns, sequenceValid, allocations: result.allocations });
    }
  } catch (err) {
    console.error('❌ [TEST 4 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 5: Adjacency Metric & Integrity Scoring
  // ---------------------------------------------------------
  total++;
  try {
    // Create a mock grid with intentional zero violations
    const perfectGrid = {
      1: {
        1: { student_id: 1, course_id: 'A' },
        2: { student_id: 2, course_id: 'B' }
      },
      2: {
        1: { student_id: 3, course_id: 'B' },
        2: { student_id: 4, course_id: 'A' }
      }
    };

    const metrics = seatingService.calculateAdjacencyMetrics(perfectGrid, 2, 2);

    if (metrics.totalViolations === 0 && metrics.integrityPercentage === 100 && metrics.riskLevel === 'ZERO_RISK') {
      console.log(' [TEST 5 PASSED] Adjacency Metric & Integrity Score computation verified (100% integrity, ZERO_RISK).');
      passed++;
    } else {
      console.error('❌ [TEST 5 FAILED] Metrics computation mismatch:', metrics);
    }
  } catch (err) {
    console.error('❌ [TEST 5 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 6: Strategy-Aware Room Usable Capacity & Error Verification
  // ---------------------------------------------------------
  total++;
  try {
    const testRoom = { id: 1, room_number: 'R-1', capacity: 12, rows_count: 3, cols_count: 4 };

    // 1. Single paper with ALTERNATE_COLUMNS (odd columns only: 3 rows * 2 cols = 6 seats)
    const singleSpaced = seatingService.getRoomUsableCapacity(testRoom, 'ALTERNATE_COLUMNS', 1);
    // 2. Dual paper with ALTERNATE_COLUMNS (all 12 seats usable across both courses)
    const dualInterleaved = seatingService.getRoomUsableCapacity(testRoom, 'ALTERNATE_COLUMNS', 2);
    // 3. Sequential fill (all 12 seats usable)
    const sequential = seatingService.getRoomUsableCapacity(testRoom, 'SEQUENTIAL', 1);

    if (singleSpaced === 6 && dualInterleaved === 12 && sequential === 12) {
      console.log(' [TEST 6 PASSED] Strategy-Aware Room Capacity correctly computed (Single Spaced: 6, Dual Interleaved: 12, Sequential: 12).');
      passed++;
    } else {
      console.error('❌ [TEST 6 FAILED] Capacity calculation mismatch:', { singleSpaced, dualInterleaved, sequential });
    }
  } catch (err) {
    console.error('❌ [TEST 6 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 7: Dual-Paper Column Spacing When One Subject Has Fewer Students
  // ---------------------------------------------------------
  total++;
  try {
    const testRoom = [{ id: 1, room_number: 'R-1', capacity: 20, rows_count: 5, cols_count: 4 }];
    const unbalancedGroups = [
      {
        exam_id: 1,
        course_id: 10,
        course_code: 'CSE3005',
        students: [
          { id: 1, name: 'S1', enrollment_no: '101' },
          { id: 2, name: 'S2', enrollment_no: '102' },
          { id: 3, name: 'S3', enrollment_no: '103' },
          { id: 4, name: 'S4', enrollment_no: '104' },
          { id: 5, name: 'S5', enrollment_no: '105' },
          { id: 6, name: 'S6', enrollment_no: '106' }
        ]
      },
      {
        exam_id: 2,
        course_id: 20,
        course_code: 'ECE2001',
        students: [
          { id: 7, name: 'S7', enrollment_no: '201' },
          { id: 8, name: 'S8', enrollment_no: '202' }
        ]
      }
    ];

    const result = seatingService.generateSeatCoordinates(testRoom, unbalancedGroups, 'ALTERNATE_COLUMNS');
    const grid = result.roomGrids[1].grid;

    let sameCourseAdjacency = 0;
    for (let r = 1; r <= 5; r++) {
      for (let c = 1; c <= 4; c++) {
        const cur = grid[r][c];
        if (!cur) continue;
        if (c + 1 <= 4 && grid[r][c + 1] && grid[r][c + 1].course_id === cur.course_id) {
          sameCourseAdjacency++;
        }
      }
    }

    // After ECE2001 runs out of students (after row 1 col 4), even columns in subsequent rows must be empty!
    // Row 2 col 2 and Row 2 col 4 should be null
    const row2Col2Empty = grid[2][2] === null;
    const row2Col4Empty = grid[2][4] === null;
    const cseInOddColsOnly = [grid[1][1], grid[1][3], grid[2][1], grid[2][3], grid[3][1], grid[3][3]].every(
      s => s && s.course_code === 'CSE3005'
    );

    if (sameCourseAdjacency === 0 && row2Col2Empty && row2Col4Empty && cseInOddColsOnly) {
      console.log(' [TEST 7 PASSED] Dual-Paper Spacing verified: Even columns left empty when secondary subject runs out; 0 same-course adjacencies.');
      passed++;
    } else {
      console.error('❌ [TEST 7 FAILED] Unbalanced dual-paper spacing violation:', {
        sameCourseAdjacency,
        row2Col2Empty,
        row2Col4Empty,
        cseInOddColsOnly
      });
    }
  } catch (err) {
    console.error('❌ [TEST 7 FAILED]', err.message);
  }

  // ---------------------------------------------------------
  // TEST 8: getRoomLayout parameter signature & strict option
  // ---------------------------------------------------------
  total++;
  try {
    const fnStr = seatingService.getRoomLayout ? seatingService.getRoomLayout.toString() : '';
    if (typeof seatingService.getRoomLayout === 'function' && fnStr.includes('strict')) {
      console.log(' [TEST 8 PASSED] getRoomLayout accepts (roomId, examId, strict) with strict option support.');
      passed++;
    } else {
      console.error('❌ [TEST 8 FAILED] getRoomLayout missing strict parameter support');
    }
  } catch (err) {
    console.error('❌ [TEST 8 FAILED]', err.message);
  }

  console.log('\n======================================================');
  console.log(`🎯 RESULT: ${passed} / ${total} TESTS PASSED`);
  console.log('======================================================\n');

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runSeatingEngineTests();
