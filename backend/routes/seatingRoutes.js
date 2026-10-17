
const express = require('express');
const router = express.Router();

const {
  allocateSeating,
  getSeatingForExam,
  getRoomSeatingGrid,
  getRoomsOverview,
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

// All seating endpoints require authentication.
router.use(verifyToken);

// Read endpoints: accessible by ADMIN and FACULTY.
router.get(
  '/rooms-overview',
  requireRole('ADMIN', 'FACULTY'),
  getRoomsOverview
);

router.get(
  '/exam/:examId',
  requireRole('ADMIN', 'FACULTY'),
  getSeatingForExam
);

router.get(
  '/room/:roomId/grid',
  requireRole('ADMIN', 'FACULTY'),
  getRoomSeatingGrid
);

router.get(
  '/room/:roomId',
  requireRole('ADMIN', 'FACULTY'),
  getRoomLayout
);

router.get(
  '/exams',
  requireRole('ADMIN', 'FACULTY'),
  getExamsList
);

router.get(
  '/enrolled-students/:examId',
  requireRole('ADMIN', 'FACULTY'),
  getEnrolledStudents
);

// Allocation endpoints: ADMIN only.
router.post(
  '/allocate',
  requireRole('ADMIN'),
  allocateSeating
);

router.post(
  '/seating',
  requireRole('ADMIN'),
  allocateSeats
);

router.delete(
  '/exam/:examId',
  requireRole('ADMIN'),
  clearAllocations
);

// Demo data initialization: ADMIN only.
router.post(
  '/seed-demo-exams',
  requireRole('ADMIN'),
  seedDemoExams
);

// Manual seating management: ADMIN only.
router.post(
  '/manual-save',
  requireRole('ADMIN'),
  saveManual
);

router.post(
  '/manual-seat',
  requireRole('ADMIN'),
  assignSeat
);

router.delete(
  '/manual-seat',
  requireRole('ADMIN'),
  unassignSeat
);

module.exports = router;
