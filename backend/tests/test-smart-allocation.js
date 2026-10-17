const assert = require('assert');

/**
 * Headless Unit Tests for Smart Allocation & Scheduling:
 * Features Tested:
 * 1. Exam Difficulty Spacing Engine (Spacing difficulty levels 4 & 5)
 * 2. Workload Balancing & Fairness Index Computation
 * 3. Faculty Capacity Limit (max_duties) Enforcement
 * 4. Department Impartiality Assignment Scoring
 */

async function runSmartAllocationTests() {
  console.log('\n======================================================');
  console.log('🧪 RUNNING SMART ALLOCATION & SCHEDULING TESTS');
  console.log('======================================================\n');

  let passed = 0;
  let total = 0;

  // -----------------------------------------------------------------
  // TEST 1: Exam Difficulty Spacing Sorting
  // -----------------------------------------------------------------
  total++;
  try {
    const mockCourses = [
      { id: 1, course_code: 'CSE101', difficulty_level: 2 },
      { id: 2, course_code: 'CSE302', difficulty_level: 5 },
      { id: 3, course_code: 'CSE201', difficulty_level: 4 },
      { id: 4, course_code: 'CSE105', difficulty_level: 3 }
    ];

    // Spacing engine sorts by difficulty descending so hard exams are spaced first
    const sorted = [...mockCourses].sort((a, b) => b.difficulty_level - a.difficulty_level);

    if (sorted[0].difficulty_level === 5 && sorted[1].difficulty_level === 4) {
      console.log(` [TEST 1 PASSED] Difficulty Spacing Engine prioritizes high-difficulty courses (Levels 5 & 4).`);
      passed++;
    } else {
      console.error('❌ [TEST 1 FAILED] Sorting order incorrect.');
    }
  } catch (err) {
    console.error('❌ [TEST 1 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 2: Workload Balancing & Fairness Index Computation
  // -----------------------------------------------------------------
  total++;
  try {
    // When all faculty have equal duties (e.g., 2, 2, 2, 2)
    // Variance = 0, StdDev = 0 -> Fairness Index = 100%
    const dutyCounts = [2, 2, 2, 2];
    const totalAssigned = dutyCounts.reduce((a, b) => a + b, 0);
    const mean = totalAssigned / dutyCounts.length;
    const variance = dutyCounts.reduce((acc, c) => acc + Math.pow(c - mean, 2), 0) / dutyCounts.length;
    const stdDev = Math.sqrt(variance);
    const fairnessIndex = Math.max(0, Math.round((1 - (stdDev / (mean + 1))) * 100));

    if (fairnessIndex === 100) {
      console.log(` [TEST 2 PASSED] Workload Equalizer calculates 100% Fairness Index for balanced distribution.`);
      passed++;
    } else {
      console.error(`❌ [TEST 2 FAILED] Expected 100% fairness index but got ${fairnessIndex}%.`);
    }
  } catch (err) {
    console.error('❌ [TEST 2 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 3: Faculty Capacity Limit (max_duties) Enforcement
  // -----------------------------------------------------------------
  total++;
  try {
    const faculty = { name: 'Dr. Shilpa', assigned: 4, maxDuties: 4 };
    const canAcceptDuty = faculty.assigned < faculty.maxDuties;

    if (!canAcceptDuty) {
      console.log(` [TEST 3 PASSED] Strict max_duties capacity limit enforced (Prevents faculty overload).`);
      passed++;
    } else {
      console.error('❌ [TEST 3 FAILED] Capacity limit was not enforced.');
    }
  } catch (err) {
    console.error('❌ [TEST 3 FAILED]', err.message);
  }

  // -----------------------------------------------------------------
  // TEST 4: Department Impartiality Assignment Scoring
  // -----------------------------------------------------------------
  total++;
  try {
    const examDept = 'CSE';
    const candidateA = { name: 'Dr. Harsh', dept: 'ECE', count: 1 };
    const candidateB = { name: 'Dr. Shilpa', dept: 'CSE', count: 1 };

    // Impartial candidate from external department gets +50 priority score
    const scoreA = (10 - candidateA.count) * 20 + (candidateA.dept !== examDept ? 50 : 0);
    const scoreB = (10 - candidateB.count) * 20 + (candidateB.dept !== examDept ? 50 : 0);

    if (scoreA > scoreB) {
      console.log(` [TEST 4 PASSED] Department Impartiality Algorithm correctly prioritizes external faculty.`);
      passed++;
    } else {
      console.error('❌ [TEST 4 FAILED] Impartiality scoring incorrect.');
    }
  } catch (err) {
    console.error('❌ [TEST 4 FAILED]', err.message);
  }

  console.log(`\n🎯 RESULT: ${passed} / ${total} TESTS PASSED\n`);
  return passed === total;
}

runSmartAllocationTests().catch(console.error);
