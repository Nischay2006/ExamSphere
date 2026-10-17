const express = require('express');
const router = express.Router();
const {
  getDutyRoster,
  getWorkloadStats,
  autoAllocateDuties,
  assignSubstitute,
  removeDuty,
  checkAvailability,
  assignDuty,
  resetDuties
} = require('../controllers/dutyController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// Duty endpoints require authentication
router.use(verifyToken);

// Read endpoints: accessible by ADMIN and FACULTY
router.get('/roster', requireRole('ADMIN', 'FACULTY'), getDutyRoster);
router.get('/workload-stats', requireRole('ADMIN', 'FACULTY'), getWorkloadStats);
router.get('/availability', requireRole('ADMIN', 'FACULTY'), checkAvailability);

// Mutating endpoints: strictly ADMIN
router.post('/auto-allocate', requireRole('ADMIN'), autoAllocateDuties);
router.post('/assign', requireRole('ADMIN'), assignDuty);
router.post('/reset-all', requireRole('ADMIN'), resetDuties);
router.put('/:dutyId/substitute', requireRole('ADMIN'), assignSubstitute);
router.delete('/:dutyId', requireRole('ADMIN'), removeDuty);

module.exports = router;
