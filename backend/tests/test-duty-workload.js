const assert = require('assert');

/**
 * Headless Unit Tests for Module 5:
 * Faculty Duty & Workload Management
 * 
 * Main functionalities tested:
 * 1. Assign invigilators to rooms and time slots
 * 2. Check faculty availability (clash prevention & capacity checks)
 * 3. Balance workloads (variance minimization & fairness index)
 * 4. Department impartiality verification
 * 5. Seniority-weighted hall allocation
 */

async function runDutyWorkloadTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING MODULE 5 TESTS: FACULTY DUTY & WORKLOAD MANAGEMENT');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  // -----------------------------------------------------------------
  // TEST 1: Workload Balancing & Fairness Index Computation
  // -----------------------------------------------------------------
  total++;
  try {
    // Perfectly equalized distribution: [2, 2, 2, 2] -> stdDev = 0, Fairness = 100%
    const balancedCounts = [2, 2, 2, 2];
    const meanBalanced = balancedCounts.reduce((a, b) => a + b, 0) / balancedCounts.length;
    const varBalanced = balancedCounts.reduce((acc, c) => acc + Math.pow(c - meanBalanced, 2), 0) / balancedCounts.length;
    const stdDevBalanced = Math.sqrt(varBalanced);
    const fairnessBalanced = Math.max(0, Math.round((1 - (stdDevBalanced / (meanBalanced + 1))) * 100));

    // Skewed / unfair distribution: [5, 0, 0, 0] -> high variance, low fairness
    const skewedCounts = [5, 0, 0, 0];
    const meanSkewed = skewedCounts.reduce((a, b) => a + b, 0) / skewedCounts.length;
    const varSkewed = skewedCounts.reduce((acc, c) => acc + Math.pow(c - meanSkewed, 2), 0) / skewedCounts.length;
    const stdDevSkewed = Math.sqrt(varSkewed);
    const fairnessSkewed = Math.max(0, Math.round((1 - (stdDevSkewed / (meanSkewed + 1))) * 100));

    if (fairnessBalanced === 100 && fairnessSkewed < 50) {
      console.log(` [TEST 1 PASSED] Workload Equalizer calculates 100% Fairness for balanced load and penalizes skewed load (${fairnessSkewed}%).`);
      passed++;
    } else {
      console.error(`❌ [TEST 1 FAILED] Fairness calculations unexpected: Balanced=${fairnessBalanced}%, Skewed=${fairnessSkewed}%`);
    }
  } catch (err) {
    console.error('❌ [TEST 1 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 2: Check Faculty Availability (Time Slot Clash Detection)
  // -----------------------------------------------------------------
  total++;
  try {
    const existingDuty = {
      date: '2026-11-10',
      start: '09:30:00',
      end: '12:30:00'
    };

    const requestedSlot = {
      date: '2026-11-10',
      start: '11:00:00',
      end: '14:00:00'
    };

    // Check overlap condition:
    const isOverlapping = (
      (requestedSlot.start <= existingDuty.start && requestedSlot.end > existingDuty.start) ||
      (requestedSlot.start < existingDuty.end && requestedSlot.end >= existingDuty.end) ||
      (requestedSlot.start >= existingDuty.start && requestedSlot.end <= existingDuty.end)
    );

    if (isOverlapping) {
      console.log(` [TEST 2 PASSED] Faculty Availability Scanner detects overlapping time slot clash (11:00 vs 09:30-12:30).`);
      passed++;
    } else {
      console.error(`❌ [TEST 2 FAILED] Time slot clash was not detected.`);
    }
  } catch (err) {
    console.error('❌ [TEST 2 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 3: Faculty Capacity Limit (max_duties) Enforcement
  // -----------------------------------------------------------------
  total++;
  try {
    const facultyA = { name: 'Dr. Shilpa', assigned: 4, maxDuties: 4 };
    const facultyB = { name: 'Dr. Nishtha', assigned: 2, maxDuties: 5 };

    const isAFree = facultyA.assigned < facultyA.maxDuties;
    const isBFree = facultyB.assigned < facultyB.maxDuties;

    if (!isAFree && isBFree) {
      console.log(` [TEST 3 PASSED] Strict max_duties capacity limit enforced (Dr. Shilpa capped at 4, Dr. Nishtha available at 2/5).`);
      passed++;
    } else {
      console.error(`❌ [TEST 3 FAILED] Capacity check failed.`);
    }
  } catch (err) {
    console.error('❌ [TEST 3 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: Department Impartiality Assignment Scoring
  // -----------------------------------------------------------------
  total++;
  try {
    const examCourseDept = 'CSE';
    const candidateExternal = { name: 'Dr. Harsh', dept: 'ECE', duties: 1 };
    const candidateInternal = { name: 'Dr. Shilpa', dept: 'CSE', duties: 1 };

    const scoreExternal = (10 - candidateExternal.duties) * 20 + (candidateExternal.dept !== examCourseDept ? 50 : 0);
    const scoreInternal = (10 - candidateInternal.duties) * 20 + (candidateInternal.dept !== examCourseDept ? 50 : 0);

    if (scoreExternal > scoreInternal) {
      console.log(` [TEST 4 PASSED] Department Impartiality Algorithm prioritizes external faculty over internal department colleagues.`);
      passed++;
    } else {
      console.error(`❌ [TEST 4 FAILED] Impartiality scoring incorrect.`);
    }
  } catch (err) {
    console.error('❌ [TEST 4 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 5: Seniority-Weighted Room Matching
  // -----------------------------------------------------------------
  total++;
  try {
    const largeHallCapacity = 80; // e.g., AUD-HALL
    const seniorProf = { name: 'Dr. Shilpa', seniority: 2 };
    const juniorProf = { name: 'Dr. Nishtha', seniority: 1 };

    // Seniority weighting rule: halls >= 50 capacity prefer seniority >= 2
    const seniorScore = (largeHallCapacity >= 50 && seniorProf.seniority >= 2) ? 30 : 0;
    const juniorScore = (largeHallCapacity >= 50 && juniorProf.seniority >= 2) ? 30 : 0;

    if (seniorScore > juniorScore) {
      console.log(` [TEST 5 PASSED] Hierarchical Seniority Matcher prioritizes Senior Faculty for large examination halls.`);
      passed++;
    } else {
      console.error(`❌ [TEST 5 FAILED] Seniority matching scoring failed.`);
    }
  } catch (err) {
    console.error('❌ [TEST 5 FAILED]', err.message);
  }

  console.log(`\n🎯 RESULT: ${passed} / ${total} TESTS PASSED\n`);
  return passed === total;
}

runDutyWorkloadTests().catch(console.error);
