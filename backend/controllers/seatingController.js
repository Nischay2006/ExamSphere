
const seatingService = require('../services/seatingService');

/**
 * Thin Seating Controller
 * Delegates seating allocation and anti-cheating logic to SeatingService.
 * Follows a 3-tier layered architecture.
 */

// Allocate seating for an exam using the requested strategy.
async function allocateSeating(req, res) {
  try {
    const { examId, roomIds, strategy } = req.body;

    if (!examId) {
      return res.status(400).json({
        success: false,
        message: 'examId is required.'
      });
    }

    const result = await seatingService.allocateSeatingForExam(examId, {
      roomIds,
      strategy
    });

    return res.status(200).json({
      success: true,
      message: result.message,
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to allocate seating.'
    });
  }
}

// Allocate seats using the multi-exam allocation workflow.
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

// Retrieve seating arrangements for a specific exam.
async function getSeatingForExam(req, res) {
  try {
    const data = await seatingService.getSeatingByExam(req.params.examId);

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve seating.'
    });
  }
}

// Alternative exam retrieval endpoint used by the main branch.
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

// Retrieve the room seating grid used by the current feature branch.
async function getRoomSeatingGrid(req, res) {
  try {
    const { roomId } = req.params;
    const { examId } = req.query;

    const data = await seatingService.getRoomSeatingGrid(roomId, examId);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve room seating grid.'
    });
  }
}

// Retrieve the 2D room layout used by the main branch.
async function getRoomLayout(req, res) {
  try {
    const { roomId } = req.params;
    const { examId, exam_id, strict } = req.query;

    const targetExamId = examId || exam_id || null;
    const isStrict = strict === 'true' || strict === true;

    const data = await seatingService.getRoomLayout(
      roomId,
      targetExamId,
      isStrict
    );

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

// Retrieve an overview of rooms and their seating status.
async function getRoomsOverview(req, res) {
  try {
    const { examId } = req.query;
    const data = await seatingService.getRoomsOverview(examId);

    return res.json({
      success: true,
      count: data.length,
      data
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to retrieve rooms overview.'
    });
  }
}

// Clear seating allocations while preserving user information for auditing.
async function clearAllocations(req, res) {
  try {
    const { examId } = req.params;
    const userId = req.user ? req.user.id : null;

    const result = await seatingService.clearAllocations(examId, userId);

    return res.status(200).json({
      success: true,
      message: result.deletedCount !== undefined
        ? `Cleared ${result.deletedCount} seat allocations for exam ID ${examId}.`
        : 'Seat allocations cleared successfully.',
      data: result
    });
  } catch (err) {
    return res.status(err.statusCode || 500).json({
      success: false,
      message: err.message || 'Failed to clear allocations.'
    });
  }
}

// List exams with their current allocation status.
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

// Seed demo exams when the database is empty.
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

// Retrieve enrolled students and their seat status.
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

// Save multiple manual seat assignments.
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

// Assign a single student to a seat.
async function assignSeat(req, res) {
  try {
    const {
      exam_id,
      room_id,
      student_id,
      row_num,
      col_num,
      seat_number
    } = req.body;

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

// Remove a student from a seat.
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
  // Feature branch endpoints
  allocateSeating,
  getSeatingForExam,
  getRoomSeatingGrid,
  getRoomsOverview,

  // Main branch endpoints
  allocateSeats,
  getSeatingByExam,
  getRoomLayout,
  getExamsList,
  seedDemoExams,
  getEnrolledStudents,
  saveManual,
  assignSeat,
  unassignSeat,

  // Shared endpoint
  clearAllocations
};
