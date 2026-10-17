const express = require('express');
const router = express.Router();
const {
  getExams,
  getExam,
  createExam,
  updateExam,
  deleteExam,
  detectConflicts,
  generateTimetable
} = require('../controllers/schedulingController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Scheduling endpoints require authentication
router.use(verifyToken);

// Read endpoints: accessible by ADMIN and FACULTY
router.get('/exams', requireRole('ADMIN', 'FACULTY'), getExams);
router.get('/exams/:id', requireRole('ADMIN', 'FACULTY'), getExam);
router.get('/conflicts', requireRole('ADMIN', 'FACULTY'), detectConflicts);

// Mutating endpoints: strictly ADMIN
router.post('/exams', requireRole('ADMIN'), createExam);
router.put('/exams/:id', requireRole('ADMIN'), updateExam);
router.delete('/exams/:id', requireRole('ADMIN'), deleteExam);
router.post('/generate', requireRole('ADMIN'), generateTimetable);

module.exports = router;
