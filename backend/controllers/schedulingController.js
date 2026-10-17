const schedulingService = require('../services/schedulingService');

/**
 * Thin Scheduling Controller
 * Delegates scheduling logic and conflict detection to SchedulingService
 */

async function getExams(req, res) {
  try {
    const data = await schedulingService.getAllExams();
    res.json({ success: true, count: data.length, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function getExam(req, res) {
  try {
    const data = await schedulingService.getExamById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function createExam(req, res) {
  try {
    const id = await schedulingService.createExam(req.body);
    res.status(201).json({ success: true, message: 'Exam scheduled successfully.', id });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function updateExam(req, res) {
  try {
    await schedulingService.updateExam(req.params.id, req.body);
    res.json({ success: true, message: 'Exam schedule updated successfully.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function deleteExam(req, res) {
  try {
    await schedulingService.deleteExam(req.params.id);
    res.json({ success: true, message: 'Exam deleted successfully.' });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function detectConflicts(req, res) {
  try {
    const result = await schedulingService.detectConflicts();
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

async function generateTimetable(req, res) {
  try {
    const result = await schedulingService.generateAutomatedTimetable(req.body);
    res.status(201).json({ success: true, message: result.message, data: result });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message });
  }
}

module.exports = {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  detectConflicts,
  generateTimetable
};
