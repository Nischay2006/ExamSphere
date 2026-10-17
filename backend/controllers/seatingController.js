const seatingService = require('../services/seatingService');

/**
 * Thin Seating Allocation Controller
 * Follows 3-Tier Layered Architecture: validates input, delegates to SeatingService, formats HTTP responses
 */

/**
 * POST /api/allocations/seating
 * Allocate rooms based on capacity, assign student seats, and generate seating arrangements
 */
async function allocateSeats(req, res) {
  try {
    const { exam_ids, room_ids, strategy, clearExisting } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.allocateSeats({
      exam_ids,
      room_ids,
      strategy,
      clearExisting: clearExisting !== false,
      userId
    });

    return res.status(200).json({
      success: true,
      message: `Successfully allocated ${result.summary.totalSeatsAllocated} seats across ${result.summary.roomsUtilized} rooms.`,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to allocate seats.'
    });
  }
}

/**
 * GET /api/allocations/exam/:examId
 * Fetch seating arrangement for a specific exam
 */
async function getSeatingByExam(req, res) {
  try {
    const { examId } = req.params;
    const data = await seatingService.getSeatingByExamId(examId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve seating arrangement.'
    });
  }
}

/**
 * GET /api/allocations/room/:roomId
 * Fetch 2D room matrix layout for interactive visual seating grid
 */
async function getRoomLayout(req, res) {
  try {
    const { roomId } = req.params;
    const { examId, exam_id, strict } = req.query;
    const targetExamId = examId || exam_id || null;
    const isStrict = strict === 'true' || strict === true;
    const data = await seatingService.getRoomLayout(roomId, targetExamId, isStrict);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve room layout.'
    });
  }
}

/**
 * DELETE /api/allocations/exam/:examId
 * Clear all seating allocations for an exam
 */
async function clearAllocations(req, res) {
  try {
    const { examId } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.clearAllocations(examId, userId);

    return res.status(200).json({
      success: true,
      message: `Cleared ${result.deletedCount} seat allocations for exam ID ${examId}.`,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to clear allocations.'
    });
  }
}

/**
 * GET /api/allocations/exams
 * List all exams with their current allocation status
 */
async function getExamsList(req, res) {
  try {
    const data = await seatingService.getExamsWithAllocationStatus();

    return res.status(200).json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve exams list.'
    });
  }
}

/**
 * POST /api/allocations/seed-demo-exams
 * Helper to populate initial demo exams if table is empty
 */
async function seedDemoExams(req, res) {
  try {
    const result = await seatingService.seedDemoExamsIfEmpty();

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to seed demo exams.'
    });
  }
}

/**
 * GET /api/allocations/enrolled-students/:examId
 * Fetch all enrolled students for an exam with their current seat status
 */
async function getEnrolledStudents(req, res) {
  try {
    const { examId } = req.params;
    const data = await seatingService.getEnrolledStudentsForExam(examId);

    return res.status(200).json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve enrolled students.'
    });
  }
}

/**
 * POST /api/allocations/manual-save
 * Save batch manual seat allocations
 */
async function saveManual(req, res) {
  try {
    const { exam_id, room_id, assignments } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.saveManualAllocation({
      exam_id,
      room_id,
      assignments,
      userId
    });

    return res.status(200).json({
      success: true,
      message: `Successfully saved ${result.savedCount} manual seat assignments.`,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to save manual seating.'
    });
  }
}

/**
 * POST /api/allocations/manual-seat
 * Assign single student to a seat
 */
async function assignSeat(req, res) {
  try {
    const { exam_id, room_id, student_id, row_num, col_num, seat_number } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.assignSingleSeat({
      exam_id,
      room_id,
      student_id,
      row_num,
      col_num,
      seat_number,
      userId
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to assign seat.'
    });
  }
}

/**
 * DELETE /api/allocations/manual-seat
 * Unassign/remove student from a desk
 */
async function unassignSeat(req, res) {
  try {
    const { exam_id, room_id, row_num, col_num } = req.body;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.unassignSingleSeat({
      exam_id,
      room_id,
      row_num,
      col_num,
      userId
    });

    return res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to unassign seat.'
    });
  }
}

module.exports = {
  allocateSeats,
  getSeatingByExam,
  getRoomLayout,
  clearAllocations,
  getExamsList,
  seedDemoExams,
  getEnrolledStudents,
  saveManual,
  assignSeat,
  unassignSeat
};
