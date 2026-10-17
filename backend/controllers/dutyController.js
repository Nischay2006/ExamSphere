const dutyService = require('../services/dutyService');

/**
 * Thin Duty Controller
 * Delegates faculty invigilation duty balancing to DutyService
 */

async function getDutyRoster(req, res) {
  try {
    const data = await dutyService.getDutyRoster();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function getWorkloadStats(req, res) {
  try {
    const data = await dutyService.getWorkloadStats();
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function autoAllocateDuties(req, res) {
  try {
    const { clearExisting, excludeFacultyIds } = req.body;
    const result = await dutyService.autoAllocateDuties({ clearExisting, excludeFacultyIds });
    res.status(200).json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function assignSubstitute(req, res) {
  try {
    const { dutyId } = req.params;
    const { substituteFacultyId } = req.body;
    if (!substituteFacultyId) {
      return res.status(400).json({ success: false, message: 'substituteFacultyId is required.' });
    }
    await dutyService.assignSubstitute(dutyId, substituteFacultyId);
    res.json({ success: true, message: 'Substitute invigilator assigned successfully.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function removeDuty(req, res) {
  try {
    await dutyService.removeDuty(req.params.dutyId);
    res.json({ success: true, message: 'Duty assignment removed successfully.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function checkAvailability(req, res) {
  try {
    const { exam_date, start_time, end_time, course_dept } = req.query;
    const data = await dutyService.checkFacultyAvailability({ exam_date, start_time, end_time, course_dept });
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function assignDuty(req, res) {
  try {
    const { exam_id, room_id, faculty_id, exam_date, start_time, end_time } = req.body;
    const result = await dutyService.assignDutyToRoomSlot({ exam_id, room_id, faculty_id, exam_date, start_time, end_time });
    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function resetDuties(req, res) {
  try {
    const result = await dutyService.resetAllDuties();
    res.json(result);
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getDutyRoster,
  getWorkloadStats,
  autoAllocateDuties,
  assignSubstitute,
  removeDuty,
  checkAvailability,
  assignDuty,
  resetDuties
};
