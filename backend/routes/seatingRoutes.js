const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/seatingController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All allocation endpoints require authentication
router.use(verifyToken);

// Exam listing & allocation status
router.get('/exams', getExamsList);

// Enrolled students for an exam
router.get('/enrolled-students/:examId', getEnrolledStudents);

// Seating queries
router.get('/exam/:examId', getSeatingByExam);
router.get('/room/:roomId', getRoomLayout);

// Mutations require ADMIN role
router.post('/seating', requireRole('ADMIN'), allocateSeats);
router.delete('/exam/:examId', requireRole('ADMIN'), clearAllocations);
router.post('/seed-demo-exams', requireRole('ADMIN'), seedDemoExams);

// Manual seating routes
router.post('/manual-save', requireRole('ADMIN'), saveManual);
router.post('/manual-seat', requireRole('ADMIN'), assignSeat);
router.delete('/manual-seat', requireRole('ADMIN'), unassignSeat);

module.exports = router;
